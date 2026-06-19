<script setup lang="ts">
/**
 * Full detail page — the standalone, deep-linkable view of one title (the
 * drawer's "open full page" target, and what a shared /anime/<id> URL renders).
 *
 * SSR/SSG-safe: the title record is fetched with `useAsyncData`, whose RETURN
 * value IS the data (no setup-time side effects, no window access in setup), so
 * the top ~40 ids prerender to real HTML with a server-painted cover and
 * per-title SEO. The long tail hydrates the same way via the SPA fallback.
 * Recommendations are a secondary, client-only enhancement.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJikan } from '~/composables/useJikan'
import { useFormat } from '~/composables/useFormat'
import { useRecent } from '~/composables/useRecent'
import type { Anime, RecommendationEntry } from '~/types/jikan'

const route = useRoute()
const router = useRouter()
const { getAnimeById, getRecommendations } = useJikan()
const { score, year, compact } = useFormat()
const { push: pushRecent } = useRecent()

const id = computed(() => String(route.params.id))

// Hydration-safe data: useAsyncData returns the record itself. `data` is the
// title, `error`/`pending` drive the explicit states. Keyed by id so navigating
// between detail pages refetches cleanly.
const { data: anime, pending, error, refresh } = await useAsyncData(
  () => `anime-${id.value}`,
  async () => (await getAnimeById(id.value)).data,
  { watch: [id] },
)

// Only surface the hard error state once a fetch has actually failed and
// produced no data. Wrapped in <ClientOnly> in the template so the server
// (prerender) never bakes an error into static HTML — an empty build-time fetch
// degrades to the skeleton, which hydrates and retries.
const hasError = computed(() => !pending.value && (Boolean(error.value) || !anime.value))
// Exposed for the template (Vue's template compiler can't parse `import.meta`).
const isClient = import.meta.client

// If a prerendered page hydrated with no data (its build-time fetch was rate
// limited), refetch once on the client so the skeleton resolves to content.
onMounted(() => {
  if (!anime.value && !pending.value) refresh()
})

// Recommendations + recent history are client-only side effects.
const recs = ref<RecommendationEntry[]>([])

watch(
  anime,
  (a) => {
    if (!a || !import.meta.client) return
    pushRecent({
      mal_id: a.mal_id,
      title: a.title,
      image: a.images?.jpg?.image_url ?? null,
      score: a.score,
      type: a.type,
      year: year(a),
    })
    recs.value = []
    getRecommendations(a.mal_id)
      .then((r) => {
        recs.value = r.data.slice(0, 12)
      })
      .catch(() => {})
  },
  { immediate: true },
)

// Per-title SEO off the API data — title, description, and the cover as the
// og:image / twitter card so a shared /anime/<id> link unfurls correctly.
const seoDescription = computed(() =>
  ((anime.value?.synopsis ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)) ||
  'A title on Senkō, the keyboard-first anime index.',
)
const seoImage = computed(
  () =>
    anime.value?.images?.webp?.large_image_url ||
    anime.value?.images?.jpg?.large_image_url ||
    anime.value?.images?.jpg?.image_url ||
    undefined,
)
useSeoMeta({
  title: () => (anime.value ? `${anime.value.title} · Senkō` : 'Anime · Senkō'),
  description: seoDescription,
  ogTitle: () => (anime.value ? `${anime.value.title} · Senkō` : 'Senkō'),
  ogDescription: seoDescription,
  ogImage: seoImage,
  ogType: 'video.tv_show',
  twitterCard: 'summary_large_image',
  twitterTitle: () => (anime.value ? anime.value.title : 'Senkō'),
  twitterImage: seoImage,
})

const poster = computed(
  () =>
    anime.value?.images?.webp?.large_image_url ||
    anime.value?.images?.jpg?.large_image_url ||
    '',
)
const synopsis = computed(() => (anime.value?.synopsis ?? '').replace(/\s+/g, ' ').trim())
const background = computed(() => (anime.value?.background ?? '').replace(/\s+/g, ' ').trim())
const trailerUrl = computed(() => {
  const t = anime.value?.trailer
  return t?.youtube_id ? `https://www.youtube-nocookie.com/embed/${t.youtube_id}` : null
})
const facts = computed(() => {
  const a = anime.value
  if (!a) return []
  const list: Array<{ label: string; value: string }> = [
    { label: 'Type', value: a.type ?? '—' },
    { label: 'Episodes', value: a.episodes ? String(a.episodes) : '?' },
    { label: 'Status', value: a.status ?? '—' },
    { label: 'Aired', value: a.aired?.string ?? '—' },
    { label: 'Duration', value: a.duration ?? '—' },
    { label: 'Source', value: a.source ?? '—' },
    { label: 'Rating', value: a.rating ?? '—' },
  ]
  if (a.studios?.length) list.push({ label: 'Studios', value: a.studios.map((s) => s.name).join(', ') })
  return list
})

function openRec(rid: number) {
  router.push(`/anime/${rid}`)
}
</script>

<template>
  <div class="container-page py-6 sm:py-8">
    <!-- Breadcrumb -->
    <button
      type="button"
      class="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-fg-subtle transition-colors hover:text-fg"
      @click="router.back()"
    >
      <AppIcon name="chevron-left" :size="15" />
      Back
    </button>

    <!-- Loaded -->
    <article v-if="anime" class="grid gap-8 lg:grid-cols-[300px_1fr]">
      <!-- Sidebar -->
      <aside class="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
        <div class="aspect-[3/4] w-full max-w-[300px] overflow-hidden rounded-xl border border-line-strong bg-bg-subtle shadow-panel">
          <img v-if="poster" :src="poster" :alt="`Cover art for ${anime.title}`" class="h-full w-full object-cover" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p class="flex items-center gap-1 text-base font-semibold text-amber-300">
              <AppIcon name="star" :size="14" class="text-amber-400" />{{ score(anime.score) }}
            </p>
            <p class="text-2xs text-fg-faint">Score</p>
          </div>
          <div class="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p class="text-base font-semibold text-fg">#{{ anime.rank ?? '—' }}</p>
            <p class="text-2xs text-fg-faint">Rank</p>
          </div>
          <div class="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p class="text-base font-semibold text-fg">{{ compact(anime.members) }}</p>
            <p class="text-2xs text-fg-faint">Members</p>
          </div>
          <div class="rounded-lg border border-line bg-panel px-3 py-2.5">
            <p class="text-base font-semibold text-fg">{{ compact(anime.favorites) }}</p>
            <p class="text-2xs text-fg-faint">Favorites</p>
          </div>
        </div>

        <dl class="divide-y divide-line overflow-hidden rounded-xl border border-line">
          <div v-for="f in facts" :key="f.label" class="flex items-start justify-between gap-4 bg-panel px-3 py-2 text-sm">
            <dt class="shrink-0 text-fg-subtle">{{ f.label }}</dt>
            <dd class="text-right text-fg">{{ f.value }}</dd>
          </div>
        </dl>

        <a
          :href="anime.url"
          target="_blank"
          rel="noopener"
          class="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-panel py-2 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          View on MyAnimeList
          <AppIcon name="external" :size="13" />
        </a>
      </aside>

      <!-- Main -->
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="anime.type" class="rounded-md bg-bg-subtle px-2 py-0.5 text-2xs font-medium uppercase tracking-wide text-fg-subtle ring-1 ring-line">{{ anime.type }}</span>
          <span
            v-if="anime.status"
            class="flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-medium ring-1"
            :class="anime.airing ? 'text-positive ring-positive/30 bg-positive/10' : 'text-fg-subtle ring-line bg-bg-subtle'"
          >
            <span v-if="anime.airing" class="h-1.5 w-1.5 rounded-full bg-positive" />
            {{ anime.airing ? 'Airing' : anime.status }}
          </span>
        </div>

        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{{ anime.title }}</h1>
        <p v-if="anime.title_english && anime.title_english !== anime.title" class="mt-1 text-base text-fg-subtle">
          {{ anime.title_english }}
        </p>
        <p v-if="anime.title_japanese" class="mt-1 text-sm text-fg-faint">{{ anime.title_japanese }}</p>

        <!-- Genres -->
        <div v-if="anime.genres?.length" class="mt-4 flex flex-wrap gap-1.5">
          <NuxtLink
            v-for="g in anime.genres"
            :key="g.mal_id"
            :to="`/browse?genres=${g.mal_id}`"
            class="rounded-md bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg-subtle ring-1 ring-line transition-colors hover:bg-panel hover:text-fg"
          >
            {{ g.name }}
          </NuxtLink>
        </div>

        <!-- Synopsis -->
        <section v-if="synopsis" class="mt-7 max-w-[68ch]">
          <h2 class="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint">Synopsis</h2>
          <p class="text-[0.95rem] leading-relaxed text-fg-muted">{{ synopsis }}</p>
        </section>

        <!-- Trailer -->
        <section v-if="trailerUrl" class="mt-7 max-w-2xl">
          <h2 class="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-faint">
            <AppIcon name="play" :size="12" /> Trailer
          </h2>
          <div class="aspect-video w-full overflow-hidden rounded-xl border border-line bg-bg-subtle">
            <iframe
              :src="trailerUrl"
              :title="`${anime.title} trailer`"
              class="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
          </div>
        </section>

        <!-- Background -->
        <section v-if="background" class="mt-7 max-w-[68ch]">
          <h2 class="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint">Background</h2>
          <p class="text-[0.95rem] leading-relaxed text-fg-subtle">{{ background }}</p>
        </section>

        <!-- Recommendations -->
        <section v-if="recs.length" class="mt-9">
          <h2 class="mb-3 text-2xs font-semibold uppercase tracking-wider text-fg-faint">More like this</h2>
          <ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            <li v-for="r in recs" :key="r.entry.mal_id">
              <button type="button" class="group block w-full text-left" @click="openRec(r.entry.mal_id)">
                <div class="aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-bg-subtle transition-transform duration-200 ease-house group-hover:-translate-y-0.5">
                  <img :src="r.entry.images?.jpg?.image_url ?? ''" :alt="r.entry.title" loading="lazy" class="h-full w-full object-cover transition-transform duration-300 ease-house group-hover:scale-105" />
                </div>
                <p class="mt-1.5 line-clamp-2 text-2xs leading-tight text-fg-subtle group-hover:text-fg">{{ r.entry.title }}</p>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </article>

    <!-- Loading. Also the SSR fallback when a prerender-time fetch came back
         empty: we ship the skeleton (which hydrates and refetches on the client)
         rather than baking a hard error into static HTML. -->
    <div v-else-if="pending || !isClient" class="grid gap-8 lg:grid-cols-[300px_1fr]">
      <div class="space-y-3">
        <div class="skeleton aspect-[3/4] w-full max-w-[300px] rounded-xl" />
        <div class="skeleton h-24 w-full rounded-xl" />
      </div>
      <div class="space-y-3">
        <div class="skeleton h-8 w-2/3 rounded" />
        <div class="skeleton h-4 w-1/3 rounded" />
        <div class="skeleton mt-6 h-3 w-full rounded" />
        <div class="skeleton h-3 w-11/12 rounded" />
        <div class="skeleton h-3 w-10/12 rounded" />
      </div>
    </div>

    <!-- Error — client-side only (ClientOnly), after a confirmed failed fetch. -->
    <ClientOnly v-else>
      <ErrorState v-if="hasError" @retry="() => refresh()" />
    </ClientOnly>
  </div>
</template>
