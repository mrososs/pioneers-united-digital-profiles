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

/** Multi-line text. `dir="auto"` for the same bilingual reason as AppInput. */
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
    class="w-full resize-y rounded-md border bg-input px-3 py-2 text-sm text-foreground transition-colors
           placeholder:text-muted-fg
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
           disabled:cursor-not-allowed disabled:opacity-60"
    :class="invalid ? 'border-danger' : 'border-border'"
  />
</template>
