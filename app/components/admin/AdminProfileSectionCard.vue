<script setup lang="ts">
import { PROFILE_SECTION_MAX_ITEMS } from '#shared/constants/profile-sections'
import type { SectionFormEntry } from '~/utils/profile-section-form'
import { defaultSectionItem } from '~/utils/profile-section-form'

/**
 * One structured content block: its own title override, its visibility, and its
 * ordered list of items.
 *
 * POSITION IS NOT THIS COMPONENT'S TO CHANGE
 *   The block's own content (title, enabled, items) is a `v-model`, since it is
 *   this card's to own. Its position among sibling blocks is not — that lives in
 *   the parent's array, so moving or removing the whole block is an emitted
 *   event, not a mutation here. Same split for items: reordering or removing one
 *   item is local (this card owns `items`), but the item's own fields are a
 *   nested `v-model` down into `AdminProfileSectionItemFields`.
 */
const props = defineProps<{
  sectionIndex: number
  canMoveUp: boolean
  canMoveDown: boolean
  fieldErrors?: Record<string, string>
}>()

const emit = defineEmits<{
  'remove': []
  'move-up': []
  'move-down': []
}>()

const section = defineModel<SectionFormEntry>({ required: true })

const { t } = useI18n()

const kindLabel = computed(() => t(`profile.sections.kinds.${section.value.kind}`))
const atMaxItems = computed(() => section.value.items.length >= PROFILE_SECTION_MAX_ITEMS)

function errorFor(field: string): string | undefined {
  return props.fieldErrors?.[`sections.${props.sectionIndex}.${field}`]
}

function itemErrorFor(itemIndex: number) {
  return (field: string): string | undefined =>
    props.fieldErrors?.[`sections.${props.sectionIndex}.payload.items.${itemIndex}.${field}`]
}

function addItem() {
  if (atMaxItems.value) return
  section.value.items.push(defaultSectionItem(section.value.kind))
}

function removeItem(itemIndex: number) {
  if (section.value.items.length <= 1) return
  section.value.items.splice(itemIndex, 1)
}

function moveItem(itemIndex: number, direction: -1 | 1) {
  const items = section.value.items
  const target = itemIndex + direction
  if (target < 0 || target >= items.length) return

  const [moved] = items.splice(itemIndex, 1)
  items.splice(target, 0, moved!)
}
</script>

<template>
  <AppCard
    tone="quiet"
    padding="md"
    class="flex flex-col gap-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-heading">
        {{ kindLabel }}
      </h3>

      <div class="flex items-center gap-2">
        <AppSwitch
          v-model="section.enabled"
          :label="t('admin.profileForm.sectionsEditor.sectionEnabled', { kind: kindLabel })"
        />

        <AppIconButton
          :label="t('admin.profileForm.sectionsEditor.moveSectionUp', { kind: kindLabel })"
          :disabled="!canMoveUp"
          size="sm"
          @click="emit('move-up')"
        >
          <AppIcon
            name="chevron-down"
            class="rotate-180"
            :size="16"
          />
        </AppIconButton>

        <AppIconButton
          :label="t('admin.profileForm.sectionsEditor.moveSectionDown', { kind: kindLabel })"
          :disabled="!canMoveDown"
          size="sm"
          @click="emit('move-down')"
        >
          <AppIcon
            name="chevron-down"
            :size="16"
          />
        </AppIconButton>

        <AppIconButton
          variant="danger"
          :label="t('admin.profileForm.sectionsEditor.removeSection', { kind: kindLabel })"
          size="sm"
          @click="emit('remove')"
        >
          <AppIcon
            name="trash-2"
            :size="16"
          />
        </AppIconButton>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <AppFormField
        v-slot="{ id, describedBy, invalid }"
        :label="t('admin.profileForm.sectionsEditor.titleOverrideEn')"
        :hint="t('admin.profileForm.sectionsEditor.titleOverrideHint')"
        :error="errorFor('titleEn')"
      >
        <AppInput
          :id="id"
          v-model="section.titleEn"
          :maxlength="120"
          :invalid="invalid"
          :described-by="describedBy"
        />
      </AppFormField>

      <AppFormField
        v-slot="{ id, describedBy, invalid }"
        :label="t('admin.profileForm.sectionsEditor.titleOverrideAr')"
        :hint="t('admin.profileForm.sectionsEditor.titleOverrideHint')"
        :error="errorFor('titleAr')"
      >
        <AppInput
          :id="id"
          v-model="section.titleAr"
          :maxlength="120"
          :invalid="invalid"
          :described-by="describedBy"
        />
      </AppFormField>
    </div>

    <ul class="flex flex-col gap-3">
      <AppCard
        v-for="(item, itemIndex) in section.items"
        :key="item._localId"
        as="li"
        padding="sm"
        class="flex flex-col gap-3"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="pu-label-caps text-muted-fg">{{ itemIndex + 1 }}</span>

          <div class="flex items-center gap-2">
            <AppIconButton
              :label="t('admin.profileForm.sectionsEditor.moveItemUp', { number: itemIndex + 1 })"
              :disabled="itemIndex === 0"
              size="sm"
              @click="moveItem(itemIndex, -1)"
            >
              <AppIcon
                name="chevron-down"
                class="rotate-180"
                :size="16"
              />
            </AppIconButton>

            <AppIconButton
              :label="t('admin.profileForm.sectionsEditor.moveItemDown', { number: itemIndex + 1 })"
              :disabled="itemIndex === section.items.length - 1"
              size="sm"
              @click="moveItem(itemIndex, 1)"
            >
              <AppIcon
                name="chevron-down"
                :size="16"
              />
            </AppIconButton>

            <AppIconButton
              variant="danger"
              :label="t('admin.profileForm.sectionsEditor.removeItem', { number: itemIndex + 1 })"
              :disabled="section.items.length <= 1"
              size="sm"
              @click="removeItem(itemIndex)"
            >
              <AppIcon
                name="trash-2"
                :size="16"
              />
            </AppIconButton>
          </div>
        </div>

        <AdminProfileSectionItemFields
          v-model="section.items[itemIndex]!"
          :kind="section.kind"
          :error-for="itemErrorFor(itemIndex)"
        />
      </AppCard>
    </ul>

    <div>
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        :disabled="atMaxItems"
        @click="addItem"
      >
        {{ t('admin.profileForm.sectionsEditor.addItem', { kind: kindLabel }) }}
      </AppButton>
    </div>
  </AppCard>
</template>
