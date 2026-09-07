import { PROFILE_SECTION_KINDS, PROFILE_SECTION_KINDS_BY_TYPE } from '#shared/constants/profile-sections'
import type { ProfileSectionKind } from '#shared/constants/profile-sections'
import type { ProfileSection } from '#shared/types/profile-section'
import type { ProfileType } from '#shared/constants/profiles'

/**
 * Client-only editing shapes for profile sections, and the mapping between them
 * and the wire shapes in `shared/schemas/profile-section.schema.ts`.
 *
 * ONE SPEC TABLE, TWO USES
 *   `PROFILE_SECTION_ITEM_FIELDS` mirrors the Zod payload schemas field-for-field
 *   (same keys, same max lengths). `AdminProfileSectionItemFields.vue` renders
 *   from it directly, and the seeding/submit helpers below use it to build and
 *   clean item objects — so a tenth block type is one array entry here plus one
 *   union variant in the Zod schema, not a new template.
 *
 * `_localId` IS NEVER SENT
 *   It exists only so `v-for` has a stable key across add/remove/move — without
 *   it, removing an item from the middle of a list would let Vue reuse the wrong
 *   DOM node and misroute focus. It is stripped before submit (and would be
 *   dropped by the server's Zod parse regardless, since unknown keys are not
 *   part of any payload schema).
 */

export interface ItemFieldSpec {
  key: string
  labelKey: string
  control: 'input' | 'textarea' | 'select-icon'
  inputType?: 'text' | 'url'
  /** Omit to use the input's own `dir="auto"` default. */
  dir?: 'ltr'
  maxlength: number
  /** Cosmetic only — the schema keeps the field nullable either way. */
  required?: boolean
}

export type SectionItemFormEntry = { _localId: string } & Record<string, string>

export interface SectionFormEntry {
  _localId: string
  kind: ProfileSectionKind
  titleEn: string
  titleAr: string
  enabled: boolean
  items: SectionItemFormEntry[]
}

const label: ItemFieldSpec['maxlength'] = 120
const body: ItemFieldSpec['maxlength'] = 600

export const PROFILE_SECTION_ITEM_FIELDS: Record<ProfileSectionKind, ItemFieldSpec[]> = {
  metrics: [
    { key: 'valueEn', labelKey: 'metricsValueEn', control: 'input', maxlength: label },
    { key: 'valueAr', labelKey: 'metricsValueAr', control: 'input', maxlength: label },
    { key: 'labelEn', labelKey: 'metricsLabelEn', control: 'input', maxlength: label },
    { key: 'labelAr', labelKey: 'metricsLabelAr', control: 'input', maxlength: label },
  ],
  expertise: [
    { key: 'labelEn', labelKey: 'expertiseLabelEn', control: 'input', maxlength: label },
    { key: 'labelAr', labelKey: 'expertiseLabelAr', control: 'input', maxlength: label },
  ],
  services: [
    { key: 'icon', labelKey: 'servicesIcon', control: 'select-icon', maxlength: 40 },
    { key: 'titleEn', labelKey: 'servicesTitleEn', control: 'input', maxlength: label },
    { key: 'titleAr', labelKey: 'servicesTitleAr', control: 'input', maxlength: label },
    { key: 'descriptionEn', labelKey: 'servicesDescriptionEn', control: 'textarea', maxlength: body },
    { key: 'descriptionAr', labelKey: 'servicesDescriptionAr', control: 'textarea', maxlength: body },
  ],
  experience: [
    { key: 'roleEn', labelKey: 'experienceRoleEn', control: 'input', maxlength: label },
    { key: 'roleAr', labelKey: 'experienceRoleAr', control: 'input', maxlength: label },
    { key: 'organizationEn', labelKey: 'experienceOrganizationEn', control: 'input', maxlength: label },
    { key: 'organizationAr', labelKey: 'experienceOrganizationAr', control: 'input', maxlength: label },
    { key: 'periodEn', labelKey: 'experiencePeriodEn', control: 'input', maxlength: label },
    { key: 'periodAr', labelKey: 'experiencePeriodAr', control: 'input', maxlength: label },
    { key: 'summaryEn', labelKey: 'experienceSummaryEn', control: 'textarea', maxlength: body },
    { key: 'summaryAr', labelKey: 'experienceSummaryAr', control: 'textarea', maxlength: body },
  ],
  credentials: [
    { key: 'nameEn', labelKey: 'credentialsNameEn', control: 'input', maxlength: label },
    { key: 'nameAr', labelKey: 'credentialsNameAr', control: 'input', maxlength: label },
    { key: 'issuerEn', labelKey: 'credentialsIssuerEn', control: 'input', maxlength: label },
    { key: 'issuerAr', labelKey: 'credentialsIssuerAr', control: 'input', maxlength: label },
    { key: 'year', labelKey: 'credentialsYear', control: 'input', dir: 'ltr', maxlength: 12 },
    { key: 'url', labelKey: 'credentialsUrl', control: 'input', inputType: 'url', dir: 'ltr', maxlength: 2048 },
  ],
  recognition: [
    { key: 'titleEn', labelKey: 'recognitionTitleEn', control: 'input', maxlength: label },
    { key: 'titleAr', labelKey: 'recognitionTitleAr', control: 'input', maxlength: label },
    { key: 'sourceEn', labelKey: 'recognitionSourceEn', control: 'input', maxlength: label },
    { key: 'sourceAr', labelKey: 'recognitionSourceAr', control: 'input', maxlength: label },
    { key: 'year', labelKey: 'recognitionYear', control: 'input', dir: 'ltr', maxlength: 12 },
    { key: 'url', labelKey: 'recognitionUrl', control: 'input', inputType: 'url', dir: 'ltr', maxlength: 2048 },
  ],
  languages: [
    { key: 'nameEn', labelKey: 'languagesNameEn', control: 'input', maxlength: label },
    { key: 'nameAr', labelKey: 'languagesNameAr', control: 'input', maxlength: label },
    { key: 'levelEn', labelKey: 'languagesLevelEn', control: 'input', maxlength: label },
    { key: 'levelAr', labelKey: 'languagesLevelAr', control: 'input', maxlength: label },
  ],
  offices: [
    { key: 'nameEn', labelKey: 'officesNameEn', control: 'input', maxlength: label },
    { key: 'nameAr', labelKey: 'officesNameAr', control: 'input', maxlength: label },
    { key: 'addressEn', labelKey: 'officesAddressEn', control: 'textarea', maxlength: body },
    { key: 'addressAr', labelKey: 'officesAddressAr', control: 'textarea', maxlength: body },
    { key: 'mapUrl', labelKey: 'officesMapUrl', control: 'input', inputType: 'url', dir: 'ltr', maxlength: 2048 },
    { key: 'phone', labelKey: 'officesPhone', control: 'input', dir: 'ltr', maxlength: 32 },
  ],
  documents: [
    { key: 'titleEn', labelKey: 'documentsTitleEn', control: 'input', maxlength: label },
    { key: 'titleAr', labelKey: 'documentsTitleAr', control: 'input', maxlength: label },
    { key: 'descriptionEn', labelKey: 'documentsDescriptionEn', control: 'textarea', maxlength: body },
    { key: 'descriptionAr', labelKey: 'documentsDescriptionAr', control: 'textarea', maxlength: body },
    { key: 'url', labelKey: 'documentsUrl', control: 'input', inputType: 'url', dir: 'ltr', maxlength: 2048, required: true },
    { key: 'fileType', labelKey: 'documentsFileType', control: 'input', dir: 'ltr', maxlength: 12 },
  ],
}

