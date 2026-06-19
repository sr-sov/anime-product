<script setup lang="ts">
/**
 * Browse — the main product surface. A filter bar (sort / type / status /
 * genres, all instant and URL-driven) over a dense, responsive poster grid.
 * Clicking a tile opens the route-aware detail drawer in place. Every
 * interactive state is explicit: loading skeleton, empty, error+retry, loaded.
 *
 * All filter + pagination state lives in the URL (composables/useBrowse.ts), so
 * the back button restores the exact view and any result page is shareable.
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBrowse } from '~/composables/useBrowse'

const router = useRouter()
const route = useRoute()

const {
  filters,
  state,
  results,
  totalPages,
  hasNext,
  activeFilterCount,
  selectedGenreIds,
  fetchPage,
  toggleGenre,
  setType,
  setStatus,
  setSort,
  setPage,
  clearAll,
} = useBrowse()

function openAnime(id: number) {
  router.push({ path: route.path, query: { ...route.query, a: String(id) } })
}

const heading = computed(() => {
  const f = filters.value
  if (f.sort === 'top') return 'Top ranked'
  if (f.sort === 'season') return 'Airing this season'
  if (f.type) return `${f.type.toUpperCase()} titles`
  if (activeFilterCount.value > 0) return 'Filtered results'
  return 'Most popular'
})

useHead({ title: () => `${heading.value} · Senkō` })
</script>

<template>
  <div class="container-page py-6 sm:py-8">
    <!-- Heading -->
    <div class="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-fg">{{ heading }}</h1>
        <p class="mt-0.5 text-sm text-fg-faint">
          Filter instantly · open any title in place ·
          <kbd class="kbd">⌘K</kbd> to search
        </p>
      </div>
    </div>

    <!-- Filters -->
    <FilterBar
      :selected-genre-ids="selectedGenreIds"
      :type="filters.type"
      :status="filters.status"
      :sort="filters.sort"
      :active-count="activeFilterCount"
      @toggle-genre="toggleGenre"
      @set-type="setType"
      @set-status="setStatus"
      @set-sort="setSort"
      @clear="clearAll"
    />

    <!-- Results -->
    <div class="mt-6">
      <AnimeGridSkeleton v-if="state === 'loading'" :count="18" />

      <ErrorState v-else-if="state === 'error'" @retry="fetchPage" />

      <EmptyState
        v-else-if="state === 'empty'"
        title="No titles match"
        message="Nothing fits this combination of filters. Try removing one, or search for a specific title."
      />

      <template v-else>
        <TransitionGroup
          tag="ul"
          name="grid"
          class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        >
          <li v-for="(a, i) in results" :key="a.mal_id" :style="{ '--i': i }" class="grid-item">
            <AnimeCard :anime="a" :index="i" @open="openAnime" />
          </li>
        </TransitionGroup>

        <PageNav
          class="mt-8"
          :page="filters.page"
          :total-pages="totalPages"
          :has-next="hasNext"
          @go="setPage"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Staggered entrance for the grid (transform/opacity only). The per-item delay
   is driven by the --i custom prop. Reduced-motion collapses it via the global
   guard in main.css. */
.grid-item {
  animation: card-in 0.4s var(--ease-house) backwards;
  animation-delay: calc(var(--i) * 22ms);
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Smooth reflow when results reorder (filtering). */
.grid-move {
  transition: transform 0.35s var(--ease-house);
}
.grid-leave-active {
  position: absolute;
}
</style>
