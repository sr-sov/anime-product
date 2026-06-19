<script setup lang="ts">
/**
 * A horizontally-scrolling rail of titles for the home page. Loads its own data
 * from a supplied fetcher so each rail is independent (one slow/failed rail
 * never blocks the others). Snap-scrolls, keyboard reachable, with loading and
 * error states. Cards open the detail drawer in place.
 */
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFormat, srcsetFrom } from '~/composables/useFormat'
import type { Anime } from '~/types/jikan'

const props = defineProps<{
  title: string
  icon: string
  /** A fetcher returning the rail's titles. */
  load: () => Promise<Anime[]>
  /** Optional "see all" destination. */
  to?: string
}>()

const router = useRouter()
const route = useRoute()
const { score, year } = useFormat()

const items = ref<Anime[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')

async function run() {
  state.value = 'loading'
  try {
    items.value = (await props.load()).slice(0, 14)
    state.value = 'ready'
  } catch {
    state.value = 'error'
  }
}
onMounted(run)

function open(id: number) {
  router.push({ path: route.path, query: { ...route.query, a: String(id) } })
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-fg">
        <span class="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle text-accent ring-1 ring-line">
          <AppIcon :name="(icon as any)" :size="13" />
        </span>
        {{ title }}
      </h2>
      <NuxtLink
        v-if="to"
        :to="to"
        class="flex items-center gap-0.5 text-xs font-medium text-fg-subtle transition-colors hover:text-fg"
      >
        See all
        <AppIcon name="chevron-right" :size="13" />
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="state === 'loading'" class="flex gap-3 overflow-hidden" aria-hidden="true">
      <div v-for="i in 8" :key="i" class="w-[132px] shrink-0 sm:w-[148px]">
        <div class="skeleton aspect-[3/4] w-full rounded-lg" />
        <div class="skeleton mt-2 h-3 w-4/5 rounded" />
      </div>
    </div>

    <!-- Error -->
    <p v-else-if="state === 'error'" class="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-fg-subtle">
      Couldn’t load this rail.
      <button class="font-medium text-accent underline underline-offset-2" @click="run">Retry</button>
    </p>

    <!-- Loaded -->
    <ul
      v-else
      class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
    >
      <li
        v-for="a in items"
        :key="a.mal_id"
        class="w-[132px] shrink-0 snap-start sm:w-[148px]"
      >
        <button
          type="button"
          class="group block w-full text-left"
          @click="open(a.mal_id)"
        >
          <div class="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-bg-subtle transition-[transform,border-color] duration-200 ease-house group-hover:-translate-y-0.5 group-hover:border-line-strong group-focus-visible:-translate-y-0.5">
            <img
              :src="a.images?.webp?.large_image_url || a.images?.jpg?.image_url || ''"
              :srcset="srcsetFrom(a.images?.webp) || srcsetFrom(a.images?.jpg)"
              sizes="148px"
              :alt="`Cover art for ${a.title}`"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover transition-transform duration-[450ms] ease-house group-hover:scale-[1.05]"
            />
            <span
              v-if="a.score"
              class="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/65 px-1 py-0.5 text-2xs font-semibold text-amber-300 backdrop-blur-sm"
            >
              <AppIcon name="star" :size="10" class="text-amber-400" />
              {{ score(a.score) }}
            </span>
          </div>
          <p class="mt-1.5 line-clamp-1 text-xs font-medium text-fg-muted group-hover:text-fg">
            {{ a.title }}
          </p>
          <p class="text-2xs text-fg-faint">{{ year(a) }}</p>
        </button>
      </li>
    </ul>
  </section>
</template>
