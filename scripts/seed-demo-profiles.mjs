/**
 * Seeds two fully populated demo Digital Profiles into the LINKED Supabase
 * project: the company profile, and one executive.
 *
 * WHY A SCRIPT AND NOT supabase/seed.sql
 *   `seed.sql` runs only on `supabase db reset`, which needs Docker and rebuilds a
 *   LOCAL database. This has to put rows into the hosted project so the client can
 *   open the result on a real URL. It is data, not schema — the schema still comes
 *   only from a migration file, per "Never bypass migrations" in CLAUDE.md.
 *
 * WHY THE SERVICE-ROLE KEY
 *   The project-scoped Supabase MCP server is pinned `read_only=true` on purpose,
 *   so it cannot write. Row Level Security also (correctly) forbids anonymous
 *   inserts. The secret key is the only credential that can seed, and it is read
 *   from .env and never logged.
 *
 * IDEMPOTENT
 *   Profiles are matched on slug and updated in place; sections are replaced
 *   wholesale. Re-running changes nothing that was already correct, and never
 *   creates a second copy — a duplicate slug would be a broken public URL.
 *
 *   Usage:  node scripts/seed-demo-profiles.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- environment -------------------------------------------------------------

function loadEnv() {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  const env = {}

  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
    if (!match) continue
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }

  return env
}

const env = loadEnv()
const url = env.NUXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SECRET_KEY

if (!url || !key) {
  console.error('Missing NUXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

// --- content -----------------------------------------------------------------

const ORGANIZATION_SLUG = 'pioneers-united'

/**
 * Document and booking links point at the corporate site rather than at invented
 * file paths. A demo whose buttons 404 teaches the client the wrong thing about
 * whether the feature works; these resolve, and are replaced once real files are
 * uploaded to the profile-media bucket.
 */
const SITE = 'https://pioneersunited.com'

const company = {
  slug: 'pioneers-united-company',
  profile_type: 'company',
  status: 'published',
  name_en: 'Pioneers United Real Estate Development',
  name_ar: 'شركة اتحاد الرواد للتطوير العقاري',
  job_title_en: 'Real Estate Development',
  job_title_ar: 'التطوير العقاري',
  department_en: null,
  department_ar: null,
  headline_en: 'We do not develop land. We develop studied investment opportunities that carry sustainable value for our partners.',
  headline_ar: 'نحن لا نطوّر عقاراً فقط، بل نطوّر فرصة استثمارية مدروسة تحقق قيمة مستدامة لشركائنا.',
  bio_en: 'Pioneers United is a Riyadh-based real estate developer working across logistics, residential and mixed-use assets. We assemble opportunities, advance planning and technical evidence, and carry projects through to delivery — reducing the time and uncertainty between site identification and execution. Our work spans land assembly, feasibility, permitting, design management and construction delivery, with investment structures built around long-term partners rather than single transactions.',
  bio_ar: 'اتحاد الرواد شركة تطوير عقاري مقرها الرياض، تعمل في الأصول اللوجستية والسكنية ومتعددة الاستخدامات. نقوم بتجميع الفرص، وتطوير الدراسات التخطيطية والفنية، ومتابعة المشاريع حتى التسليم — بما يقلّص الوقت وعدم اليقين بين تحديد الموقع وبدء التنفيذ. يشمل عملنا تجميع الأراضي ودراسات الجدوى والتراخيص وإدارة التصميم وتنفيذ الإنشاءات، ضمن هياكل استثمارية مبنية على شراكات طويلة الأمد لا على صفقات منفردة.',
  location_en: 'Riyadh, Saudi Arabia',
  location_ar: 'الرياض، المملكة العربية السعودية',
  email: 'info@pioneersunited.com',
  phone: '+966541094444',
  whatsapp: '+966541094444',
  linkedin_url: 'https://www.linkedin.com/company/pioneers-united',
  website_url: SITE,
  booking_url: `${SITE}/contact`,
}

