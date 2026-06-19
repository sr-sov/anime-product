import { ref, type Ref } from 'vue'

/**
 * Recently-viewed history — a small localStorage-backed list that powers the
 * "Recent" group in the command palette and the home rail. Capped, de-duped,
 * most-recent-first. Stored as a slim record so the palette can render without
 * a network round-trip.
 */

export interface RecentItem {
  mal_id: number
  title: string
  image: string | null
  score: number | null
  type: string | null
  year: string
}

const STORAGE_KEY = 'senko:recent'
const MAX = 8

/** Module-level ref so every consumer sees the same list in one session. */
const recent: Ref<RecentItem[]> = ref([])
let hydrated = false

/** The pure list transform — exported so it can be unit-tested in isolation. */
export function addToRecentList(
  list: readonly RecentItem[],
  item: RecentItem,
  max = MAX,
): RecentItem[] {
  const next = [item, ...list.filter((r) => r.mal_id !== item.mal_id)]
  return next.slice(0, max)
}

function read(): RecentItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RecentItem[]) : []
  } catch {
    return []
  }
}

function persist(list: RecentItem[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* private mode / quota — recent history is best-effort, ignore. */
  }
}

export function useRecent() {
  if (!hydrated && typeof window !== 'undefined') {
    recent.value = read()
    hydrated = true
  }

  function push(item: RecentItem) {
    recent.value = addToRecentList(recent.value, item)
    persist(recent.value)
  }

  function clear() {
    recent.value = []
    persist(recent.value)
  }

  return { recent, push, clear }
}
