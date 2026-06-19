<script setup lang="ts">
/**
 * Home — the product IS the hero. No marketing splash: a tight headline, the
 * command-palette search as the single focal control, quick-jump chips, then a
 * featured spotlight and curated rails (Top, This season, optionally Recent).
 * Everything lands fast and is one keystroke from anywhere via ⌘K.
 */
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useJikan } from '~/composables/useJikan'
import { useCommandPalette } from '~/composables/useCommandPalette'
import { useRecent } from '~/composables/useRecent'
import { useFormat, srcsetFrom } from '~/composables/useFormat'

const router = useRouter()
const route = useRoute()
const { getTopAnime, getSeasonNow } = useJikan()
const { open } = useCommandPalette()
const { recent } = useRecent()
const { score, year, compact } = useFormat()

// Featured spotlight = the current #1 top title. Fetched hydration-safely so it
// SERVER-RENDERS into the prerendered homepage HTML: no skeleton→content swap on
// first paint (which was the mobile CLS source), and it doubles as the LCP hero.
const { data: featured, pending: featuredPending, error: featuredError, refresh: refreshFeatured } =
  await useAsyncData('home-featured', async () => (await getTopAnime(1)).data[0] ?? null)

// If the build-time fetch was rate-limited (no featured baked), refetch on the
// client so the skeleton resolves to the hero rather than freezing an error.
const isClient = import.meta.client
onMounted(() => {
  if (!featured.value) refreshFeatured()
})

// Preload the hero cover (the LCP image) — its URL is known at SSR time, so
// hinting it in <head> lets the browser fetch it during HTML parse rather than
// after the image element is discovered. Improves the mobile LCP.
const featuredCover = computed(
  () => featured.value?.images?.webp?.large_image_url || featured.value?.images?.jpg?.large_image_url || '',
)
const featuredSrcset = computed(
  () => srcsetFrom(featured.value?.images?.webp) || srcsetFrom(featured.value?.images?.jpg) || '',
)
useHead({
  link: () =>
    featuredCover.value
      ? [
          {
            rel: 'preload',
            as: 'image',
            href: featuredCover.value,
            // Match the <img> so the preload fetches the same responsive source.
            imagesrcset: featuredSrcset.value || undefined,
            imagesizes: featuredSrcset.value ? '(min-width:640px) 176px, 128px' : undefined,
            fetchpriority: 'high',
          },
        ]
      : [],
})

// Rail fetchers (each rail loads independently).
const loadTop = async () => (await getTopAnime(1)).data
const loadSeason = async () => (await getSeasonNow(1)).data

const quickJumps = [
  { label: 'Top ranked', icon: 'flame', to: '/browse?sort=top' },
  { label: 'This season', icon: 'calendar', to: '/browse?sort=season' },
  { label: 'Films', icon: 'film', to: '/browse?type=movie' },
  { label: 'Action', icon: 'hash', to: '/browse?genres=1' },
  { label: 'Romance', icon: 'hash', to: '/browse?genres=22' },
]

function openFeatured() {
  if (featured.value) router.push({ path: route.path, query: { ...route.query, a: String(featured.value.mal_id) } })
}
function openRecent(id: number) {
  router.push({ path: route.path, query: { ...route.query, a: String(id) } })
}

const featuredSynopsis = computed(() =>
  (featured.value?.synopsis ?? '').replace(/\s+/g, ' ').trim().slice(0, 260),
)
</script>

