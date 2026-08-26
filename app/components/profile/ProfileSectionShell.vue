<script setup lang="ts">
/**
 * The chrome every structured content block shares: the anchor target, the
 * micro-cap heading and the spacing between heading and content.
 *
 * WHY A SHELL RATHER THAN REPEATING THE HEADER IN EACH RENDERER
 *   There are nine renderers. Without this, the eyebrow's classes, the heading
 *   level, the scroll offset and the gap would be written nine times, and the
 *   tenth block would get one of them subtly wrong. Each renderer is now only the
 *   part that actually differs — how its items are drawn.
 *
 * `scroll-mt` is what makes the anchor navigation land correctly: without it a
 * jump puts the heading underneath the sticky bar. The value tracks the bar's
 * height, and is the reason the bar's height is a constant rather than intrinsic.
 */
defineProps<{
  /** Fragment id. Must match what ProfileSectionNav links to. */
  anchor: string
  title: string
}>()
</script>

<template>
  <section
    :id="anchor"
    class="flex scroll-mt-20 flex-col gap-3 lg:scroll-mt-24"
  >
    <h2 class="pu-eyebrow text-muted-fg">
      {{ title }}
    </h2>

    <slot />
  </section>
</template>
