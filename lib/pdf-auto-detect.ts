// Polyfill Promise.withResolvers for Node runtimes < 22.0.0
if (typeof (Promise as any).withResolvers === 'undefined') {
  ;(Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { FieldType } from '@/lib/supabase/types'

export interface DetectedField {
  id: string
  type: FieldType
  label: string
  page: number
  x: number // 0 - 1
  y: number // 0 - 1
  width: number // 0 - 1
  height: number // 0 - 1
  required: boolean
  assigned_to: 'signer' | 'sender'
  is_suggestion: boolean
  confidence: number
  cueText?: string
}

const DEFAULT_DIMENSIONS: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 0.24, height: 0.045 },
  initials: { width: 0.12, height: 0.035 },
  date: { width: 0.18, height: 0.028 },
  name: { width: 0.22, height: 0.028 },
  text: { width: 0.24, height: 0.028 },
}

interface PatternRule {
  type: FieldType
  regex: RegExp
  defaultLabel: string
  confidence: number
  // Placement offset relative to cue text bounding box
  placement: 'above' | 'right' | 'aligned'
}

const PATTERN_RULES: PatternRule[] = [
  // Signature patterns
  {
    type: 'signature',
    regex:
      /(?:^|\b)(?:signature(?:\s+of\s+(?:client|contractor|signer))?|signed\s+by|sign\s+here|authorized\s+signature)\s*[:_]+/i,
    defaultLabel: 'Signature',
    confidence: 0.95,
    placement: 'above',
  },
  {
    type: 'signature',
    regex:
      /^(?:signature(?:\s+of\s+(?:client|contractor|signer))?|authorized\s+signature|client\s+signature)$/i,
    defaultLabel: 'Signature',
    confidence: 0.95,
    placement: 'above',
  },
  {
    type: 'signature',
    regex: /\bX\s*_{3,}/i,
    defaultLabel: 'Signature',
    confidence: 0.9,
    placement: 'above',
  },

  // Date patterns
  {
    type: 'date',
    regex: /(?:^|\b)(?:date\s+signed|date\s+of\s+signing|dated?)\s*[:_]+/i,
    defaultLabel: 'Date Signed',
    confidence: 0.92,
    placement: 'right',
  },
  {
    type: 'date',
    regex: /^(?:date\s+signed|date\s+of\s+signing)$/i,
    defaultLabel: 'Date Signed',
    confidence: 0.92,
    placement: 'right',
  },

  // Printed Name patterns
  {
    type: 'name',
    regex:
      /(?:^|\b)(?:print(?:ed)?\s+name|client\s+name|signer\s+name|full\s+name)\s*[:_]+/i,
    defaultLabel: 'Full Name',
    confidence: 0.9,
    placement: 'right',
  },
  {
    type: 'name',
    regex: /^(?:print(?:ed)?\s+name|full\s+name)$/i,
    defaultLabel: 'Full Name',
    confidence: 0.9,
    placement: 'right',
  },

  // Initials patterns
  {
    type: 'initials',
    regex: /(?:^|\b)(?:initial(?:s)?\s+here|client\s+initials?)\s*[:_]?/i,
    defaultLabel: 'Initials',
    confidence: 0.88,
    placement: 'right',
  },
  {
    type: 'initials',
    regex: /(?:^|\b)initials?\s*[:_]+/i,
    defaultLabel: 'Initials',
    confidence: 0.88,
    placement: 'right',
  },
]

/**
 * Automatically inspects a PDF document and detects fields for signature, date, name, and initials.
 * Anchors to AcroForm widgets first if present, then falls back to rule-based pattern detection.
 */
