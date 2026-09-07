<script setup lang="ts">
import type { ProfileSectionKind } from '#shared/constants/profile-sections'
import type { ProfileType } from '#shared/constants/profiles'
import type { SelectOption } from '~/components/app/AppSelect.vue'
import type { SectionFormEntry } from '~/utils/profile-section-form'
import { defaultSectionEntry, orderedSectionKinds } from '~/utils/profile-section-form'

/**
 * The ordered list of structured content blocks (Experience, Credentials, ...)
 * on a profile.
 *
 * AT MOST ONE BLOCK PER KIND
 *   Enforced by a unique index in the database (see the `profile_sections`
 *   migration), so "kinds not already present" is the whole menu of what can be
 *   added next — there is no scenario where adding a second `experience` block
 *   should even be offered.
 */
const props = defineProps<{
  profileType: ProfileType
  fieldErrors?: Record<string, string>
}>()

const sections = defineModel<SectionFormEntry[]>({ required: true })

const { t } = useI18n()

const availableKinds = computed<ProfileSectionKind[]>(() =>
  orderedSectionKinds(props.profileType).filter(kind => !sections.value.some(section => section.kind === kind)),
)

const kindOptions = computed<SelectOption[]>(() =>
  availableKinds.value.map(kind => ({ value: kind, label: t(`profile.sections.kinds.${kind}`) })),
)

const newSectionKind = shallowRef<string | null>(null)

watch(availableKinds, (kinds) => {
  if (newSectionKind.value && !kinds.includes(newSectionKind.value as ProfileSectionKind)) {
    newSectionKind.value = null
  }
})

function addSection() {
  if (!newSectionKind.value) return
  sections.value.push(defaultSectionEntry(newSectionKind.value as ProfileSectionKind))
  newSectionKind.value = null
}

function removeSection(index: number) {
  sections.value.splice(index, 1)
}

function moveSection(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= sections.value.length) return

  const [moved] = sections.value.splice(index, 1)
  sections.value.splice(target, 0, moved!)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p
      v-if="sections.length === 0"
      class="text-sm text-muted-fg"
    >
      {{ t('admin.profileForm.sectionsEditor.empty') }}
    </p>

    <AdminProfileSectionCard
      v-for="(section, index) in sections"
      :key="section._localId"
      v-model="sections[index]!"
      :section-index="index"
      :can-move-up="index > 0"
      :can-move-down="index < sections.length - 1"
      :field-errors="fieldErrors"
      @remove="removeSection(index)"
      @move-up="moveSection(index, -1)"
      @move-down="moveSection(index, 1)"
    />

    <div class="flex flex-wrap items-end gap-3">
      <AppFormField
        v-if="availableKinds.length > 0"
        v-slot="{ id, describedBy }"
        :label="t('admin.profileForm.sectionsEditor.addSectionLabel')"
        class="min-w-48"
      >
        <AppSelect
          :id="id"
          v-model="newSectionKind"
          :options="kindOptions"
          :placeholder="t('admin.profileForm.sectionsEditor.addSectionPlaceholder')"
          :described-by="describedBy"
        />
      </AppFormField>

      <p
        v-else
        class="text-xs text-muted-fg"
      >
        {{ t('admin.profileForm.sectionsEditor.allKindsAdded') }}
      </p>

      <AppButton
        v-if="availableKinds.length > 0"
        type="button"
        variant="secondary"
        :disabled="!newSectionKind"
        @click="addSection"
      >
        {{ t('admin.profileForm.sectionsEditor.addSection') }}
      </AppButton>
    </div>
  </div>
</template>