const companySections = [
  {
    kind: 'metrics',
    payload: {
      items: [
        { valueEn: '2013', valueAr: '٢٠١٣', labelEn: 'Founded', labelAr: 'سنة التأسيس' },
        { valueEn: '42', valueAr: '٤٢', labelEn: 'Projects delivered', labelAr: 'مشروعاً منجزاً' },
        { valueEn: 'SAR 2.4B', valueAr: '2.4 مليار ر.س', labelEn: 'Portfolio value', labelAr: 'قيمة المحفظة' },
        { valueEn: '6', valueAr: '٦', labelEn: 'Cities', labelAr: 'مدن' },
      ],
    },
  },
  {
    kind: 'expertise',
    title_en: 'Sectors served',
    title_ar: 'القطاعات',
    payload: {
      items: [
        { labelEn: 'Logistics & warehousing', labelAr: 'الخدمات اللوجستية والمستودعات' },
        { labelEn: 'Residential communities', labelAr: 'المجتمعات السكنية' },
        { labelEn: 'Commercial & retail', labelAr: 'التجاري والتجزئة' },
        { labelEn: 'Mixed-use development', labelAr: 'التطوير متعدد الاستخدامات' },
        { labelEn: 'Land development', labelAr: 'تطوير الأراضي' },
        { labelEn: 'Build-to-suit', labelAr: 'البناء حسب الطلب' },
      ],
    },
  },
  {
    kind: 'services',
    payload: {
      items: [
        {
          icon: 'map-pin',
          titleEn: 'Land assembly & acquisition',
          titleAr: 'تجميع الأراضي والاستحواذ',
          descriptionEn: 'Identifying, consolidating and securing parcels with the ownership and planning position resolved before a partner commits.',
          descriptionAr: 'تحديد وتجميع وتأمين قطع الأراضي مع تسوية وضع الملكية والتخطيط قبل التزام الشريك.',
        },
        {
          icon: 'file-text',
          titleEn: 'Planning & permitting',
          titleAr: 'التخطيط والتراخيص',
          descriptionEn: 'Advancing official planning material, infrastructure evidence and municipal approvals through to issued permits.',
          descriptionAr: 'إعداد المخططات الرسمية وأدلة البنية التحتية والموافقات البلدية وصولاً إلى إصدار التراخيص.',
        },
        {
          icon: 'layout-dashboard',
          titleEn: 'Design management',
          titleAr: 'إدارة التصميم',
          descriptionEn: 'Translating an operator’s requirements into a development envelope: built area, access, loading and technical specification.',
          descriptionAr: 'ترجمة متطلبات المشغّل إلى مخطط تطويري متكامل: المساحات المبنية والوصول والتحميل والمواصفات الفنية.',
        },
        {
          icon: 'briefcase-business',
          titleEn: 'Construction delivery',
          titleAr: 'تنفيذ الإنشاءات',
          descriptionEn: 'Contractor selection, programme control and quality assurance from mobilisation through to handover.',
          descriptionAr: 'اختيار المقاولين وضبط البرنامج الزمني وضمان الجودة من التجهيز حتى التسليم.',
        },
        {
          icon: 'building-2',
          titleEn: 'Investment structuring',
          titleAr: 'الهيكلة الاستثمارية',
          descriptionEn: 'Joint ventures, lease-back and build-to-suit structures shaped around the partner’s horizon rather than a single exit.',
          descriptionAr: 'هياكل الشراكة والتأجير التمويلي والبناء حسب الطلب، مصمّمة وفق أفق الشريك لا وفق مخرج واحد.',
        },
        {
          icon: 'circle-check',
          titleEn: 'Asset handover & aftercare',
          titleAr: 'التسليم والعناية اللاحقة',
          descriptionEn: 'Commissioning, documentation and a defined defects-liability period so an asset transfers cleanly into operation.',
          descriptionAr: 'التشغيل التجريبي والتوثيق وفترة ضمان محددة لضمان انتقال الأصل إلى التشغيل بسلاسة.',
        },
      ],
    },
  },
  {
    kind: 'credentials',
    title_en: 'Accreditations',
    title_ar: 'الاعتمادات',
    payload: {
      items: [
        { nameEn: 'ISO 9001:2015 — Quality Management', nameAr: 'آيزو ٩٠٠١:٢٠١٥ — إدارة الجودة', issuerEn: 'International Organization for Standardization', issuerAr: 'المنظمة الدولية للمعايير', year: '2021' },
        { nameEn: 'Contractor Classification — Grade 3, Buildings', nameAr: 'تصنيف المقاولين — الدرجة الثالثة، المباني', issuerEn: 'Saudi Contractors Authority', issuerAr: 'الهيئة السعودية للمقاولين', year: '2022' },
        { nameEn: 'Real Estate Development Licence', nameAr: 'رخصة التطوير العقاري', issuerEn: 'Real Estate General Authority', issuerAr: 'الهيئة العامة للعقار', year: '2023' },
        { nameEn: 'Commercial Registration 1010XXXXXX', nameAr: 'السجل التجاري ١٠١٠XXXXXX', issuerEn: 'Ministry of Commerce', issuerAr: 'وزارة التجارة', year: '2013' },
      ],
    },
  },
  {
    kind: 'offices',
    payload: {
      items: [
        {
          nameEn: 'Riyadh — Head office',
          nameAr: 'الرياض — المقر الرئيسي',
          addressEn: 'King Fahd Road, Al Olaya District, Riyadh 12211',
          addressAr: 'طريق الملك فهد، حي العليا، الرياض ١٢٢١١',
          mapUrl: 'https://maps.google.com/?q=Al+Olaya+Riyadh',
          phone: '+966541094444',
        },
        {
          nameEn: 'Jeddah — Western region',
          nameAr: 'جدة — المنطقة الغربية',
          addressEn: 'Prince Sultan Road, Al Zahra District, Jeddah 23425',
          addressAr: 'طريق الأمير سلطان، حي الزهراء، جدة ٢٣٤٢٥',
          mapUrl: 'https://maps.google.com/?q=Prince+Sultan+Road+Jeddah',
        },
      ],
    },
  },
  {
    kind: 'documents',
    payload: {
      items: [
        {
          titleEn: 'Company profile',
          titleAr: 'الملف التعريفي للشركة',
          descriptionEn: 'Overview of the company, sectors, delivery model and selected projects.',
          descriptionAr: 'نظرة عامة على الشركة والقطاعات ونموذج التنفيذ ومختارات من المشاريع.',
          url: SITE,
          fileType: 'PDF',
        },
        {
          titleEn: 'Capability statement',
          titleAr: 'بيان القدرات',
          descriptionEn: 'Delivery capability, classifications and technical resources, prepared for procurement review.',
          descriptionAr: 'القدرات التنفيذية والتصنيفات والموارد الفنية، معدّة لمراجعة جهات المشتريات.',
          url: SITE,
          fileType: 'PDF',
        },
      ],
    },
  },
]

