<script setup lang="ts">
/**
 * Layout for the print-only profile view (`app/pages/[slug]/print.vue`).
 *
 * No header, no footer, no skip link — a headless browser is the only visitor,
 * and every one of those things is either irrelevant to it or, in the skip
 * link's case, chrome that would show up as an odd first line on the PDF.
 */
</script>

<template>
  <div class="bg-background">
    <slot />
  </div>
</template>
