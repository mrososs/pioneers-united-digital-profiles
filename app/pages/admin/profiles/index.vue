<script setup lang="ts">
import type { PaginatedResult } from '#shared/types/api'
import type { ProfileListItem } from '#shared/types/profile'
import type { TableColumn } from '~/components/app/AppTable.vue'

/**
 * Profile list.
 *
 * Filters live in the URL query, not in local state: a filtered view is then bookmarkable
 * and survives a reload, and the back button behaves as the user expects. `useFetch`
 * re-runs automatically because the query object is reactive.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const { pick } = useLocalizedField()

const search = shallowRef(typeof route.query.search === 'string' ? route.query.search : '')
const page = computed(() => {
  const raw = Number(route.query.page ?? 1)
  return Number.isFinite(raw) && raw >= 1 ? Math.trunc(raw) : 1
})

const { data, status, refresh } = await useFetch<PaginatedResult<ProfileListItem>>(
  '/api/admin/profiles',
  {
    query: computed(() => ({
      page: page.value,
      perPage: 20,
      ...(search.value ? { search: search.value } : {}),
    })),
  },
)

const columns = computed<TableColumn[]>(() => [
  { key: 'name', label: t('admin.profiles.columns.name') },
  { key: 'slug', label: t('admin.profiles.columns.slug'), hideOnMobile: true },
  { key: 'status', label: t('admin.profiles.columns.status') },
  { key: 'actions', label: t('admin.profiles.columns.actions'), align: 'end' },
])

function goToPage(next: number) {
  return router.push({ query: { ...route.query, page: next } })
}

/** Debounce is deliberate: a keystroke-per-request search would hammer the API. */
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(search, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void router.push({ query: { ...route.query, search: value || undefined, page: 1 } })
  }, 300)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

useSeoMeta({
  title: () => t('admin.profiles.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.profiles.title')"
      :description="t('admin.profiles.description')"
    >
      <template #actions>
        <AppButton
          :to="localePath('/admin/profiles/new')"
          size="sm"
        >
          {{ t('common.actions.create') }}
        </AppButton>
      </template>
    </AdminPageHeader>

    <div class="max-w-sm">
      <AppFormField
        v-slot="{ id }"
        :label="t('common.actions.search')"
      >
        <AppInput
          :id="id"
          v-model="search"
          type="search"
          :placeholder="t('admin.profiles.searchPlaceholder')"
        />
      </AppFormField>
    </div>

    <AppTable
      :columns="columns"
      :rows="data?.items ?? []"
      :loading="status === 'pending'"
      :caption="t('admin.profiles.title')"
    >
      <template #empty>
        <AppEmptyState
          :title="t('admin.profiles.empty')"
          :description="t('admin.profiles.emptyDescription')"
        >
          <template #action>
            <AppButton
              :to="localePath('/admin/profiles/new')"
              size="sm"
            >
              {{ t('common.actions.create') }}
            </AppButton>
          </template>
        </AppEmptyState>
      </template>

      <template #cell="{ row, column }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center gap-3">
            <AppAvatar
              :src="row.photoUrl"
              :name="pick(row.nameEn, row.nameAr) ?? row.nameEn"
              size="sm"
            />
            <div class="min-w-0">
              <p class="truncate font-medium text-foreground">
                {{ pick(row.nameEn, row.nameAr) }}
              </p>
              <p class="truncate text-xs text-muted-fg">
                {{ pick(row.jobTitleEn, row.jobTitleAr) ?? t('common.notAvailable') }}
              </p>
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'slug'">
          <span
            class="font-mono text-xs text-muted-fg"
            dir="ltr"
          >/{{ row.slug }}</span>
        </template>

        <template v-else-if="column.key === 'status'">
          <AppBadge :tone="row.status === 'published' ? 'success' : row.status === 'draft' ? 'neutral' : 'warning'">
            {{ t(`admin.profileStatus.${row.status}`) }}
          </AppBadge>
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="flex justify-end gap-2">
            <AppButton
              :to="localePath(`/admin/profiles/${row.id}/edit`)"
              variant="ghost"
              size="sm"
            >
              {{ t('common.actions.edit') }}
            </AppButton>

            <AppButton
              v-if="row.status === 'published'"
              :href="localePath(`/${row.slug}`)"
              variant="ghost"
              size="sm"
            >
              {{ t('common.actions.preview') }}
            </AppButton>
          </div>
        </template>
      </template>
    </AppTable>

    <AppPagination
      v-if="data"
      :page="data.page"
      :total-pages="data.totalPages"
      :total="data.total"
      :per-page="data.perPage"
      @update:page="goToPage"
    />

    <div class="flex justify-end">
      <AppButton
        variant="ghost"
        size="sm"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        {{ t('common.actions.retry') }}
      </AppButton>
    </div>
  </div>
</template>