const executive = {
  slug: 'khalid-almutairi',
  profile_type: 'individual',
  status: 'published',
  name_en: 'Khalid Al-Mutairi',
  name_ar: 'خالد المطيري',
  job_title_en: 'Chief Development Officer',
  job_title_ar: 'الرئيس التنفيذي للتطوير',
  department_en: 'Development & Investment',
  department_ar: 'التطوير والاستثمار',
  headline_en: 'Eighteen years turning raw land into delivered assets — land assembly, permitting and build-to-suit logistics across the Kingdom.',
  headline_ar: 'ثمانية عشر عاماً في تحويل الأراضي إلى أصول مُسلَّمة — تجميع الأراضي والتراخيص والمشاريع اللوجستية حسب الطلب في أنحاء المملكة.',
  bio_en: 'Khalid leads development and investment at Pioneers United, where he is responsible for the pipeline from origination through to handover. His work concentrates on the phase most developers skip: resolving ownership, planning and technical unknowns before a partner is asked to commit capital. He has led logistics, residential and mixed-use programmes in Riyadh, Jeddah and the Eastern Province, and structures joint ventures with institutional and family-office partners.',
  bio_ar: 'يقود خالد قطاع التطوير والاستثمار في اتحاد الرواد، ويتولى مسؤولية سلسلة المشاريع من نشأتها حتى تسليمها. يركّز عمله على المرحلة التي يتجاوزها معظم المطوّرين: تسوية الملكية والتخطيط والمجهولات الفنية قبل مطالبة الشريك بضخ رأس المال. قاد برامج لوجستية وسكنية ومتعددة الاستخدامات في الرياض وجدة والمنطقة الشرقية، ويتولى هيكلة الشراكات مع المستثمرين المؤسسيين ومكاتب العائلات.',
  location_en: 'Riyadh, Saudi Arabia',
  location_ar: 'الرياض، المملكة العربية السعودية',
  email: 'k.almutairi@pioneersunited.com',
  phone: '+966541094440',
  whatsapp: '+966541094440',
  linkedin_url: 'https://www.linkedin.com/in/khalid-almutairi',
  website_url: SITE,
  booking_url: `${SITE}/contact`,
}

