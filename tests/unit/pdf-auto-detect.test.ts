import { describe, it, expect } from 'vitest'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { autoDetectPdfFields } from '@/lib/pdf-auto-detect'

describe('PDF Auto-Detection Precision Benchmark', () => {
  // Helper to build a clean PDF with specified lines
  async function createContractPdf(pages: Array<string[]>): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(StandardFonts.Helvetica)

    for (const pageLines of pages) {
      const page = doc.addPage([612, 792]) // US Letter
      let y = 720
      for (const line of pageLines) {
        page.drawText(line, {
          x: 50,
          y,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        })
        y -= 24
      }
    }

    return await doc.save()
  }

  it('detects signature, date, and name fields with >90% precision across diverse contracts', async () => {
    // Contract 1: Standard Master Services Agreement
    const msaPdf = await createContractPdf([
      [
        'MASTER SERVICES AGREEMENT',
        'This Agreement is entered into between Acme Corp and Freelancer.',
        '1. Term and Scope of Work.',
        'The contractor shall deliver engineering and design services.',
        '2. Consideration and Invoicing terms within 30 days.',
        '',
        'Client Signature: __________________________',
        'Date Signed: _______________________________',
        'Printed Name: ______________________________',
      ],
    ])

    // Contract 2: Mutual NDA with "Authorized Signature" & "Date"
    const ndaPdf = await createContractPdf([
      [
        'MUTUAL NON-DISCLOSURE AGREEMENT',
        'Both parties agree to hold proprietary information confidential.',
        'Section 4. Standard terms and covenants.',
        '',
        'Authorized Signature: ______________________',
        'Date: ______________________________________',
      ],
    ])

    // Contract 3: SOW with "Sign here" & "Initials here"
    const sowPdf = await createContractPdf([
      [
        'STATEMENT OF WORK (SOW-04)',
        'Milestone 1: Prototype design deliverable.',
        'Milestone 2: Final deployment.',
        '',
        'Sign here: _________________________________',
        'Initials here: _____________________________',
      ],
    ])

    // Contract 4: Multi-page Consulting Retainer
    const multiPagePdf = await createContractPdf([
      ['CONSULTING RETAINER AGREEMENT - PAGE 1', 'Recitals and preamble clauses.'],
      [
        'CONSULTING RETAINER AGREEMENT - PAGE 2',
        'Signatures below confirm acceptance of all obligations.',
        '',
        'Signature of Client: _______________________',
        'Date of Signing: ___________________________',
      ],
    ])

    // Contract 5: Pure body text article (ZERO signature cues)
    // Critical test for precision: body text mentioning "signatures" in paragraphs
    // must NOT generate false positive fields.
    const articlePdf = await createContractPdf([
      [
        'THE EVOLUTION OF ELECTRONIC SIGNATURES',
        'In the year 2000, the United States enacted the ESIGN Act.',
        'Legal contracts historically required a wet-ink signature on parchment.',
        'Today, digital signatures rely on public key cryptography and hashing.',
        'Courts have consistently upheld electronic agreements when consent is clear.',
      ],
    ])

    const testCases = [
      { name: 'Master Services Agreement', pdf: msaPdf, expectedCues: 3 },
      { name: 'Mutual NDA', pdf: ndaPdf, expectedCues: 2 },
      { name: 'Statement of Work', pdf: sowPdf, expectedCues: 2 },
      { name: 'Multi-Page Retainer', pdf: multiPagePdf, expectedCues: 2 },
      { name: 'Article Body Text (Zero cues)', pdf: articlePdf, expectedCues: 0 },
    ]

    let totalDetected = 0
    let truePositives = 0
    let falsePositives = 0

    for (const testCase of testCases) {
      const detected = await autoDetectPdfFields(testCase.pdf)
      totalDetected += detected.length

      if (testCase.expectedCues === 0) {
        // Any detection on the article is a false positive
        falsePositives += detected.length
      } else {
        // Check that detected items match real cues
        for (const item of detected) {
          if (item.cueText && /signature|sign|date|initial|name/i.test(item.cueText)) {
            truePositives++
          } else {
            falsePositives++
          }
        }
      }
    }

    const precision =
      totalDetected === 0 ? 1.0 : truePositives / (truePositives + falsePositives)

    console.log(
      `[Auto-Detect Precision] True Positives: ${truePositives}, False Positives: ${falsePositives}, Precision: ${(
        precision * 100
      ).toFixed(1)}%`
    )

    // Requirement: Precision must exceed 90%
    expect(precision).toBeGreaterThanOrEqual(0.9)
    // False positives should be 0 on pure body text
    expect(falsePositives).toBe(0)
    // All 9 cues across the contracts should be found
    expect(truePositives).toBe(9)
  })

  it('safely handles empty or minimal PDFs without throwing', async () => {
    const blankDoc = await PDFDocument.create()
    blankDoc.addPage([612, 792])
    const blankBytes = await blankDoc.save()

    const detected = await autoDetectPdfFields(blankBytes)
    expect(Array.isArray(detected)).toBe(true)
    expect(detected.length).toBe(0)
  })

  it('safely handles invalid data without throwing', async () => {
    const invalidBuffer = Buffer.from('Corrupt binary data')
    const detected = await autoDetectPdfFields(invalidBuffer)
    expect(Array.isArray(detected)).toBe(true)
    expect(detected.length).toBe(0)
  })
})
