import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables, TablesInsert, TablesUpdate } from '#shared/types/database.types'
import type { ProfileListQuery } from '#shared/schemas/profile.schema'

/**
 * Data access for profiles. No h3, no HTTP, no business rules — SQL only.
 *
 * THE CLIENT IS AN ARGUMENT, ON PURPOSE
 *   Every function takes the Supabase client rather than creating one. That makes
 *   the privilege level an explicit decision at the call site:
 *
 *     serverSupabaseClient(event)       -- acts as the caller, RLS applies.
 *                                          Used for all public reads, so a policy
 *                                          mistake cannot be papered over by the
 *                                          application.
 *     serverSupabaseServiceRole(event)  -- bypasses RLS. Used only where the route
 *                                          has already proven authorization via
 *                                          server/utils/auth.ts.
 */

export type Client = SupabaseClient<Database>

type ProfileRow = Tables<'profiles'>
type ProfileLinkRow = Tables<'profile_links'>
type ProfileSectionRow = Tables<'profile_sections'>

const PROFILE_COLUMNS = '*'
const LINK_COLUMNS = '*'
const SECTION_COLUMNS = '*'

export interface ProfileWithLinks {
  profile: ProfileRow
  links: ProfileLinkRow[]
}

/**
 * Fetches one published profile by slug together with its organization and links.
 *
 * The `status = 'published'` filter is redundant when called with an anon client —
 * RLS already enforces it — and necessary when called with the service-role client.
 * Keeping it here means the function has the same meaning whichever client it gets.
 */
export async function findPublishedProfileBySlug(client: Client, slug: string) {
  const { data, error } = await client
    .from('profiles')
    .select(
      `${PROFILE_COLUMNS}, organizations!inner(*), profile_links(${LINK_COLUMNS}), profile_sections(${SECTION_COLUMNS})`,
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error

  return data
}

export async function findProfileById(client: Client, id: string) {
  const { data, error } = await client
    .from('profiles')
    .select(`${PROFILE_COLUMNS}, profile_links(${LINK_COLUMNS}), profile_sections(${SECTION_COLUMNS})`)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data
}

export async function findProfileBySlug(client: Client, slug: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error

  return data
}

/** The company profile of an organization, if one has been created. */
export async function findCompanyProfile(client: Client, organizationId: string): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('profile_type', 'company')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data
}

export interface ProfilePage {
  rows: ProfileRow[]
  total: number
}

/**
 * Paginated admin listing.
 *
 * Search is a plain ILIKE across the four searchable columns. With a roster of
 * executives that is a sequential scan over a handful of rows, which is cheaper
 * than maintaining a trigram or tsvector index. If the table ever reaches
 * thousands of rows, add `pg_trgm` GIN indexes on name_en/name_ar and switch this
 * to a single `websearch_to_tsquery` — the change is contained to this function.
 */
export async function listProfiles(
  client: Client,
  organizationId: string,
  query: ProfileListQuery,
): Promise<ProfilePage> {
  const from = (query.page - 1) * query.perPage
  const to = from + query.perPage - 1

  let builder = client
    .from('profiles')
    .select(PROFILE_COLUMNS, { count: 'exact' })
    .eq('organization_id', organizationId)

  if (query.status) builder = builder.eq('status', query.status)
  if (query.profileType) builder = builder.eq('profile_type', query.profileType)

  if (query.search) {
    // Escape PostgREST's `or` filter separators so a search term cannot alter the
    // filter expression.
    const term = query.search.replace(/[,()\\]/g, ' ').trim()
    if (term.length > 0) {
      const pattern = `%${term}%`
      builder = builder.or(
        [
          `name_en.ilike.${pattern}`,
          `name_ar.ilike.${pattern}`,
          `slug.ilike.${pattern}`,
          `job_title_en.ilike.${pattern}`,
        ].join(','),
      )
    }
  }

  const { data, error, count } = await builder
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  return { rows: data ?? [], total: count ?? 0 }
}

export async function countProfilesByStatus(
  client: Client,
  organizationId: string,
  status: Database['public']['Enums']['profile_status'],
): Promise<number> {
  const { count, error } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', status)

  if (error) throw error

  return count ?? 0
}

export async function insertProfile(client: Client, values: TablesInsert<'profiles'>): Promise<ProfileRow> {
  const { data, error } = await client
    .from('profiles')
    .insert(values)
    .select(PROFILE_COLUMNS)
    .single()

  if (error) throw error

  return data
}

export async function updateProfile(
  client: Client,
  id: string,
  values: TablesUpdate<'profiles'>,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .update(values)
    .eq('id', id)
    .select(PROFILE_COLUMNS)
    .maybeSingle()

  if (error) throw error

  return data
}

export async function deleteProfile(client: Client, id: string): Promise<void> {
  const { error } = await client.from('profiles').delete().eq('id', id)

  if (error) throw error
}

// -----------------------------------------------------------------------------
// Links
// -----------------------------------------------------------------------------

export async function listProfileLinks(client: Client, profileId: string): Promise<ProfileLinkRow[]> {
  const { data, error } = await client
    .from('profile_links')
    .select(LINK_COLUMNS)
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return data ?? []
}

/**
 * Replaces a profile's links wholesale.
 *
 * The editor sends the complete list, so delete-then-insert keeps ordering and
 * removals correct without diffing. It is not wrapped in a transaction because
 * PostgREST cannot express one; if links ever become critical enough that a partial
 * failure matters, move this into a `plpgsql` function called through RPC.
 */
export async function replaceProfileLinks(
  client: Client,
  profileId: string,
  links: Omit<TablesInsert<'profile_links'>, 'profile_id'>[],
): Promise<ProfileLinkRow[]> {
  const { error: deleteError } = await client
    .from('profile_links')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) throw deleteError

  if (links.length === 0) return []

  const { data, error } = await client
    .from('profile_links')
    .insert(links.map(link => ({ ...link, profile_id: profileId })))
    .select(LINK_COLUMNS)

  if (error) throw error

  return data ?? []
}

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

export async function listProfileSections(client: Client, profileId: string): Promise<ProfileSectionRow[]> {
  const { data, error } = await client
    .from('profile_sections')
    .select(SECTION_COLUMNS)
    .eq('profile_id', profileId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return data ?? []
}

/**
 * Replaces a profile's sections wholesale.
 *
 * Same delete-then-insert shape as replaceProfileLinks, and for the same reason:
 * the editor submits the complete set, so diffing would buy nothing. It matters
 * more here, though — a unique index on (profile_id, kind) means an update that
 * merely reordered kinds would collide mid-flight if applied row by row. Clearing
 * first sidesteps that entirely.
 *
 * Not transactional (PostgREST cannot express one). A partial failure leaves the
 * sections cleared, which is recoverable by re-saving; if that ever becomes
 * unacceptable, move this into a plpgsql function called over RPC.
 */
export async function replaceProfileSections(
  client: Client,
  profileId: string,
  sections: Omit<TablesInsert<'profile_sections'>, 'profile_id'>[],
): Promise<ProfileSectionRow[]> {
  const { error: deleteError } = await client
    .from('profile_sections')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) throw deleteError

  if (sections.length === 0) return []

  const { data, error } = await client
    .from('profile_sections')
    .insert(sections.map(section => ({ ...section, profile_id: profileId })))
    .select(SECTION_COLUMNS)

  if (error) throw error

  return data ?? []
}
