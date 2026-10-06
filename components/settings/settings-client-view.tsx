'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Shield,
  CreditCard,
  Bell,
  Download,
  Trash2,
  Check,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Loader2,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/document-helpers'

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

interface SettingsClientViewProps {
  userEmail: string
  profile: {
    displayName: string
    timezone: string
  }
  entitlement: {
    plan: string
    purchasedAt: string | null
    refundStatus: string
  }
  usage: {
    requestsSent: number
    resetDate: string
  }
}

export function SettingsClientView({
  userEmail,
  profile: initialProfile,
  entitlement,
  usage,
}: SettingsClientViewProps) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName || '')
  const [timezone, setTimezone] = useState(initialProfile.timezone || 'America/New_York')
  const [savingProfile, setSavingProfile] = useState(false)

  // Modals state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [refundStatus, setRefundStatus] = useState(entitlement.refundStatus)

  const [exporting, setExporting] = useState(false)
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  // Save profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, timezone }),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      toast({ title: 'Profile updated' })
    } catch {
      toast({ variant: 'destructive', title: 'Error saving profile' })
    } finally {
      setSavingProfile(false)
    }
  }

  // Request refund
  async function handleRequestRefund() {
    setRefunding(true)
    try {
      const res = await fetch('/api/settings/refund', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to request refund')
      setRefundStatus('requested')
      setRefundDialogOpen(false)
      toast({
        title: 'Refund requested',
        description: 'Our support team will process your request promptly.',
      })
    } catch {
      toast({ variant: 'destructive', title: 'Error requesting refund' })
    } finally {
      setRefunding(false)
    }
  }

  // Data export
  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/settings/export', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      setExportDownloadUrl(data.downloadUrl)
      toast({
        title: 'Export ready',
        description: 'We created your archive and emailed a 24h download link.',
      })
    } catch {
      toast({ variant: 'destructive', title: 'Failed to create export' })
    } finally {
      setExporting(false)
    }
  }

  // Delete account
  async function handleDeleteAccount() {
    if (deleteConfirmation.toLowerCase() !== 'delete my account') return
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/danger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText: 'delete my account' }),
      })
      if (!res.ok) throw new Error('Deletion failed')
      router.push('/login')
      router.refresh()
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete account' })
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FCFDFE] pb-20">
      <header className="border-b bg-background sticky top-0 z-20">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
          <span className="font-semibold text-sm">Account Settings</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 space-y-8">
        {/* Section 1: Profile */}
        <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile & Signer Identity
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure how you appear to recipients on documents and email requests.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                />
                <p className="text-[11px] text-muted-foreground">
                  Signers will see:{' '}
                  <span className="font-medium text-foreground">
                    &quot;Sent by {displayName || 'Someone'}&quot;
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={userEmail}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  Your primary authentication identity. Cannot be changed.
                </p>
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </section>

        {/* Section 2: Plan & Usage */}
        <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Plan & Monthly Usage
            </h2>
            <p className="text-xs text-muted-foreground">
              Single-user lifetime membership with fair-use allowance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4 bg-[#FCFDFE] space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Current Plan
              </span>
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Lifetime Founder ($49)
              </p>
              <p className="text-xs text-muted-foreground">
                Active since{' '}
                {formatDate(entitlement.purchasedAt || new Date().toISOString())}
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-[#FCFDFE] space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Fair-Use Requests
              </span>
              <p className="text-sm font-semibold text-foreground">
                {usage.requestsSent} of 50 requests used this month
              </p>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min(100, (usage.requestsSent / 50) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Quota resets automatically on {usage.resetDate}.
              </p>
            </div>
          </div>

          {/* Refund policy block */}
          <div className="rounded-xl border border-zinc-200 p-4 text-xs space-y-2 bg-background">
            <h3 className="font-semibold text-foreground">30-Day Money-Back Guarantee</h3>
            <p className="text-muted-foreground leading-relaxed">
              If Scribbble isn&apos;t a fit for your workflow within 30 days of purchase,
              request a full refund with no hassle.
            </p>
            <div>
              {refundStatus === 'requested' ? (
                <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Refund requested. Our support team is processing your request.
                </span>
              ) : refundStatus === 'refunded' ? (
                <span className="inline-flex items-center text-xs text-muted-foreground">
                  License refunded.
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundDialogOpen(true)}
                  className="text-xs"
                >
                  Request a refund
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Data Export */}
        <section className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Data Export
            </h2>
            <p className="text-xs text-muted-foreground">
              Download an archive of all your completed, signed PDFs alongside the
              complete CSV audit activity record.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Generating archive...
                </>
              ) : (
                'Export all documents & activity record'
              )}
            </Button>

            {exportDownloadUrl && (
              <Button asChild size="sm">
                <a href={exportDownloadUrl} target="_blank" rel="noreferrer" download>
                  Download ZIP archive
                </a>
              </Button>
            )}
          </div>
        </section>

        {/* Section 4: Danger Zone */}
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 sm:p-8 space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h2>
            <p className="text-xs text-muted-foreground">
              Permanently delete your account and all associated document data. Once
              confirmed, this action cannot be undone. Note that copies already emailed to
              signers cannot be recalled.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete account
            </Button>
          </div>
        </section>
      </main>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a full refund?</DialogTitle>
            <DialogDescription>
              We will process your $49 refund via Stripe. Your license and access to
              Scribbble will be deactivated once refunded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              disabled={refunding}
            >
              Cancel
            </Button>
            <Button onClick={handleRequestRefund} disabled={refunding}>
              {refunding ? 'Submitting...' : 'Confirm refund request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Deletion Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account permanently?</DialogTitle>
            <DialogDescription>
              This will immediately delete all your documents, templates, and storage
              files. To confirm, please type{' '}
              <span className="font-semibold text-foreground">
                &quot;delete my account&quot;
              </span>{' '}
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete my account"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                deleteConfirmation.toLowerCase() !== 'delete my account' || deleting
              }
            >
              {deleting ? 'Deleting account...' : 'Permanently delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
