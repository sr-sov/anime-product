<script setup lang="ts">
/**
 * Route-aware detail drawer.
 *
 * Driven entirely by the URL: when `?a=<id>` is present it fetches that title's
 * full record and slides a panel in from the right, over whatever page is
 * underneath. Closing just strips `a` from the query, so the browse grid stays
 * exactly where it was and every open title is a shareable deep link. No full
 * navigation, no lost scroll position.
 *
 * States: loading skeleton → loaded (poster, stats, synopsis, genres, trailer,
 * recommendations) → error+retry. Esc closes; focus is trapped to the panel;
 * body scroll is locked without shifting the page. Opening a title records it
 * to recent history (which feeds the palette).
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useJikan } from '~/composables/useJikan'
import { useFormat } from '~/composables/useFormat'
import { useRecent } from '~/composables/useRecent'
import { useScrollLock } from '~/composables/useScrollLock'
import type { Anime, RecommendationEntry } from '~/types/jikan'

const route = useRoute()
const router = useRouter()
const { getAnimeById, getRecommendations } = useJikan()
const { score, year, compact, episodes } = useFormat()
const { push: pushRecent } = useRecent()

const openId = computed(() => {
  const a = route.query.a
  const id = Array.isArray(a) ? a[0] : a
  const n = Number(id)
  return id && Number.isFinite(n) && n > 0 ? n : null
})
const isOpen = computed(() => openId.value !== null)

useScrollLock(isOpen)

type State = 'loading' | 'ready' | 'error'
const state = ref<State>('loading')
const anime = ref<Anime | null>(null)
const recs = ref<RecommendationEntry[]>([])
const panelEl = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let loadToken = 0

async function load(id: number) {
  const token = ++loadToken
  state.value = 'loading'
  anime.value = null
  recs.value = []
  try {
    const res = await getAnimeById(id)
    if (token !== loadToken) return
    anime.value = res.data
    state.value = 'ready'
    recordRecent(res.data)
    // Recommendations are secondary; load them after, ignore their failure.
    getRecommendations(id)
      .then((r) => {
        if (token === loadToken) recs.value = r.data.slice(0, 8)
      })
      .catch(() => {})
  } catch {
    if (token !== loadToken) return
    state.value = 'error'
  }
}

function recordRecent(a: Anime) {
  pushRecent({
    mal_id: a.mal_id,
    title: a.title,
    image: a.images?.jpg?.image_url ?? null,
    score: a.score,
    type: a.type,
    year: year(a),
  })
}

watch(
  openId,
  (id) => {
    if (id !== null) {
      load(id)
      nextTick(() => closeBtn.value?.focus())
    }
  },
  { immediate: true },
)

function close() {
  const q = { ...route.query }
  delete q.a
  router.replace({ path: route.path, query: q })
}

function openRecommendation(id: number) {
  router.replace({ path: route.path, query: { ...route.query, a: String(id) } })
  panelEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
    return
  }
  // Simple focus trap: keep Tab inside the panel.
  if (e.key === 'Tab' && panelEl.value) {
    const focusables = panelEl.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

// ── Derived display data ──────────────────────────────────────────────────
const poster = computed(
  () =>
    anime.value?.images?.webp?.large_image_url ||
    anime.value?.images?.jpg?.large_image_url ||
    anime.value?.images?.jpg?.image_url ||
    '',
)
const englishTitle = computed(() => {
  const en = anime.value?.title_english
  return en && en !== anime.value?.title ? en : null
})
const stats = computed(() => {
  const a = anime.value
  if (!a) return []
  return [
    { label: 'Score', value: a.score ? score(a.score) : '—', icon: 'star' },
    { label: 'Rank', value: a.rank ? `#${a.rank}` : '—', icon: 'flame' },
    { label: 'Members', value: compact(a.members), icon: 'users' },
    { label: 'Favorites', value: compact(a.favorites), icon: 'heart' },
  ]
})
const facts = computed(() => {
  const a = anime.value
  if (!a) return []
  const list: Array<{ label: string; value: string }> = [
    { label: 'Type', value: a.type ?? '—' },
    { label: 'Episodes', value: a.episodes ? String(a.episodes) : '?' },
    { label: 'Status', value: a.status ?? '—' },
    { label: 'Aired', value: a.aired?.string ?? '—' },
    { label: 'Season', value: a.season ? `${a.season} ${a.year ?? ''}`.trim() : (a.year ? String(a.year) : '—') },
    { label: 'Duration', value: a.duration ?? '—' },
    { label: 'Source', value: a.source ?? '—' },
    { label: 'Rating', value: a.rating ?? '—' },
  ]
  if (a.studios?.length) list.push({ label: 'Studio', value: a.studios.map((s) => s.name).join(', ') })
  return list
})
const synopsis = computed(() => (anime.value?.synopsis ?? '').replace(/\s+/g, ' ').trim())
const trailerUrl = computed(() => {
  const t = anime.value?.trailer
  if (!t?.youtube_id) return null
  return `https://www.youtube-nocookie.com/embed/${t.youtube_id}`
})
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div v-if="isOpen" class="fixed inset-0 z-[90]" @keydown="onKeydown">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/55 backdrop-blur-[1px]" @click="close" aria-hidden="true" />

        <!-- Panel -->
        <Transition name="drawer" appear>
          <aside
            ref="panelEl"
            role="dialog"
            aria-modal="true"
            :aria-label="anime ? anime.title : 'Anime detail'"
            class="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col overflow-y-auto overscroll-contain border-l border-line-strong bg-bg shadow-palette"
          >
            <!-- Sticky header bar -->
            <div
              class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/85 px-5 py-3 backdrop-blur-xl"
            >
              <p class="truncate text-sm font-medium text-fg-muted">
                <span class="text-fg-faint">Detail</span>
                <span v-if="anime" class="mx-1.5 text-line-strong">/</span>
                <span v-if="anime" class="text-fg">{{ anime.title }}</span>
              </p>
              <button
                ref="closeBtn"
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-bg-subtle hover:text-fg"
                aria-label="Close detail (Escape)"
                @click="close"
              >
                <AppIcon name="x" :size="17" />
              </button>
            </div>

            <!-- ── Loading skeleton ── -->
            <div v-if="state === 'loading'" class="flex flex-col gap-5 p-5">
              <div class="flex gap-4">
                <div class="skeleton aspect-[3/4] w-32 shrink-0 rounded-lg" />
                <div class="flex-1 space-y-2.5 pt-1">
                  <div class="skeleton h-5 w-4/5 rounded" />
                  <div class="skeleton h-3 w-1/2 rounded" />
                  <div class="skeleton mt-4 h-3 w-2/3 rounded" />
                  <div class="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <div v-for="i in 4" :key="i" class="skeleton h-16 rounded-lg" />
              </div>
              <div class="space-y-2">
                <div v-for="i in 4" :key="i" class="skeleton h-3 rounded" :style="{ width: `${95 - i * 7}%` }" />
              </div>
            </div>

            <!-- ── Error ── -->
            <div v-else-if="state === 'error'" class="p-5">
              <ErrorState @retry="openId && load(openId)" />
            </div>

            <!-- ── Loaded ── -->
            <div v-else-if="anime" class="flex flex-col">
              <!-- Hero -->
              <div class="relative">
                <div class="absolute inset-0 h-40 overflow-hidden" aria-hidden="true">
                  <img
                    v-if="poster"
                    :src="poster"
                    alt=""
                    class="h-full w-full scale-110 object-cover opacity-25 blur-2xl"
                  />
                  <div class="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
                </div>
                <div class="relative flex gap-4 p-5">
                  <div class="aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-lg border border-line-strong bg-bg-subtle shadow-panel">
                    <img
                      v-if="poster"
                      :src="poster"
                      :alt="`Cover art for ${anime.title}`"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <div class="min-w-0 flex-1 pt-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span v-if="anime.type" class="rounded-md bg-bg-subtle px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-fg-subtle ring-1 ring-line">
                        {{ anime.type }}
                      </span>
                      <span
                        v-if="anime.status"
                        class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium ring-1"
                        :class="anime.airing ? 'text-positive ring-positive/30 bg-positive/10' : 'text-fg-subtle ring-line bg-bg-subtle'"
                      >
                        <span v-if="anime.airing" class="h-1.5 w-1.5 rounded-full bg-positive" />
                        {{ anime.airing ? 'Airing' : anime.status }}
                      </span>
                    </div>
                    <h2 class="mt-2 text-xl font-semibold leading-tight text-fg">
                      {{ anime.title }}
                    </h2>
                    <p v-if="englishTitle" class="mt-0.5 text-sm text-fg-subtle">{{ englishTitle }}</p>
                    <p v-if="anime.title_japanese" class="mt-1 text-xs text-fg-faint">{{ anime.title_japanese }}</p>

                    <!-- Genres -->
                    <div v-if="anime.genres?.length" class="mt-3 flex flex-wrap gap-1.5">
                      <NuxtLink
                        v-for="g in anime.genres"
                        :key="g.mal_id"
                        :to="`/browse?genres=${g.mal_id}`"
                        class="rounded-md bg-bg-subtle px-2 py-0.5 text-2xs font-medium text-fg-subtle ring-1 ring-line transition-colors hover:bg-panel hover:text-fg"
                        @click="close"
                      >
                        {{ g.name }}
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stat row -->
              <div class="grid grid-cols-4 gap-2 px-5">
                <div
                  v-for="s in stats"
                  :key="s.label"
                  class="flex flex-col items-center gap-0.5 rounded-lg border border-line bg-panel py-2.5"
                >
                  <span class="text-sm font-semibold tabular-nums text-fg">{{ s.value }}</span>
                  <span class="text-[0.62rem] uppercase tracking-wide text-fg-faint">{{ s.label }}</span>
                </div>
              </div>

              <!-- Synopsis -->
              <section v-if="synopsis" class="px-5 pt-6">
                <h3 class="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint">Synopsis</h3>
                <p class="text-sm leading-relaxed text-fg-muted">{{ synopsis }}</p>
              </section>

              <!-- Trailer -->
              <section v-if="trailerUrl" class="px-5 pt-6">
                <h3 class="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-fg-faint">
                  <AppIcon name="play" :size="12" /> Trailer
                </h3>
                <div class="aspect-video w-full overflow-hidden rounded-lg border border-line bg-bg-subtle">
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

              <!-- Facts table -->
              <section class="px-5 pt-6">
                <h3 class="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint">Information</h3>
                <dl class="divide-y divide-line overflow-hidden rounded-lg border border-line">
                  <div
                    v-for="f in facts"
                    :key="f.label"
                    class="flex items-start justify-between gap-4 bg-panel px-3 py-2 text-sm"
                  >
                    <dt class="shrink-0 text-fg-subtle">{{ f.label }}</dt>
                    <dd class="text-right text-fg">{{ f.value }}</dd>
                  </div>
                </dl>
              </section>

              <!-- Recommendations -->
              <section v-if="recs.length" class="px-5 pt-6">
                <h3 class="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-faint">More like this</h3>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="r in recs"
                    :key="r.entry.mal_id"
                    type="button"
                    class="group flex flex-col gap-1 text-left"
                    @click="openRecommendation(r.entry.mal_id)"
                  >
                    <div class="aspect-[3/4] w-full overflow-hidden rounded-md border border-line bg-bg-subtle">
                      <img
                        :src="r.entry.images?.jpg?.image_url ?? ''"
                        :alt="r.entry.title"
                        loading="lazy"
                        class="h-full w-full object-cover transition-transform duration-300 ease-house group-hover:scale-105"
                      />
                    </div>
                    <span class="line-clamp-2 text-2xs leading-tight text-fg-subtle group-hover:text-fg">
                      {{ r.entry.title }}
                    </span>
                  </button>
                </div>
              </section>

              <!-- Footer actions -->
              <div class="mt-6 flex items-center gap-2 border-t border-line px-5 py-4">
                <NuxtLink
                  :to="`/anime/${anime.mal_id}`"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
                  @click="close"
                >
                  Open full page
                  <AppIcon name="chevron-right" :size="14" />
                </NuxtLink>
                <a
                  :href="anime.url"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  MyAnimeList
                  <AppIcon name="external" :size="13" />
                </a>
              </div>
            </div>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-fade-enter-active {
  transition: opacity 0.2s var(--ease-house);
}
.drawer-fade-leave-active {
  transition: opacity 0.2s var(--ease-house);
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
</style>
