<script setup lang="ts">
/**
 * ⌘K Command Palette — the centerpiece.
 *
 * One overlay that does four jobs at once, all keyboard-first:
 *   1. Run commands (navigate, browse modes) — local, instant.
 *   2. Jump to a genre — local, instant.
 *   3. Search anime live — debounced network, optimistic, with its own
 *      loading / empty / error states inside the list.
 *   4. Re-open something you just viewed (Recent) — local, instant.
 *
 * Everything is fuzzy-ranked (composables/useFuzzy.ts) and fully navigable with
 * the keyboard: ↑/↓ move (wrapping), ⏎ runs the selection, Esc closes, the
 * focus is trapped, and the active row always scrolls into view. The matched
 * characters of each label are highlighted.
 *
 * Motion: a controlled spring on open (scale + lift), honored against
 * prefers-reduced-motion (the global CSS guard collapses it to an instant
 * appearance). Transform/opacity only.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCommandPalette } from '~/composables/useCommandPalette'
import { useCommands, type Command } from '~/composables/useCommands'
import { useJikan } from '~/composables/useJikan'
import { useDebouncedRef } from '~/composables/useDebounce'
import { useRecent, type RecentItem } from '~/composables/useRecent'
import { useScrollLock } from '~/composables/useScrollLock'
import { fuzzyRank, highlightSegments } from '~/composables/useFuzzy'
import { useFormat } from '~/composables/useFormat'
import type { Anime, Genre } from '~/types/jikan'

const { isOpen, seedQuery, close } = useCommandPalette()
const router = useRouter()
const { searchAnime, getGenres } = useJikan()
const { recent } = useRecent()
const { score: fmtScore, year: fmtYear } = useFormat()

useScrollLock(isOpen)

// ── Genre catalogue (loaded once, lazily on first open) ───────────────────
const genres = ref<Genre[]>([])
let genresRequested = false
async function ensureGenres() {
  if (genresRequested) return
  genresRequested = true
  try {
    const res = await getGenres()
    genres.value = res.data
  } catch {
    genresRequested = false // allow a retry on the next open
  }
}
const { allCommands } = useCommands(() => genres.value)

// ── Query + debounced live search ─────────────────────────────────────────
const query = ref('')
const debounced = useDebouncedRef(query, 280)

type SearchState = 'idle' | 'loading' | 'ready' | 'error'
const searchState = ref<SearchState>('idle')
const searchResults = ref<Anime[]>([])
let searchToken = 0

/**
 * Run the live search for a term. Extracted so the in-list error state can
 * retry the exact same query without waiting for another keystroke. The token
 * guard keeps a stale response (or a stale retry) from overwriting a newer one.
 */
async function runSearch(rawTerm: string) {
  const term = rawTerm.trim()
  if (term.length < 2) {
    searchResults.value = []
    searchState.value = 'idle'
    return
  }
  const token = ++searchToken
  searchState.value = 'loading'
  try {
    const res = await searchAnime({ q: term, limit: 8, order_by: 'members', sort: 'desc' })
    if (token !== searchToken) return // a newer keystroke superseded us
    searchResults.value = res.data
    searchState.value = 'ready'
  } catch {
    if (token !== searchToken) return
    searchResults.value = []
    searchState.value = 'error'
  }
}

watch(debounced, (q) => runSearch(q))

/** Retry the current query (from the in-list error state). */
function retrySearch() {
  runSearch(query.value)
}

// ── Result model ──────────────────────────────────────────────────────────
// Every navigable row is normalised to a `Row` so selection/keyboard handling
// is uniform regardless of the row's origin.
interface Row {
  key: string
  group: string
  icon: string
  title: string
  /** Matched-char indices for highlighting the title. */
  indices: number[]
  subtitle?: string
  hint?: string
  /** A small leading thumbnail (anime rows). */
  image?: string | null
  perform: () => void
}

function animeRow(a: Pick<Anime, 'mal_id' | 'title' | 'images' | 'score' | 'type' | 'year' | 'aired'>, group: string, indices: number[]): Row {
  return {
    key: `anime-${group}-${a.mal_id}`,
    group,
    icon: 'play',
    title: a.title,
    indices,
    subtitle: [a.type, fmtYear(a)].filter((x) => x && x !== '—').join(' · ') || undefined,
    hint: a.score ? `★ ${fmtScore(a.score)}` : undefined,
    image: a.images?.jpg?.image_url ?? null,
    perform: () => openAnime(a.mal_id),
  }
}

