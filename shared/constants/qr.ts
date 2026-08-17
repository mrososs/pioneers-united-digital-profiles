/**
 * QR constants. QR images are never persisted: they are a pure function of the
 * canonical profile URL, so regenerating is always cheaper and always correct.
 */

export const QR_FORMATS = ['svg', 'png'] as const
export type QrFormat = typeof QR_FORMATS[number]

/**
 * 'M' recovers ~15% of the symbol and keeps the module count low enough that a
 * profile URL still scans reliably when printed small (business card back).
 */
export const QR_ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const
export type QrErrorCorrectionLevel = typeof QR_ERROR_CORRECTION_LEVELS[number]

export const QR_DEFAULT_ERROR_CORRECTION: QrErrorCorrectionLevel = 'M'

export const QR_DEFAULT_SIZE = 512
export const QR_MIN_SIZE = 128
export const QR_MAX_SIZE = 2048
export const QR_DEFAULT_MARGIN = 2

export function isQrFormat(value: unknown): value is QrFormat {
  return typeof value === 'string' && (QR_FORMATS as readonly string[]).includes(value)
}
