import { existsSync } from 'node:fs'
import type { Browser } from 'puppeteer-core'
import type { LocaleCode } from '#shared/constants/locales'
import { profilePrintUrl } from '../../utils/urls'
import { logger } from '../../utils/logger'

/**
 * Renders a published profile to PDF by launching a headless Chromium, opening
 * the print-only view of the profile's own public page, and printing it.
 *
 * WHY A HEADLESS BROWSER RATHER THAN A PDF LIBRARY
 *   A PDF library such as pdfkit or pdf-lib draws glyphs in the order given, with
 *   no bidi reordering and no Arabic letter-joining. Getting Arabic right would
 *   mean bringing in a text-shaping engine and reimplementing what a browser
 *   already does. Chromium is that engine, and it is also the exact renderer
 *   that already produces a correct bilingual profile page today, so pointing it
 *   at `/print` reuses that correctness instead of rebuilding a worse version of
 *   it by hand.
 *
 * THE PRINT PAGE, NOT THE INTERACTIVE ONE
 *   `/{locale}/{slug}/print` (app/pages/[slug]/print.vue) is a plain, static
 *   rendering with no motion, no sticky panels and no buttons that make no sense
 *   on paper — see that file. It is public (the profile data behind it already
 *   is), but it is not linked from anywhere a visitor would land on directly.
 */

let browserPromise: Promise<Browser> | null = null

function isServerless(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/**
 * `@sparticuz/chromium`'s binary is a Linux build for the Lambda/Vercel
 * runtime and cannot run on a developer's machine, so local development points
 * `puppeteer-core` at a browser already installed on the box instead of
 * bundling a second Chromium download as a dependency.
 */
const LOCAL_CHROME_CANDIDATES: Partial<Record<NodeJS.Platform, string[]>> = {
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
}

function findLocalChromePath(): string | null {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH

  const candidates = LOCAL_CHROME_CANDIDATES[process.platform] ?? []
  return candidates.find(candidate => existsSync(candidate)) ?? null
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core')

  if (isServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  const executablePath = findLocalChromePath()
  if (!executablePath) {
    throw new Error(
      'no_local_chrome_found: set PUPPETEER_EXECUTABLE_PATH to a Chrome or Edge executable to generate PDFs locally',
    )
  }

  return puppeteer.launch({ executablePath, headless: true })
}

/** A warm browser is reused across requests; Fluid Compute keeps the process alive between invocations. */
async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise
    if (existing.connected) return existing
    browserPromise = null
  }

  browserPromise = launchBrowser().catch((error: unknown) => {
    browserPromise = null
    throw error
  })

  return browserPromise
}

export interface ProfilePdfInput {
  slug: string
  locale: LocaleCode
}

/**
 * PAGE GEOMETRY
 *
 * Chromium scales the 900px-wide viewport onto A4's 210mm width, so one CSS
 * pixel is 210/900 = 0.2333mm. The viewport height is then chosen so that
 * `100vh` in the print view is exactly one printable page:
 *
 *   printable height = 297mm − 14mm top − 14mm bottom = 269mm
 *   269mm ÷ 0.2333mm/px                               = 1153px
 *
 * WHY THE MARGINS MOVED OUT OF THE PAGE
 *   They used to be zero, with the print view supplying `py-16` instead. That is
 *   correct only while the PDF is one page: vertical padding applies at the start
 *   and end of a box, not to each page fragment, so as soon as a profile carries
 *   enough content to spill onto a second page the text ran straight to the paper
 *   edge. Real page margins apply to every sheet. Horizontal spacing stays on the
 *   container, where box padding *does* repeat per fragment.
 *
 * The page waits on its own images (photo, QR) via the browser's native
 * `networkidle0` signal, and on web fonts via `document.fonts.ready` — both
 * matter for Arabic, whose glyphs live in Tajawal and would render as tofu if the
 * page were printed before the font finished loading.
 */
const PAGE_MARGIN_MM = 14
const VIEWPORT_WIDTH_PX = 900
/** (297 − 2 × 14)mm ÷ (210mm ÷ 900px), rounded — see the note above. */
const VIEWPORT_HEIGHT_PX = Math.round(
  (297 - 2 * PAGE_MARGIN_MM) / (210 / VIEWPORT_WIDTH_PX),
)

export async function renderProfilePdf({ slug, locale }: ProfilePdfInput): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    await page.setViewport({ width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX })
    await page.goto(profilePrintUrl(locale, slug), { waitUntil: 'networkidle0', timeout: 20_000 })
    await page.evaluate(() => document.fonts.ready)

    const bytes = await page.pdf({
      format: 'a4',
      printBackground: true,
      margin: {
        top: `${PAGE_MARGIN_MM}mm`,
        right: '0',
        bottom: `${PAGE_MARGIN_MM}mm`,
        left: '0',
      },
    })

    return Buffer.from(bytes)
  }
  catch (error) {
    logger.error('pdf_render_failed', { slug, locale, detail: error })
    throw error
  }
  finally {
    await page.close()
  }
}

export function pdfFileName(slug: string): string {
  return `${slug}.pdf`
}
