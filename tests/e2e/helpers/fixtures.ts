import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignerToken, hashSignerToken } from '@/lib/tokens'
import { encodeFieldForDb } from '@/lib/fields-codec'
import { getSamplePdfBuffer } from './test-pdf'

export interface FixtureOptions {
  title?: string
  status?: 'sent' | 'viewed' | 'voided' | 'deleted' | 'completed'
  isTest?: boolean
  expiresInHours?: number
  signerName?: string | null
  signerEmail?: string
  additionalFields?: Array<{
    type: 'signature' | 'initials' | 'date' | 'name' | 'text'
    label: string
    page: number
    x: number
    y: number
    width: number
    height: number
    required: boolean
    value?: string | null
  }>
}

export async function createTestDocumentFixture(options: FixtureOptions = {}) {
  const admin = createAdminClient()
  const title = options.title || `Test Agreement ${Date.now()}`
  const status = options.status || 'sent'
  const isTest = options.isTest !== undefined ? options.isTest : true
  const signerName =
    options.signerName !== undefined ? options.signerName : 'Automated Test Signer'
  const signerEmail = options.signerEmail || 'robot-signer@watchpost.test'

  // Ensure owner user exists
  const ownerEmail = 'test-e2e@watchpost.test'
  const { data: usersData } = await admin.auth.admin.listUsers()
  let owner = usersData?.users.find((u) => u.email === ownerEmail)
  if (!owner) {
    const created = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
      password: 'TestPassword123!',
    })
    owner = created.data.user!
  }

  // Upload original PDF
  const pdfBuffer = await getSamplePdfBuffer()
  const storagePath = `${owner.id}/e2e-test-${Date.now()}.pdf`
  await admin.storage.from('originals').upload(storagePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  // Insert document
  const { data: doc, error: docErr } = await admin
    .from('documents')
    .insert({
      owner_id: owner.id,
      title,
      status,
      storage_path_original: storagePath,
      page_count: 1,
      is_test: isTest,
      sent_at: new Date().toISOString(),
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      voided_at: status === 'voided' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (docErr || !doc) {
    throw new Error(`Failed to create test document: ${docErr?.message}`)
  }

  // Generate token and signer
  const rawToken = generateSignerToken()
  const tokenHash = hashSignerToken(rawToken)

  const expiresAt = new Date()
  if (options.expiresInHours !== undefined) {
    expiresAt.setHours(expiresAt.getHours() + options.expiresInHours)
  } else {
    expiresAt.setDate(expiresAt.getDate() + 90)
  }

  const { data: signer, error: signerErr } = await admin
    .from('signers')
    .insert({
      document_id: doc.id,
      name: signerName,
      email: signerEmail,
      token_hash: tokenHash,
      token_expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (signerErr || !signer) {
    throw new Error(`Failed to create test signer: ${signerErr?.message}`)
  }

  // Insert signature field
  const fieldPayload = {
    type: 'signature' as const,
    label: 'Signature',
    assigned_to: 'signer' as const,
    page: 1,
    x: 0.2,
    y: 0.5,
    width: 0.25,
    height: 0.06,
    required: true,
    value:
      status === 'completed'
        ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        : null,
  }

  const encodedField = encodeFieldForDb(fieldPayload, doc.id)
  const { data: field, error: fieldErr } = await admin
    .from('fields')
    .insert({
      ...encodedField,
      signer_id: signer.id,
    })
    .select()
    .single()

  if (fieldErr) {
    console.error('Failed to create test field:', fieldErr)
  }

  const createdAdditionalFields: any[] = []
  if (options.additionalFields && options.additionalFields.length > 0) {
    for (const af of options.additionalFields) {
      const enc = encodeFieldForDb(
        {
          ...af,
          assigned_to: 'signer',
        },
        doc.id
      )
      const { data: createdAf } = await admin
        .from('fields')
        .insert({
          ...enc,
          signer_id: signer.id,
        })
        .select()
        .single()
      if (createdAf) createdAdditionalFields.push(createdAf)
    }
  }

  async function cleanup() {
    try {
      await admin.from('fields').delete().eq('document_id', doc.id)
      await admin.from('signers').delete().eq('document_id', doc.id)
      await admin.from('audit_events').delete().eq('document_id', doc.id)
      await admin.from('email_log').delete().eq('document_id', doc.id)
      await admin.from('documents').delete().eq('id', doc.id)
      await admin.storage.from('originals').remove([storagePath])
      if (doc.storage_path_signed) {
        await admin.storage.from('signed').remove([doc.storage_path_signed])
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning for doc', doc.id, cleanupErr)
    }
  }

  return {
    document: doc,
    signer,
    rawToken,
    field,
    additionalFields: createdAdditionalFields,
    cleanup,
  }
}
