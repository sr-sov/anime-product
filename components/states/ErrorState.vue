<script setup lang="ts">
/** Error state with a retry path. Names what broke and what to do next. */
defineProps<{ message?: string }>()
const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line py-20 text-center"
  >
    <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-warn/10 text-warn">
      <AppIcon name="alert" :size="22" />
    </span>
    <div>
      <p class="text-sm font-medium text-fg">Couldn’t load that</p>
      <p class="mx-auto mt-1 max-w-sm text-sm text-fg-subtle">
        {{ message || 'The request to the Jikan API failed. It rate-limits aggressively — give it a second and try again.' }}
      </p>
    </div>
    <button
      type="button"
      class="mt-1 inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      @click="emit('retry')"
    >
      <AppIcon name="loader" :size="14" />
      Try again
    </button>
  </div>
</template>
