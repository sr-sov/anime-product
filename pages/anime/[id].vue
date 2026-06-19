<script setup lang="ts">
/**
 * Full detail page — the standalone, deep-linkable view of one title (the
 * drawer's "open full page" target, and what a shared /anime/<id> URL renders).
 * Same data as the drawer, laid out full-width: a poster + meta sidebar, a
 * readable synopsis column, the trailer, and a recommendations grid. Explicit
 * loading / error states; recorded to recent history on view.
 */
import { computed, ref, watch } from 'vue'
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

type State = 'loading' | 'ready' | 'error'
const state = ref<State>('loading')
const anime = ref<Anime | null>(null)
const recs = ref<RecommendationEntry[]>([])
let token = 0

async function load() {
  const mine = ++token
  state.value = 'loading'
  anime.value = null
  recs.value = []
  try {
    const res = await getAnimeById(id.value)
    if (mine !== token) return
    anime.value = res.data
    state.value = 'ready'
    pushRecent({
      mal_id: res.data.mal_id,
      title: res.data.title,
      image: res.data.images?.jpg?.image_url ?? null,
      score: res.data.score,
      type: res.data.type,
      year: year(res.data),
    })
    getRecommendations(id.value)
      .then((r) => {
        if (mine === token) recs.value = r.data.slice(0, 12)
      })
      .catch(() => {})
  } catch {
    if (mine !== token) return
    state.value = 'error'
  }
}

watch(id, load, { immediate: true })

useHead({ title: () => (anime.value ? `${anime.value.title} · Senkō` : 'Loading · Senkō') })

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

    <!-- Loading -->
    <div v-if="state === 'loading'" class="grid gap-8 lg:grid-cols-[300px_1fr]">
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

    <!-- Error -->
    <ErrorState v-else-if="state === 'error'" @retry="load" />

    <!-- Loaded -->
    <article v-else-if="anime" class="grid gap-8 lg:grid-cols-[300px_1fr]">
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
  </div>
</template>
