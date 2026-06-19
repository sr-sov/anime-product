import type {
  Anime,
  AnimeQuery,
  Genre,
  JikanListResponse,
  JikanSingleResponse,
  RecommendationEntry,
} from '~/types/jikan'

/**
 * useJikan — a thin, typed client for the Jikan v4 API.
 *
 * Responsibilities:
 *  - typed fetchers for the four endpoints this app uses,
 *  - a tiny in-memory response cache (per session) to avoid refetching,
 *  - a client-side request-rate guard so we never burst past Jikan's
 *    documented limits (~3 req/s, 60/min). Debouncing of user input is
 *    handled separately (see `useDebounce`) — this guard is the backstop.
 *
 * All requests run with `$fetch` so the app works as a static SPA: the data
 * is fetched in the browser at runtime, no Nitro server route involved.
 */

// ---- Module-level singletons (shared across all callers in a session) ----

const cache = new Map<string, unknown>()

/**
 * In-flight request de-duplication. When two surfaces ask for the same key
 * before the first resolves (e.g. the home featured spotlight and the Top rail
 * both hit /top/anime?page=1 on load), they share ONE network promise instead
 * of racing two requests through the rate limiter — which is what inflated TTI
 * with 429 refetch churn on the near-empty shell.
 */
const inflight = new Map<string, Promise<unknown>>()

/**
 * Build a stable cache key from a path plus sorted, cleaned query params.
 * Pure and exported so the keying logic can be unit-tested in isolation.
 */
export function buildCacheKey(
  path: string,
  params?: Record<string, unknown>,
): string {
  if (!params) return path
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
  const qs = entries.map(([k, v]) => `${k}=${String(v)}`).join('&')
  return qs ? `${path}?${qs}` : path
}

/** Minimum spacing between outbound requests. ~3 req/s -> ~334ms; we pad it. */
const MIN_REQUEST_SPACING_MS = 360
let lastRequestAt = 0
let queueTail: Promise<void> = Promise.resolve()

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Serialize outbound requests and space them out. Each call chains onto the
 * previous one, so concurrent callers are throttled rather than dropped.
 */
function scheduleSlot(): Promise<void> {
  const run = queueTail.then(async () => {
    const now = Date.now()
    const wait = Math.max(0, lastRequestAt + MIN_REQUEST_SPACING_MS - now)
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
  })
  // Keep the chain alive even if a slot rejects (it won't, but be safe).
  queueTail = run.catch(() => undefined)
  return run
}

export function useJikan() {
  const base = useRuntimeConfig().public.jikanBase as string

  /**
   * Core request: rate-guarded, cached, typed. Throws on non-2xx so callers
   * (and useAsyncData) can render an error state.
   */
  async function request<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const key = buildCacheKey(path, params)
    if (cache.has(key)) {
      return cache.get(key) as T
    }
    // De-dup: if an identical request is already in flight, await it instead of
    // issuing a second one.
    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>

    const run = (async () => {
      await scheduleSlot()

      const result = await $fetch<T>(`${base}${path}`, {
        // $fetch serializes params and drops undefined values for us.
        query: params,
        // Retry on transient/rate-limited failures with exponential backoff,
        // honoring Retry-After when Jikan sends it. This keeps a 429 from
        // turning into a tight refetch loop that inflates TTI.
        retry: 3,
        retryStatusCodes: [425, 429, 500, 502, 503, 504],
        retryDelay: (ctx) => {
          const ra = Number(ctx.response?.headers?.get('retry-after'))
          if (Number.isFinite(ra) && ra > 0) return Math.min(ra * 1000, 5_000)
          return 800
        },
        timeout: 12_000,
      })

      cache.set(key, result)
      return result
    })()

    inflight.set(key, run)
    try {
      return await run
    } finally {
      inflight.delete(key)
    }
  }

  // ---------------------------------------------------------------------
  // Public fetchers
  // ---------------------------------------------------------------------

  /** Popular anime feed: GET /top/anime?page=N */
  function getTopAnime(page = 1): Promise<JikanListResponse<Anime>> {
    return request<JikanListResponse<Anime>>('/top/anime', {
      page,
      limit: 24,
      sfw: true,
    })
  }

  /**
   * Search / filtered listing: GET /anime?q=&page=&genres=
   * Used for both the search box and the genre filter (Jikan supports both
   * on the same endpoint), so the discovery page has one code path.
   */
  function searchAnime(
    query: AnimeQuery,
  ): Promise<JikanListResponse<Anime>> {
    const params: Record<string, unknown> = {
      page: query.page ?? 1,
      limit: query.limit ?? 24,
      sfw: query.sfw ?? true,
    }
    if (query.q) params.q = query.q
    if (query.genres) params.genres = query.genres
    if (query.type) params.type = query.type
    if (query.status) params.status = query.status
    if (query.order_by) params.order_by = query.order_by
    if (query.sort) params.sort = query.sort
    if (typeof query.min_score === 'number') params.min_score = query.min_score
    return request<JikanListResponse<Anime>>('/anime', params)
  }

  /** Full detail: GET /anime/{id}/full */
  function getAnimeById(id: number | string): Promise<JikanSingleResponse<Anime>> {
    return request<JikanSingleResponse<Anime>>(`/anime/${id}/full`)
  }

  /** Genre list for the filter: GET /genres/anime */
  function getGenres(): Promise<JikanListResponse<Genre>> {
    return request<JikanListResponse<Genre>>('/genres/anime')
  }

  /** This season's currently-airing titles: GET /seasons/now */
  function getSeasonNow(page = 1): Promise<JikanListResponse<Anime>> {
    return request<JikanListResponse<Anime>>('/seasons/now', {
      page,
      limit: 24,
      sfw: true,
    })
  }

  /** "More like this": GET /anime/{id}/recommendations */
  function getRecommendations(
    id: number | string,
  ): Promise<JikanListResponse<RecommendationEntry>> {
    return request<JikanListResponse<RecommendationEntry>>(
      `/anime/${id}/recommendations`,
    )
  }

  return {
    getTopAnime,
    searchAnime,
    getAnimeById,
    getGenres,
    getSeasonNow,
    getRecommendations,
  }
}
