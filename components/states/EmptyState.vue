<script setup lang="ts">
/** Empty result state — teaches the space and offers the keyboard way out. */
import { useCommandPalette } from '~/composables/useCommandPalette'

withDefaults(
  defineProps<{
    title?: string
    message?: string
    icon?: string
  }>(),
  {
    title: 'Nothing here',
    message: 'No titles match these filters. Loosen them or search for something specific.',
    icon: 'inbox',
  },
)

const { open } = useCommandPalette()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line py-20 text-center"
  >
    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-subtle text-fg-faint">
      <AppIcon :name="(icon as any)" :size="22" />
    </span>
    <div>
      <p class="text-sm font-medium text-fg">{{ title }}</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-fg-subtle">{{ message }}</p>
    </div>
    <button
      type="button"
      class="mt-1 inline-flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      @click="open()"
    >
      <AppIcon name="search" :size="14" />
      Open search
      <kbd class="kbd">⌘K</kbd>
    </button>
  </div>
</template>
