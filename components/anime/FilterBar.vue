<script setup lang="ts">
/**
 * Instant-filter bar for the browse page. Sort presets, type, and status are
 * segmented controls; genres are a scrollable chip rail loaded from the API
 * (with its own loading skeleton). Every control writes straight to the URL via
 * the browse engine, so results update instantly and the view stays shareable.
 *
 * A "search within" button hands off to the ⌘K palette rather than duplicating
 * a search field here — one search surface, app-wide.
 */
import { onMounted, ref } from 'vue'
import { useJikan } from '~/composables/useJikan'
import { useCommandPalette } from '~/composables/useCommandPalette'
import type { Genre } from '~/types/jikan'

const props = defineProps<{
  selectedGenreIds: Set<number>
  type: string
  status: string
  sort: string
  activeCount: number
}>()

const emit = defineEmits<{
  (e: 'toggle-genre', id: number): void
  (e: 'set-type', v: string): void
  (e: 'set-status', v: string): void
  (e: 'set-sort', v: string): void
  (e: 'clear'): void
}>()

const { getGenres } = useJikan()
const { open } = useCommandPalette()

const genres = ref<Genre[]>([])
const genresState = ref<'loading' | 'ready' | 'error'>('loading')

async function loadGenres() {
  genresState.value = 'loading'
  try {
    const res = await getGenres()
    // Most-populated genres first; trim the long tail for a tidy rail.
    genres.value = res.data.sort((a, b) => b.count - a.count).slice(0, 24)
    genresState.value = 'ready'
  } catch {
    genresState.value = 'error'
  }
}
onMounted(loadGenres)

const sorts = [
  { id: 'top', label: 'Top ranked', icon: 'flame' },
  { id: 'season', label: 'This season', icon: 'calendar' },
] as const
const types = [
  { id: 'tv', label: 'TV' },
  { id: 'movie', label: 'Film' },
  { id: 'ova', label: 'OVA' },
  { id: 'special', label: 'Special' },
] as const
const statuses = [
  { id: 'airing', label: 'Airing' },
  { id: 'complete', label: 'Finished' },
  { id: 'upcoming', label: 'Upcoming' },
] as const
</script>

<template>
  <div class="space-y-4">
    <!-- Row 1: sort presets, type, status, clear -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex rounded-lg border border-line bg-panel p-0.5" role="group" aria-label="Sort">
        <button
          v-for="s in sorts"
          :key="s.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-sm font-medium transition-colors"
          :class="sort === s.id ? 'bg-accent text-accent-fg' : 'text-fg-subtle hover:text-fg'"
          :aria-pressed="sort === s.id"
          @click="emit('set-sort', s.id)"
        >
          <AppIcon :name="s.icon" :size="13" />
          {{ s.label }}
        </button>
      </div>

      <span class="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />

      <div class="inline-flex rounded-lg border border-line bg-panel p-0.5" role="group" aria-label="Type">
        <button
          v-for="t in types"
          :key="t.id"
          type="button"
          class="rounded-[6px] px-2.5 py-1 text-sm font-medium transition-colors"
          :class="type === t.id ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg'"
          :aria-pressed="type === t.id"
          @click="emit('set-type', t.id)"
        >
          {{ t.label }}
        </button>
      </div>

      <div class="hidden rounded-lg border border-line bg-panel p-0.5 md:inline-flex" role="group" aria-label="Status">
        <button
          v-for="st in statuses"
          :key="st.id"
          type="button"
          class="rounded-[6px] px-2.5 py-1 text-sm font-medium transition-colors"
          :class="status === st.id ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg'"
          :aria-pressed="status === st.id"
          @click="emit('set-status', st.id)"
        >
          {{ st.label }}
        </button>
      </div>

      <div class="flex-1" />

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
        @click="open()"
      >
        <AppIcon name="search" :size="13" />
        <span class="hidden sm:inline">Search</span>
        <kbd class="kbd">⌘K</kbd>
      </button>

      <button
        v-if="activeCount > 0"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
        @click="emit('clear')"
      >
        <AppIcon name="x" :size="13" />
        Clear
        <span class="rounded bg-accent-bg px-1 text-2xs font-semibold text-accent">{{ activeCount }}</span>
      </button>
    </div>

    <!-- Row 2: genre chip rail -->
    <div>
      <div
        v-if="genresState === 'loading'"
        class="flex gap-2 overflow-hidden"
        aria-hidden="true"
      >
        <div v-for="i in 12" :key="i" class="skeleton h-7 rounded-full" :style="{ width: `${60 + (i % 4) * 20}px` }" />
      </div>
      <p v-else-if="genresState === 'error'" class="text-xs text-fg-faint">
        Couldn’t load genres.
        <button class="text-accent underline underline-offset-2" @click="loadGenres">Retry</button>
      </p>
      <div
        v-else
        class="-mx-1 flex flex-wrap gap-1.5 px-1"
        role="group"
        aria-label="Filter by genre"
      >
        <button
          v-for="g in genres"
          :key="g.mal_id"
          type="button"
          class="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
          :class="
            selectedGenreIds.has(g.mal_id)
              ? 'border-transparent bg-accent text-accent-fg'
              : 'border-line bg-panel text-fg-subtle hover:border-line-strong hover:text-fg'
          "
          :aria-pressed="selectedGenreIds.has(g.mal_id)"
          @click="emit('toggle-genre', g.mal_id)"
        >
          {{ g.name }}
        </button>
      </div>
    </div>
  </div>
</template>
