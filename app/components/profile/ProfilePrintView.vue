<script setup lang="ts">
import type { PublicProfile } from '#shared/types/profile'
import { useProfileLinks } from '~/composables/useProfileLinks'

/**
 * A one-page, print-only rendering of a profile — photo, identity, bio,
 * contact details and a QR code back to the live page.
 *
 * Deliberately static: no motion, no interactive affordances (buttons, sticky
 * panels, wallet actions) that mean nothing once this is on paper or in a PDF
 * viewer. See app/pages/[slug]/print.vue for where this is used and why it
 * exists as its own view rather than a print stylesheet on the interactive one.
 *
 * Contact rows stay real `<a>` elements (tel:/mailto:/https) rather than plain
 * text: Chromium's print pipeline preserves anchor hrefs as clickable PDF
 * links, so a recipient can still tap a phone number from the exported file.
 */
const props = defineProps<{
  profile: PublicProfile
}>()

const { t } = useI18n()
const { telHref, mailtoHref, whatsappHref, qrSvgUrl } = useProfileLinks(() => props.profile)

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Overrides for the PDF export, set from `admin/settings/pdf-branding`
 * (server/services/organization.service.ts → getPublicPdfBrandingColors). Re-validated
 * against the hex pattern here — the same defence QR colours get — before being
 * interpolated into custom properties.
 *
 * `backgroundColor` is set directly rather than through `--pu-background`: that token
 * paints the ANCESTOR `bg-background` div in app/layouts/print.vue, so overriding it on
 * a descendant would never reach it. The text and border tokens are consumed by
 * descendants of this component, so overriding them here cascades normally.
 */
const printStyle = computed(() => {
  const { backgroundColor, textColor, lineColor } = props.profile.pdfBranding
  const style: Record<string, string> = {}

  if (backgroundColor && HEX_COLOR_PATTERN.test(backgroundColor)) {
    style.backgroundColor = backgroundColor
  }
  if (textColor && HEX_COLOR_PATTERN.test(textColor)) {
    style['--pu-text-heading'] = textColor
    style['--pu-text-body'] = textColor
    style['--pu-text-muted'] = textColor
    style['--pu-text-faint'] = textColor
  }
  if (lineColor && HEX_COLOR_PATTERN.test(lineColor)) {
    style['--pu-border'] = lineColor
    style['--pu-border-default'] = lineColor
    style['--pu-border-strong'] = lineColor
  }

  return style
})

const roleLine = computed(() => {
  const parts = [props.profile.jobTitle, props.profile.department].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
})

interface ContactRow {
  key: string
  icon: 'phone' | 'mail' | 'whatsapp' | 'linkedin' | 'globe'
  label: string
  href: string
}

const contactRows = computed<ContactRow[]>(() => {
  const rows: ContactRow[] = []

  if (telHref.value && props.profile.phone) {
    rows.push({ key: 'phone', icon: 'phone', label: props.profile.phone, href: telHref.value })
  }
  if (mailtoHref.value && props.profile.email) {
    rows.push({ key: 'email', icon: 'mail', label: props.profile.email, href: mailtoHref.value })
  }
  if (whatsappHref.value && props.profile.whatsapp) {
    rows.push({ key: 'whatsapp', icon: 'whatsapp', label: props.profile.whatsapp, href: whatsappHref.value })
  }
  if (props.profile.websiteUrl) {
    rows.push({ key: 'website', icon: 'globe', label: props.profile.websiteUrl, href: props.profile.websiteUrl })
  }
  if (props.profile.linkedinUrl) {
    rows.push({ key: 'linkedin', icon: 'linkedin', label: props.profile.linkedinUrl, href: props.profile.linkedinUrl })
  }

  return rows
})
</script>

