<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
  placeholder?: string
  rows?: number
  invalid?: boolean
  disabled?: boolean
  describedBy?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  maxlength?: number
}>(), {
  rows: 4,
  invalid: false,
  disabled: false,
  dir: 'auto',
})

/**
 * Multi-line text. `dir="auto"` for the same bilingual reason as AppInput, and
 * the same field treatment: 112px minimum height, 4px radius, navy border plus
 * halo on focus.
 */
const model = defineModel<string | null>({ default: '' })
</script>

<template>
  <textarea
    :id="id"
    v-model="model"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    :dir="dir"
    :maxlength="maxlength"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedBy"
    class="min-h-28 w-full resize-y rounded-sm border bg-input px-3.5 py-2.5 text-sm text-foreground
           transition-[border-color,box-shadow] duration-[160ms] ease-standard
           placeholder:text-faint
           hover:border-border-strong
           focus:border-primary focus:outline-none
           disabled:cursor-not-allowed disabled:bg-input-disabled disabled:text-faint"
    :class="invalid
      ? 'border-danger focus:border-danger focus:shadow-focus-danger'
      : 'border-border-default focus:shadow-focus'"
  />
</template>
