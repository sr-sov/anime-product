<script setup lang="ts">
/**
 * Root shell. Holds the persistent chrome (header/footer), the page outlet, and
 * the two global overlays that any page can summon:
 *   - the ⌘K command palette (CommandPalette),
 *   - the route-aware detail drawer (AnimeDrawer), driven by the `?a=<id>`
 *     query param so a title can open over any page and deep-link cleanly.
 *
 * The global keyboard shortcuts are registered once here.
 */
import { useGlobalShortcuts } from '~/composables/useGlobalShortcuts'

useGlobalShortcuts()
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1">
      <NuxtPage />
    </main>
    <AppFooter />

    <!-- Global overlays -->
    <CommandPalette />
    <AnimeDrawer />
  </div>
</template>
