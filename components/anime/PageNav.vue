<script setup lang="ts">
/** Compact prev/next pager with a current-page readout. Keyboard reachable. */
const props = defineProps<{
  page: number
  totalPages: number
  hasNext: boolean
}>()

const emit = defineEmits<{ (e: 'go', page: number): void }>()
</script>

<template>
  <nav class="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
      :disabled="page <= 1"
      @click="emit('go', page - 1)"
    >
      <AppIcon name="chevron-left" :size="14" />
      Prev
    </button>
    <span class="px-3 text-sm tabular-nums text-fg-subtle">
      Page <span class="font-medium text-fg">{{ page }}</span>
      <span v-if="totalPages > 1"> of {{ totalPages }}</span>
    </span>
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line"
      :disabled="!hasNext"
      @click="emit('go', page + 1)"
    >
      Next
      <AppIcon name="chevron-right" :size="14" />
    </button>
  </nav>
</template>
