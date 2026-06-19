<script setup lang="ts">
/**
 * Skeleton grid shown while a result page loads. Mirrors the real grid's tile
 * proportions exactly so content swaps in with zero layout shift. Pure
 * presentation — count is configurable.
 */
withDefaults(defineProps<{ count?: number }>(), { count: 18 })
</script>

<template>
  <ul
    class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    aria-hidden="true"
  >
    <li
      v-for="i in count"
      :key="i"
      class="overflow-hidden rounded-xl border border-line bg-panel"
    >
      <div class="skeleton aspect-[3/4] w-full" />
      <div class="space-y-2 p-3">
        <div class="skeleton h-3.5 w-4/5 rounded" />
        <div class="skeleton h-2.5 w-1/2 rounded" />
      </div>
    </li>
  </ul>
</template>
