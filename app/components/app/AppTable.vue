<script setup lang="ts" generic="TRow extends { id: string }">
/**
 * Data table.
 *
 * Generic over the row type so a caller's cell slots are typed rather than `any`.
 *
 * Two details that are easy to get wrong and are handled here:
 *   * the table scrolls inside its own `overflow-x-auto` wrapper, so a wide table never
 *     makes the whole page scroll sideways — which on a phone breaks the layout;
 *   * `<caption>` is present but visually hidden, giving screen readers the table's
 *     purpose without adding a visible heading.
 */
export interface TableColumn {
  key: string
  label: string
  /** Right/end-aligned for numeric or action columns. */
  align?: 'start' | 'end'
  /** Hidden below `sm`. Use for columns that are not essential on a phone. */
  hideOnMobile?: boolean
}

defineProps<{
  columns: TableColumn[]
  rows: TRow[]
  caption: string
  loading?: boolean
  rowKey?: (row: TRow) => string
}>()

defineSlots<{
  cell: (props: { row: TRow, column: TableColumn }) => unknown
  empty: () => unknown
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{ caption }}
      </caption>

      <thead class="bg-muted/60">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-4 py-3 font-medium text-muted-fg"
            :class="[
              column.align === 'end' ? 'text-end' : 'text-start',
              column.hideOnMobile ? 'hidden sm:table-cell' : '',
            ]"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="loading">
          <td
            :colspan="columns.length"
            class="px-4 py-6"
          >
            <div
              role="status"
              class="flex flex-col gap-2"
            >
              <AppSkeleton variant="text" />
              <AppSkeleton
                variant="text"
                width="70%"
              />
              <AppSkeleton
                variant="text"
                width="45%"
              />
            </div>
          </td>
        </tr>

        <tr v-else-if="rows.length === 0">
          <td
            :colspan="columns.length"
            class="px-4 py-6"
          >
            <slot name="empty" />
          </td>
        </tr>

        <tr
          v-for="row in rows"
          v-else
          :key="rowKey ? rowKey(row) : row.id"
          class="border-t border-border transition-colors hover:bg-surface-hover"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            class="px-4 py-3 align-middle"
            :class="[
              column.align === 'end' ? 'text-end' : 'text-start',
              column.hideOnMobile ? 'hidden sm:table-cell' : '',
            ]"
          >
            <slot
              name="cell"
              :row="row"
              :column="column"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
