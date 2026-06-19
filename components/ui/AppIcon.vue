<script setup lang="ts">
/**
 * A tiny inline-SVG icon set. Hand-drawn paths (Lucide-style, 1.5px stroke) so
 * the app ships zero icon-library weight and every glyph is tree-shaken to the
 * ones actually used. Decorative by default (aria-hidden); pass a `title` to
 * make an icon meaningful to assistive tech.
 */
const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
    title?: string
  }>(),
  { size: 16 },
)

type IconName =
  | 'search'
  | 'command'
  | 'corner-down-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-up-down'
  | 'x'
  | 'star'
  | 'tv'
  | 'film'
  | 'sparkles'
  | 'flame'
  | 'calendar'
  | 'hash'
  | 'home'
  | 'chevron-right'
  | 'chevron-left'
  | 'external'
  | 'clock'
  | 'play'
  | 'users'
  | 'heart'
  | 'check'
  | 'sliders'
  | 'github'
  | 'alert'
  | 'inbox'
  | 'loader'

// Path data only; the wrapper supplies the shared svg attributes.
const PATHS: Record<IconName, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  command: '<path d="M15 6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3v12a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3"/>',
  'corner-down-left': '<path d="m9 10-4 4 4 4"/><path d="M20 6v6a2 2 0 0 1-2 2H5"/>',
  'arrow-up': '<path d="m18 11-6-6-6 6"/><path d="M12 5v14"/>',
  'arrow-down': '<path d="m6 13 6 6 6-6"/><path d="M12 19V5"/>',
  'arrow-up-down': '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  star: '<path d="M11.5 2.8a.6.6 0 0 1 1 0l2.4 5 5.4.8a.6.6 0 0 1 .3 1l-3.9 3.8.9 5.4a.6.6 0 0 1-.8.6L12 17l-4.8 2.5a.6.6 0 0 1-.9-.6l1-5.4-4-3.8a.6.6 0 0 1 .4-1l5.4-.8z"/>',
  tv: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="m7 3 5 4 5-4"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>',
  sparkles: '<path d="M9.9 3.3a.4.4 0 0 1 .76 0l1.2 3.5 3.5 1.2a.4.4 0 0 1 0 .76l-3.5 1.2-1.2 3.5a.4.4 0 0 1-.76 0L8.7 9.96l-3.5-1.2a.4.4 0 0 1 0-.76l3.5-1.2z"/><path d="M18 13.5 18.7 15.6 20.8 16.3 18.7 17 18 19.1 17.3 17 15.2 16.3 17.3 15.6z"/>',
  flame: '<path d="M12 2c1 3 3.5 4.2 3.5 7.5a3.5 3.5 0 0 1-7 0c0-.8.2-1.4.5-2-2 1-3.5 3.2-3.5 6a6.5 6.5 0 1 0 13 0C18.5 7.5 14.5 5 12 2Z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  home: '<path d="m3 10 9-7 9 7"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.85"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  heart: '<path d="M19 5.5a4.5 4.5 0 0 0-7-1L12 5l-.1-.5a4.5 4.5 0 0 0-7 1c-1.3 2.3-.6 5 2.4 7.7L12 18l4.7-4.8c3-2.7 3.7-5.4 2.3-7.7Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.6a5.1 5.1 0 0 0-1.4-3.5 4.8 4.8 0 0 0-.1-3.5s-1.1-.3-3.6 1.4a12.3 12.3 0 0 0-6.4 0C6.7 1.1 5.6 1.4 5.6 1.4a4.8 4.8 0 0 0-.1 3.5A5.1 5.1 0 0 0 4 8.4c0 5 3 6.3 6 6.6a3.4 3.4 0 0 0-.9 2.5V22"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z"/>',
  loader: '<path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
}
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="title ? undefined : 'true'"
    :aria-label="title"
    :role="title ? 'img' : undefined"
    class="shrink-0"
    v-html="(title ? `<title>${title}</title>` : '') + PATHS[props.name]"
  />
</template>