<template>
  <div>
    <!-- ── Hero: the product is the hero ── -->
    <section class="border-b border-line bg-bg-subtle/30">
      <div class="container-page py-12 sm:py-16">
        <div class="mx-auto max-w-2xl text-center">
          <span
            class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-2xs font-medium text-fg-subtle"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-positive" />
            Live data · MyAnimeList via Jikan
          </span>
          <h1 class="mt-5 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            The anime index, built like a tool.
          </h1>
          <p class="mx-auto mt-3 max-w-xl text-base leading-relaxed text-fg-subtle">
            Keyboard-first search across thousands of titles. Filter instantly, open
            anything in place, and never touch the mouse if you don’t want to.
          </p>

          <!-- The focal control: the palette trigger, styled as a search field -->
          <button
            type="button"
            class="group mx-auto mt-7 flex w-full max-w-md items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 text-left shadow-panel transition-colors hover:border-line-strong"
            @click="open()"
          >
            <AppIcon name="search" :size="18" class="text-fg-faint" />
            <span class="flex-1 text-sm text-fg-subtle">Search anime, genres, commands…</span>
            <span class="flex items-center gap-1">
              <kbd class="kbd">⌘</kbd>
              <kbd class="kbd">K</kbd>
            </span>
          </button>

          <!-- Quick jumps -->
          <div class="mt-5 flex flex-wrap items-center justify-center gap-1.5">
            <NuxtLink
              v-for="q in quickJumps"
              :key="q.label"
              :to="q.to"
              class="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
            >
              <AppIcon :name="(q.icon as any)" :size="12" />
              {{ q.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <div class="container-page space-y-12 py-10">
      <!-- ── Featured spotlight ── -->
      <section>
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
          <span class="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle text-accent ring-1 ring-line">
            <AppIcon name="sparkles" :size="13" />
          </span>
          Featured · #1 right now
        </h2>

        <!-- Loading. Also the SSR fallback when the build-time fetch was rate-
             limited: ship the skeleton (hydrates + refetches), never a baked
             error. -->
        <div v-if="!featured && (featuredPending || !isClient)" class="flex gap-5 rounded-2xl border border-line bg-panel p-5">
          <div class="skeleton aspect-[3/4] w-32 shrink-0 rounded-lg sm:w-44" />
          <div class="flex-1 space-y-3 py-2">
            <div class="skeleton h-6 w-2/3 rounded" />
            <div class="skeleton h-3 w-1/3 rounded" />
            <div class="skeleton mt-4 h-3 w-full rounded" />
            <div class="skeleton h-3 w-5/6 rounded" />
            <div class="skeleton h-3 w-4/6 rounded" />
          </div>
        </div>

        <!-- Error — client-side only, after a confirmed failed (re)fetch. -->
        <p v-else-if="!featured" class="rounded-xl border border-dashed border-line px-4 py-8 text-sm text-fg-subtle">
          Couldn’t load the featured title right now.
        </p>

        <!-- Loaded -->
        <button
          v-else
          type="button"
          class="group flex w-full gap-5 overflow-hidden rounded-2xl border border-line bg-panel p-5 text-left transition-colors hover:border-line-strong"
          @click="openFeatured"
        >
          <div class="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-lg border border-line-strong bg-bg-subtle shadow-panel sm:w-44">
            <!-- The hero cover is the LCP element (above the fold, server-
                 painted) — load it eagerly at high priority, never lazily, and
                 with a srcset so mobile pulls a ~176px-fit source instead of the
                 425px large file (smaller LCP payload over throttled networks). -->
            <img
              :src="featured.images?.webp?.large_image_url || featured.images?.jpg?.large_image_url || ''"
              :srcset="srcsetFrom(featured.images?.webp) || srcsetFrom(featured.images?.jpg)"
              sizes="(min-width:640px) 176px, 128px"
              :alt="`Cover art for ${featured.title}`"
              fetchpriority="high"
              decoding="async"
              width="176"
              height="235"
              class="h-full w-full object-cover transition-transform duration-500 ease-house group-hover:scale-[1.04]"
            />
          </div>
          <div class="min-w-0 flex-1 py-1">
            <div class="flex flex-wrap items-center gap-2 text-2xs font-medium text-fg-faint">
              <span v-if="featured.type" class="rounded bg-bg-subtle px-1.5 py-0.5 uppercase tracking-wide text-fg-subtle ring-1 ring-line">{{ featured.type }}</span>
              <span>{{ year(featured) }}</span>
              <span v-if="featured.episodes">· {{ featured.episodes }} eps</span>
            </div>
            <h3 class="mt-2 text-xl font-semibold leading-tight text-fg sm:text-2xl">{{ featured.title }}</h3>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span class="flex items-center gap-1 font-medium text-amber-300">
                <AppIcon name="star" :size="14" class="text-amber-400" />
                {{ score(featured.score) }}
              </span>
              <span class="text-fg-subtle">#{{ featured.rank }} ranked</span>
              <span class="text-fg-subtle">{{ compact(featured.members) }} members</span>
            </div>
            <p class="mt-3 line-clamp-3 max-w-2xl text-sm leading-relaxed text-fg-subtle">
              {{ featuredSynopsis }}…
            </p>
            <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
              Open detail
              <AppIcon name="chevron-right" :size="14" class="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </section>

      <!-- ── Recently viewed ── -->
      <section v-if="recent.length">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
          <span class="flex h-6 w-6 items-center justify-center rounded-md bg-bg-subtle text-accent ring-1 ring-line">
            <AppIcon name="clock" :size="13" />
          </span>
          Recently viewed
        </h2>
        <ul class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <li v-for="r in recent" :key="r.mal_id" class="w-[112px] shrink-0 sm:w-[124px]">
            <button type="button" class="group block w-full text-left" @click="openRecent(r.mal_id)">
              <div class="aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-bg-subtle transition-transform duration-200 ease-house group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5">
                <img :src="r.image || ''" :alt="r.title" loading="lazy" class="h-full w-full object-cover" />
              </div>
              <p class="mt-1.5 line-clamp-1 text-2xs font-medium text-fg-muted group-hover:text-fg">{{ r.title }}</p>
            </button>
          </li>
        </ul>
      </section>

      <!-- ── Rails ── -->
      <!-- Below the fold: lazy-hydrate on visibility so their JS doesn't pile
           onto the initial home hydration long task (cuts TBT). They render
           server-side as skeletons and become interactive when scrolled to. -->
      <LazyAnimeRail title="Top ranked" icon="flame" :load="loadTop" to="/browse?sort=top" hydrate-on-visible />
      <LazyAnimeRail title="Airing this season" icon="calendar" :load="loadSeason" to="/browse?sort=season" hydrate-on-visible />
    </div>
  </div>
</template>
