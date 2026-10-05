'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Compass,
  FileText,
  Send,
  PenTool,
  CheckCircle,
  Settings,
  Activity,
  User,
  ExternalLink,
  X,
  Search,
  Shield,
  Scale,
  Copy,
  ChevronRight,
  Eye,
} from 'lucide-react'

interface RecentDoc {
  id: string
  title: string | null
  status: string
  updated_at: string
}

export function DevToolbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)

  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Keyboard shortcut: Option+V to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Load recent documents when opened
  useEffect(() => {
    if (!isOpen) return

    async function fetchDocs() {
      try {
        setLoadingDocs(true)
        const res = await fetch('/api/dev/routes')
        if (res.ok) {
          const data = await res.json()
          setRecentDocs(data.recentDocuments || [])
        }
      } catch {
        // Ignore fetch errors
      } finally {
        setLoadingDocs(false)
      }
    }

    fetchDocs()
  }, [isOpen])

  async function openSignerLink(docId: string) {
    try {
      setGeneratingLink(docId)
      const res = await fetch(`/api/envelopes/${docId}/link`, { method: 'POST' })
      if (!res.ok) throw new Error('Could not generate link')
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (err: any) {
      alert('Could not open signer link: ' + err.message)
    } finally {
      setGeneratingLink(null)
    }
  }

  const staticSections = [
    {
      title: 'Sender Views',
      items: [
        {
          label: 'All Docs (Dashboard)',
          href: '/',
          icon: FileText,
          desc: 'Document list, sort, search, fair-use count',
        },
        {
          label: 'Upload Document',
          href: '/send',
          icon: Send,
          desc: 'Upload PDF and set signer details',
        },
        {
          label: 'Activity Log',
          href: '/activity',
          icon: Activity,
          desc: 'Global audit events across documents',
        },
        {
          label: 'Settings',
          href: '/settings',
          icon: Settings,
          desc: 'Sender profile, usage limits, danger zone',
        },
        {
          label: 'Welcome / Onboarding',
          href: '/welcome',
          icon: User,
          desc: 'First-time user onboarding tour',
        },
      ],
    },
    {
      title: 'Auth & Growth',
      items: [
        {
          label: 'Login Screen',
          href: '/login',
          icon: User,
          desc: 'Magic link authentication',
        },
        {
          label: 'Claim Account',
          href: '/claim',
          icon: ExternalLink,
          desc: 'Post-signature viral signup page',
        },
      ],
    },
    {
      title: 'Legal & Compliance',
      items: [
        {
          label: 'E-Sign Consent',
          href: '/legal/esign-consent',
          icon: Shield,
          desc: 'ESIGN / UETA consumer consent disclosure',
        },
        {
          label: 'Terms of Service',
          href: '/legal/terms',
          icon: Scale,
          desc: 'Standard service terms',
        },
        {
          label: 'Privacy Policy',
          href: '/legal/privacy',
          icon: Shield,
          desc: 'Data handling practices',
        },
        {
          label: 'Refund Policy',
          href: '/legal/refund',
          icon: FileText,
          desc: 'Refund guidelines',
        },
      ],
    },
  ]

  const drafts = recentDocs.filter((d) => d.status === 'draft')
  const signable = recentDocs.filter((d) => d.status === 'sent' || d.status === 'viewed')
  const completed = recentDocs.filter((d) => d.status === 'completed')

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-full bg-zinc-900 text-white shadow-xl hover:bg-zinc-800 transition-all border border-zinc-700 select-none group"
        title="Browse all views (Option + V)"
      >
        <Compass className="h-4 w-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
        <span>Views</span>
        <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
          ⌥V
        </span>
      </button>

      {/* Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-zinc-900 text-emerald-400 rounded-lg">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 leading-none">
                    View Navigator
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Jump to any sender, editor, signer, or legal page
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search views (e.g. place, signer, review, consent)..."
                className="w-full text-xs outline-hidden placeholder:text-zinc-400 text-zinc-800 bg-transparent"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-xs text-zinc-400 hover:text-zinc-600 font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
              {/* Contextual Draft & Signer Links for Active DB Documents */}
              {(drafts.length > 0 || signable.length > 0 || completed.length > 0) &&
                !search && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900 uppercase tracking-wider text-[10px]">
                        Live Context Views (Your Documents)
                      </span>
                      <span className="text-[10px] text-amber-700">
                        Direct links into your active data
                      </span>
                    </div>

                    {drafts.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-medium text-zinc-700">
                          Drafts (Place Fields & Review):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {drafts.slice(0, 4).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-amber-100 text-zinc-800"
                            >
                              <span className="truncate max-w-[140px] font-medium">
                                {d.title || 'Untitled Draft'}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Link
                                  href={`/send/${d.id}/place`}
                                  onClick={() => setIsOpen(false)}
                                  className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium text-[11px] transition-colors"
                                >
                                  Place fields
                                </Link>
                                <Link
                                  href={`/send/${d.id}/review`}
                                  onClick={() => setIsOpen(false)}
                                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[11px] transition-colors"
                                >
                                  Review
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {signable.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="text-[11px] font-medium text-zinc-700">
                          Signer Experience (Live Link):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {signable.slice(0, 4).map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-100 text-zinc-800"
                            >
                              <span className="truncate max-w-[130px] font-medium">
                                {d.title || 'Document'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => openSignerLink(d.id)}
                                  disabled={generatingLink === d.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-600 text-white font-medium text-[11px] transition-colors"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>
                                    {generatingLink === d.id
                                      ? 'Loading...'
                                      : 'Signer view'}
                                  </span>
                                </button>
                                <Link
                                  href={`/documents/${d.id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-[11px]"
                                >
                                  Details
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Static Sections */}
              {staticSections.map((sec) => {
                const filteredItems = sec.items.filter(
                  (i) =>
                    !search ||
                    i.label.toLowerCase().includes(search.toLowerCase()) ||
                    i.desc.toLowerCase().includes(search.toLowerCase()) ||
                    i.href.toLowerCase().includes(search.toLowerCase())
                )

                if (filteredItems.length === 0) return null

                return (
                  <div key={sec.title} className="space-y-2">
                    <div className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                      {sec.title}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="group flex items-start gap-3 p-2.5 rounded-xl border border-zinc-100 bg-white hover:border-zinc-300 hover:bg-zinc-50/80 transition-all text-zinc-900"
                          >
                            <div className="p-2 rounded-lg bg-zinc-100 group-hover:bg-zinc-900 group-hover:text-white transition-colors shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-zinc-900 group-hover:text-primary transition-colors">
                                  {item.label}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {item.href}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Dev Toolbar • Only rendered in local development</span>
              <span className="font-mono text-zinc-400">Press ⌥V to toggle anytime</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