<template>
  <!-- Full-bleed wrapper: carries the PDF-branding overrides (see printStyle above) so a
       custom background paints edge to edge, not just behind the max-w-800 column. Its
       height is the content's, which is taller than one page once a profile has enough
       sections — the background still covers every sheet because printBackground paints
       whatever the box occupies, not just the first viewport. -->
  <div
    class="min-h-screen w-full bg-background"
    :style="printStyle"
  >
    <!-- Horizontal padding only. Vertical spacing is the PDF's page margin, so it
         repeats on every sheet — box padding would apply to the first and last page
         and let a second page run to the paper edge. See pdf.service.ts.
         `min-h-screen` is one printable page exactly (the viewport is sized to it),
         which is what keeps the QR footer pinned to the bottom of a short profile. -->
    <div class="mx-auto flex min-h-screen w-full max-w-[800px] flex-col gap-10 px-16">
      <header class="flex flex-col items-center gap-4 text-center">
        <AppAvatar
          :src="profile.photoUrl"
          :name="profile.name"
          :alt="t('profile.photoAlt', { name: profile.name })"
          size="2xl"
        />

        <div class="flex flex-col items-center gap-2.5">
          <p class="pu-eyebrow text-muted-fg">
            {{ profile.organization.name }}
          </p>

          <span
            class="pu-rule"
            aria-hidden="true"
          />

          <h1 class="text-3xl font-semibold text-heading">
            {{ profile.name }}
          </h1>

          <p
            v-if="roleLine"
            class="text-base text-body"
          >
            {{ roleLine }}
          </p>

          <p
            v-if="profile.location"
            class="flex items-center gap-1.5 text-sm text-muted-fg"
          >
            <AppIcon
              name="map-pin"
              :size="15"
            />
            {{ profile.location }}
          </p>

          <p
            v-if="profile.headline"
            class="max-w-[46ch] text-sm leading-relaxed text-balance text-body"
          >
            {{ profile.headline }}
          </p>
        </div>
      </header>

      <!-- No `break-inside-avoid` on the section: a long bio that does not fit in
           the remainder of a page would be moved whole, blanking most of the sheet.
           A paragraph splits across a fold perfectly well. -->
      <section
        v-if="profile.bio"
        class="pu-print-section flex flex-col gap-2.5"
      >
        <h2 class="pu-eyebrow break-after-avoid text-muted-fg">
          {{ t('profile.sections.about') }}
        </h2>
        <p class="text-base leading-relaxed text-pretty text-body">
          {{ profile.bio }}
        </p>
      </section>

      <ProfilePrintSections
        v-if="profile.sections.length > 0"
        :sections="profile.sections"
      />

      <section
        v-if="contactRows.length > 0"
        class="pu-print-section flex flex-col gap-2.5"
      >
        <h2 class="pu-eyebrow break-after-avoid text-muted-fg">
          {{ t('profile.sections.contact') }}
        </h2>

        <ul class="flex flex-col gap-2">
          <li
            v-for="row in contactRows"
            :key="row.key"
            class="break-inside-avoid"
          >
            <a
              :href="row.href"
              class="flex items-center gap-2.5 text-sm text-body"
              dir="ltr"
            >
              <AppIcon
                :name="row.icon"
                :size="16"
                class="shrink-0 text-muted-fg"
              />
              {{ row.label }}
            </a>
          </li>
        </ul>
      </section>

      <footer class="mt-auto flex items-center gap-5 border-t border-border pt-8">
        <div
          v-if="qrSvgUrl"
          class="pu-qr-frame shrink-0 p-2.5"
        >
          <img
            :src="qrSvgUrl"
            :alt="t('profile.qr.alt', { name: profile.name })"
            width="112"
            height="112"
            class="size-28"
          >
        </div>

        <div class="flex flex-col gap-1">
          <p class="pu-eyebrow text-muted-fg">
            {{ t('profile.qr.title') }}
          </p>
          <p
            class="pu-mono text-xs break-all text-muted-fg"
            dir="ltr"
          >
            {{ profile.canonicalUrl }}
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>
