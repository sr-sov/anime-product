import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJikan } from '~/composables/useJikan'
import type { Anime, AnimeQuery } from '~/types/jikan'

/**
 * Browse-page data engine.
 *
 * Reads the filter state from the URL query (so every view is shareable and the
 * back button restores filters), turns it into a Jikan request, and exposes a
 * clean { state, results, pagination } surface plus setters that write back to
 * the URL. Filters are debounced upstream by the page's input; this composable
 * fetches on any committed change and cancels stale responses with a token.
 *
 * Special "sort" presets (top / season) map to dedicated endpoints; otherwise
 * it uses the unified /anime listing with genre/type/status filters.
 */

export type SortPreset = '' | 'top' | 'season'

export interface BrowseFilters {
  genres: string // comma-separated mal_ids
  type: string // tv | movie | ova | special | ona | music
  status: string // airing | complete | upcoming
  sort: SortPreset
  page: number
}

function readFilters(route: ReturnType<typeof useRoute>): BrowseFilters {
  const q = route.query
  const str = (v: unknown) => (Array.isArray(v) ? v[0] : v) ?? ''
  const page = Number(str(q.page))
  return {
    genres: String(str(q.genres)),
    type: String(str(q.type)),
    status: String(str(q.status)),
    sort: (String(str(q.sort)) as SortPreset) || '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function useBrowse() {
  const route = useRoute()
  const router = useRouter()
  const { searchAnime, getTopAnime, getSeasonNow } = useJikan()

  const filters = computed(() => readFilters(route))

  type State = 'loading' | 'ready' | 'error' | 'empty'
  const state = ref<State>('loading')
  const results = ref<Anime[]>([])
  const totalPages = ref(1)
  const hasNext = ref(false)
  let token = 0

  async function fetchPage() {
    const f = filters.value
    const mine = ++token
    state.value = 'loading'
    try {
      let data: Anime[]
      let last = 1
      let next = false

      if (f.sort === 'top' && !f.genres && !f.type && !f.status) {
        const res = await getTopAnime(f.page)
        data = res.data
        last = res.pagination.last_visible_page
        next = res.pagination.has_next_page
      } else if (f.sort === 'season' && !f.genres && !f.type && !f.status) {
        const res = await getSeasonNow(f.page)
        data = res.data
        last = res.pagination.last_visible_page
        next = res.pagination.has_next_page
      } else {
        const query: AnimeQuery = {
          page: f.page,
          limit: 24,
          genres: f.genres || undefined,
          type: f.type || undefined,
          status: f.status || undefined,
          order_by: f.sort === 'top' ? 'score' : 'members',
          sort: 'desc',
        }
        const res = await searchAnime(query)
        data = res.data
        last = res.pagination.last_visible_page
        next = res.pagination.has_next_page
      }

      if (mine !== token) return
      results.value = data
      totalPages.value = Math.max(1, last)
      hasNext.value = next
      state.value = data.length === 0 ? 'empty' : 'ready'
    } catch {
      if (mine !== token) return
      results.value = []
      state.value = 'error'
    }
  }

  // Refetch whenever the committed filters change. Browse is an interactive,
  // URL-driven surface that is NOT prerendered (only `/` + detail routes are),
  // so the fetch is client-only: the server paints the skeleton, the client
  // hydrates and loads. This avoids an SSR fetch whose ref-based result would
  // not survive into the payload (the side-effect-ref hydration trap).
  if (import.meta.client) {
    watch(filters, fetchPage, { immediate: true, deep: true })
  }

  // ── Setters write through the URL (single source of truth) ───────────────
  function patchQuery(patch: Record<string, string | undefined>, resetPage = true) {
    const q: Record<string, string> = {}
    // Preserve the drawer param if present.
    if (route.query.a) q.a = String(route.query.a)
    const base = filters.value
    const merged = {
      genres: base.genres,
      type: base.type,
      status: base.status,
      sort: base.sort,
      ...patch,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) q[k] = String(v)
    }
    if (!resetPage && base.page > 1) q.page = String(base.page)
    router.push({ path: '/browse', query: q })
  }

  function toggleGenre(id: number) {
    const set = new Set(filters.value.genres.split(',').filter(Boolean))
    const key = String(id)
    set.has(key) ? set.delete(key) : set.add(key)
    patchQuery({ genres: [...set].join(',') })
  }

  function setType(type: string) {
    patchQuery({ type: filters.value.type === type ? '' : type })
  }

  function setStatus(status: string) {
    patchQuery({ status: filters.value.status === status ? '' : status })
  }

  function setSort(sort: string) {
    const next = (sort as SortPreset) || ''
    patchQuery({ sort: filters.value.sort === next ? '' : next })
  }

  function clearAll() {
    patchQuery({ genres: '', type: '', status: '', sort: '' })
  }

  function setPage(page: number) {
    const q: Record<string, string> = {}
    if (route.query.a) q.a = String(route.query.a)
    const f = filters.value
    if (f.genres) q.genres = f.genres
    if (f.type) q.type = f.type
    if (f.status) q.status = f.status
    if (f.sort) q.sort = f.sort
    if (page > 1) q.page = String(page)
    router.push({ path: '/browse', query: q })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeFilterCount = computed(() => {
    const f = filters.value
    return (
      (f.genres ? f.genres.split(',').filter(Boolean).length : 0) +
      (f.type ? 1 : 0) +
      (f.status ? 1 : 0) +
      (f.sort ? 1 : 0)
    )
  })

  const selectedGenreIds = computed(
    () => new Set(filters.value.genres.split(',').filter(Boolean).map(Number)),
  )

  return {
    filters,
    state,
    results,
    totalPages,
    hasNext,
    activeFilterCount,
    selectedGenreIds,
    fetchPage,
    toggleGenre,
    setType,
    setStatus,
    setSort,
    setPage,
    clearAll,
  }
}
