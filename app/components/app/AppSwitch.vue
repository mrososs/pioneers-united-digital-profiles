<script setup lang="ts">
const props = withDefaults(defineProps<{
  label: string
  id?: string
  disabled?: boolean
  describedBy?: string
}>(), {
  disabled: false,
})

/**
 * Boolean toggle.
 *
 * Built on `role="switch"` with `aria-checked` rather than a styled checkbox, and it
 * responds to Space/Enter because it is a real `<button>`. The knob translation uses a
 * logical direction (`ltr:` / `rtl:`) so the "on" position is on the correct side in
 * Arabic — a hard-coded translate-x would slide the wrong way.
 */
const model = defineModel<boolean>({ default: false })

function toggle() {
  if (props.disabled) return
  model.value = !model.value
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :aria-describedby="describedBy"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent
           transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
           disabled:cursor-not-allowed disabled:opacity-50"
    :class="model ? 'bg-primary' : 'bg-border-strong'"
    @click="toggle"
  >
    <span
      class="pointer-events-none block size-5 rounded-full bg-surface shadow-card transition-transform"
      :class="model ? 'ltr:translate-x-5 rtl:-translate-x-5' : 'translate-x-0'"
    />
  </button>
</template>
