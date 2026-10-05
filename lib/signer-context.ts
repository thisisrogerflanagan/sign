import { createAdminClient } from '@/lib/supabase/admin'
import { hashSignerToken } from '@/lib/tokens'
import { decodeFieldFromDb } from '@/lib/fields-codec'

export interface ResolvedSignerContext {
  signer: any
  document: any
  ownerProfile: any
  fields: any[]
  signedUrl: string | null
  errorType?: 'not_found' | 'expired' | 'voided' | 'deleted' | 'already_completed'
}

export async function resolveSignerToken(rawToken: string): Promise<ResolvedSignerContext> {
  const admin = createAdminClient()
  const tokenHash = hashSignerToken(rawToken)

  // 1. Look up signer by token hash
  const { data: signer, error: signerError } = await admin
    .from('signers')
    .select('*')
    .eq('token_hash', tokenHash)
    .single()

  if (signerError || !signer) {
    return { signer: null, document: null, ownerProfile: null, fields: [], signedUrl: null, errorType: 'not_found' }
  }

  // Check token expiration
  if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
    return { signer, document: null, ownerProfile: null, fields: [], signedUrl: null, errorType: 'expired' }
  }

  // 2. Look up document
  const { data: doc, error: docError } = await admin
    .from('documents')
    .select('*')
    .eq('id', signer.document_id)
    .single()

  if (docError || !doc) {
    return { signer, document: null, ownerProfile: null, fields: [], signedUrl: null, errorType: 'not_found' }
  }

  if (doc.status === 'voided') {
    return { signer, document: doc, ownerProfile: null, fields: [], signedUrl: null, errorType: 'voided' }
  }

  if (doc.status === 'deleted') {
    return { signer, document: doc, ownerProfile: null, fields: [], signedUrl: null, errorType: 'deleted' }
  }

  if (doc.status === 'completed') {
    return { signer, document: doc, ownerProfile: null, fields: [], signedUrl: null, errorType: 'already_completed' }
  }

  // 3. Fetch sender profile
  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name, email')
    .eq('id', doc.owner_id)
    .single()

  // 4. Fetch fields for document
  const { data: fields } = await admin
    .from('fields')
    .select('*')
    .eq('document_id', doc.id)
    .order('page', { ascending: true })

  // 5. Mint 60s signed URL for viewing PDF
  let signedUrl: string | null = null
  if (doc.storage_path_original) {
    const { data: signedData } = await admin.storage
      .from('originals')
      .createSignedUrl(doc.storage_path_original, 300) // 5 minutes for signer viewing

    signedUrl = signedData?.signedUrl || null
  }

  return {
    signer,
    document: doc,
    ownerProfile: profile,
    fields: (fields || []).map(decodeFieldFromDb),
    signedUrl,
  }
}
