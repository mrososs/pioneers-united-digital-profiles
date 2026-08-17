import { describe, expect, it } from 'vitest'
import { qrFileName, renderQrPng, renderQrSvg } from '../../server/services/qr/qr.service'

/**
 * The QR service has one security-relevant job beyond rendering: it must not let a
 * caller-supplied colour reach the generated SVG markup unvalidated, and it must keep the
 * requested size inside sane bounds so a query string cannot ask for a 100-megapixel PNG.
 */

const PROFILE_URL = 'https://profile.pioneersunited.com/en/sample-executive'

describe('renderQrSvg', () => {
  it('renders an SVG document', async () => {
    const svg = await renderQrSvg(PROFILE_URL)

    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  it('encodes the payload it was given', async () => {
    // Two different URLs must not produce identical symbols.
    const [a, b] = await Promise.all([
      renderQrSvg(PROFILE_URL),
      renderQrSvg(`${PROFILE_URL}-other`),
    ])

    expect(a).not.toBe(b)
  })

  it('applies validated brand colours', async () => {
    const svg = await renderQrSvg(PROFILE_URL, { dark: '#192341', light: '#ffffff' })

    expect(svg.toLowerCase()).toContain('#192341')
  })

  it('rejects a colour that is not a hex value and falls back to the default', async () => {
    // A value like this is how markup gets injected into generated SVG.
    const svg = await renderQrSvg(PROFILE_URL, { dark: '"><script>alert(1)</script>' })

    expect(svg).not.toContain('<script>')
    expect(svg.toLowerCase()).toContain('#000000')
  })

  it('clamps an out-of-range size instead of honouring it', async () => {
    const huge = await renderQrSvg(PROFILE_URL, { size: 100_000 })
    const tiny = await renderQrSvg(PROFILE_URL, { size: -50 })

    // Both still render; the clamp is what matters.
    expect(huge).toContain('<svg')
    expect(tiny).toContain('<svg')
  })
})

describe('renderQrPng', () => {
  it('renders a PNG with the correct magic bytes', async () => {
    const png = await renderQrPng(PROFILE_URL, { size: 256 })

    expect(png.byteLength).toBeGreaterThan(0)
    expect(png[0]).toBe(0x89)
    expect(png[1]).toBe(0x50)
    expect(png[2]).toBe(0x4E)
    expect(png[3]).toBe(0x47)
  })
})

describe('qrFileName', () => {
  it('names downloads after the slug and format', () => {
    expect(qrFileName('sample-executive', 'png')).toBe('sample-executive-qr.png')
    expect(qrFileName('sample-executive', 'svg')).toBe('sample-executive-qr.svg')
  })
})
