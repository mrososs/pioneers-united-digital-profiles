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
  /** Renders the value in IBM Plex Mono. For slugs, URLs and IDs. */
  mono?: boolean
}>(), {
  type: 'text',
  invalid: false,
  disabled: false,
  readonly: false,
  dir: 'auto',
  mono: false,
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
 *
 * DESIGN SYSTEM
 *   42px tall, 14px inline padding, 4px radius. Focus replaces the global
 *   outline with the field treatment the system specifies — a navy border plus
 *   a 3px halo — which is a stronger indicator here than a detached ring,
 *   because it also marks which field is invalid when both states coincide.
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
    class="h-10.5 w-full rounded-sm border bg-input px-3.5 text-sm text-foreground
           transition-[border-color,box-shadow] duration-[160ms] ease-standard
           placeholder:text-faint
           hover:border-border-strong
           focus:border-primary focus:outline-none
           disabled:cursor-not-allowed disabled:bg-input-disabled disabled:text-faint"
    :class="[
      invalid
        ? 'border-danger focus:border-danger focus:shadow-focus-danger'
        : 'border-border-default focus:shadow-focus',
      mono ? 'pu-mono text-xs' : '',
    ]"
  >
</template>
