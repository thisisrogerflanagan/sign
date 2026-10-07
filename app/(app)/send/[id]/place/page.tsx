'use client'

import React, { use } from 'react'
import { SendFlowEditor } from '@/components/send/send-flow-editor'

export default function FieldEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return <SendFlowEditor initialStep="place" documentId={resolvedParams.id} />
}
