import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parsePdfBuffer } from '@/lib/pdf/parse'
import { autoDetectPdfFields } from '@/lib/pdf-auto-detect'
import { encodeFieldForDb } from '@/lib/fields-codec'
import { writeAuditEvent } from '@/lib/audit'
import { captureServerEvent } from '@/lib/analytics'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const titleInput = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate MIME type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF documents are supported. Please upload a .pdf file.' },
        { status: 400 }
      )
    }

    // Validate size (10 MB limit)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds the 10 MB limit. Please upload a smaller PDF.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Inspect & parse PDF with pdf-lib
    let parsed
    try {
      parsed = await parsePdfBuffer(buffer)
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: parseErr.message || 'The PDF is damaged and cannot be opened.' },
        { status: 400 }
      )
    }

    if (parsed.isEncrypted) {
      return NextResponse.json(
        {
          error:
            'Password-protected or encrypted PDFs cannot be prepared for signing. Please remove the password and try again.',
        },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Create document record in draft state
    const cleanTitle =
      titleInput?.trim() || file.name.replace(/\.pdf$/i, '').trim() || 'Untitled Document'

    const { data: document, error: docError } = await admin
      .from('documents')
      .insert({
        owner_id: user.id,
        title: cleanTitle,
        status: 'draft',
        page_count: parsed.pageCount,
        is_test: false,
      })
      .select('id')
      .single()

    if (docError || !document) {
      console.error('Failed to create document row:', docError)
      return NextResponse.json(
        { error: 'Failed to create document record. Please try again.' },
        { status: 500 }
      )
    }

    const documentId = document.id
    const storagePath = `${user.id}/${documentId}/original.pdf`

    // 2. Upload file to Supabase Storage 'originals' bucket
    const { error: uploadError } = await admin.storage
      .from('originals')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      // Cleanup draft document row if upload failed
      await admin.from('documents').delete().eq('id', documentId)
      return NextResponse.json(
        { error: 'Failed to store PDF file. Please try again.' },
        { status: 500 }
      )
    }

    // 3. Update document with storage path
    await admin
      .from('documents')
      .update({ storage_path_original: storagePath })
      .eq('id', documentId)

    // 3b. Automatically detect fields in the uploaded PDF and insert as suggestions
    try {
      const detected = await autoDetectPdfFields(buffer)
      if (detected.length > 0) {
        const fieldsToInsert = detected.map((d) =>
          encodeFieldForDb(
            {
              type: d.type,
              label: d.label,
              page: d.page,
              x: d.x,
              y: d.y,
              width: d.width,
              height: d.height,
              required: d.required,
              assigned_to: d.assigned_to,
              is_suggestion: true,
            },
            documentId
          )
        )
        await admin.from('fields').insert(fieldsToInsert)
      }
    } catch (detectErr) {
      console.error('Non-blocking PDF auto-detect error during upload:', detectErr)
    }

    // 4. Record audit event
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = req.headers.get('user-agent') || null

    await writeAuditEvent({
      documentId,
      actorType: 'sender',
      actorEmail: user.email,
      eventType: 'document_created',
      ipAddress: ip,
      userAgent,
      metadata: {
        page_count: parsed.pageCount,
        file_size_kb: Math.round(file.size / 1024),
      },
    })

    // 5. Fire PostHog server event
    await captureServerEvent(user.id, {
      name: 'document_uploaded',
      properties: {
        page_count: parsed.pageCount,
        file_size_kb: Math.round(file.size / 1024),
      },
    })

    return NextResponse.json({
      documentId,
      pageCount: parsed.pageCount,
      title: cleanTitle,
    })
  } catch (error: any) {
    console.error('Unexpected error during document upload:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during upload.' },
      { status: 500 }
    )
  }
}
