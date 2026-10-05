import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export async function ensureSamplePdf(): Promise<string> {
  const dir = path.resolve(process.cwd(), 'tests/fixtures')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const filePath = path.join(dir, 'sample-contract.pdf')
  if (!fs.existsSync(filePath)) {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const page = doc.addPage([612, 792])

    page.drawText('SAMPLE AGREEMENT FOR AUTOMATED TESTING', {
      x: 50,
      y: 720,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText('This contract is automatically generated for end-to-end testing.', {
      x: 50,
      y: 690,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })

    page.drawText('Client Signature: ___________________________', {
      x: 50,
      y: 400,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })

    page.drawText('Date Signed: ________________________________', {
      x: 50,
      y: 350,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })

    const bytes = await doc.save()
    fs.writeFileSync(filePath, Buffer.from(bytes))
  }

  return filePath
}

export async function getSamplePdfBuffer(): Promise<Buffer> {
  const filePath = await ensureSamplePdf()
  return fs.readFileSync(filePath)
}
