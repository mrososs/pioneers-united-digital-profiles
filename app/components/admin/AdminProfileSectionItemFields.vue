<script setup lang="ts">
import type { ProfileSectionKind } from '#shared/constants/profile-sections'
import type { SelectOption } from '~/components/app/AppSelect.vue'
import { ICON_NAMES } from '~/utils/icons'
import type { SectionItemFormEntry } from '~/utils/profile-section-form'
import { PROFILE_SECTION_ITEM_FIELDS } from '~/utils/profile-section-form'

/**
 * One section item's fields, generated from `PROFILE_SECTION_ITEM_FIELDS`.
 *
 * A single generic renderer instead of nine near-identical per-kind templates —
 * adding a tenth block type is one entry in that table, not a new component.
 */
const props = defineProps<{
  kind: ProfileSectionKind
  /** Resolves a field key (e.g. `titleEn`) to its server-side error, if any. */
  errorFor: (field: string) => string | undefined
}>()

const item = defineModel<SectionItemFormEntry>({ required: true })

const { t } = useI18n()

const fields = computed(() => PROFILE_SECTION_ITEM_FIELDS[props.kind])

const iconOptions = computed<SelectOption[]>(() => [
  { value: '', label: t('admin.profileForm.sectionsEditor.itemFields.servicesIconNone') },
  ...ICON_NAMES.map(name => ({ value: name, label: name })),
])
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <AppFormField
      v-for="field in fields"
      :key="field.key"
      v-slot="{ id, describedBy, invalid }"
      :label="t(`admin.profileForm.sectionsEditor.itemFields.${field.labelKey}`)"
      :required="field.required"
      :error="errorFor(field.key)"
      :class="field.control === 'textarea' ? 'sm:col-span-2' : undefined"
    >
      <AppSelect
        v-if="field.control === 'select-icon'"
        :id="id"
        v-model="item[field.key]"
        :options="iconOptions"
        :invalid="invalid"
        :described-by="describedBy"
      />

      <AppTextarea
        v-else-if="field.control === 'textarea'"
        :id="id"
        v-model="item[field.key]"
        :rows="3"
        :maxlength="field.maxlength"
        :invalid="invalid"
        :described-by="describedBy"
      />

      <AppInput
        v-else
        :id="id"
        v-model="item[field.key]"
        :type="field.inputType === 'url' ? 'url' : 'text'"
        :inputmode="field.inputType === 'url' ? 'url' : undefined"
        :dir="field.dir"
        :maxlength="field.maxlength"
        :invalid="invalid"
        :described-by="describedBy"
      />
    </AppFormField>
  </div>
</template>
