<script setup lang="ts">
import type { PublicProfileSection } from '#shared/types/profile-section'

/**
 * Renders a profile's structured content blocks in order.
 *
 * ONE JOB: DISPATCH
 *   This component decides *which* renderer draws a block and nothing else. Each
 *   renderer owns how its own items look. That split is what makes a new block
 *   type a two-file change — a schema variant and a renderer — rather than an edit
 *   to a growing conditional inside the profile view.
 *
 * WHY A `v-if` CHAIN RATHER THAN A COMPONENT MAP
 *   A `{ metrics: ProfileMetricsBand, ... }` lookup with `<component :is>` looks
 *   tidier, but `items` would then be typed as the union of every item shape and
 *   TypeScript could not prove that an `experience` block's items reach the
 *   experience renderer. The chain below narrows the discriminated union properly,
 *   so passing the wrong payload to the wrong component is a compile error.
 *
 * The metrics band is excluded here on purpose — the view places it above the
 * fold, outside the section flow. See `useProfileSections`.
 */
defineProps<{
  sections: PublicProfileSection[]
}>()

const titleFor = useProfileSectionTitle()
</script>

<template>
  <div class="flex flex-col gap-8">
    <template
      v-for="section in sections"
      :key="section.id"
    >
      <ProfileSectionShell
        v-reveal
        :anchor="section.anchor"
        :title="titleFor(section)"
      >
        <ProfileTagList
          v-if="section.kind === 'expertise'"
          :items="section.items"
        />

        <ProfileServiceList
          v-else-if="section.kind === 'services'"
          :items="section.items"
        />

        <ProfileExperienceList
          v-else-if="section.kind === 'experience'"
          :items="section.items"
        />

        <ProfileCredentialList
          v-else-if="section.kind === 'credentials'"
          :items="section.items"
        />

        <ProfileRecognitionList
          v-else-if="section.kind === 'recognition'"
          :items="section.items"
        />

        <ProfileLanguageList
          v-else-if="section.kind === 'languages'"
          :items="section.items"
        />

        <ProfileOfficeList
          v-else-if="section.kind === 'offices'"
          :items="section.items"
        />

        <ProfileDocumentList
          v-else-if="section.kind === 'documents'"
          :items="section.items"
        />
      </ProfileSectionShell>
    </template>
  </div>
</template>
