/**
 * Fuzzy matching — the ranking core of the command palette.
 *
 * A subsequence matcher (every query character must appear in order) with a
 * scoring model tuned for "type a few letters, get the obvious thing first":
 *
 *  - consecutive matches are rewarded (so "att" beats scattered a..t..t),
 *  - matches at a word boundary (start, after space/-/_/:/.) score higher,
 *  - an earlier first match outranks a later one,
 *  - shorter targets win ties (a 6-char title beats a 60-char one).
 *
 * The function returns the matched character indices so the UI can highlight
 * exactly what the user typed. Everything here is pure and synchronous, which
 * is why it carries its own unit suite (test/fuzzy.test.ts).
 */

export interface FuzzyResult {
  /** Total score; higher is better. `-Infinity` when there is no match. */
  score: number
  /** Indices in `target` that matched, ascending. Empty for an empty query. */
  indices: number[]
}

/** True at a word boundary: index 0, or just after a separator. */
function isBoundary(target: string, i: number): boolean {
  if (i === 0) return true
  const prev = target[i - 1]!
  return prev === ' ' || prev === '-' || prev === '_' || prev === ':' || prev === '.' || prev === '/'
}

/**
 * Score `query` against `target`. Case-insensitive. An empty query matches
 * anything with score 0 (so an empty palette query keeps the natural order).
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult {
  const q = query.trim().toLowerCase()
  if (q === '') return { score: 0, indices: [] }

  const t = target.toLowerCase()
  if (q.length > t.length) return { score: -Infinity, indices: [] }

  const indices: number[] = []
  let score = 0
  let ti = 0
  let prevMatchIndex = -2 // so the first match is never "consecutive"

  for (let qi = 0; qi < q.length; qi++) {
    const qc = q[qi]!
    let found = -1
    while (ti < t.length) {
      if (t[ti] === qc) {
        found = ti
        break
      }
      ti++
    }
    if (found === -1) return { score: -Infinity, indices: [] }

    // Base point for the match.
    score += 1

    // Reward an exact-case match (the user typed the casing on purpose).
    if (target[found] === query[qi]) score += 1

    // Strong reward for landing on a word boundary.
    if (isBoundary(t, found)) score += 8

    // Reward a run of adjacent matches; the longer the run, the more it pays.
    if (found === prevMatchIndex + 1) score += 5

    // Gentle penalty for the gap we had to skip to reach this char.
    score -= Math.min(found - (prevMatchIndex + 1), 6) * 0.5

    indices.push(found)
    prevMatchIndex = found
    ti = found + 1
  }

  // Reward matching near the start of the target.
  score += Math.max(0, 6 - indices[0]!) * 0.5

  // Break ties toward shorter, denser targets.
  score -= t.length * 0.02

  return { score, indices }
}

/** Convenience: did `query` match `target` at all? */
export function fuzzyTest(query: string, target: string): boolean {
  return fuzzyMatch(query, target).score !== -Infinity
}

/**
 * Rank a list by fuzzy score against `query`, keeping only matches.
 * `key` extracts the searchable string from each item. Stable for equal
 * scores (preserves input order), so a pre-sorted feed stays sensible.
 */
export function fuzzyRank<T>(
  query: string,
  items: readonly T[],
  key: (item: T) => string,
): Array<{ item: T; score: number; indices: number[] }> {
  const scored = items.map((item, i) => {
    const { score, indices } = fuzzyMatch(query, key(item))
    return { item, score, indices, i }
  })
  return scored
    .filter((s) => s.score !== -Infinity)
    .sort((a, b) => (b.score - a.score) || (a.i - b.i))
    .map(({ item, score, indices }) => ({ item, score, indices }))
}

/**
 * Split a string into highlighted / plain segments given matched indices.
 * Used by the palette and search results to render the matched run. Pure, so
 * it is unit-tested alongside the matcher.
 */
export interface HighlightSegment {
  text: string
  match: boolean
}

export function highlightSegments(
  target: string,
  indices: number[],
): HighlightSegment[] {
  if (indices.length === 0) return [{ text: target, match: false }]
  const set = new Set(indices)
  const segments: HighlightSegment[] = []
  let buffer = ''
  let bufferMatch = set.has(0)

  for (let i = 0; i < target.length; i++) {
    const isMatch = set.has(i)
    if (isMatch === bufferMatch) {
      buffer += target[i]
    } else {
      if (buffer) segments.push({ text: buffer, match: bufferMatch })
      buffer = target[i]!
      bufferMatch = isMatch
    }
  }
  if (buffer) segments.push({ text: buffer, match: bufferMatch })
  return segments
}
