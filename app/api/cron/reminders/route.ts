import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTransactionalEmail } from '@/lib/email/client'
import { renderReminderDueEmail } from '@/lib/email/catalog'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Process due reminders
    const { data: dueReminders, error: remError } = await admin
      .from('reminders')
      .select(
        `
        id,
        user_id,
        document_id,
        remind_at,
        note,
        status,
        documents (
          id,
          title,
          status,
          owner_id
        )
      `
      )
      .eq('status', 'pending')
      .lte('remind_at', nowIso)

    if (remError) {
      console.error('Error fetching due reminders in cron:', remError)
    }

    let firedCount = 0
    let autoCompletedCount = 0

    for (const reminder of dueReminders || []) {
      const doc = reminder.documents as any

      // Smart behavior: if the document is completed before reminder is due,
      // auto-complete the reminder without firing an email or notification
      if (doc && doc.status === 'completed') {
        await admin
          .from('reminders')
          .update({ status: 'completed' })
          .eq('id', reminder.id)
        autoCompletedCount++
        continue
      }

      // Mark reminder as fired
      await admin.from('reminders').update({ status: 'fired' }).eq('id', reminder.id)

      firedCount++

      const docTitle = doc?.title || 'Document'
      const bodyText = reminder.note
        ? `Reminder: "${reminder.note}" for "${docTitle}".`
        : `Follow-up reminder for "${docTitle}".`

      // Create notification
      await admin.from('notifications').insert({
        user_id: reminder.user_id,
        document_id: reminder.document_id,
        type: 'reminder_due',
        title: 'Reminder due',
        body: bodyText,
      })

      // Send email to user
      const { data: userProfile } = await admin
        .from('profiles')
        .select('email, display_name')
        .eq('id', reminder.user_id)
        .maybeSingle()

      if (userProfile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const documentUrl = `${appUrl}/documents/${reminder.document_id}`
        const emailContent = renderReminderDueEmail({
          recipientName: userProfile.display_name || userProfile.email.split('@')[0],
          documentTitle: docTitle,
          note: reminder.note,
          documentUrl,
          appUrl,
        })

        await sendTransactionalEmail({
          to: userProfile.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          documentId: reminder.document_id,
          template: 'reminder_due',
        })
      }
    }

    // 2. Process time-sensitive nudges:
    // Documents awaiting signature for 3+ days with no "time-sensitive" notification in the last 7 days
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000

    const { data: awaitingDocs, error: docsError } = await admin
      .from('documents')
      .select('id, title, owner_id, status, sent_at, created_at')
      .in('status', ['sent', 'viewed'])

    if (docsError) {
      console.error('Error fetching awaiting documents in cron:', docsError)
    }

    let timeSensitiveCount = 0

    for (const doc of awaitingDocs || []) {
      const referenceDateStr = doc.sent_at || doc.created_at
      if (!referenceDateStr) continue
      const refTime = new Date(referenceDateStr).getTime()
      if (refTime > Date.now() - threeDaysMs) {
        continue
      }

      // Check if a time-sensitive notification was created in the last 7 days
      const { data: existingNotice } = await admin
        .from('notifications')
        .select('id')
        .eq('document_id', doc.id)
        .eq('type', 'time_sensitive')
        .gte('created_at', sevenDaysAgoIso)
        .maybeSingle()

      if (!existingNotice) {
        await admin.from('notifications').insert({
          user_id: doc.owner_id,
          document_id: doc.id,
          type: 'time_sensitive',
          title: 'Action needed',
          body: `"${doc.title || 'Untitled Document'}" has been awaiting signature for 3+ days.`,
        })
        timeSensitiveCount++
      }
    }

    return NextResponse.json({
      success: true,
      firedReminders: firedCount,
      autoCompletedReminders: autoCompletedCount,
      timeSensitiveNotifications: timeSensitiveCount,
    })
  } catch (err: any) {
    console.error('Error in reminders cron:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
