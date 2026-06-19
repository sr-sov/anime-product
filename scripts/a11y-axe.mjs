/**
 * Accessibility gate — runs axe-core against the running site with the ⌘K
 * command palette OPEN (its signature surface, where the listbox ownership
 * chain and group/header contrast live). Fails the process on any critical or
 * serious WCAG 2.1 A/AA violation.
 *
 * Usage:  node scripts/a11y-axe.mjs <baseUrl>
 *   baseUrl defaults to http://localhost:4178/anime-product/
 *
 * Chrome resolution order:
 *   1. $PUPPETEER_EXECUTABLE_PATH
 *   2. a puppeteer cache install under ~/.cache/puppeteer
 *   3. system chromium / google-chrome on PATH
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const axePath = require.resolve('axe-core')
const axeSource = readFileSync(axePath, 'utf8')

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
    } catch {
      /* keep looking */
    }
  }
  throw new Error('No Chrome/Chromium found. Set PUPPETEER_EXECUTABLE_PATH.')
}

const base = process.argv[2] || 'http://localhost:4178/anime-product/'

const browser = await puppeteer.launch({
  executablePath: resolveChrome(),
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 })

  // Open the palette. Prefer clicking a real trigger button (robust in
  // headless); fall back to the Ctrl+K shortcut.
  const opened = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /search anime/i.test(b.textContent || '') || b.getAttribute('aria-label') === 'Open search',
    )
    if (btn) {
      btn.click()
      return true
    }
    return false
  })
  if (!opened) {
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyK')
    await page.keyboard.up('Control')
  }
  await new Promise((r) => setTimeout(r, 600))
  await page.keyboard.type('naruto', { delay: 40 })
  await new Promise((r) => setTimeout(r, 2800))

  const hasListbox = await page.evaluate(() => !!document.querySelector('[role="listbox"]'))
  const optionCount = await page.evaluate(
    () => document.querySelectorAll('[role="listbox"] [role="option"]').length,
  )
  console.log(`palette listbox present: ${hasListbox} (options: ${optionCount})`)

  await page.evaluate(axeSource)
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    })
  })

  const tally = { critical: 0, serious: 0, moderate: 0, minor: 0 }
  for (const v of results.violations) tally[v.impact] = (tally[v.impact] || 0) + 1

  console.log(`\n=== AXE (palette open) — ${results.violations.length} violation type(s) ===`)
  console.log(JSON.stringify(tally))
  for (const v of results.violations) {
    console.log(`  [${v.impact}] ${v.id} — ${v.nodes.length} node(s): ${v.help}`)
  }

  const blocking = tally.critical + tally.serious
  if (blocking > 0) {
    console.error(`\nFAIL: ${blocking} critical/serious violation(s) with the palette open.`)
    process.exit(1)
  }
  console.log('\nPASS: zero critical/serious violations with the palette open.')
} finally {
  await browser.close()
}
