import { ref } from 'vue'

/**
 * Command-palette open/close state — a tiny module-level store so any surface
 * (the header button, an empty state, a keyboard shortcut) can summon the
 * palette, and the palette component itself can read/close it. Kept separate
 * from the palette's internal query/selection state, which lives in the
 * component and resets on each open.
 */

const isOpen = ref(false)
/** Optional seed text, e.g. opening the palette from a genre's "search within". */
const seedQuery = ref('')

export function useCommandPalette() {
  function open(seed = '') {
    seedQuery.value = seed
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
  }
  function toggle() {
    isOpen.value ? close() : open()
  }
  return { isOpen, seedQuery, open, close, toggle }
}
