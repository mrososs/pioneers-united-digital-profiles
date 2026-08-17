import QRCode from 'qrcode'
import type { QrErrorCorrectionLevel, QrFormat } from '#shared/constants/qr'
import {
  QR_DEFAULT_ERROR_CORRECTION,
  QR_DEFAULT_MARGIN,
  QR_DEFAULT_SIZE,
  QR_MAX_SIZE,
  QR_MIN_SIZE,
} from '#shared/constants/qr'

/**
 * QR generation.
 *
 * WHY NOTHING IS PERSISTED
 *   A QR code is a pure function of the URL it encodes. Storing the image would
 *   create a second source of truth that can go stale the moment a slug changes,
 *   and would need invalidation, storage and its own RLS. Regenerating costs
 *   microseconds, so the codes are always rendered on demand and the endpoint is
 *   cached at the HTTP layer instead.
 *
 * WHAT IS ENCODED
 *   Always the canonical absolute profile URL, and nothing else. Never a vCard
 *   payload: an embedded vCard freezes the contact details into printed material,
 *   whereas a URL keeps a printed business card correct after the person's phone
 *   number changes. This is the single most important property of the design.
 *
 * BRANDING
 *   `dark`/`light` accept the resolved brand colours, which is enough for a
 *   brand-coloured code today. A logo overlay is a rendering concern for the
 *   client (an <img> centred over the SVG) and deliberately not baked in here —
 *   overlaying server-side would require a raster pipeline and risks pushing the
 *   symbol below its error-correction budget.
 */

export interface QrRenderOptions {
  size?: number
  margin?: number
  errorCorrectionLevel?: QrErrorCorrectionLevel
  /** Foreground colour as #rrggbb or #rrggbbaa. */
  dark?: string
  /** Background colour. Pass '#0000' for a transparent PNG. */
  light?: string
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

function clampSize(size: number | undefined): number {
  if (size === undefined || !Number.isFinite(size)) return QR_DEFAULT_SIZE
  return Math.min(QR_MAX_SIZE, Math.max(QR_MIN_SIZE, Math.trunc(size)))
}

/**
 * Colours reach this module from branding settings and query strings, so they are
 * re-validated here rather than trusted. An unvalidated value would be
 * interpolated straight into generated SVG markup.
 */
function safeColor(value: string | undefined, fallback: string): string {
  return value !== undefined && HEX_COLOR.test(value) ? value : fallback
}

function resolveOptions(options: QrRenderOptions) {
  return {
    width: clampSize(options.size),
    margin: options.margin !== undefined && Number.isFinite(options.margin)
      ? Math.min(8, Math.max(0, Math.trunc(options.margin)))
      : QR_DEFAULT_MARGIN,
    errorCorrectionLevel: options.errorCorrectionLevel ?? QR_DEFAULT_ERROR_CORRECTION,
    color: {
      dark: safeColor(options.dark, '#000000'),
      light: safeColor(options.light, '#ffffff'),
    },
  }
}

export async function renderQrSvg(payload: string, options: QrRenderOptions = {}): Promise<string> {
  const resolved = resolveOptions(options)

  return QRCode.toString(payload, {
    type: 'svg',
    width: resolved.width,
    margin: resolved.margin,
    errorCorrectionLevel: resolved.errorCorrectionLevel,
    color: resolved.color,
  })
}

export async function renderQrPng(payload: string, options: QrRenderOptions = {}): Promise<Buffer> {
  const resolved = resolveOptions(options)

  return QRCode.toBuffer(payload, {
    type: 'png',
    width: resolved.width,
    margin: resolved.margin,
    errorCorrectionLevel: resolved.errorCorrectionLevel,
    color: resolved.color,
  })
}

/** Data URL for inline display, so the public profile needs no extra request. */
export async function renderQrDataUrl(payload: string, options: QrRenderOptions = {}): Promise<string> {
  const resolved = resolveOptions(options)

  return QRCode.toDataURL(payload, {
    type: 'image/png',
    width: resolved.width,
    margin: resolved.margin,
    errorCorrectionLevel: resolved.errorCorrectionLevel,
    color: resolved.color,
  })
}

export function qrFileName(slug: string, format: QrFormat): string {
  return `${slug}-qr.${format}`
}
