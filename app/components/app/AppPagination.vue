<script setup lang="ts">
/**
 * Page stepper.
 *
 * Wrapped in `<nav aria-label>` so it is reachable as a landmark, and the current page is
 * announced through a live region rather than being colour-only. Emits an intent
 * (`update:page`) instead of navigating, so the parent stays in charge of the URL.
 *
 * The chevrons are directional glyphs, so they flip under RTL — "previous" must
 * point towards the start of the reading order in both languages.
 */
const props = defineProps<{
  page: number
  totalPages: number
  total: number
  perPage: number
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()

const { t } = useI18n()

const canGoBack = computed(() => props.page > 1)
const canGoForward = computed(() => props.page < props.totalPages)

const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1))
const to = computed(() => Math.min(props.page * props.perPage, props.total))
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
    :aria-label="t('common.pagination.page', { page, total: totalPages })"
  >
    <p
      class="text-xs text-muted-fg"
      aria-live="polite"
    >
      {{ t('common.pagination.showing', { from, to, total }) }}
    </p>

    <div class="flex items-center gap-2">
      <AppButton
        variant="secondary"
        size="sm"
        :disabled="!canGoBack"
        @click="emit('update:page', page - 1)"
      >
        <AppIcon
          name="chevron-left"
          :size="15"
          class="rtl:rotate-180"
        />
        {{ t('common.pagination.previous') }}
      </AppButton>

      <!-- `tabular-nums`, not `.pu-num`: this is a translated sentence with a
           number inside it, so it must follow the page direction. `.pu-num`
           forces LTR and is only for a bare figure. -->
      <span class="px-1 text-xs tabular-nums text-muted-fg">
        {{ t('common.pagination.page', { page, total: totalPages }) }}
      </span>

      <AppButton
        variant="secondary"
        size="sm"
        :disabled="!canGoForward"
        @click="emit('update:page', page + 1)"
      >
        {{ t('common.pagination.next') }}
        <AppIcon
          name="chevron-right"
          :size="15"
          class="rtl:rotate-180"
        />
      </AppButton>
    </div>
  </nav>
</template>
