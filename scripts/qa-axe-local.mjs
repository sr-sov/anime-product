/**
 * Self-contained local a11y QA: spins up the static server in-process, opens the
 * built site with the ⌘K palette OPEN, runs axe-core, prints the report, and
 * exits non-zero on any critical/serious violation. No external server needed.
 *
 * Usage: node scripts/qa-axe-local.mjs
 */
import http from 'node:http'
import { execSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const axeSource = readFileSync(require.resolve('axe-core'), 'utf8')

const ROOT = fileURLToPath(new URL('../.output/public', import.meta.url))
const PREFIX = '/anime-product'
const PORT = 4191
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2',
}

function resolveChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH
  const cache = `${process.env.HOME}/.cache/puppeteer/chrome`
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      const bin = `${cache}/${dir}/chrome-linux64/chrome`
      if (existsSync(bin)) return bin
    }
  }
  for (const cmd of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      return execSync(`which ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch { /* keep looking */ }
  }
  throw new Error('No Chrome found')
}

const server = http.createServer(async (req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0])
  if (url.startsWith(PREFIX)) url = url.slice(PREFIX.length) || '/'
  let fp = normalize(join(ROOT, url))
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  try {
    let s = await stat(fp).catch(() => null)
    if (s && s.isDirectory()) { fp = join(fp, 'index.html'); s = await stat(fp).catch(() => null) }
    if (!s) { fp = join(ROOT, '404.html'); res.statusCode = 404 }
    const body = await readFile(fp)
    res.setHeader('Content-Type', MIME[extname(fp)] || 'application/octet-stream')
    res.end(body)
  } catch (e) { res.writeHead(500); res.end(String(e)) }
})

await new Promise((r) => server.listen(PORT, r))

const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
})

let exitCode = 0
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(`http://localhost:${PORT}${PREFIX}/`, { waitUntil: 'networkidle2', timeout: 60000 })

  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => /search anime/i.test(b.textContent || '') || b.getAttribute('aria-label') === 'Open search',
    )
    if (btn) { btn.click(); return true }
    return false
  })
  if (!opened) {
    await page.keyboard.down('Control'); await page.keyboard.press('KeyK'); await page.keyboard.up('Control')
  }
  await new Promise((r) => setTimeout(r, 700))
  await page.keyboard.type('naruto', { delay: 40 })
  await new Promise((r) => setTimeout(r, 2800))

  const meta = await page.evaluate(() => ({
    listbox: !!document.querySelector('[role="listbox"]'),
    options: document.querySelectorAll('[role="listbox"] [role="option"]').length,
    groups: document.querySelectorAll('[role="listbox"] [role="group"]').length,
  }))
  console.log(`palette listbox: ${meta.listbox}  groups: ${meta.groups}  options: ${meta.options}`)

  await page.evaluate(axeSource)
  const results = await page.evaluate(async () =>
    await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }),
  )
  const tally = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const v of results.violations) tally[v.impact] = (tally[v.impact] || 0) + 1
  console.log(`\n=== AXE (palette open) — ${results.violations.length} violation type(s) ===`)
  console.log(JSON.stringify(tally))
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id} — ${v.nodes.length} node(s): ${v.help}`)
    for (const n of v.nodes.slice(0, 3)) console.log(`      ${n.target.join(' ')}`)
  }
  const blocking = tally.critical + tally.serious
  if (blocking > 0) { console.error(`\nFAIL: ${blocking} critical/serious`); exitCode = 1 }
  else console.log('\nPASS: zero critical/serious with palette open.')
} finally {
  await browser.close()
  server.close()
}
process.exit(exitCode)
