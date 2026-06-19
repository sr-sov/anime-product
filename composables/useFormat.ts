import type { Anime } from '~/types/jikan'

/**
 * Small presentation helpers shared by cards and the detail page. Kept as a
 * composable (rather than scattered inline) so formatting stays consistent.
 */
export function useFormat() {
  /** "8.74" or "—" when a score is missing (unaired / unrated). */
  function score(value: number | null | undefined): string {
    return typeof value === 'number' ? value.toFixed(2) : '—'
  }

  /** Prefer the explicit `year`, else fall back to the aired-from year. */
  function year(anime: Pick<Anime, 'year' | 'aired'>): string {
    if (anime.year) return String(anime.year)
    const from = anime.aired?.prop?.from?.year
    return from ? String(from) : '—'
  }

  /** Compact member/favorite counts, e.g. 1_200_000 -> "1.2M". */
  function compact(value: number | null | undefined): string {
    if (typeof value !== 'number') return '—'
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  /** "24 eps", "1 ep", or "? eps" when episode count is unknown. */
  function episodes(value: number | null | undefined): string {
    if (typeof value !== 'number') return '? eps'
    return `${value} ep${value === 1 ? '' : 's'}`
  }

  return { score, year, compact, episodes }
}
