<script setup lang="ts">
/**
 * Label + help text + error message wrapper.
 *
 * Exists so that the wiring accessibility depends on — `for`/`id`, `aria-describedby`,
 * `aria-invalid`, `role="alert"` — is written once and cannot be forgotten per form.
 * It hands the resolved ids to its slot so the control inside can bind them.
 */
const props = defineProps<{
  label: string
  /** Id of the control. Generated when omitted. */
  inputId?: string
  hint?: string
  /** Translated message. Presence is what marks the field invalid. */
  error?: string | null
  required?: boolean
}>()

const generatedId = useId()

const controlId = computed(() => props.inputId ?? generatedId)
const hintId = computed(() => (props.hint ? `${controlId.value}-hint` : undefined))
const errorId = computed(() => (props.error ? `${controlId.value}-error` : undefined))

const describedBy = computed(() => {
  const ids = [errorId.value, hintId.value].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      :for="controlId"
      class="text-sm font-medium text-foreground"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-danger"
        aria-hidden="true"
      >*</span>
    </label>

    <slot
      :id="controlId"
      :described-by="describedBy"
      :invalid="Boolean(error)"
    />

    <p
      v-if="hint && !error"
      :id="hintId"
      class="text-xs text-muted-fg"
    >
      {{ hint }}
    </p>

    <p
      v-if="error"
      :id="errorId"
      class="text-xs text-danger"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
