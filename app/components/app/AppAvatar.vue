<script setup lang="ts">
/**
 * Profile photograph with an initials fallback.
 *
 * The fallback matters more than it looks: a profile can be published before its photo
 * is uploaded, and a broken image icon on an executive's card is worse than initials.
 * `@error` catches a photo whose storage object was removed after publication.
 *
 * Initials are taken by grapheme-ish slicing of the first two words, which works for
 * Arabic as well as Latin names; `Intl.Segmenter` would be more correct but is overkill
 * for two characters.
 */
const props = withDefaults(defineProps<{
  src?: string | null
  /** Full name — used for initials and for the image's alt text. */
  name: string
  /** Accessible description. Falls back to the name when omitted. */
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}>(), {
  size: 'md',
})

const failed = shallowRef(false)

watch(() => props.src, () => {
  failed.value = false
})

const SIZE_CLASS = {
  'sm': 'size-8 text-xs',
  'md': 'size-10 text-sm',
  'lg': 'size-16 text-lg',
  'xl': 'size-24 text-2xl',
  '2xl': 'size-32 text-4xl',
}

const initials = computed(() =>
  props.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => [...word][0] ?? '')
    .join('')
    .toUpperCase(),
)

const showImage = computed(() => Boolean(props.src) && !failed.value)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-fg"
    :class="SIZE_CLASS[size]"
  >
    <img
      v-if="showImage"
      :src="src ?? undefined"
      :alt="alt ?? name"
      class="size-full object-cover"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    >
    <span
      v-else
      aria-hidden="true"
    >{{ initials }}</span>
  </span>
</template>
