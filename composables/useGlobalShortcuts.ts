import { onMounted, onUnmounted } from 'vue'
import { useCommandPalette } from '~/composables/useCommandPalette'

/**
 * App-wide keyboard shortcuts. Mounted once (in app.vue):
 *   ⌘K / Ctrl+K — toggle the command palette (from anywhere).
 *   /           — open the palette, unless typing in a field.
 *
 * We never hijack keys while the user is in an input/textarea/contenteditable,
 * except ⌘K which is a deliberate global override even inside the palette input.
 */

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

export function useGlobalShortcuts() {
  const { toggle, open, isOpen } = useCommandPalette()

  function onKeydown(e: KeyboardEvent) {
    // ⌘K / Ctrl+K — works everywhere, including inside fields.
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      toggle()
      return
    }
    // "/" to open — but not while typing, and not if already open.
    if (e.key === '/' && !isOpen.value && !isEditable(e.target)) {
      e.preventDefault()
      open()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
