<script setup lang="ts">
withDefaults(defineProps<{
  id?: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search'
  placeholder?: string
  autocomplete?: string
  invalid?: boolean
  disabled?: boolean
  readonly?: boolean
  describedBy?: string
  inputmode?: 'text' | 'email' | 'tel' | 'url' | 'numeric'
  /** Pins direction. Leave unset so `auto` handles mixed-language content. */
  dir?: 'ltr' | 'rtl' | 'auto'
  maxlength?: number
}>(), {
  type: 'text',
  invalid: false,
  disabled: false,
  readonly: false,
  dir: 'auto',
})

/**
 * Text input.
 *
 * `defineModel` gives a real two-way contract without the modelValue/update pair.
 *
 * `dir="auto"` is deliberate and important: a bilingual dashboard has Arabic fields on
 * an English page and vice versa, and `auto` lets the browser resolve each value's
 * direction from its own first strong character. Forcing the page direction here would
 * render Arabic names with punctuation on the wrong side.
 */
const model = defineModel<string | null>({ default: '' })
</script>

<template>
  <input
    :id="id"
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    :disabled="disabled"
    :readonly="readonly"
    :inputmode="inputmode"
    :dir="dir"
    :maxlength="maxlength"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedBy"
    class="h-10 w-full rounded-md border bg-input px-3 text-sm text-foreground transition-colors
           placeholder:text-muted-fg
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
           disabled:cursor-not-allowed disabled:opacity-60"
    :class="invalid ? 'border-danger' : 'border-border'"
  >
</template>