function commandRow(c: Command, indices: number[]): Row {
  return {
    key: c.id,
    group: c.group,
    icon: c.icon,
    title: c.title,
    indices,
    hint: c.hint,
    perform: () => {
      close()
      c.perform()
    },
  }
}

function recentRow(r: RecentItem, indices: number[]): Row {
  return {
    key: `recent-${r.mal_id}`,
    group: 'Recent',
    icon: 'clock',
    title: r.title,
    indices,
    subtitle: [r.type, r.year].filter((x) => x && x !== '—').join(' · ') || undefined,
    hint: r.score ? `★ ${r.score.toFixed(2)}` : undefined,
    image: r.image,
    perform: () => openAnime(r.mal_id),
  }
}

function openAnime(id: number) {
  close()
  router.push({ path: router.currentRoute.value.path, query: { ...router.currentRoute.value.query, a: String(id) } })
}

// ── Grouped, fuzzy-ranked rows ────────────────────────────────────────────
const q = computed(() => query.value.trim())

const rows = computed<Row[]>(() => {
  const term = q.value
  const out: Row[] = []

  // Empty query → the launcher view: recent + the full command menu.
  if (term === '') {
    for (const r of recent.value) out.push(recentRow(r, []))
    for (const c of allCommands.value) out.push(commandRow(c, []))
    return out
  }

  // Recent (fuzzy on title).
  for (const { item, indices } of fuzzyRank(term, recent.value, (r) => r.title)) {
    out.push(recentRow(item, indices))
  }

  // Commands + genres (fuzzy on title + keywords; highlight the title only).
  const cmdRanked = fuzzyRank(term, allCommands.value, (c) => `${c.title} ${c.keywords ?? ''}`)
  for (const { item } of cmdRanked) {
    // Re-rank against the visible title so the highlight lines up.
    const titleMatch = fuzzyRank(term, [item], (c) => c.title)[0]
    out.push(commandRow(item, titleMatch?.indices ?? []))
  }

  // Live anime search results (already server-ranked by popularity; we keep
  // that order and just compute highlight indices against the title).
  for (const a of searchResults.value) {
    const m = fuzzyRank(term, [a], (x) => x.title)[0]
    out.push(animeRow(a, 'Anime', m?.indices ?? []))
  }

  return out
})

/** Rows grouped in display order, for section headers. */
const GROUP_ORDER = ['Recent', 'Anime', 'Navigation', 'Browse', 'Genres']
const groupedRows = computed(() => {
  const map = new Map<string, Row[]>()
  for (const r of rows.value) {
    if (!map.has(r.group)) map.set(r.group, [])
    map.get(r.group)!.push(r)
  }
  return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, rows: map.get(g)! }))
})

/** A flat list mirroring render order, for keyboard indexing. */
const flatRows = computed(() => groupedRows.value.flatMap((g) => g.rows))

// ── Selection + keyboard navigation ───────────────────────────────────────
const selected = ref(0)
const listEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

// Reset selection whenever the result set changes (e.g. results arrive).
watch(flatRows, () => {
  if (selected.value >= flatRows.value.length) selected.value = 0
})
watch(q, () => {
  selected.value = 0
})

function move(delta: number) {
  const n = flatRows.value.length
  if (n === 0) return
  selected.value = (selected.value + delta + n) % n
  scrollSelectedIntoView()
}

