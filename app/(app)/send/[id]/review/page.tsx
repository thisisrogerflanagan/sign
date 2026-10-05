'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Mail,
  MessageSquare,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function ReviewAndSendPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [documentId, setDocumentId] = useState<string>('')
  const [doc, setDoc] = useState<any>(null)
  const [fieldCount, setFieldCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [senderMessage, setSenderMessage] = useState('')
  const [isTest, setIsTest] = useState(false)

  // Sent confirmation state
  const [sentResult, setSentResult] = useState<{ signingUrl: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    params.then((p) => {
      setDocumentId(p.id)
      fetchDetails(p.id)
    })
  }, [params])

  async function fetchDetails(id: string) {
    try {
      setLoading(true)
      // Check document file & title
      const fileRes = await fetch(`/api/documents/${id}/file`)
      const fileData = await fileRes.json()
      if (!fileRes.ok) throw new Error(fileData.error || 'Failed to load document')
      setDoc(fileData)

      // Check fields count
      const fieldsRes = await fetch(`/api/documents/${id}/fields`)
      const fieldsData = await fieldsRes.json()
      if (fieldsRes.ok && fieldsData.fields) {
        setFieldCount(fieldsData.fields.length)
      }
    } catch (err: any) {
      setError(err.message || 'Could not load document details')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!signerEmail || fieldCount === 0 || sending) return

    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/envelopes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          signerName,
          signerEmail,
          senderMessage,
          isTest,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request')
      }

      setSentResult({ signingUrl: data.signingUrl })
    } catch (err: any) {
      setError(err.message || 'Failed to send signature request.')
    } finally {
      setSending(false)
    }
  }

  async function handleCopyLink() {
    if (!sentResult?.signingUrl) return
    await navigator.clipboard.writeText(sentResult.signingUrl)
    setCopied(true)
    toast({
      title: 'Signing link copied',
      description: 'You can now paste and share this link directly.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  // Sent Confirmation View
  if (sentResult) {
    return (
      <div className="min-h-screen bg-[#FCFDFE] flex flex-col items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm text-center space-y-6 animate-in fade-in zoom-in-95"
          data-testid="sent-confirmation-card"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {isTest ? 'Test request ready!' : 'Signature request sent!'}
            </h1>
            <p className="text-sm text-muted-foreground">
              We emailed the signing link to{' '}
              <span className="font-semibold text-foreground">{signerEmail}</span>.
            </p>
          </div>

          {/* Direct Copyable Signing Link */}
          <div className="rounded-xl border bg-muted/40 p-4 text-left space-y-2">
            <Label className="text-xs text-muted-foreground">
              Or share link directly
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={sentResult.signingUrl}
                data-testid="sent-signing-url-input"
                className="text-xs font-mono bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ml-1 text-xs">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button asChild className="w-full">
              <Link href={`/documents/${documentId}`}>View document progress</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/send">Send another document</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FCFDFE] pb-16">
      {/* Top Navbar */}
      <div className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link
              href={`/send/${documentId}/place`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to fields editor
            </Link>
          </Button>

          {/* Stepper indicator */}
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-muted-foreground">Upload</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-muted-foreground">Place fields</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
              3
            </span>
            <span className="font-semibold text-foreground">Review & send</span>
          </div>

          <div className="w-20" />
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 pt-10 sm:px-6">
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Review & send signature request
          </h1>
          <p className="text-sm text-muted-foreground">
            Specify who needs to sign. Recipients will not need to create an account.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Blocker: Zero fields */}
        {!loading && fieldCount === 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">No signature fields placed</p>
              <p className="mt-0.5">
                You must place at least one field before sending. Return to the editor to
                drop a field.
              </p>
              <Button
                asChild
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-amber-950 font-semibold underline mt-2"
              >
                <Link href={`/send/${documentId}/place`}>Return to field placement</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          {/* Summary Box */}
          <div className="rounded-xl bg-muted/40 p-4 border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                {doc?.title || 'Document'}
              </span>
              <span className="text-muted-foreground font-medium">
                {fieldCount} field{fieldCount === 1 ? '' : 's'} placed
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Single-signer envelope. All placed fields will be assigned to this
              recipient.
            </p>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signerEmail" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Signer Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signerEmail"
                type="email"
                placeholder="signer@example.com"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                required
                disabled={sending}
                data-testid="signer-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signerName" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Signer Name{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="signerName"
                type="text"
                placeholder="Jane Doe"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                disabled={sending}
                data-testid="signer-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderMessage" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Message to Signer{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <textarea
                id="senderMessage"
                rows={3}
                placeholder="Hi Jane, please review and sign this agreement at your convenience..."
                value={senderMessage}
                onChange={(e) => setSenderMessage(e.target.value)}
                disabled={sending}
                data-testid="sender-message-input"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Test Send Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border bg-[#FCFDFE] cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={isTest}
                  onChange={(e) => setIsTest(e.target.checked)}
                  data-testid="test-send-checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Send to myself as a test
                  </span>
                  <p className="text-muted-foreground mt-0.5">
                    Test sends are exempt from your 50/month fair-use quota and clearly
                    labeled as test requests.
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={sending || fieldCount === 0 || !signerEmail}
                data-testid="send-envelope-button"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing and sending request...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send signature request
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