export async function autoDetectPdfFields(
  pdfData: ArrayBuffer | Uint8Array
): Promise<DetectedField[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfData),
      useSystemFonts: true,
    })

    const doc = await loadingTask.promise
    const detected: DetectedField[] = []
    let fieldCounter = 1

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const pageW = viewport.width
      const pageH = viewport.height

      // 1. Check for interactive AcroForm annotations first
      try {
        const annotations = await page.getAnnotations()
        for (const annot of annotations) {
          if (annot.subtype === 'Widget' && annot.rect) {
            const [x1, y1, x2, y2] = annot.rect
            const normX = Math.max(0, Math.min(1, x1 / pageW))
            const normY = Math.max(0, Math.min(1, (pageH - y2) / pageH))
            const normW = Math.max(0.05, Math.min(1, (x2 - x1) / pageW))
            const normH = Math.max(0.02, Math.min(1, (y2 - y1) / pageH))

            const nameLower = (annot.fieldName || '').toLowerCase()
            let fieldType: FieldType = 'text'
            let label = annot.fieldName || 'Form Field'

            if (nameLower.includes('sign')) {
              fieldType = 'signature'
              label = 'Signature'
            } else if (nameLower.includes('date')) {
              fieldType = 'date'
              label = 'Date Signed'
            } else if (nameLower.includes('init')) {
              fieldType = 'initials'
              label = 'Initials'
            } else if (nameLower.includes('name')) {
              fieldType = 'name'
              label = 'Full Name'
            }

            detected.push({
              id: `suggest-${fieldCounter++}`,
              type: fieldType,
              label,
              page: pageNum,
              x: normX,
              y: normY,
              width: normW,
              height: normH,
              required: true,
              assigned_to: 'signer',
              is_suggestion: true,
              confidence: 0.99,
              cueText: `AcroForm: ${annot.fieldName}`,
            })
          }
        }
      } catch (err) {
        // Annotation check failed or empty, proceed to text scanning
      }

      // If AcroForms were found on this page, don't duplicate with text detection
      const pageAcroCount = detected.filter((d) => d.page === pageNum).length
      if (pageAcroCount > 0) continue

      // 2. Text layout scanner
      const textContent = await page.getTextContent()
      const textItems = textContent.items as Array<any>

      for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i]
        const str = (item.str || '').trim()
        if (!str) continue

        // Check against patterns
        for (const rule of PATTERN_RULES) {
          if (rule.regex.test(str)) {
            // Found a cue!
            const transform = item.transform // [scaleX, skewY, skewX, scaleY, tx, ty]
            const cueX = transform[4]
            const cueY = transform[5] // from bottom in PDF points
            const cueW = item.width || 40
            const cueH = item.height || 12

            const dims = DEFAULT_DIMENSIONS[rule.type]
            let normX = 0
            let normY = 0

            if (rule.placement === 'above') {
              // Position box above the cue text (e.g. above "Signature" or signature line)
              normX = Math.max(0.04, Math.min(0.96 - dims.width, cueX / pageW))
              normY = Math.max(
                0.04,
                Math.min(
                  0.96 - dims.height,
                  (pageH - cueY - dims.height * pageH - 4) / pageH
                )
              )
            } else {
              // Position box to the right of the cue text (e.g. "Date: [   ]")
              normX = Math.max(
                0.04,
                Math.min(0.96 - dims.width, (cueX + cueW + 8) / pageW)
              )
              normY = Math.max(
                0.04,
                Math.min(
                  0.96 - dims.height,
                  (pageH - cueY - (dims.height * pageH) / 2) / pageH
                )
              )
            }

            // Avoid placing overlapping boxes using bounding box intersection
            const isOverlap = detected.some((existing) => {
              if (existing.page !== pageNum) return false
              const overlapX =
                normX < existing.x + existing.width && normX + dims.width > existing.x
              const overlapY =
                normY < existing.y + existing.height && normY + dims.height > existing.y
              return overlapX && overlapY
            })

            if (!isOverlap) {
              detected.push({
                id: `suggest-${fieldCounter++}`,
                type: rule.type,
                label: rule.defaultLabel,
                page: pageNum,
                x: normX,
                y: normY,
                width: dims.width,
                height: dims.height,
                required: true,
                assigned_to: 'signer',
                is_suggestion: true,
                confidence: rule.confidence,
                cueText: str,
              })
            }
          }
        }
      }
    }

    return detected
  } catch (error) {
    console.error('PDF auto-detection encountered an error:', error)
    // Non-blocking: returns empty array so user can place fields manually
    return []
  }
}
