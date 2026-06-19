<script setup lang="ts">
/**
 * A dense, hover-detailed grid tile. Poster-forward (the cover is the content),
 * with a quiet metadata strip and a hover state that lifts the card, reveals a
 * synopsis snippet, and surfaces the score. Clicking opens the detail drawer in
 * place (via the `?a=` query) rather than navigating away — keeping the browse
 * context intact. Fully keyboard-reachable (it is a real <button>).
 *
 * The whole tile is one focusable control; the image lazy-loads and reserves
 * its aspect ratio so the grid never shifts.
 */
import { useFormat, srcsetFrom } from '~/composables/useFormat'
import type { Anime } from '~/types/jikan'

const props = defineProps<{
  anime: Anime
  /** Sequence index, used to stagger the entrance. */
  index?: number
}>()

const emit = defineEmits<{ (e: 'open', id: number): void }>()

const { score, year, episodes } = useFormat()

const poster =
  props.anime.images?.webp?.large_image_url ||
  props.anime.images?.jpg?.large_image_url ||
  props.anime.images?.jpg?.image_url ||
  ''

// Responsive sources: prefer webp, fall back to jpg. The `sizes` mirrors the
// grid (2 cols on phones → 6 on xl, container capped at 1320px).
const srcset = srcsetFrom(props.anime.images?.webp) || srcsetFrom(props.anime.images?.jpg)
const sizes = '(min-width:1280px) 210px, (min-width:1024px) 18vw, (min-width:768px) 23vw, (min-width:640px) 31vw, 47vw'

const synopsis = (props.anime.synopsis ?? '').replace(/\s+/g, ' ').trim()
</script>

<template>
  <button
    type="button"
    class="group relative flex w-full flex-col overflow-hidden rounded-xl border border-line bg-panel text-left transition-[transform,border-color,box-shadow] duration-200 ease-house hover:-translate-y-0.5 hover:border-line-strong hover:shadow-panel focus-visible:-translate-y-0.5"
    @click="emit('open', anime.mal_id)"
  >
    <!-- Poster -->
    <div class="relative aspect-[3/4] w-full overflow-hidden bg-bg-subtle">
      <img
        v-if="poster"
        :src="poster"
        :srcset="srcset"
        :sizes="srcset ? sizes : undefined"
        :alt="`Cover art for ${anime.title}`"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-[450ms] ease-house group-hover:scale-[1.04]"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-fg-faint"
        aria-hidden="true"
      >
        <AppIcon name="film" :size="28" />
      </div>

      <!-- Gradient + hover synopsis -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-3 pt-10 opacity-0 transition-all duration-200 ease-house group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
      >
        <p v-if="synopsis" class="line-clamp-4 text-xs leading-relaxed text-slate-200">
          {{ synopsis }}
        </p>
      </div>

      <!-- Score chip -->
      <span
        v-if="anime.score"
        class="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-2xs font-semibold text-amber-300 backdrop-blur-sm"
      >
        <AppIcon name="star" :size="11" class="text-amber-400" />
        {{ score(anime.score) }}
      </span>

      <!-- Type badge -->
      <span
        v-if="anime.type"
        class="absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-slate-200 backdrop-blur-sm"
      >
        {{ anime.type }}
      </span>
    </div>

    <!-- Meta strip -->
    <div class="flex flex-col gap-0.5 p-3">
      <h3 class="line-clamp-1 text-sm font-medium text-fg group-hover:text-fg">
        {{ anime.title }}
      </h3>
      <p class="flex items-center gap-1.5 text-2xs text-fg-faint">
        <span>{{ year(anime) }}</span>
        <span class="text-line-strong">·</span>
        <span>{{ episodes(anime.episodes) }}</span>
      </p>
    </div>
  </button>
</template>
