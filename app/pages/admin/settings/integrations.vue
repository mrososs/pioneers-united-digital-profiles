<script setup lang="ts">
import type { WalletProviderSummary } from '#shared/types/wallet'
import { WALLET_PROVIDER_LABEL, isWalletProvider } from '#shared/constants/wallet'

/**
 * Integration settings.
 *
 * TWO INDEPENDENT FACTS PER PROVIDER, SHOWN SEPARATELY
 *   `enabled`   — a stored, per-organization preference an administrator controls here.
 *   `configured` — whether the SERVER holds the credentials. Read-only from this screen and
 *                  changeable only by deploying environment variables.
 *
 *   Collapsing them into one switch would be a lie: a provider can be switched on and still
 *   be unusable. The toggle is therefore disabled until the server reports credentials.
 *
 * No credential is ever entered, displayed or stored here. The Zod schema rejects
 * credential-shaped config keys and a database trigger rejects them again.
 */
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

interface IntegrationRow {
  provider: string
  enabled: boolean
  config: Record<string, unknown>
  updatedAt: string
}

const { t } = useI18n()
const { can } = useAdminSession()

const { data, refresh } = await useFetch<{
  integrations: IntegrationRow[]
  providerStatus: WalletProviderSummary
}>('/api/admin/integrations')

const canEdit = computed(() => can('integrations:write'))
const saved = shallowRef(false)

/** Local editable mirror of the stored `enabled` flags. */
const enabled = reactive<Record<string, boolean>>({})

watch(data, (value) => {
  for (const integration of value?.integrations ?? []) {
    enabled[integration.provider] = integration.enabled
  }
}, { immediate: true })

const rows = computed(() =>
  (data.value?.integrations ?? []).map((integration) => {
    const provider = integration.provider
    const detail = isWalletProvider(provider) ? data.value?.providerStatus[provider] ?? null : null

    return {
      provider,
      label: isWalletProvider(provider) ? WALLET_PROVIDER_LABEL[provider] : provider,
      configured: detail?.configured ?? false,
      missing: detail?.missingConfiguration ?? [],
    }
  }),
)

const { execute: save, pending, errorMessage } = useAsyncAction(async () => {
  await $fetch('/api/admin/integrations', {
    method: 'PATCH',
    body: {
      integrations: (data.value?.integrations ?? []).map(integration => ({
        provider: integration.provider,
        enabled: enabled[integration.provider] ?? false,
        // Config is round-tripped unchanged: this screen has no fields for it yet, and
        // dropping it would silently erase whatever is stored.
        config: integration.config,
      })),
    },
  })

  await refresh()
  saved.value = true
})

const { scrollToTop } = useScrollToTop()

/** Scroll up after the request settles so the success or error alert above the list is visible. */
async function onSubmit() {
  await save()
  scrollToTop()
}

useSeoMeta({
  title: () => t('admin.settings.integrations.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      :title="t('admin.settings.integrations.title')"
      :description="t('admin.settings.integrations.description')"
    />

    <AppAlert
      v-if="errorMessage"
      tone="danger"
    >
      {{ errorMessage }}
    </AppAlert>

    <AppAlert
      v-else-if="saved"
      tone="success"
    >
      {{ t('admin.settings.integrations.saved') }}
    </AppAlert>

    <AppAlert
      v-if="!canEdit"
      tone="info"
    >
      {{ t('errors.forbidden') }}
    </AppAlert>

    <ul class="flex flex-col gap-4">
      <AppCard
        v-for="row in rows"
        :key="row.provider"
        as="li"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-sm font-semibold text-foreground">
              {{ row.label }}
            </h2>

            <p
              class="mt-1 text-xs"
              :class="row.configured ? 'text-success' : 'text-muted-fg'"
            >
              {{ row.configured
                ? t('admin.settings.integrations.credentialsConfigured')
                : t('admin.settings.integrations.credentialsMissing') }}
            </p>

            <p
              v-if="!row.configured && row.missing.length > 0"
              class="mt-2 font-mono text-[0.6875rem] break-all text-muted-fg"
              dir="ltr"
            >
              {{ t('admin.wallet.missingConfig', { keys: row.missing.join(', ') }) }}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-muted-fg">{{ t('admin.settings.integrations.enabled') }}</span>
            <AppSwitch
              v-model="enabled[row.provider]"
              :label="`${row.label} — ${t('admin.settings.integrations.enabled')}`"
              :disabled="!canEdit || !row.configured"
            />
          </div>
        </div>
      </AppCard>
    </ul>

    <div v-if="canEdit">
      <AppButton
        :loading="pending"
        @click="onSubmit"
      >
        {{ t('common.actions.saveChanges') }}
      </AppButton>
    </div>
  </div>
</template>
