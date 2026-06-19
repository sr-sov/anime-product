# Senkō — a keyboard-first anime index

The anime database built like a tool, not a brochure. Fast, dense, and operable
end to end from the keyboard. The centerpiece is a real **⌘K command palette**:
fuzzy-search thousands of titles, jump to any genre, re-open what you just
viewed, and run navigation commands — all with live debounced results and full
arrow-key navigation. Titles open in a **route-aware detail drawer** over the
current page, so you never lose your place. Data is the live
[Jikan API](https://jikan.moe) (MyAnimeList), fetched client-side, so the whole
app ships as a static site.

**Live:** https://sr-sov.github.io/anime-product/

[![CI](https://github.com/sr-sov/anime-product/actions/workflows/ci.yml/badge.svg)](https://github.com/sr-sov/anime-product/actions/workflows/ci.yml)

## The direction

Product / command-palette. The reference register is Linear / Vercel / Raycast /
Stripe: true-neutral dark grays with a faint cool cast, crisp hairlines, one
electric accent used sparingly (focus, the active palette row, a single primary
action per view), Inter for text and mono for keys. Motion is micro-interactions
only — a controlled spring on the palette open, focus transitions, skeleton →
content, a staggered grid entrance — all transform/opacity, 60fps, and a real
static fallback under `prefers-reduced-motion`.

## Signature: the ⌘K command palette

One overlay does four jobs at once, all keyboard-first:

| | |
|---|---|
| **Run commands** | Navigate, open browse presets (Top, This season, Films, TV) — local, instant. |
| **Jump to a genre** | Every genre as a command, ranked by popularity. |
| **Search anime live** | Debounced (280 ms) network search with its own loading / empty / error states *inside* the list, stale-response cancellation, and optimistic feel. |
| **Recent** | Re-open titles you just viewed (localStorage), no network. |

Everything is fuzzy-ranked (`composables/useFuzzy.ts`) with the matched
characters highlighted. Keyboard: `⌘K` / `Ctrl K` toggles from anywhere (even
inside a field), `/` opens it, `↑ ↓` move (wrapping), `Home`/`End` jump, `⏎`
runs the selection, `Esc` closes. Focus is trapped to the input, the active row
always scrolls into view, and the platform-correct modifier (`⌘` vs `Ctrl`) is
detected at runtime.

## Stack

- **Nuxt 3** (Vue 3, `<script setup>` + Composition API), SPA / static output
- **TypeScript** in `strict` mode with a typed API surface
- **TailwindCSS** with an OKLCH design-token system (single source of truth in
  `assets/css/main.css`, surfaced to both Tailwind and hand CSS)
- **Jikan API v4** — no key, no auth
- **Vitest** for the pure logic, **GitHub Actions** for CI

## Patterns demonstrated

- **A reusable, typed data layer.** `composables/useJikan.ts` is a typed client
  over six Jikan endpoints (top, search/listing, full detail, genres, current
  season, recommendations) with an in-memory response cache, a serialized
  client-side **rate guard** (~3 req/s, the limit Jikan enforces), retry, and an
  extracted, unit-tested `buildCacheKey`.
- **Pure logic, isolated and tested.** The fuzzy matcher
  (`useFuzzy.ts` — subsequence matching with consecutive / word-boundary /
  prefix scoring and highlight-index output) and the recent-history transform
  (`useRecent.ts`) are pure functions with their own Vitest suites. State lives
  in small module-level composables (`useCommandPalette`, `useRecent`).
- **URL as the single source of truth.** All browse filters (genres, type,
  status, sort preset) and the open detail drawer (`?a=<id>`) live in the query
  string (`composables/useBrowse.ts`), so the back button restores the exact
  view and every result page and open title is a shareable deep link.
- **Route-aware drawer.** `AnimeDrawer` watches `?a=<id>`, fetches the full
  record, slides in over any page, records the view to history, lazy-loads
  recommendations, traps focus, locks body scroll without layout shift, and
  closes by stripping the query param.
- **Explicit states everywhere.** Loading skeletons sized to their content (no
  CLS), empty states that teach the space and offer the keyboard way out, and
  error states with a retry path — for the grid, every rail, the palette search,
  the drawer, and the detail page.
- **Accessibility.** Real `combobox`/`listbox`/`option` roles with
  `aria-activedescendant`, `aria-selected`, and `aria-pressed`; an architectural
  2px offset focus ring (never bare `outline: none`); `alt` text; sufficient
  contrast; and a genuine static fallback under `prefers-reduced-motion`.

## Project structure

```
types/jikan.ts                 Typed Jikan v4 interfaces (+ recommendations, filters)
composables/
  useJikan.ts                  Typed fetchers + cache + rate guard (6 endpoints)
  useFuzzy.ts                  Pure fuzzy matcher + ranker + highlighter  (tested)
  useBrowse.ts                 URL-driven filter/pagination engine
  useCommandPalette.ts         Palette open/close store
  useCommands.ts               Static command + genre-jump registry
  useGlobalShortcuts.ts        ⌘K / "/" global key handling
  useRecent.ts                 localStorage recent history             (tested)
  useScrollLock.ts             Body scroll lock (ref-counted, no CLS)
  useMediaQuery.ts             Reactive matchMedia (reduced-motion etc.)
  useDebounce.ts · useFormat.ts
components/
  palette/CommandPalette.vue   The ⌘K centerpiece
  anime/AnimeDrawer.vue        Route-aware detail drawer
  anime/{AnimeCard,AnimeRail,FilterBar,PageNav,AnimeGridSkeleton}.vue
  chrome/{AppHeader,AppFooter}.vue
  states/{EmptyState,ErrorState}.vue
  ui/AppIcon.vue               Inline-SVG icon set (zero icon-lib weight)
pages/
  index.vue                    Home: product-as-hero + featured + rails
  browse.vue                   Instant-filter dense grid
  anime/[id].vue               Full standalone detail page
app.vue · error.vue            Shell (mounts palette + drawer) + error boundary
test/                          Vitest: fuzzy, recent, formatters, cache key, debounce
```

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm test             # vitest run (unit tests)
npm run typecheck    # nuxi typecheck (strict)
npm run generate     # static build -> .output/public
```

## Testing & CI

Unit tests ([Vitest](https://vitest.dev)) cover the pure logic where bugs hide:

- `test/fuzzy.test.ts` — the matcher's subsequence rules, scoring order
  (contiguous > scattered, word-start > mid-word, shorter > longer), ranking
  stability, and the highlight segmenter (round-trips the original string).
- `test/recent.test.ts` — the recent-history transform: prepend, de-dupe by id,
  cap, immutability, field updates on re-add.
- `test/useFormat.test.ts` — score / year / count / episode formatting and
  missing-value fallbacks.
- `test/cache-key.test.ts` — `buildCacheKey` stable ordering and param cleaning.
- `test/useDebounce.test.ts` — debounce timing with fake timers.

GitHub Actions (`.github/workflows/ci.yml`) runs the strict typecheck and the
unit tests on every push and pull request.

## Deploy (GitHub Pages)

Configured for a GitHub Pages **project page**: `app.baseURL` is
`/anime-product/` and Nitro uses the `github-pages` preset (emitting `.nojekyll`
and a `404.html` SPA fallback). `npm run generate` produces a ready-to-publish
`.output/public`, deployed to the `gh-pages` branch.

## Going further

- **Nitro server-route proxy.** A `server/api/anime/[...].ts` proxy would move
  rate-limiting and caching server-side, hide the upstream, and unlock SSR for
  crawlable, fast-first-paint detail pages — the `useJikan` seam is already the
  right place to swap the base.
- **Palette command modes.** A `>` prefix for command-only mode and a `#` prefix
  to scope to genres (Raycast-style), plus per-result actions (open in new tab,
  copy link) on `⌘⏎`.

---

Data and imagery © MyAnimeList, served via Jikan. A portfolio work sample, not
affiliated with either.
