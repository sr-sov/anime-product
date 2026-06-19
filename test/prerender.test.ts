import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Build-output contract. Runs against `.output/public` after `npm run generate`
 * (skipped with a clear note if the build hasn't been produced yet, so unit CI
 * stays green; the dedicated post-generate CI step enforces it for real).
 *
 * Asserts the cross-cutting deep-link fix: a directly-typed /anime/<id> route
 * is a REAL prerendered page (a 200 with its OWN title + cover + og:image), not
 * a 404 / generic SPA shell.
 */
const PUBLIC = fileURLToPath(new URL('../.output/public', import.meta.url))
const built = existsSync(PUBLIC)

const d = built ? describe : describe.skip

d('prerendered static output', () => {
  it('emits the homepage with the server-painted featured spotlight', () => {
    const html = readFileSync(`${PUBLIC}/index.html`, 'utf8')
    expect(html).toContain('Featured · #1')
    // The featured cover is server-rendered (kills the mobile CLS swap).
    expect(html).toContain('Cover art for')
  })

  it('prerenders detail routes as real deep-linkable pages', () => {
    const dir = `${PUBLIC}/anime`
    expect(existsSync(dir)).toBe(true)
    const ids = readdirSync(dir).filter((n) => /^\d+$/.test(n))
    // We seed the top ~40; require a healthy floor in case Jikan throttled some.
    expect(ids.length).toBeGreaterThanOrEqual(10)
  })

  it('each detail page carries its OWN title, cover, and og:image', () => {
    const dir = `${PUBLIC}/anime`
    const ids = readdirSync(dir).filter((n) => /^\d+$/.test(n))
    let withContent = 0
    for (const id of ids) {
      const html = readFileSync(`${dir}/${id}/index.html`, 'utf8')
      const hasTitle = /<title>(?!Anime · Senkō<)/.test(html) // not the generic fallback
      const hasCover = html.includes('Cover art for')
      const hasOg = /property="og:image" content="https?:\/\//.test(html)
      if (hasTitle && hasCover && hasOg) withContent++
    }
    // The vast majority must have baked real content (allow a tiny throttle tail).
    expect(withContent).toBeGreaterThanOrEqual(Math.ceil(ids.length * 0.9))
  })

  it('does NOT bake a hard error state into any prerendered detail page', () => {
    const dir = `${PUBLIC}/anime`
    const ids = readdirSync(dir).filter((n) => /^\d+$/.test(n))
    for (const id of ids) {
      const html = readFileSync(`${dir}/${id}/index.html`, 'utf8')
      expect(html, `anime/${id} baked an error state`).not.toContain('Couldn’t load that')
    }
  })

  it('ships the GitHub Pages SPA fallback (404.html) for the long tail', () => {
    expect(existsSync(`${PUBLIC}/404.html`)).toBe(true)
  })
})
