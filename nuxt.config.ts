// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  // Components are organised in subfolders (chrome/, palette/, ui/, anime/) for
  // clarity, but auto-imported by their bare filename (<AppHeader/>, not
  // <ChromeAppHeader/>) so call-sites stay clean.
  components: [{ path: '~/components', pathPrefix: false }],

  // Deployed as a GitHub Pages *project* page under a sub-path. baseURL keeps
  // generated asset/route URLs correct under /anime-product/.
  app: {
    baseURL: '/anime-product/',
    // Cross-fade between routes; `out-in` avoids overlapping pages. The detail
    // drawer is route-aware but renders as an overlay (not a page transition),
    // so it animates independently of this fade.
    pageTransition: { name: 'fade', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en', class: 'dark' },
      title: 'Senkō — the keyboard-first anime index',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Senkō is a fast, keyboard-first anime database. Press ⌘K to search, jump to any genre, and open a title without leaving the page. Built with Nuxt 3 on the Jikan API.',
        },
        { name: 'theme-color', content: '#1a1a22' },
        { property: 'og:title', content: 'Senkō — the keyboard-first anime index' },
        {
          property: 'og:description',
          content:
            'A command-palette anime browser. ⌘K to search, instant filters, route-aware detail drawer.',
        },
        { property: 'og:type', content: 'website' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/anime-product/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/anime-product/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/anime-product/apple-touch-icon.png' },
        // Inter, the product workhorse. Preconnect + preload the variable woff2
        // so the font is ready at first paint — otherwise its late swap reflows
        // the home content region (the mobile CLS source: a 0.179 shift caused
        // by "Web font loaded"). A metric-adjusted fallback (main.css) covers
        // the gap if the preload is slow, so text never reflows either way.
        { rel: 'preconnect', href: 'https://rsms.me/', crossorigin: '' },
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: 'https://rsms.me/inter/font-files/InterVariable.woff2?v=4.1',
          crossorigin: '',
        },
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
      ],
    },
  },

  // GitHub Pages preset: emits .nojekyll and a 404.html SPA fallback so a fully
  // static deploy works on a project sub-path.
  nitro: {
    preset: 'github-pages',
    prerender: {
      // Pre-render the homepage plus the top ~40 detail routes (the ids are
      // seeded at build time by the hook below). crawlLinks stays OFF so the
      // long tail of titles is NOT crawled — those resolve client-side via the
      // 404.html SPA fallback. failOnError stays off so a flaky Jikan response
      // on one route never fails the whole build.
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
      // Render one route at a time with a gap between them. Each detail route
      // makes a live Jikan call during SSR; Jikan rate-limits hard (~3 req/s),
      // so serializing the prerender (instead of bursting 40 in parallel) is
      // what lets every detail page bake REAL content instead of an error
      // state. The in-fetcher backoff covers the occasional 429 on top.
      concurrency: 1,
      interval: 800,
    },
  },

  hooks: {
    /**
     * Seed the prerender queue with the top ~40 /anime/<id> routes. We fetch
     * the top-anime feed at build time (rate-guarded, ~3 req/s) so the most
     * popular titles ship as real prerendered HTML — deep-linkable, crawlable,
     * with a server-painted cover. Failure is non-fatal: if Jikan is down at
     * build, we simply prerender fewer (or zero) detail routes and the SPA
     * fallback still covers them.
     */
    async 'prerender:routes'(ctx) {
      const base = 'https://api.jikan.moe/v4'
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

      // Fetch one page with a few retries — Jikan rate-limits the build-time
      // seed too, so a single 429 must not blank the detail-route set.
      async function topPage(page: number): Promise<number[]> {
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const res = await fetch(`${base}/top/anime?page=${page}&limit=25&sfw=true`)
            if (res.status === 429) {
              await sleep(1500 * (attempt + 1))
              continue
            }
            if (!res.ok) return []
            const json = (await res.json()) as { data?: Array<{ mal_id: number }> }
            return (json.data ?? []).map((a) => a.mal_id)
          } catch {
            await sleep(1000 * (attempt + 1))
          }
        }
        return []
      }

      const ids = new Set<number>()
      for (const page of [1, 2]) {
        for (const id of await topPage(page)) ids.add(id)
        await sleep(900)
      }

      // Fallback: if Jikan was unreachable at build, seed a curated set of
      // evergreen MAL ids so the build always ships real prerendered detail
      // pages (deep-links + SEO) rather than an all-SPA long tail.
      if (ids.size < 10) {
        for (const id of [
          52991, 5114, 9253, 28977, 38524, 11061, 9969, 15417, 4181, 2904,
          41467, 51535, 31964, 32281, 19, 820, 918, 1535, 30276, 16498,
        ]) {
          ids.add(id)
        }
      }

      let added = 0
      for (const id of ids) {
        if (added >= 40) break
        ctx.routes.add(`/anime/${id}`)
        added++
      }
      // eslint-disable-next-line no-console
      console.log(`[prerender] seeded ${added} /anime/<id> detail routes`)
    },
  },

  // SSR/SSG: pages are server-rendered at build time (prerendered to static
  // HTML for GitHub Pages). The homepage and the seeded detail routes ship real
  // server-painted markup; the long tail hydrates against the live API via the
  // SPA fallback. Data must be fetched hydration-safely (useAsyncData), never
  // via setup-time side effects.
  ssr: true,

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck`
  },

  runtimeConfig: {
    public: {
      jikanBase: 'https://api.jikan.moe/v4',
    },
  },
})