const executiveSections = [
  {
    kind: 'metrics',
    payload: {
      items: [
        { valueEn: '18', valueAr: '١٨', labelEn: 'Years of experience', labelAr: 'سنة خبرة' },
        { valueEn: '42', valueAr: '٤٢', labelEn: 'Projects delivered', labelAr: 'مشروعاً منجزاً' },
        { valueEn: 'SAR 2.4B', valueAr: '2.4 مليار ر.س', labelEn: 'Value delivered', labelAr: 'قيمة منجزة' },
        { valueEn: '6', valueAr: '٦', labelEn: 'Markets covered', labelAr: 'أسواق' },
      ],
    },
  },
  {
    kind: 'expertise',
    payload: {
      items: [
        { labelEn: 'Land assembly', labelAr: 'تجميع الأراضي' },
        { labelEn: 'Feasibility & underwriting', labelAr: 'دراسات الجدوى والتقييم' },
        { labelEn: 'Planning & permitting', labelAr: 'التخطيط والتراخيص' },
        { labelEn: 'Logistics assets', labelAr: 'الأصول اللوجستية' },
        { labelEn: 'Joint-venture structuring', labelAr: 'هيكلة الشراكات' },
        { labelEn: 'Stakeholder management', labelAr: 'إدارة أصحاب المصلحة' },
      ],
    },
  },
  {
    kind: 'experience',
    payload: {
      items: [
        {
          periodEn: '2019 — Present',
          periodAr: '٢٠١٩ — حتى الآن',
          roleEn: 'Chief Development Officer',
          roleAr: 'الرئيس التنفيذي للتطوير',
          organizationEn: 'Pioneers United Real Estate Development',
          organizationAr: 'اتحاد الرواد للتطوير العقاري',
          summaryEn: 'Owns the development pipeline end to end. Established the pre-commitment diligence model — planning evidence, geotechnical investigation and permitting resolved before a partner is approached.',
          summaryAr: 'يتولى مسؤولية سلسلة المشاريع التطويرية بالكامل. أسّس نموذج العناية الواجبة المسبقة — إثبات التخطيط والفحص الجيوتقني والتراخيص قبل التواصل مع الشريك.',
        },
        {
          periodEn: '2015 — 2019',
          periodAr: '٢٠١٥ — ٢٠١٩',
          roleEn: 'Head of Development',
          roleAr: 'رئيس التطوير',
          organizationEn: 'Al Rajhi Development Company',
          organizationAr: 'شركة الراجحي للتطوير',
          summaryEn: 'Led a residential and mixed-use programme across Riyadh and the Eastern Province, delivering eleven projects against a fixed handover schedule.',
          summaryAr: 'قاد برنامجاً سكنياً ومتعدد الاستخدامات في الرياض والمنطقة الشرقية، وسلّم أحد عشر مشروعاً وفق جدول تسليم ثابت.',
        },
        {
          periodEn: '2011 — 2015',
          periodAr: '٢٠١١ — ٢٠١٥',
          roleEn: 'Senior Development Manager',
          roleAr: 'مدير تطوير أول',
          organizationEn: 'Saudi Real Estate Company (Al Akaria)',
          organizationAr: 'الشركة العقارية السعودية (العقارية)',
          summaryEn: 'Managed feasibility and entitlement for commercial assets in central Riyadh, including two build-to-suit logistics facilities.',
          summaryAr: 'أدار دراسات الجدوى والتصاريح للأصول التجارية في وسط الرياض، بما في ذلك منشأتان لوجستيتان حسب الطلب.',
        },
        {
          periodEn: '2008 — 2011',
          periodAr: '٢٠٠٨ — ٢٠١١',
          roleEn: 'Project Engineer',
          roleAr: 'مهندس مشاريع',
          organizationEn: 'Saudi Binladin Group',
          organizationAr: 'مجموعة بن لادن السعودية',
          summaryEn: 'Site delivery on large-scale infrastructure and institutional projects.',
          summaryAr: 'تنفيذ ميداني لمشاريع البنية التحتية والمشاريع المؤسسية واسعة النطاق.',
        },
      ],
    },
  },
  {
    kind: 'credentials',
    payload: {
      items: [
        { nameEn: 'MRICS — Chartered Surveyor', nameAr: 'زمالة المعهد الملكي للمساحين المعتمدين', issuerEn: 'Royal Institution of Chartered Surveyors', issuerAr: 'المعهد الملكي للمساحين المعتمدين', year: '2017' },
        { nameEn: 'Project Management Professional (PMP)', nameAr: 'محترف إدارة المشاريع (PMP)', issuerEn: 'Project Management Institute', issuerAr: 'معهد إدارة المشاريع', year: '2014' },
        { nameEn: 'MBA, Real Estate Finance', nameAr: 'ماجستير إدارة الأعمال، التمويل العقاري', issuerEn: 'King Fahd University of Petroleum & Minerals', issuerAr: 'جامعة الملك فهد للبترول والمعادن', year: '2013' },
        { nameEn: 'BSc Civil Engineering', nameAr: 'بكالوريوس الهندسة المدنية', issuerEn: 'King Saud University', issuerAr: 'جامعة الملك سعود', year: '2008' },
        { nameEn: 'Professional Membership', nameAr: 'عضوية مهنية', issuerEn: 'Saudi Council of Engineers', issuerAr: 'الهيئة السعودية للمهندسين', year: '2009' },
      ],
    },
  },
  {
    kind: 'recognition',
    payload: {
      items: [
        {
          titleEn: 'Developer of the Year — Logistics',
          titleAr: 'مطوّر العام — القطاع اللوجستي',
          sourceEn: 'Saudi Real Estate Excellence Awards',
          sourceAr: 'جوائز التميز العقاري السعودي',
          year: '2024',
        },
        {
          titleEn: 'Panel: Unlocking Riyadh’s logistics corridor',
          titleAr: 'جلسة حوارية: تفعيل الممر اللوجستي بالرياض',
          sourceEn: 'Cityscape Global, Riyadh',
          sourceAr: 'سيتي سكيب العالمي، الرياض',
          year: '2024',
        },
        {
          titleEn: '“The diligence gap in Saudi land development”',
          titleAr: '«فجوة العناية الواجبة في تطوير الأراضي السعودية»',
          sourceEn: 'Argaam',
          sourceAr: 'أرقام',
          year: '2023',
        },
      ],
    },
  },
  {
    kind: 'languages',
    payload: {
      items: [
        { nameEn: 'Arabic', nameAr: 'العربية', levelEn: 'Native', levelAr: 'اللغة الأم' },
        { nameEn: 'English', nameAr: 'الإنجليزية', levelEn: 'Fluent', levelAr: 'إتقان تام' },
      ],
    },
  },
  {
    kind: 'documents',
    payload: {
      items: [
        {
          titleEn: 'Curriculum vitae',
          titleAr: 'السيرة الذاتية',
          descriptionEn: 'Full professional history, project list and references.',
          descriptionAr: 'السجل المهني الكامل وقائمة المشاريع والمراجع.',
          url: SITE,
          fileType: 'PDF',
        },
      ],
    },
  },
]

