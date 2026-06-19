<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

function goHome() {
  // clearError navigates back into the app and resets the error boundary.
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <main class="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p class="font-mono text-6xl font-semibold text-accent">
        {{ error.statusCode || 'Error' }}
      </p>
      <h1 class="mt-4 text-2xl font-semibold tracking-tight text-fg">
        {{ error.statusCode === 404 ? 'Page not found' : 'Something broke' }}
      </h1>
      <p class="mt-2 max-w-md text-sm text-fg-subtle">
        {{
          error.statusCode === 404
            ? 'That route does not exist. Head back and search for a title with ⌘K.'
            : 'An unexpected error occurred. Try heading home and starting again.'
        }}
      </p>
      <button
        type="button"
        class="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        @click="goHome"
      >
        <AppIcon name="home" :size="15" />
        Back to home
      </button>
    </main>
  </div>
</template>
