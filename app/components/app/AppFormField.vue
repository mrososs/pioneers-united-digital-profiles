<script setup lang="ts">
/**
 * Label + help text + error message wrapper.
 *
 * Exists so that the wiring accessibility depends on — `for`/`id`, `aria-describedby`,
 * `aria-invalid`, `role="alert"` — is written once and cannot be forgotten per form.
 * It hands the resolved ids to its slot so the control inside can bind them.
 *
 * DESIGN SYSTEM
 *   Field labels are Latin micro-caps: 12px, 600, 0.09em, uppercase. That is a
 *   brand signature and it breaks in Arabic, which takes neither tracking nor
 *   case changes — `.pu-label-caps` carries the RTL reset so no call site has to
 *   remember it. The optional marker is pushed to the trailing edge with
 *   `ms-auto`, which mirrors correctly.
 */
const props = defineProps<{
  label: string
  /** Id of the control. Generated when omitted. */
  inputId?: string
  hint?: string
  /** Translated message. Presence is what marks the field invalid. */
  error?: string | null
  required?: boolean
  /** Renders an "optional" marker at the trailing edge of the label row. */
  optionalLabel?: string
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
      class="pu-label-caps flex items-center gap-1.5 text-muted-fg"
    >
      {{ label }}
      <span
        v-if="required"
        class="text-danger"
        aria-hidden="true"
      >*</span>
      <span
        v-if="optionalLabel && !required"
        class="ms-auto text-2xs font-normal tracking-normal text-faint normal-case"
      >{{ optionalLabel }}</span>
    </label>

    <slot
      :id="controlId"
      :described-by="describedBy"
      :invalid="Boolean(error)"
    />

    <p
      v-if="hint && !error"
      :id="hintId"
      class="text-2xs text-muted-fg"
    >
      {{ hint }}
    </p>

    <p
      v-if="error"
      :id="errorId"
      class="flex items-center gap-1.5 text-2xs text-danger"
      role="alert"
    >
      <AppIcon
        name="circle-alert"
        :size="14"
      />
      {{ error }}
    </p>
  </div>
</template>
