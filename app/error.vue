<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Global error page.
 *
 * Renders a translated, generic message keyed off the status code. It deliberately
 * never prints `error.message` or `error.stack`: those can carry internal detail from
 * a server failure, and the useful version is already in the server log, correlated
 * by the request id that the API error envelope carries.
 */
const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()

const messageKey = computed(() => {
  switch (props.error.statusCode) {
    case 401:
      return 'errors.unauthenticated'
    case 403:
      return 'errors.forbidden'
    case 404:
      return 'errors.notFound'
    default:
      return 'errors.internal'
  }
})

useHead({
  title: () => t('errors.pageTitle', { status: props.error.statusCode }),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

function goHome() {
  return clearError({ redirect: localePath('/') })
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
    <div class="w-full max-w-md text-center">
      <p class="font-mono text-sm text-muted-fg">
        {{ error.statusCode }}
      </p>

      <h1 class="mt-3 text-2xl font-semibold text-foreground">
        {{ t(messageKey) }}
      </h1>

      <AppButton
        class="mt-8"
        @click="goHome"
      >
        {{ t('errors.goHome') }}
      </AppButton>
    </div>
  </div>
</template>
