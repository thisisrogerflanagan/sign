'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  Eye,
  PenTool,
  CheckCheck,
  XCircle,
  Clock,
  Bell,
  Check,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NotificationItem {
  id: string
  user_id: string
  document_id: string | null
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export interface ReminderItem {
  id: string
  user_id: string
  document_id: string
  remind_at: string
  note: string | null
  status: string
  created_at: string
  documents?: {
    id: string
    title: string
    status: string
  } | null
}

interface NotificationPopupProps {
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
  documents?: Array<{
    id: string
    title: string
    status?: string
  }>
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function formatDueDate(dateStr: string) {
  const due = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = due.toDateString() === now.toDateString()
  const isTomorrow = due.toDateString() === tomorrow.toDateString()

  const timeStr = due.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  if (isToday) return `Today at ${timeStr}`
  if (isTomorrow) return `Tomorrow at ${timeStr}`
  return `${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'viewed':
      return <Eye className="h-4 w-4 text-blue-600" />
    case 'signed':
      return <PenTool className="h-4 w-4 text-indigo-600" />
    case 'completed':
      return <CheckCheck className="h-4 w-4 text-emerald-600" />
    case 'declined':
      return <XCircle className="h-4 w-4 text-rose-600" />
    case 'time_sensitive':
      return <Clock className="h-4 w-4 text-amber-600" />
    case 'reminder_due':
    default:
      return <Bell className="h-4 w-4 text-purple-600" />
  }
}

export function NotificationPopup({
  onClose,
  onUnreadCountChange,
  documents: initialDocs = [],
}: NotificationPopupProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'reminders'>(
    'notifications'
  )
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [loadingReminders, setLoadingReminders] = useState(true)
  const [creatingReminder, setCreatingReminder] = useState(false)
  const [savingReminder, setSavingReminder] = useState(false)

  // New Reminder form state
  const [selectedDocId, setSelectedDocId] = useState('')
  const [remindPreset, setRemindPreset] = useState<
    'tomorrow' | '3days' | '1week' | 'custom'
  >('tomorrow')
  const [customDate, setCustomDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')

  const popupRef = useRef<HTMLDivElement>(null)

  const dropdownBoxShadow =
    'rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px'

  // Fetch notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          onUnreadCountChange?.(data.unreadCount || 0)
        }
      } catch (err) {
        console.error('Failed to load notifications:', err)
      } finally {
        setLoadingNotifications(false)
      }
    }
    loadNotifications()
  }, [onUnreadCountChange])

  // Fetch reminders
  useEffect(() => {
    async function loadReminders() {
      try {
        const res = await fetch('/api/reminders')
        if (res.ok) {
          const data = await res.json()
          setReminders(data.reminders || [])
        }
      } catch (err) {
        console.error('Failed to load reminders:', err)
      } finally {
        setLoadingReminders(false)
      }
    }
    loadReminders()
  }, [])

  // Handle click outside and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Mark all as read
  async function handleMarkAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
    onUnreadCountChange?.(0)

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  // Mark single as read
  async function handleNotificationClick(n: NotificationItem) {
    if (!n.read_at) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
        )
      )
      const newUnread = notifications.filter(
        (item) => item.id !== n.id && !item.read_at
      ).length
      onUnreadCountChange?.(newUnread)

      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id }),
      }).catch(console.error)
    }
    onClose()
  }

  // Cancel reminder
  async function handleCancelReminder(reminderId: string) {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId))
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reminderId }),
      })
    } catch (err) {
      console.error('Failed to cancel reminder:', err)
    }
  }

  // Create reminder
  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDocId) return

    let targetDate = new Date()
    if (remindPreset === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === '3days') {
      targetDate.setDate(targetDate.getDate() + 3)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === '1week') {
      targetDate.setDate(targetDate.getDate() + 7)
      targetDate.setHours(9, 0, 0, 0)
    } else if (remindPreset === 'custom' && customDate) {
      targetDate = new Date(customDate)
    }

    setSavingReminder(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocId,
          remindAt: targetDate.toISOString(),
          note: reminderNote || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.reminder) {
          setReminders((prev) => [...prev, data.reminder])
        }
        setCreatingReminder(false)
        setReminderNote('')
        setSelectedDocId('')
      }
    } catch (err) {
      console.error('Failed to create reminder:', err)
    } finally {
      setSavingReminder(false)
    }
  }

  // Pending documents eligible for reminders (sent or viewed)
  const eligibleDocs = initialDocs.filter(
    (d) => d.status === 'sent' || d.status === 'viewed'
  )

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div
      ref={popupRef}
      className="absolute top-[calc(100%+8px)] right-0 z-50 flex flex-col p-4 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        width: '400px',
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: '18px',
        boxShadow: dropdownBoxShadow,
        background: 'rgba(250, 250, 250, 0.95)',
        backdropFilter: 'saturate(1.5) blur(32px)',
        WebkitBackdropFilter: 'saturate(1.5) blur(32px)',
      }}
    >
      {/* Header Row: Title & Actions */}
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-[16px] font-bold tracking-tight text-[#121417]">
          {activeTab === 'notifications' ? 'Notifications' : 'Reminders'}
        </h3>
        {activeTab === 'notifications' ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[12px] font-medium text-[#2A6FF5] hover:text-[#1E5ED8] disabled:text-[#8A8F98] disabled:cursor-default transition-colors flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : (
          !creatingReminder && (
            <button
              type="button"
              onClick={() => {
                if (eligibleDocs.length > 0) {
                  setSelectedDocId(eligibleDocs[0].id)
                }
                setCreatingReminder(true)
              }}
              className="text-[12px] font-medium text-[#2A6FF5] hover:text-[#1E5ED8] transition-colors flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New reminder
            </button>
          )
        )}
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-[#EAECEF]/80 p-1 rounded-[12px] flex items-center gap-1 text-[13px] mb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('notifications')
            setCreatingReminder(false)
          }}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-[9px] font-medium transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'notifications'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-[#5F6269] hover:text-[#121417]'
          )}
        >
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#E5484D] text-white text-[10px] font-semibold leading-none">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-[9px] font-medium transition-all text-center flex items-center justify-center gap-1.5',
            activeTab === 'reminders'
              ? 'bg-white text-[#121417] shadow-sm'
              : 'text-[#5F6269] hover:text-[#121417]'
          )}
        >
          <span>Reminders</span>
          {reminders.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#EAECEF] text-[#5F6269] text-[10px] font-semibold leading-none">
              {reminders.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Notifications */}
      {activeTab === 'notifications' && (
        <div className="flex flex-col min-h-[220px] max-h-[360px] overflow-y-auto">
          {loadingNotifications ? (
            <div className="flex flex-1 items-center justify-center py-10 text-[#8A8F98]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 px-4 text-center">
              <div className="h-10 w-10 rounded-full bg-[#EAECEF] flex items-center justify-center mb-3 text-[#5F6269]">
                <Check className="h-5 w-5" />
              </div>
              <h4 className="text-[15px] font-semibold text-[#121417]">
                You&apos;re all caught up.
              </h4>
              <p className="text-[12px] text-[#5F6269] mt-1 max-w-[260px] leading-relaxed">
                Activity like views, signatures, and reminder notices will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-black/[0.04]">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'group flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors',
                    !n.read_at
                      ? 'bg-white hover:bg-black/[0.02]'
                      : 'hover:bg-black/[0.03] opacity-80 hover:opacity-100'
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-black/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-[#121417] truncate">
                        {n.title}
                      </p>
                      <span className="text-[11px] text-[#8A8F98] shrink-0 font-normal">
                        {formatRelativeTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#5F6269] line-clamp-2 mt-0.5 leading-snug">
                      {n.body}
                    </p>
                  </div>
                  {!n.read_at && (
                    <div className="h-2 w-2 rounded-full bg-[#2A6FF5] shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reminders */}
      {activeTab === 'reminders' && (
        <div className="flex flex-col min-h-[220px] max-h-[380px] overflow-y-auto">
          {creatingReminder ? (
            <form onSubmit={handleCreateReminder} className="space-y-3 p-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#5F6269] uppercase tracking-wider">
                  Document
                </label>
                {eligibleDocs.length === 0 ? (
                  <p className="text-[12px] text-[#8A8F98] italic">
                    No documents currently awaiting signature.
                  </p>
                ) : (
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full text-[13px] bg-white border border-black/[0.1] rounded-lg px-2.5 py-1.5 text-[#121417] focus:outline-none focus:ring-1 focus:ring-[#2A6FF5]"
                    required
                  >
                    {eligibleDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title || 'Untitled Document'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#5F6269] uppercase tracking-wider">
                  When
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setRemindPreset('tomorrow')}
                    className={cn(
                      'py-1.5 px-2 rounded-lg border text-center transition-colors font-medium',
                      remindPreset === 'tomorrow'
                        ? 'bg-white border-[#2A6FF5] text-[#2A6FF5] shadow-xs'
                        : 'bg-white/60 border-black/[0.08] text-[#5F6269] hover:bg-white'
                    )}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('3days')}
                    className={cn(
                      'py-1.5 px-2 rounded-lg border text-center transition-colors font-medium',
                      remindPreset === '3days'
                        ? 'bg-white border-[#2A6FF5] text-[#2A6FF5] shadow-xs'
                        : 'bg-white/60 border-black/[0.08] text-[#5F6269] hover:bg-white'
                    )}
                  >
                    In 3 days
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('1week')}
                    className={cn(
                      'py-1.5 px-2 rounded-lg border text-center transition-colors font-medium',
                      remindPreset === '1week'
                        ? 'bg-white border-[#2A6FF5] text-[#2A6FF5] shadow-xs'
                        : 'bg-white/60 border-black/[0.08] text-[#5F6269] hover:bg-white'
                    )}
                  >
                    In 1 week
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemindPreset('custom')}
                    className={cn(
                      'py-1.5 px-2 rounded-lg border text-center transition-colors font-medium',
                      remindPreset === 'custom'
                        ? 'bg-white border-[#2A6FF5] text-[#2A6FF5] shadow-xs'
                        : 'bg-white/60 border-black/[0.08] text-[#5F6269] hover:bg-white'
                    )}
                  >
                    Pick date
                  </button>
                </div>
                {remindPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full text-[12px] bg-white border border-black/[0.1] rounded-lg px-2.5 py-1.5 text-[#121417] mt-1"
                    required
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#5F6269] uppercase tracking-wider">
                  Note (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. nudge about the deposit"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full text-[13px] bg-white border border-black/[0.1] rounded-lg px-2.5 py-1.5 text-[#121417] placeholder:text-[#8A8F98] focus:outline-none focus:ring-1 focus:ring-[#2A6FF5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreatingReminder(false)}
                  className="text-[12px] font-medium text-[#5F6269] hover:text-[#121417] px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedDocId || savingReminder}
                  className="text-[12px] font-medium bg-[#2A6FF5] hover:bg-[#1E5ED8] disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {savingReminder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Set reminder
                </button>
              </div>
            </form>
          ) : loadingReminders ? (
            <div className="flex flex-1 items-center justify-center py-10 text-[#8A8F98]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-8 px-4 text-center">
              <div className="h-10 w-10 rounded-full bg-[#EAECEF] flex items-center justify-center mb-3 text-[#5F6269]">
                <Calendar className="h-5 w-5" />
              </div>
              <h4 className="text-[15px] font-semibold text-[#121417]">
                No pending reminders
              </h4>
              <p className="text-[12px] text-[#5F6269] mt-1 max-w-[260px] leading-relaxed">
                Schedule a follow-up reminder to nudge signers when needed.
              </p>
              {eligibleDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDocId(eligibleDocs[0].id)
                    setCreatingReminder(true)
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[#2A6FF5] hover:bg-[#1E5ED8] text-white font-medium text-[12px] px-3.5 py-1.5 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New reminder
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {reminders.map((r) => {
                const docTitle = r.documents?.title || 'Document'
                return (
                  <div
                    key={r.id}
                    className="bg-white/90 border border-black/[0.06] rounded-xl p-3 shadow-xs flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/documents/${r.document_id}`}
                        onClick={onClose}
                        className="text-[13px] font-medium text-[#121417] hover:text-[#2A6FF5] truncate flex items-center gap-1 transition-colors"
                      >
                        <span className="truncate">{docTitle}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-[#8A8F98]" />
                      </Link>
                      <p className="text-[12px] text-[#2A6FF5] font-medium mt-0.5">
                        {formatDueDate(r.remind_at)}
                      </p>
                      {r.note && (
                        <p className="text-[12px] text-[#5F6269] italic mt-1 line-clamp-2">
                          &ldquo;{r.note}&rdquo;
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelReminder(r.id)}
                      className="p-1 rounded-md text-[#8A8F98] hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="Cancel reminder"
                      aria-label="Cancel reminder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
