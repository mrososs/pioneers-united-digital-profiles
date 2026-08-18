<script setup lang="ts">
/**
 * Surface container. The one place card padding, radius and elevation are decided.
 *
 * DESIGN SYSTEM
 *   Hairline first: a 1px `rgba(25,35,65,.08)` border, an 8px radius and a
 *   shadow faint enough to read as a lift rather than a glow. Cards pad 24,
 *   tight cards 16. Only menus and dialogs get real elevation.
 *
 *   `quiet` is the sand-tinted, borderless variant used for panels that sit
 *   inside another card. `inverse` is the navy panel used on the profile hero
 *   and the admin namespace card.
 */
withDefaults(defineProps<{
  as?: 'div' | 'section' | 'article' | 'li'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'default' | 'quiet' | 'inverse'
  /** Adds the hover lift. Only for a card that is itself a link or a button. */
  interactive?: boolean
}>(), {
  as: 'div',
  padding: 'md',
  tone: 'default',
  interactive: false,
})

const PADDING_CLASS = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

const TONE_CLASS = {
  default: 'border-border bg-surface shadow-card',
  quiet: 'border-transparent bg-muted',
  inverse: 'border-transparent bg-surface-inverse text-on-navy-78',
}
</script>

<template>
  <component
    :is="as"
    class="rounded-lg border"
    :class="[
      TONE_CLASS[tone],
      PADDING_CLASS[padding],
      interactive
        ? 'cursor-pointer transition-[box-shadow,border-color,transform] duration-[240ms] ease-standard hover:border-border-default hover:shadow-raised motion-safe:hover:-translate-y-px'
        : '',
    ]"
  >
    <slot />
  </component>
</template>
