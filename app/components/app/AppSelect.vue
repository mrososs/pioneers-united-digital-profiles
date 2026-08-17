<script setup lang="ts">
/**
 * Native `<select>`.
 *
 * Native on purpose: it gets platform keyboard behaviour, the correct mobile picker and
 * RTL handling for free. A custom listbox would need all three reimplemented, and a
 * dashboard has no styling need that justifies it.
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

withDefaults(defineProps<{
  options: SelectOption[]
  id?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  describedBy?: string
}>(), {
  invalid: false,
  disabled: false,
})

const model = defineModel<string | null>({ default: null })
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :disabled="disabled"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedBy"
    class="h-10 w-full rounded-md border bg-input px-3 text-sm text-foreground transition-colors
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
           disabled:cursor-not-allowed disabled:opacity-60"
    :class="invalid ? 'border-danger' : 'border-border'"
  >
    <option
      v-if="placeholder"
      :value="null"
      disabled
    >
      {{ placeholder }}
    </option>

    <option
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>