function scrollSelectedIntoView() {
  nextTick(() => {
    const el = listEl.value?.querySelector<HTMLElement>('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function runSelected() {
  flatRows.value[selected.value]?.perform()
}

function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      move(-1)
      break
    case 'Home':
      e.preventDefault()
      selected.value = 0
      scrollSelectedIntoView()
      break
    case 'End':
      e.preventDefault()
      selected.value = Math.max(0, flatRows.value.length - 1)
      scrollSelectedIntoView()
      break
    case 'Enter':
      e.preventDefault()
      runSelected()
      break
    case 'Escape':
      e.preventDefault()
      close()
      break
    case 'Tab':
      // Keep focus trapped on the input (the list is driven by arrows).
      e.preventDefault()
      break
  }
}

function selectRow(globalIndex: number) {
  selected.value = globalIndex
}

/** Map a (group, local) position to the flat index for hover/click. */
function flatIndexOf(row: Row): number {
  return flatRows.value.indexOf(row)
}

// ── Open / close lifecycle ────────────────────────────────────────────────
watch(isOpen, (open) => {
  if (open) {
    ensureGenres()
    query.value = seedQuery.value
    selected.value = 0
    nextTick(() => {
      inputEl.value?.focus()
      inputEl.value?.select()
    })
  } else {
    // Clear on close so the next open starts clean.
    query.value = ''
    searchResults.value = []
    searchState.value = 'idle'
  }
})

const showSearchStatus = computed(
  () => q.value.length >= 2 && searchState.value === 'loading',
)
/** The live search failed AND nothing local matched — the list is bare. */
const isSearchError = computed(() => searchState.value === 'error')
/** Genuine no-results: a settled (non-error, non-loading) empty set. */
const isEmpty = computed(
  () =>
    flatRows.value.length === 0 &&
    searchState.value !== 'loading' &&
    searchState.value !== 'error',
)
</script>

<template>
  <Teleport to="body">
    <Transition name="palette-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]"
        @mousedown.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/55 backdrop-blur-[2px]" aria-hidden="true" />

        <!-- Panel -->
        <div
          class="palette-panel relative w-full max-w-[640px] overflow-hidden rounded-xl border border-line-strong bg-overlay shadow-palette"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          @keydown="onKeydown"
        >
          <!-- Search input -->
          <div class="flex items-center gap-3 border-b border-line px-4">
            <AppIcon name="search" :size="18" class="text-fg-faint" />
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              role="combobox"
              :aria-expanded="flatRows.length > 0"
              :aria-controls="flatRows.length > 0 ? 'palette-list' : undefined"
              :aria-activedescendant="flatRows[selected] ? `row-${flatRows[selected]!.key}` : undefined"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="Search anime, jump to a genre, run a command…"
              class="h-14 w-full bg-transparent text-[0.95rem] text-fg placeholder:text-fg-faint focus:outline-none"
            />
            <div
              v-if="showSearchStatus"
              class="flex items-center gap-1.5 text-2xs text-fg-faint"
              aria-live="polite"
            >
              <AppIcon name="loader" :size="13" class="animate-spin" />
              <span>Searching</span>
            </div>
            <kbd v-else class="kbd">esc</kbd>
          </div>

          <!-- Results. tabindex makes the scroll region keyboard-operable
               (axe scrollable-region-focusable); arrow keys still drive
               selection from the input above. -->
          <div
            ref="listEl"
            tabindex="0"
            class="max-h-[min(420px,52vh)] overflow-y-auto overscroll-contain p-2 focus:outline-none"
          >
            <!-- Empty -->
            <div
              v-if="isEmpty"
              class="flex flex-col items-center gap-2 px-4 py-12 text-center"
            >
              <AppIcon name="inbox" :size="22" class="text-fg-faint" />
              <p class="text-sm text-fg-subtle">
                No matches for
                <span class="font-medium text-fg">“{{ q }}”</span>
              </p>
              <p class="text-xs text-fg-faint">Try a shorter query or a genre name.</p>
            </div>

            <!-- Search error + retry. Shown when the live anime query fails; any
                 local command/genre/recent matches still render below it, so a
                 dropped network call never blanks the whole palette. -->
            <div
              v-else-if="isSearchError"
              class="mx-1 mb-2 mt-1 flex items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2.5"
              role="alert"
            >
              <AppIcon name="alert" :size="16" class="shrink-0 text-warn" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-fg">Search request failed</p>
                <p class="text-xs text-fg-subtle">Jikan rate-limits aggressively — give it a second.</p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border border-line bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                @click="retrySearch"
              >
                Retry
              </button>
            </div>

            <!-- Loading skeleton (first search, before any results) -->
            <div v-else-if="searchState === 'loading' && flatRows.length === 0" class="space-y-1 px-1 py-1">
              <div
                v-for="i in 5"
                :key="i"
                class="flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                <div class="skeleton h-9 w-9 rounded-md" />
                <div class="flex-1 space-y-1.5">
                  <div class="skeleton h-3 rounded" :style="{ width: `${60 - i * 6}%` }" />
                  <div class="skeleton h-2.5 w-1/4 rounded" />
                </div>
              </div>
            </div>

            <!-- Grouped result rows.

                 ARIA ownership chain: a dedicated role="listbox" wraps ONLY the
                 groups (no empty/error/loading chrome leaks into it). Each section
                 is a role="group" labelled by its header; the option rows are
                 direct children of that group. This keeps the required
                 listbox → group → option hierarchy valid (no orphaned options, no
                 nested generic list between them). The header is a plain <div>
                 (not an <h3>/<ul>) so it carries no implicit list/heading
                 semantics that would break the group. -->
            <div
              v-if="flatRows.length > 0"
              id="palette-list"
              role="listbox"
              aria-label="Results"
            >
              <div
                v-for="g in groupedRows"
                :key="g.group"
                role="group"
                :aria-labelledby="`palette-group-${g.group}`"
                class="mb-1 last:mb-0"
              >
                <div
                  :id="`palette-group-${g.group}`"
                  class="px-3 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint"
                >
                  {{ g.group }}
                </div>
                <div
                  v-for="row in g.rows"
                  :id="`row-${row.key}`"
                  :key="row.key"
                  role="option"
                  :aria-selected="flatIndexOf(row) === selected"
                  :data-selected="flatIndexOf(row) === selected"
                  class="group/row flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-100"
                  :class="
                    flatIndexOf(row) === selected
                      ? 'bg-accent-bg text-fg'
                      : 'text-fg-muted hover:bg-bg-subtle'
                  "
                  @mousemove="selectRow(flatIndexOf(row))"
                  @click="row.perform()"
                >
                  <!-- Leading: thumbnail or icon tile -->
                  <span
                    v-if="row.image"
                    class="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-bg-subtle ring-1 ring-line"
                  >
                    <img
                      :src="row.image"
                      :alt="''"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover"
                    />
                  </span>
                  <span
                    v-else
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-subtle ring-1 ring-line"
                    :class="flatIndexOf(row) === selected ? 'text-accent' : 'text-fg-subtle'"
                  >
                    <AppIcon :name="(row.icon as any)" :size="16" />
                  </span>

                  <!-- Title (highlighted) + subtitle -->
                  <span class="min-w-0 flex-1">
                    <span class="block truncate">
                      <template v-if="row.indices.length">
                        <span
                          v-for="(seg, i) in highlightSegments(row.title, row.indices)"
                          :key="i"
                          :class="seg.match ? 'match-hl' : ''"
                        >{{ seg.text }}</span>
                      </template>
                      <template v-else>{{ row.title }}</template>
                    </span>
                    <span
                      v-if="row.subtitle"
                      class="block truncate text-xs"
                      :class="flatIndexOf(row) === selected ? 'text-fg-muted' : 'text-fg-faint'"
                    >
                      {{ row.subtitle }}
                    </span>
                  </span>

                  <!-- Hint / shortcut. On the selected row the background shifts
                       to accent-bg, so faint ink dips under AA — lift it. -->
                  <span
                    v-if="row.hint"
                    class="shrink-0 font-mono text-2xs"
                    :class="flatIndexOf(row) === selected ? 'text-fg-muted' : 'text-fg-faint'"
                  >
                    {{ row.hint }}
                  </span>
                  <AppIcon
                    name="corner-down-left"
                    :size="14"
                    class="shrink-0 text-accent opacity-0 transition-opacity"
                    :class="flatIndexOf(row) === selected ? 'opacity-100' : ''"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer legend -->
          <div
            class="flex items-center justify-between gap-4 border-t border-line bg-bg-subtle/40 px-4 py-2 text-2xs text-fg-faint"
          >
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1.5">
                <kbd class="kbd"><AppIcon name="arrow-up-down" :size="11" /></kbd>
                navigate
              </span>
              <span class="flex items-center gap-1.5">
                <kbd class="kbd"><AppIcon name="corner-down-left" :size="11" /></kbd>
                open
              </span>
            </div>
            <span class="flex items-center gap-1.5">
              <kbd class="kbd"><AppIcon name="command" :size="11" /></kbd>
              <span>Senkō</span>
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Overlay fade. */
.palette-fade-enter-active {
  transition: opacity 0.18s ease-out;
}
.palette-fade-leave-active {
  transition: opacity 0.14s ease-in;
}
.palette-fade-enter-from,
.palette-fade-leave-to {
  opacity: 0;
}

/* The controlled spring on the panel itself (scale + lift). Reduced-motion is
   handled by the global guard in main.css, which collapses the duration. */
.palette-fade-enter-active .palette-panel {
  animation: palette-pop 0.28s cubic-bezier(0.22, 1.18, 0.36, 1);
}
@keyframes palette-pop {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
