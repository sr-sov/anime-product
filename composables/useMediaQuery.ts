import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/**
 * Reactive `matchMedia`. SSR-safe (returns the fallback until mounted), cleans
 * up its listener on unmount. Used for reduced-motion checks and pointer/hover
 * detection so motion and hover affordances degrade honestly.
 */
export function useMediaQuery(query: string, fallback = false): Ref<boolean> {
  const matches = ref(fallback)
  let mql: MediaQueryList | null = null

  function update(e: MediaQueryListEvent | MediaQueryList) {
    matches.value = e.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', update)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', update)
  })

  return matches
}

/** True when the user asked the OS to reduce motion. */
export function usePrefersReducedMotion(): Ref<boolean> {
  return useMediaQuery('(prefers-reduced-motion: reduce)', false)
}
