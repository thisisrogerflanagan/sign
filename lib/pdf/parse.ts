import { PDFDocument } from 'pdf-lib'

export interface ParsedPdfResult {
  pageCount: number
  isEncrypted: boolean
}

/**
 * Validates and inspects an uploaded PDF.
 * Checks for encryption and parses page count.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
    })

    const pageCount = pdfDoc.getPageCount()
    if (pageCount < 1) {
      throw new Error('This PDF has no pages.')
    }

    return {
      pageCount,
      isEncrypted: false,
    }
  } catch (error: any) {
    if (
      error.message?.includes('encrypt') ||
      error.message?.includes('password') ||
      error.name === 'EncryptedPDFError'
    ) {
      return {
        pageCount: 0,
        isEncrypted: true,
      }
    }
    throw new Error('The PDF file could not be parsed or may be damaged.')
  }
}
