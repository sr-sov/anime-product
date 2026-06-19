<script setup lang="ts">
/**
 * Top chrome — a thin, sticky product bar (Linear/Vercel register). The brand
 * mark sits left; the palette trigger is the focal control, styled like a real
 * search field but opening the ⌘K palette. On phones it collapses to an icon
 * button. The platform-correct shortcut hint (⌘ vs Ctrl) is detected client-
 * side so it reads native.
 */
import { computed, onMounted, ref } from 'vue'
import { useCommandPalette } from '~/composables/useCommandPalette'

const { open } = useCommandPalette()

const isMac = ref(true)
onMounted(() => {
  isMac.value = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
})
const modKey = computed(() => (isMac.value ? '⌘' : 'Ctrl'))

const links = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Browse' },
]
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl"
    :style="{ height: 'var(--header-h)' }"
  >
    <div class="container-page flex h-full items-center gap-4">
      <!-- Brand -->
      <NuxtLink
        to="/"
        class="flex shrink-0 items-center gap-2 text-fg transition-colors hover:text-fg"
        aria-label="Senkō home"
      >
        <span
          class="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-fg shadow-[0_0_0_1px_var(--accent-bg),0_4px_12px_-2px_var(--accent-bg)]"
        >
          <AppIcon name="sparkles" :size="15" />
        </span>
        <span class="text-[0.95rem] font-semibold tracking-tight">Senkō</span>
        <span class="hidden text-2xs font-medium text-fg-faint sm:inline">anime index</span>
      </NuxtLink>

      <!-- Primary nav -->
      <nav class="hidden items-center gap-1 sm:flex" aria-label="Primary">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-md px-2.5 py-1 text-sm font-medium text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
          active-class="!text-fg"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="flex-1" />

      <!-- Palette trigger — the focal search control. -->
      <button
        type="button"
        class="group hidden h-8 items-center gap-2 rounded-lg border border-line bg-bg-subtle pl-2.5 pr-2 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:bg-panel hover:text-fg-muted sm:flex sm:w-64 lg:w-72"
        @click="open()"
      >
        <AppIcon name="search" :size="15" class="text-fg-faint" />
        <span class="flex-1 text-left text-[0.8rem]">Search anime…</span>
        <kbd class="kbd">{{ modKey }}</kbd>
        <kbd class="kbd">K</kbd>
      </button>

      <!-- Phone: icon-only trigger -->
      <button
        type="button"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-bg-subtle text-fg-subtle transition-colors hover:text-fg sm:hidden"
        aria-label="Open search"
        @click="open()"
      >
        <AppIcon name="search" :size="16" />
      </button>

      <a
        href="https://github.com/sr-sov/anime-product"
        target="_blank"
        rel="noopener"
        class="hidden h-8 w-8 items-center justify-center rounded-lg text-fg-faint transition-colors hover:bg-bg-subtle hover:text-fg-muted sm:flex"
        aria-label="View source on GitHub"
      >
        <AppIcon name="github" :size="17" />
      </a>
    </div>
  </header>
</template>
