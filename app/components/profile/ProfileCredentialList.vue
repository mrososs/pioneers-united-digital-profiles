<script setup lang="ts">
import type { PublicCredentialItem } from '#shared/types/profile-section'

/**
 * Certifications, degrees, licences, memberships, accreditations.
 *
 * A SET, NOT A SEQUENCE
 *   No timeline rail and no numbering: holding three certifications is not a
 *   progression, and a structural device that implies order would be telling the
 *   reader something untrue. Rows separated by hairlines, nothing more.
 *
 * VERIFICATION LINK
 *   When an issuer publishes a verification page, the whole row becomes the link
 *   — a bigger target than a trailing icon, which matters on a phone. When it does
 *   not, the row is a plain `div`; an anchor with no href is not a control and
 *   would still take keyboard focus.
 */
defineProps<{
  items: PublicCredentialItem[]
}>()
</script>

<template>
  <ul class="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
    <li
      v-for="(credential, index) in items"
      :key="index"
    >
      <component
        :is="credential.url ? 'a' : 'div'"
        v-bind="credential.url
          ? { href: credential.url, target: '_blank', rel: 'noopener noreferrer' }
          : {}"
        class="flex items-start gap-3 p-4"
        :class="credential.url
          ? 'transition-colors duration-[160ms] ease-standard hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'
          : ''"
      >
        <AppIcon
          name="circle-check"
          :size="17"
          class="mt-0.5 shrink-0 text-accent"
        />

        <span class="min-w-0 flex-1">
          <span
            v-if="credential.name"
            class="block text-sm font-semibold text-heading"
          >
            {{ credential.name }}
          </span>

          <span
            v-if="credential.issuer || credential.year"
            class="mt-0.5 block text-xs text-muted-fg"
          >
            <span v-if="credential.issuer">{{ credential.issuer }}</span>
            <span
              v-if="credential.issuer && credential.year"
              aria-hidden="true"
            > · </span>
            <span
              v-if="credential.year"
              class="pu-num"
            >{{ credential.year }}</span>
          </span>
        </span>

        <AppIcon
          v-if="credential.url"
          name="arrow-up-right"
          :size="15"
          class="mt-0.5 shrink-0 text-faint rtl:-scale-x-100"
        />
      </component>
    </li>
  </ul>
</template>
