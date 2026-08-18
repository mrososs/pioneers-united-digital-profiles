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
 *
 * DESIGN SYSTEM: 40x22 track, 18px knob, 160ms on the standard curve.
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
    class="relative inline-flex h-5.5 w-10 shrink-0 items-center rounded-full
           transition-colors duration-[160ms] ease-standard
           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
           disabled:cursor-not-allowed disabled:opacity-50"
    :class="model
      ? 'bg-primary hover:bg-primary-hover'
      : 'bg-border-strong hover:bg-faint'"
    @click="toggle"
  >
    <span
      class="pointer-events-none absolute start-0.5 block size-4.5 rounded-full bg-white
             shadow-[0_1px_2px_rgb(11_16_32_/_0.28)]
             transition-transform duration-[160ms] ease-standard"
      :class="model ? 'ltr:translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0'"
    />
  </button>
</template>
