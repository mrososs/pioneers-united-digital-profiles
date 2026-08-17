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

const dialogRef = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const descriptionId = useId()

const SIZE_CLASS = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
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
    class="m-auto w-[calc(100%-2rem)] rounded-lg border border-border bg-surface p-0 text-foreground shadow-overlay
           backdrop:bg-black/40"
    :class="SIZE_CLASS[size]"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2
            :id="titleId"
            class="text-lg font-semibold"
          >
            {{ title }}
          </h2>
          <p
            v-if="description"
            :id="descriptionId"
            class="mt-1 text-sm text-muted-fg"
          >
            {{ description }}
          </p>
        </div>

        <AppIconButton
          :label="$t('common.actions.close')"
          size="sm"
          @click="emit('close')"
        >
          <span aria-hidden="true">&times;</span>
        </AppIconButton>
      </div>

      <div>
        <slot />
      </div>

      <div
        v-if="$slots.footer"
        class="flex flex-wrap justify-end gap-2"
      >
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>
