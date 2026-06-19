import { watch, type Ref } from 'vue'

/**
 * Lock body scroll while an overlay (palette / drawer) is open, compensating
 * for the removed scrollbar width so the page doesn't shift (no CLS). Reference
 * counted, so a palette opened over an already-open drawer doesn't unlock early.
 */

let locks = 0
let savedPaddingRight = ''

function applyLock() {
  if (typeof document === 'undefined') return
  const body = document.body
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  if (locks === 0) {
    savedPaddingRight = body.style.paddingRight
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    body.style.overflow = 'hidden'
  }
  locks++
}

function releaseLock() {
  if (typeof document === 'undefined') return
  locks = Math.max(0, locks - 1)
  if (locks === 0) {
    const body = document.body
    body.style.overflow = ''
    body.style.paddingRight = savedPaddingRight
  }
}

/** Bind scroll-lock to a boolean ref; locks while true, releases while false. */
export function useScrollLock(active: Ref<boolean>) {
  watch(active, (on, was) => {
    if (on && !was) applyLock()
    else if (!on && was) releaseLock()
  })
}