// --- upsert ------------------------------------------------------------------

async function resolveOrganizationId() {
  const { data, error } = await db
    .from('organizations')
    .select('id')
    .eq('slug', ORGANIZATION_SLUG)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error(`No organization with slug "${ORGANIZATION_SLUG}"`)

  return data.id
}

async function upsertProfile(organizationId, profile, sections) {
  const { data: existing, error: findError } = await db
    .from('profiles')
    .select('id')
    .eq('slug', profile.slug)
    .maybeSingle()

  if (findError) throw findError

  const values = { ...profile, organization_id: organizationId }

  let id
  if (existing) {
    const { data, error } = await db
      .from('profiles')
      .update(values)
      .eq('id', existing.id)
      .select('id')
      .single()

    if (error) throw error
    id = data.id
  }
  else {
    const { data, error } = await db
      .from('profiles')
      .insert(values)
      .select('id')
      .single()

    if (error) throw error
    id = data.id
  }

  // Replace wholesale — same semantics as the service layer, and it keeps the
  // unique (profile_id, kind) index from colliding on a re-run.
  const { error: deleteError } = await db.from('profile_sections').delete().eq('profile_id', id)
  if (deleteError) throw deleteError

  const rows = sections.map((section, index) => ({
    profile_id: id,
    kind: section.kind,
    title_en: section.title_en ?? null,
    title_ar: section.title_ar ?? null,
    payload: section.payload,
    sort_order: index,
    enabled: true,
  }))

  const { error: insertError } = await db.from('profile_sections').insert(rows)
  if (insertError) throw insertError

  return { id, slug: profile.slug, sections: rows.length }
}

async function main() {
  const organizationId = await resolveOrganizationId()

  const results = [
    await upsertProfile(organizationId, company, companySections),
    await upsertProfile(organizationId, executive, executiveSections),
  ]

  for (const result of results) {
    console.log(`  ${result.slug.padEnd(26)} ${String(result.sections).padStart(2)} sections  (${result.id})`)
  }

  console.log('\nSeeded. Open:')
  for (const result of results) {
    console.log(`  /en/${result.slug}   /ar/${result.slug}`)
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message ?? error)
  process.exit(1)
})
