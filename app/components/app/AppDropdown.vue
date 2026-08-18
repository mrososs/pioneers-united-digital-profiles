<script setup lang="ts">
/**
 * Menu anchored to a trigger.
 *
 * Closes on outside click and on Escape, and returns focus to the trigger afterwards —
 * without that, keyboard focus is left on a detached element and the user is stranded.
 *
 * Positioning uses logical insets (`start-0` / `end-0`), so an `align="start"` menu opens
 * from the correct edge in Arabic without any RTL-specific code.
 *
 * DESIGN SYSTEM
 *   A menu is the other surface given real elevation (`shadow-overlay`), at a
 *   6px radius with 2px item corners and a 212px minimum width. The trigger's
 *   chevron rotates on open — a state change, not decoration — at the control
 *   duration.
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
      class="inline-flex h-10.5 items-center gap-2 rounded-sm border border-border-default bg-surface px-3.5 text-sm text-heading
             transition-[background-color,border-color] duration-[160ms] ease-standard
             hover:border-border-strong hover:bg-surface-hover
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      @click="open = !open"
    >
      <slot name="trigger">
        {{ props.label }}
      </slot>

      <AppIcon
        name="chevron-down"
        :size="16"
        class="text-muted-fg transition-transform duration-[160ms] ease-standard"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="open"
      :id="menuId"
      role="menu"
      class="absolute top-full z-20 mt-1.5 min-w-[212px] rounded-md border border-border bg-surface p-1.5 shadow-overlay
             motion-safe:animate-[pu-dialog-in_160ms_var(--ease-out-soft)]"
      :class="align === 'end' ? 'end-0' : 'start-0'"
    >
      <slot :close="close" />
    </div>
  </div>
</template>
