<script setup lang="ts">
import type { WalletProviderSummary } from '#shared/types/wallet'
import type { TableColumn } from '~/components/app/AppTable.vue'
import { WALLET_PROVIDERS, WALLET_PROVIDER_LABEL } from '#shared/constants/wallet'

/**
 * Wallet passes.
 *
 * Shows each provider's readiness before showing any passes, because "not configured" is
 * the current and expected state: no Apple pass certificate or Google issuer has been
 * provisioned yet. The screen names the exact environment variables that are missing —
 * their names only, never their values — so provisioning is a checklist rather than a
 * support ticket.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

interface WalletPassRow {
  id: string
  profileId: string
  profileSlug: string | null
  profileNameEn: string | null
  profileNameAr: string | null
  provider: 'apple' | 'google'
  status: 'pending' | 'active' | 'revoked' | 'failed'
  externalId: string | null
  lastGeneratedAt: string | null
  lastError: string | null
  updatedAt: string
}

const { t, d } = useI18n()
const { pick } = useLocalizedField()

const { data, status } = await useFetch<{
  passes: WalletPassRow[]
  providerStatus: WalletProviderSummary
}>('/api/admin/wallet/passes')

const providers = computed(() =>
  WALLET_PROVIDERS.map(provider => ({
    provider,
    label: WALLET_PROVIDER_LABEL[provider],
    detail: data.value?.providerStatus[provider] ?? null,
  })),
)

const columns = computed<TableColumn[]>(() => [
  { key: 'profile', label: t('admin.profiles.columns.name') },
  { key: 'provider', label: t('admin.wallet.provider') },
  { key: 'status', label: t('admin.wallet.status') },
  { key: 'lastGenerated', label: t('admin.wallet.lastGenerated'), hideOnMobile: true },
])

function toneFor(passStatus: WalletPassRow['status']) {
  switch (passStatus) {
    case 'active':
      return 'success' as const
    case 'failed':
      return 'danger' as const
    case 'revoked':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

useSeoMeta({
  title: () => t('admin.wallet.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.wallet.title')"
      :description="t('admin.wallet.description')"
    />

    <div class="grid gap-4 sm:grid-cols-2">
      <AppCard
        v-for="entry in providers"
        :key="entry.provider"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-foreground">
              {{ entry.label }}
            </h2>

            <p class="mt-1 text-xs text-muted-fg">
              {{ entry.detail?.configured
                ? t('admin.settings.integrations.credentialsConfigured')
                : t('admin.wallet.notConfiguredHint') }}
            </p>

            <p
              v-if="entry.detail && !entry.detail.configured && entry.detail.missingConfiguration.length > 0"
              class="mt-2 font-mono text-[0.6875rem] break-all text-muted-fg"
              dir="ltr"
            >
              {{ t('admin.wallet.missingConfig', { keys: entry.detail.missingConfiguration.join(', ') }) }}
            </p>
          </div>

          <AppBadge :tone="entry.detail?.configured ? 'success' : 'neutral'">
            {{ entry.detail?.configured
              ? t('admin.settings.integrations.enabled')
              : t('admin.wallet.notConfigured') }}
          </AppBadge>
        </div>
      </AppCard>
    </div>

    <AppTable
      :columns="columns"
      :rows="data?.passes ?? []"
      :loading="status === 'pending'"
      :caption="t('admin.wallet.title')"
    >
      <template #empty>
        <AppEmptyState
          :title="t('common.states.empty')"
          :description="t('admin.wallet.notConfiguredHint')"
        />
      </template>

      <template #cell="{ row, column }">
        <template v-if="column.key === 'profile'">
          <span class="text-sm">{{ pick(row.profileNameEn, row.profileNameAr) ?? row.profileSlug }}</span>
        </template>

        <template v-else-if="column.key === 'provider'">
          {{ WALLET_PROVIDER_LABEL[row.provider] }}
        </template>

        <template v-else-if="column.key === 'status'">
          <AppBadge :tone="toneFor(row.status)">
            {{ t(`admin.wallet.passStatus.${row.status}`) }}
          </AppBadge>
        </template>

        <template v-else-if="column.key === 'lastGenerated'">
          <span class="text-xs text-muted-fg">
            {{ row.lastGeneratedAt ? d(new Date(row.lastGeneratedAt), 'short') : t('common.notAvailable') }}
          </span>
        </template>
      </template>
    </AppTable>
  </div>
</template>
