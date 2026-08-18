<script setup lang="ts">
/**
 * Native `<select>`.
 *
 * Native on purpose: it gets platform keyboard behaviour, the correct mobile picker and
 * RTL handling for free. A custom listbox would need all three reimplemented, and a
 * dashboard has no styling need that justifies it.
 *
 * The browser's own arrow is suppressed and replaced with the design system's
 * `chevron-down` glyph, positioned with a logical inset so it moves to the left
 * edge in Arabic. The chevron is `pointer-events-none`, so clicking it still
 * opens the native picker.
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
  <div class="relative flex w-full items-center">
    <select
      :id="id"
      v-model="model"
      :disabled="disabled"
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="h-10.5 w-full cursor-pointer appearance-none rounded-sm border bg-input ps-3.5 pe-9 text-sm text-foreground
             transition-[border-color,box-shadow] duration-[160ms] ease-standard
             hover:border-border-strong
             focus:border-primary focus:outline-none
             disabled:cursor-not-allowed disabled:bg-input-disabled disabled:text-faint"
      :class="invalid
        ? 'border-danger focus:border-danger focus:shadow-focus-danger'
        : 'border-border-default focus:shadow-focus'"
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

    <AppIcon
      name="chevron-down"
      :size="16"
      class="pointer-events-none absolute end-3 text-muted-fg"
    />
  </div>
</template>
