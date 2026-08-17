<script setup lang="ts">
/**
 * Menu anchored to a trigger.
 *
 * Closes on outside click and on Escape, and returns focus to the trigger afterwards —
 * without that, keyboard focus is left on a detached element and the user is stranded.
 *
 * Positioning uses logical insets (`start-0` / `end-0`), so an `align="start"` menu opens
 * from the correct edge in Arabic without any RTL-specific code.
 */
const props = withDefaults(defineProps<{
  label: string
  align?: 'start' | 'end'
}>(), {
  align: 'end',
})

const open = shallowRef(false)
const rootRef = useTemplateRef<HTMLElement>('root')
const triggerRef = useTemplateRef<HTMLButtonElement>('trigger')
const menuId = useId()

function close(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) triggerRef.value?.focus()
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!open.value) return
  const root = rootRef.value
  if (root && !root.contains(event.target as Node)) close(false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <div
    ref="root"
    class="relative inline-block"
    @keydown="onKeydown"
  >
    <button
      ref="trigger"
      type="button"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-haspopup="menu"
      class="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm
             transition-colors hover:bg-surface-hover
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      @click="open = !open"
    >
      <slot name="trigger">
        {{ props.label }}
      </slot>
    </button>

    <div
      v-if="open"
      :id="menuId"
      role="menu"
      class="absolute top-full z-20 mt-1 min-w-48 rounded-md border border-border bg-surface p-1 shadow-overlay"
      :class="align === 'end' ? 'end-0' : 'start-0'"
    >
      <slot :close="close" />
    </div>
  </div>
</template>
