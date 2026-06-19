/**
 * Tiny static server for LOCAL QA of the generated build. Serves
 * `.output/public` under the production base path (`/anime-product/`) with
 * correct MIME types and a 404.html SPA fallback — i.e. it mimics GitHub Pages
 * closely enough to run Lighthouse / axe against the real static output.
 *
 * Usage:  node scripts/static-serve.mjs [port]
 */
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../.output/public', import.meta.url))
const PREFIX = '/anime-product'
const PORT = Number(process.argv[2]) || 4178
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
}

http
  .createServer(async (req, res) => {
    let url = decodeURIComponent((req.url || '/').split('?')[0])
    if (url.startsWith(PREFIX)) url = url.slice(PREFIX.length) || '/'
    let fp = normalize(join(ROOT, url))
    if (!fp.startsWith(ROOT)) {
      res.writeHead(403)
      return res.end()
    }
    try {
      let s = await stat(fp).catch(() => null)
      if (s && s.isDirectory()) {
        fp = join(fp, 'index.html')
        s = await stat(fp).catch(() => null)
      }
      if (!s) {
        fp = join(ROOT, '404.html')
        res.statusCode = 404
      }
      const body = await readFile(fp)
      res.setHeader('Content-Type', MIME[extname(fp)] || 'application/octet-stream')
      res.end(body)
    } catch (e) {
      res.writeHead(500)
      res.end(String(e))
    }
  })
  .listen(PORT, () => console.log(`static build serving on http://localhost:${PORT}${PREFIX}/`))