/** Kinds ordered for the "add a block" picker: the kinds the profile type suggests, then the rest. */
export function orderedSectionKinds(profileType: ProfileType): ProfileSectionKind[] {
  const preferred = PROFILE_SECTION_KINDS_BY_TYPE[profileType]
  const rest = PROFILE_SECTION_KINDS.filter(kind => !preferred.includes(kind))
  return [...preferred, ...rest]
}

function newLocalId(): string {
  return crypto.randomUUID()
}

export function defaultSectionItem(kind: ProfileSectionKind): SectionItemFormEntry {
  const item: SectionItemFormEntry = { _localId: newLocalId() }
  for (const field of PROFILE_SECTION_ITEM_FIELDS[kind]) item[field.key] = ''
  return item
}

export function defaultSectionEntry(kind: ProfileSectionKind): SectionFormEntry {
  return {
    _localId: newLocalId(),
    kind,
    titleEn: '',
    titleAr: '',
    enabled: true,
    items: [defaultSectionItem(kind)],
  }
}

function toItemFormEntry(kind: ProfileSectionKind, raw: Record<string, unknown>): SectionItemFormEntry {
  const item: SectionItemFormEntry = { _localId: newLocalId() }
  for (const field of PROFILE_SECTION_ITEM_FIELDS[kind]) {
    const value = raw[field.key]
    item[field.key] = typeof value === 'string' ? value : ''
  }
  return item
}

/** Seeds an editor entry from a saved section. Always keeps at least one item row. */
export function toSectionFormEntry(section: ProfileSection): SectionFormEntry {
  const rawItems = Array.isArray(section.payload.items) ? section.payload.items : []
  const items = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map(item => toItemFormEntry(section.kind, item))

  return {
    _localId: newLocalId(),
    kind: section.kind,
    titleEn: section.titleEn ?? '',
    titleAr: section.titleAr ?? '',
    enabled: section.enabled,
    items: items.length > 0 ? items : [defaultSectionItem(section.kind)],
  }
}

/** Strips `_localId` and shapes one entry for the submit payload. */
export function toSectionSubmit(entry: SectionFormEntry): Record<string, unknown> {
  const fields = PROFILE_SECTION_ITEM_FIELDS[entry.kind]

  return {
    kind: entry.kind,
    titleEn: entry.titleEn,
    titleAr: entry.titleAr,
    enabled: entry.enabled,
    payload: {
      items: entry.items.map((item) => {
        const cleaned: Record<string, string> = {}
        for (const field of fields) cleaned[field.key] = item[field.key] ?? ''
        return cleaned
      }),
    },
  }
}
