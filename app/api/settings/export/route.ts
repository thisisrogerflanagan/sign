import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import JSZip from 'jszip'
import { sendTransactionalEmail } from '@/lib/email/client'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // 1. Fetch completed documents for this user
    const { data: docs } = await admin
      .from('documents')
      .select('id, title, storage_path_signed, completed_at')
      .eq('owner_id', user.id)
      .eq('status', 'completed')

    // 2. Fetch all audit events
    const { data: auditEvents } = await admin
      .from('audit_events')
      .select('*, documents!inner(owner_id)')
      .eq('documents.owner_id', user.id)

    const zip = new JSZip()

    // 3. Generate CSV of audit events
    let csvContent =
      'id,document_id,event_type,actor_type,actor_email,ip_address,created_at\n'
    if (auditEvents) {
      auditEvents.forEach((ev: any) => {
        csvContent += `"${ev.id}","${ev.document_id}","${ev.event_type}","${ev.actor_type}","${ev.actor_email || ''}","${ev.ip_address || ''}","${ev.created_at}"\n`
      })
    }
    zip.file('activity_records.csv', csvContent)

    // 4. Download signed PDFs and add to zip
    if (docs) {
      const pdfsFolder = zip.folder('signed_pdfs')
      for (const d of docs) {
        if (d.storage_path_signed && pdfsFolder) {
          const { data: pdfBlob } = await admin.storage
            .from('signed')
            .download(d.storage_path_signed)

          if (pdfBlob) {
            const buf = Buffer.from(await pdfBlob.arrayBuffer())
            const filename = `${d.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${d.id.slice(0, 8)}.pdf`
            pdfsFolder.file(filename, buf)
          }
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // 5. Upload zip to storage temp path
    const zipPath = `${user.id}/exports/scribbble_export_${Date.now()}.zip`
    await admin.storage.from('signed').upload(zipPath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    })

    // 6. Mint 24h signed URL
    const { data: signedData } = await admin.storage
      .from('signed')
      .createSignedUrl(zipPath, 86400) // 24 hours

    const downloadUrl = signedData?.signedUrl

    // 7. Email download link
    if (downloadUrl && user.email) {
      await sendTransactionalEmail({
        to: user.email,
        subject: 'Your Scribbble data export is ready',
        html: `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b;">
            <h2>Your data export is ready</h2>
            <p>We bundled your signed PDFs and audit activity records into a secure archive.</p>
            <p><a href="${downloadUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Download Export (ZIP)</a></p>
            <p style="font-size: 12px; color: #64748b;">This link will expire in 24 hours.</p>
          </div>
        `,
        template: 'export_ready',
      })
    }

    return NextResponse.json({ success: true, downloadUrl })
  } catch (err: any) {
    console.error('Export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
