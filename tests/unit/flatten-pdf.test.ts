import { describe, it, expect } from 'vitest'
import { PDFDocument, rgb } from 'pdf-lib'
import { flattenPdf, FlattenField } from '@/lib/pdf/flatten'

// Minimal 1x1 transparent PNG data URI for testing signature embedding
const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('flattenPdf Unit Tests', () => {
  async function createSamplePdf(
    pagesConfig: Array<{ width: number; height: number }>
  ): Promise<Buffer> {
    const doc = await PDFDocument.create()
    for (const cfg of pagesConfig) {
      const page = doc.addPage([cfg.width, cfg.height])
      page.drawText('Sample document text', {
        x: 50,
        y: cfg.height - 100,
        size: 12,
        color: rgb(0, 0, 0),
      })
    }
    const bytes = await doc.save()
    return Buffer.from(bytes)
  }

  it('flattens fields onto a standard portrait PDF and returns a valid uncorrupted PDF', async () => {
    // US Letter Portrait: 612 x 792
    const originalPdf = await createSamplePdf([{ width: 612, height: 792 }])

    const fields: FlattenField[] = [
      {
        type: 'text',
        page: 1,
        x: 0.1,
        y: 0.2,
        width: 0.3,
        height: 0.05,
        value: 'Standard text note',
      },
      {
        type: 'date',
        page: 1,
        x: 0.1,
        y: 0.3,
        width: 0.2,
        height: 0.04,
        value: '2026-10-05',
      },
      {
        type: 'signature',
        page: 1,
        x: 0.1,
        y: 0.5,
        width: 0.25,
        height: 0.08,
        value: TINY_PNG_DATA_URL,
      },
    ]

    const resultBuffer = await flattenPdf(originalPdf, fields)

    expect(resultBuffer).toBeInstanceOf(Buffer)
    expect(resultBuffer.length).toBeGreaterThan(0)

    // Verify it is a valid, uncorrupted PDF by loading it back
    const reloaded = await PDFDocument.load(resultBuffer)
    expect(reloaded.getPageCount()).toBe(1)
    const page = reloaded.getPage(0)
    expect(page.getWidth()).toBe(612)
    expect(page.getHeight()).toBe(792)
  })

  it('handles landscape orientation and multi-page layouts correctly', async () => {
    // Multi-page: Page 1 portrait (612x792), Page 2 landscape (792x612)
    const originalPdf = await createSamplePdf([
      { width: 612, height: 792 },
      { width: 792, height: 612 },
    ])

    const fields: FlattenField[] = [
      {
        type: 'text',
        page: 1,
        x: 0.2,
        y: 0.8,
        width: 0.4,
        height: 0.05,
        value: 'Page 1 footer text',
      },
      {
        type: 'initials',
        page: 2,
        x: 0.7,
        y: 0.85,
        width: 0.15,
        height: 0.06,
        value: TINY_PNG_DATA_URL,
      },
    ]

    const resultBuffer = await flattenPdf(originalPdf, fields)
    const reloaded = await PDFDocument.load(resultBuffer)

    expect(reloaded.getPageCount()).toBe(2)
    expect(reloaded.getPage(0).getWidth()).toBe(612)
    expect(reloaded.getPage(1).getWidth()).toBe(792)
    expect(reloaded.getPage(1).getHeight()).toBe(612)
  })

  it('skips unfilled or invalid page fields without corrupting output', async () => {
    const originalPdf = await createSamplePdf([{ width: 612, height: 792 }])

    const fields: FlattenField[] = [
      {
        type: 'signature',
        page: 1,
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.05,
        value: null, // unfilled
      },
      {
        type: 'text',
        page: 99, // out of bounds page
        x: 0.1,
        y: 0.1,
        width: 0.2,
        height: 0.05,
        value: 'Ignored',
      },
    ]

    const resultBuffer = await flattenPdf(originalPdf, fields)
    const reloaded = await PDFDocument.load(resultBuffer)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('fails loudly when fed corrupted or invalid PDF buffers', async () => {
    const corruptedBuffer = Buffer.from('This is not a PDF file at all')
    await expect(flattenPdf(corruptedBuffer, [])).rejects.toThrow()
  })
})
