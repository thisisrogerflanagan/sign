import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FieldType } from '@/lib/supabase/types'

export interface FlattenField {
  type: FieldType
  page: number // 1-indexed
  x: number // 0-1
  y: number // 0-1
  width: number // 0-1
  height: number // 0-1
  value: string | null
}

/**
 * Flattens signature drawings, initials, and text into the original PDF.
 * Uses exact physical page dimensions with normalized (0-1) coordinates.
 * Note: PDF coordinate system (0, 0) is at bottom-left, whereas web canvas is top-left.
 */
export async function flattenPdf(
  originalPdfBuffer: Buffer,
  fields: FlattenField[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdfBuffer)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const field of fields) {
    if (!field.value) continue

    const pageIndex = field.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const targetPage = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = targetPage.getSize()

    // Calculate dimensions in PDF points
    const fieldWidthPt = field.width * pageWidth
    const fieldHeightPt = field.height * pageHeight
    const fieldXPt = field.x * pageWidth
    // Invert Y coordinate: top-left (web) to bottom-left (PDF)
    const fieldYPt = pageHeight - (field.y * pageHeight) - fieldHeightPt

    if (field.type === 'signature' || field.type === 'initials') {
      try {
        // Strip data:image/png;base64, prefix
        const base64Data = field.value.replace(/^data:image\/[a-z]+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const embeddedImage = await pdfDoc.embedPng(imageBuffer)

        targetPage.drawImage(embeddedImage, {
          x: fieldXPt,
          y: fieldYPt,
          width: fieldWidthPt,
          height: fieldHeightPt,
        })
      } catch (imgErr) {
        console.error('Failed to embed signature image:', imgErr)
      }
    } else {
      // Date or Text
      const fontSize = Math.max(9, Math.min(14, fieldHeightPt * 0.55))
      targetPage.drawText(field.value, {
        x: fieldXPt + 2,
        y: fieldYPt + (fieldHeightPt - fontSize) / 2,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.06, 0.09, 0.16),
      })
    }
  }

  const flattenedBytes = await pdfDoc.save()
  return Buffer.from(flattenedBytes)
}
