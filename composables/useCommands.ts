import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Genre } from '~/types/jikan'

/**
 * The static command registry for the palette — navigation and browse-mode
 * commands plus dynamically-built "jump to genre" commands. Anime search hits
 * are produced live in the palette (network), so they are NOT here; this file
 * owns only the deterministic, always-available actions.
 *
 * Each command carries the keywords the fuzzy matcher should search, the icon,
 * an optional shortcut hint, and a `perform()` that runs on Enter/click.
 */

export type CommandGroup = 'Navigation' | 'Browse' | 'Genres'

export interface Command {
  id: string
  /** The label shown and matched against. */
  title: string
  /** Extra synonyms folded into the searchable string (not displayed). */
  keywords?: string
  group: CommandGroup
  icon: string
  /** Right-aligned hint, e.g. a shortcut or a section name. */
  hint?: string
  perform: () => void
}

export function useCommands(genres: () => Genre[]) {
  const router = useRouter()

  function go(path: string) {
    router.push(path)
  }

  const baseCommands = computed<Command[]>(() => [
    // Navigation
    {
      id: 'nav-home',
      title: 'Go to Home',
      keywords: 'index start dashboard overview',
      group: 'Navigation',
      icon: 'home',
      perform: () => go('/'),
    },
    {
      id: 'nav-browse',
      title: 'Go to Browse',
      keywords: 'all catalog grid library explore filter',
      group: 'Navigation',
      icon: 'sliders',
      perform: () => go('/browse'),
    },
    // Browse modes — deep links into the browse page with a preset.
    {
      id: 'browse-top',
      title: 'Top ranked',
      keywords: 'best popular highest rated leaderboard',
      group: 'Browse',
      icon: 'flame',
      hint: 'Browse',
      perform: () => go('/browse?sort=top'),
    },
    {
      id: 'browse-airing',
      title: 'This season',
      keywords: 'now airing current seasonal new ongoing',
      group: 'Browse',
      icon: 'calendar',
      hint: 'Browse',
      perform: () => go('/browse?sort=season'),
    },
    {
      id: 'browse-movies',
      title: 'Films',
      keywords: 'movie movies cinema feature',
      group: 'Browse',
      icon: 'film',
      hint: 'Browse',
      perform: () => go('/browse?type=movie'),
    },
    {
      id: 'browse-tv',
      title: 'TV series',
      keywords: 'show shows series television',
      group: 'Browse',
      icon: 'tv',
      hint: 'Browse',
      perform: () => go('/browse?type=tv'),
    },
  ])

  /** "Jump to <Genre>" commands, built from the loaded genre list. */
  const genreCommands = computed<Command[]>(() =>
    genres()
      .slice()
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .map((g) => ({
        id: `genre-${g.mal_id}`,
        title: g.name,
        keywords: `genre tag category ${g.name}`,
        group: 'Genres' as const,
        icon: 'hash',
        hint: `${g.count.toLocaleString()} titles`,
        perform: () => go(`/browse?genres=${g.mal_id}`),
      })),
  )

  const allCommands = computed<Command[]>(() => [
    ...baseCommands.value,
    ...genreCommands.value,
  ])

  return { baseCommands, genreCommands, allCommands }
}
