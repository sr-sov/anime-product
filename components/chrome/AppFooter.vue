<script setup lang="ts">
/** Minimal product footer — credits + the data source, nothing decorative. */
</script>

<template>
  <footer class="mt-20 border-t border-line">
    <div
      class="container-page flex flex-col gap-2 py-6 text-2xs text-fg-faint sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        <span class="font-medium text-fg-subtle">Senkō</span>
        · a keyboard-first anime index. Data from the
        <a
          href="https://jikan.moe"
          target="_blank"
          rel="noopener"
          class="text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
          >Jikan</a
        >
        (MyAnimeList) API.
      </p>
      <p class="flex items-center gap-1.5">
        Press
        <kbd class="kbd">/</kbd>
        anywhere to search.
      </p>
    </div>
  </footer>
</template>
