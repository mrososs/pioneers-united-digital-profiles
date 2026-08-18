<script setup lang="ts">
/**
 * Modal dialog built on the native `<dialog>` element.
 *
 * Native gives focus trapping, Escape-to-close, the top layer and `::backdrop` without
 * a focus-management library. `showModal()`/`close()` are imperative, so the open prop
 * is mirrored into the element with a watcher, and the element's own `close` event is
 * re-emitted so an Escape press updates the parent's state instead of desynchronising it.
 *
 * `aria-labelledby` points at the title, which is why `title` is required.
 *
 * DESIGN SYSTEM
 *   A dialog is one of only two things given real elevation (`shadow-modal`);
 *   the scrim is the fixed `rgba(11,16,32,.52)`. Entry is a 240ms fade with an
 *   8px rise, matching the system's surface duration, and it is skipped for
 *   reduced-motion visitors by the global rule in main.css.
 */
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  size: 'md',
})

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const descriptionId = useId()

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
}

watch(() => props.open, (isOpen) => {
  const dialog = dialogRef.value
  if (!dialog) return

  if (isOpen && !dialog.open) dialog.showModal()
  if (!isOpen && dialog.open) dialog.close()
}, { flush: 'post' })

onMounted(() => {
  if (props.open) dialogRef.value?.showModal()
})

/** Clicking the backdrop closes: the click lands on the dialog element itself. */
function onBackdropClick(event: MouseEvent) {
  if (event.target === dialogRef.value) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descriptionId : undefined"
    class="m-auto w-[calc(100%-2rem)] rounded-lg border-0 bg-surface p-0 text-body shadow-modal
           backdrop:bg-[rgb(11_16_32_/_0.52)]
           motion-safe:open:animate-[pu-dialog-in_240ms_var(--ease-out-soft)]"
    :class="SIZE_CLASS[size]"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div class="flex flex-col">
      <div class="flex items-start justify-between gap-4 px-6 pt-6">
        <div class="min-w-0">
          <h2
            :id="titleId"
            class="text-xl font-semibold text-heading"
          >
            {{ title }}
          </h2>
          <p
            v-if="description"
            :id="descriptionId"
            class="mt-1.5 text-sm text-body"
          >
            {{ description }}
          </p>
        </div>

        <AppIconButton
          :label="t('common.actions.close')"
          size="sm"
          @click="emit('close')"
        >
          <AppIcon
            name="x"
            :size="17"
          />
        </AppIconButton>
      </div>

      <div class="px-6 py-4.5">
        <slot />
      </div>

      <div
        v-if="$slots.footer"
        class="flex flex-wrap items-center justify-end gap-3 px-6 pt-2 pb-6"
      >
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>
