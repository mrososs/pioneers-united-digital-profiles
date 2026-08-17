<script setup lang="ts">
import { loginSchema } from '#shared/schemas/auth.schema'
import { safeAdminRedirect } from '~/utils/redirect'

/**
 * Administrator sign-in.
 *
 * Authentication goes straight to Supabase Auth from the browser, which is the supported
 * pattern: the session lands in an HttpOnly cookie that Nitro can read on subsequent
 * requests. Proxying credentials through our own endpoint would add a hop that has to be
 * trusted with a password for no gain.
 *
 * TWO STEPS, NOT ONE
 *   A successful password check only proves identity. Dashboard access additionally
 *   requires an active row in admin_users, which is what /api/admin/session reports. A
 *   Supabase user with no such row is signed out again immediately and told they are not
 *   authorised — otherwise they would sit in a redirect loop.
 *
 * The failure message is deliberately identical for a wrong password and an unknown
 * address, so the form cannot be used to enumerate valid administrator e-mails.
 */
definePageMeta({
  layout: 'auth',
  middleware: 'admin-guest',
})

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const supabase = useSupabaseClient()
const { refresh } = useAdminSession()

const email = shallowRef('')
const password = shallowRef('')

const fieldErrors = ref<Record<string, string>>({})
const formError = shallowRef<string | null>(null)

const { execute: submit, pending } = useAsyncAction(async () => {
  fieldErrors.value = {}
  formError.value = null

  const parsed = loginSchema.safeParse({ email: email.value, password: password.value })

  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.map(String).join('.')
      if (!errors[key]) errors[key] = t(issue.message)
    }
    fieldErrors.value = errors
    return
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Same message for both causes: no account enumeration.
    formError.value = t('admin.login.failed')
    return
  }

  const session = await refresh()

  if (!session) {
    // Authenticated, but not an administrator. Do not leave a usable session behind.
    await supabase.auth.signOut()
    formError.value = t('admin.login.noAccess')
    return
  }

  await navigateTo(safeAdminRedirect(route.query.redirect, localePath('/admin')))
})

useSeoMeta({
  title: () => t('admin.login.title'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <AppCard padding="lg">
    <form
      class="flex flex-col gap-5"
      novalidate
      @submit.prevent="submit()"
    >
      <div>
        <h1 class="text-lg font-semibold text-foreground">
          {{ t('admin.login.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted-fg">
          {{ t('admin.login.description') }}
        </p>
      </div>

      <AppAlert
        v-if="formError"
        tone="danger"
      >
        {{ formError }}
      </AppAlert>

      <AppFormField
        v-slot="{ id, describedBy, invalid }"
        :label="t('admin.login.email')"
        :error="fieldErrors.email"
        required
      >
        <AppInput
          :id="id"
          v-model="email"
          type="email"
          autocomplete="username"
          inputmode="email"
          dir="ltr"
          :invalid="invalid"
          :described-by="describedBy"
        />
      </AppFormField>

      <AppFormField
        v-slot="{ id, describedBy, invalid }"
        :label="t('admin.login.password')"
        :error="fieldErrors.password"
        required
      >
        <AppInput
          :id="id"
          v-model="password"
          type="password"
          autocomplete="current-password"
          dir="ltr"
          :invalid="invalid"
          :described-by="describedBy"
        />
      </AppFormField>

      <AppButton
        type="submit"
        :loading="pending"
        block
      >
        {{ t('admin.login.submit') }}
      </AppButton>
    </form>
  </AppCard>
</template>
