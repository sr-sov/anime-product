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
        // Inter, the product workhorse. Preconnect keeps the first paint quick.
        { rel: 'preconnect', href: 'https://rsms.me/' },
        { rel: 'stylesheet', href: 'https://rsms.me/inter/inter.css' },
      ],
    },
  },

  // GitHub Pages preset: emits .nojekyll and a 404.html SPA fallback so a fully
  // static deploy works on a project sub-path.
  nitro: {
    preset: 'github-pages',
    prerender: {
      // Pre-render only the shell. Detail routes resolve client-side via the
      // 404.html SPA fallback, so the build never depends on Jikan being up
      // (and we don't burn build-time requests against its rate limit).
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
    },
  },

  // Data is fetched client-side from Jikan (composables/useJikan.ts); no server
  // runtime needed at deploy time. The shell is pre-rendered for a fast first
  // paint; dynamic routes hydrate against the live API via the SPA fallback.
  ssr: false,

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
