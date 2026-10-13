'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  CreditCard,
  Download,
  AlertTriangle,
  X,
  Sparkles,
  Loader2,
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
import { getUserInitials } from '@/components/app-shell'
import { cn } from '@/lib/utils'

export const COMMON_TIMEZONES = [
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

export type SettingsSectionId = 'profile' | 'plan' | 'export' | 'danger'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
  userName?: string
  userAvatar?: string | null
  initialProfile?: {
    displayName?: string
    timezone?: string
  }
  initialEntitlement?: {
    plan?: string
    purchasedAt?: string | null
    refundStatus?: string
  }
  initialUsage?: {
    requestsSent?: number
    resetDate?: string
  }
  defaultSection?: SettingsSectionId
}

export function SettingsModal({
  isOpen,
  onClose,
  userEmail: propEmail = '',
  userName: propName = 'Joe Banks',
  userAvatar,
  initialProfile,
  initialEntitlement,
  initialUsage,
  defaultSection = 'profile',
}: SettingsModalProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [activeSection, setActiveSection] = useState<SettingsSectionId>(defaultSection)
  const [userEmail, setUserEmail] = useState(propEmail)
  const [userName, setUserName] = useState(propName)

  // Profile Form state
  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName || propName !== 'Joe Banks' ? propName : ''
  )
  const [timezone, setTimezone] = useState(initialProfile?.timezone || 'America/New_York')
  const [savingProfile, setSavingProfile] = useState(false)

  // Entitlement state
  const [entitlement, setEntitlement] = useState({
    plan: initialEntitlement?.plan || 'lifetime_founder',
    purchasedAt: initialEntitlement?.purchasedAt || null,
    refundStatus: initialEntitlement?.refundStatus || 'none',
  })
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [refunding, setRefunding] = useState(false)

  // Usage state
  const [usage, setUsage] = useState({
    requestsSent: initialUsage?.requestsSent || 0,
    resetDate: initialUsage?.resetDate || 'Nov 1, 2026',
  })

  // Export state
  const [exporting, setExporting] = useState(false)
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null)

  // Danger state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Fetch fresh data when opened
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    fetch('/api/settings')
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Failed to fetch settings')
      })
      .then((data) => {
        if (!isMounted) return
        if (data.userEmail) setUserEmail(data.userEmail)
        if (data.profile) {
          if (data.profile.displayName) {
            setDisplayName(data.profile.displayName)
            setUserName(data.profile.displayName)
          }
          if (data.profile.timezone) setTimezone(data.profile.timezone)
        }
        if (data.entitlement) {
          setEntitlement({
            plan: data.entitlement.plan || 'lifetime_founder',
            purchasedAt: data.entitlement.purchasedAt || null,
            refundStatus: data.entitlement.refundStatus || 'none',
          })
        }
        if (data.usage) {
          setUsage({
            requestsSent: data.usage.requestsSent || 0,
            resetDate: data.usage.resetDate || 'Nov 1, 2026',
          })
        }
      })
      .catch(() => {
        // Fallback silently to initial props
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

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
      setUserName(displayName.trim() || propName)
      toast({ title: 'Profile updated' })
      router.refresh()
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
      setEntitlement((prev) => ({ ...prev, refundStatus: 'requested' }))
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
      onClose()
      router.push('/login')
      router.refresh()
    } catch {
      toast({ variant: 'destructive', title: 'Could not delete account' })
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  const initials = getUserInitials(userName, userEmail)

  const dropdownBoxShadow =
    'rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px'

  const navSections = [
    {
      id: 'profile' as const,
      label: 'Profile & Signer Identity',
      icon: User,
    },
    {
      id: 'plan' as const,
      label: 'Plan & Monthly Usage',
      icon: CreditCard,
    },
    {
      id: 'export' as const,
      label: 'Data Export',
      icon: Download,
    },
    {
      id: 'danger' as const,
      label: 'Danger Zone',
      icon: AlertTriangle,
      danger: true,
    },
  ]

  return (
    <div
      data-testid="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        data-testid="settings-modal-panel"
        className="settings-modal-panel relative flex flex-col md:flex-row w-full max-w-[840px] max-h-[85vh] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: '18px',
          ...({
            cornerShape: 'superellipse(1.333)',
            WebkitCornerShape: 'superellipse(1.333)',
          } as any),
          boxShadow: dropdownBoxShadow,
          background: 'rgba(250, 250, 250, 0.85)',
          backdropFilter: 'saturate(1.5) blur(32px)',
          WebkitBackdropFilter: 'saturate(1.5) blur(32px)',
        }}
      >
        {/* ============================================================ */}
        {/* LEFT COLUMN: User Identity Block + Nav List (~280px)          */}
        {/* ============================================================ */}
        <div className="w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-r border-black/[0.06] p-4 sm:p-5 flex flex-col bg-transparent">
          {/* 1. User Identity Block */}
          <div
            data-testid="settings-identity-block"
            className="flex items-center gap-3 pb-4 mb-3 border-b border-black/[0.06]"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="h-9 w-9 object-cover shrink-0"
                style={{
                  borderRadius: '50%',
                  ...({
                    cornerShape: 'squircle',
                    WebkitCornerShape: 'squircle',
                  } as any),
                }}
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold select-none"
                style={{
                  borderRadius: '50%',
                  ...({
                    cornerShape: 'squircle',
                    WebkitCornerShape: 'squircle',
                  } as any),
                  backgroundColor: '#FFAFA5',
                  color: '#892055',
                }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#121417] truncate leading-tight">
                {userName}
              </p>
              <p className="text-[12px] text-[#5F6269] truncate leading-tight mt-0.5">
                {userEmail}
              </p>
            </div>
          </div>

          {/* 2. Grouped Nav List */}
          <nav
            data-testid="settings-nav-list"
            className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0"
          >
            {navSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              return (
                <button
                  type="button"
                  key={section.id}
                  data-testid={`settings-nav-${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-medium transition-all text-left shrink-0 md:shrink select-none',
                    isActive
                      ? 'bg-[#F1F1F1] text-[#111111] shadow-none'
                      : section.danger
                        ? 'text-[#C53030] hover:text-[#9B2C2C] hover:bg-red-500/[0.06]'
                        : 'text-[#737373] hover:text-[#111111] hover:bg-black/[0.04]'
                  )}
                  style={
                    isActive
                      ? {
                          backgroundColor: '#F1F1F1',
                          color: '#111111',
                          ...({
                            cornerShape: 'superellipse(1.333)',
                            WebkitCornerShape: 'superellipse(1.333)',
                          } as any),
                        }
                      : undefined
                  }
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive
                        ? 'text-[#111111]'
                        : section.danger
                          ? 'text-[#C53030]'
                          : 'text-[#737373]'
                    )}
                  />
                  <span className="whitespace-nowrap">{section.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANE: Header with Close (X) + Section Content          */}
        {/* ============================================================ */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-transparent">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 p-5 sm:p-6 pb-3 sm:pb-4 border-b border-black/[0.06]">
            <div>
              <h2 className="text-[16px] font-semibold text-[#121417] tracking-tight leading-snug">
                {activeSection === 'profile' && 'Profile & Signer Identity'}
                {activeSection === 'plan' && 'Plan & Monthly Usage'}
                {activeSection === 'export' && 'Data Export'}
                {activeSection === 'danger' && 'Danger Zone'}
              </h2>
              <p className="text-[12px] text-[#5F6269] mt-0.5">
                {activeSection === 'profile' &&
                  'Configure how you appear to recipients on documents and email requests.'}
                {activeSection === 'plan' &&
                  'Single-user lifetime membership with fair-use allowance.'}
                {activeSection === 'export' &&
                  'Download an archive of all your completed, signed PDFs alongside the audit record.'}
                {activeSection === 'danger' &&
                  'Permanently delete your account and all associated document data.'}
              </p>
            </div>

            <button
              type="button"
              data-testid="settings-close-button"
              aria-label="Close settings"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#5F6269] hover:text-[#121417] hover:bg-black/[0.04] transition-colors focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Section Rows (Scrollable Content) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* 1. Profile & Signer Identity */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Display Name Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/[0.04]">
                  <div className="space-y-0.5 pr-2">
                    <Label
                      htmlFor="displayName"
                      className="text-[13px] font-medium text-[#121417]"
                    >
                      Display Name
                    </Label>
                    <p className="text-[11px] text-[#5F6269]">
                      Signers will see:{' '}
                      <span className="font-medium text-[#121417]">
                        {`"Sent by ${displayName || 'Someone'}"`}
                      </span>
                    </p>
                  </div>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full sm:w-[240px] text-[13px] h-9"
                  />
                </div>

                {/* Email Address Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/[0.04]">
                  <div className="space-y-0.5 pr-2">
                    <Label
                      htmlFor="email"
                      className="text-[13px] font-medium text-[#121417]"
                    >
                      Email Address
                    </Label>
                    <p className="text-[11px] text-[#5F6269]">
                      Your primary authentication identity. Cannot be changed.
                    </p>
                  </div>
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="w-full sm:w-[240px] bg-black/[0.02] text-[13px] h-9 cursor-not-allowed"
                  />
                </div>

                {/* Timezone Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/[0.04]">
                  <div className="space-y-0.5 pr-2">
                    <Label
                      htmlFor="timezone"
                      className="text-[13px] font-medium text-[#121417]"
                    >
                      Timezone
                    </Label>
                    <p className="text-[11px] text-[#5F6269]">
                      Used for date stamps and notification schedules.
                    </p>
                  </div>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full sm:w-[240px] rounded-md border border-input bg-transparent px-3 py-1.5 text-[13px] shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-9"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit Row */}
                <div className="pt-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={savingProfile}>
                    {savingProfile ? 'Saving...' : 'Save profile'}
                  </Button>
                </div>
              </form>
            )}

            {/* 2. Plan & Monthly Usage */}
            {activeSection === 'plan' && (
              <div className="space-y-5">
                {/* Current Plan Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/[0.04]">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[13px] font-medium text-[#121417]">
                      Current Plan
                    </span>
                    <p className="text-[11px] text-[#5F6269]">
                      Active since{' '}
                      {formatDate(entitlement.purchasedAt || new Date().toISOString())}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Lifetime Founder ($49)</span>
                  </div>
                </div>

                {/* Monthly Allowance Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-black/[0.04]">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[13px] font-medium text-[#121417]">
                      Fair-Use Allowance
                    </span>
                    <p className="text-[11px] text-[#5F6269]">
                      Quota resets automatically on {usage.resetDate}.
                    </p>
                  </div>
                  <div className="w-full sm:w-[240px] space-y-1.5 sm:text-right">
                    <div className="text-xs font-semibold text-[#121417]">
                      {`${usage.requestsSent} of 50 requests`}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (usage.requestsSent / 50) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 30-Day Money-Back Guarantee Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[13px] font-medium text-[#121417]">
                      30-Day Money-Back Guarantee
                    </span>
                    <p className="text-[11px] text-[#5F6269] max-w-sm">
                      If Scribbble isn&apos;t a fit for your workflow within 30 days of
                      purchase, request a full refund with no hassle.
                    </p>
                  </div>
                  <div>
                    {entitlement.refundStatus === 'requested' ? (
                      <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        Refund requested
                      </span>
                    ) : entitlement.refundStatus === 'refunded' ? (
                      <span className="inline-flex items-center text-xs text-muted-foreground">
                        License refunded
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
              </div>
            )}

            {/* 3. Data Export */}
            {activeSection === 'export' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[13px] font-medium text-[#121417]">
                      Full Document Archive
                    </span>
                    <p className="text-[11px] text-[#5F6269] max-w-sm">
                      Download an archive containing all your completed, signed PDFs
                      alongside the complete CSV activity audit trail.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      disabled={exporting}
                    >
                      {exporting ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Export all documents'
                      )}
                    </Button>

                    {exportDownloadUrl && (
                      <Button asChild size="sm">
                        <a
                          href={exportDownloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          Download ZIP
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Danger Zone */}
            {activeSection === 'danger' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[13px] font-medium text-[#C53030]">
                      Delete Account Permanently
                    </span>
                    <p className="text-[11px] text-[#5F6269] max-w-sm">
                      Permanently delete your account, templates, signatures, and document
                      records. Once confirmed, this action cannot be undone.
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      Delete account
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
