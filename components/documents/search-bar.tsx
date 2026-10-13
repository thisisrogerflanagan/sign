'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import { getStatusBadgeInfo } from '@/lib/document-helpers'
import { DocumentStatus } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export interface SearchSigner {
  id?: string
  name?: string | null
  email: string
}

export interface SearchDocument {
  id: string
  title: string
  status?: string
  page_count?: number | null
  created_at?: string
  updated_at?: string
  signers?: SearchSigner[] | SearchSigner
}

export interface SearchBarProps {
  documents?: SearchDocument[]
  defaultOpen?: boolean
}

export function getRecipientSubtitle(doc: SearchDocument): string {
  const signersList = Array.isArray(doc.signers)
    ? doc.signers
    : doc.signers
      ? [doc.signers]
      : []

  if (signersList.length === 0) return 'No recipient'

  const first = signersList[0]
  const moreCount = signersList.length - 1
  const moreSuffix = moreCount > 0 ? ` +${moreCount} more` : ''

  if (first.name && first.email) {
    return `${first.name} (${first.email})${moreSuffix}`
  }
  return `${first.name || first.email || 'No recipient'}${moreSuffix}`
}

export function filterDocuments<T extends SearchDocument>(docs: T[], query: string): T[] {
  if (!query.trim()) {
    return [...docs]
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
        return timeB - timeA
      })
      .slice(0, 5)
  }

  const lowerQ = query.trim().toLowerCase()
  return docs.filter((doc) => {
    const titleMatch = Boolean(doc.title && doc.title.toLowerCase().includes(lowerQ))
    const signersList = Array.isArray(doc.signers)
      ? doc.signers
      : doc.signers
        ? [doc.signers]
        : []
    const recipientMatch = signersList.some((s) => {
      const nameMatch = Boolean(s.name && s.name.toLowerCase().includes(lowerQ))
      const emailMatch = Boolean(s.email && s.email.toLowerCase().includes(lowerQ))
      return nameMatch || emailMatch
    })
    return titleMatch || recipientMatch
  })
}

export function SearchBar({ documents, defaultOpen = false }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(currentQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(currentQuery)
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isFocused, setIsFocused] = useState(false)
  const [remoteDocuments, setRemoteDocuments] = useState<SearchDocument[] | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Sync search state with searchParams ?q=
  useEffect(() => {
    setSearch(currentQuery)
  }, [currentQuery])

  // Debounce input by ~250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch real documents dynamically from API
  useEffect(() => {
    let isMounted = true
    const trimmed = debouncedQuery.trim()
    const url = trimmed
      ? `/api/documents?q=${encodeURIComponent(trimmed)}`
      : '/api/documents'

    fetch(url)
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Failed to fetch')
      })
      .then((data) => {
        if (isMounted && Array.isArray(data?.documents)) {
          setRemoteDocuments(data.documents)
        }
      })
      .catch(() => {
        // Ignore network errors or SSR / test environments
      })

    return () => {
      isMounted = false
    }
  }, [debouncedQuery])

  // Determine displayed items:
  // If remoteDocuments were loaded from API, use them.
  // Otherwise, filter props documents in memory.
  const displayedItems = useMemo(() => {
    if (remoteDocuments !== null) {
      if (!debouncedQuery.trim()) {
        return [...remoteDocuments]
          .sort((a, b) => {
            const timeA = new Date(a.updated_at || a.created_at || 0).getTime()
            const timeB = new Date(b.updated_at || b.created_at || 0).getTime()
            return timeB - timeA
          })
          .slice(0, 5)
      }
      return remoteDocuments
    }
    return filterDocuments(documents || [], debouncedQuery)
  }, [remoteDocuments, documents, debouncedQuery])

  // Handle click outside and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSearch('')
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleSelectDocument(doc: SearchDocument) {
    const href = doc.status === 'draft' ? `/send/${doc.id}/place` : `/documents/${doc.id}`
    router.push(href)
    setIsOpen(false)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setSearch('')
      setIsOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const targetItems =
        displayedItems.length > 0
          ? displayedItems
          : filterDocuments(documents || [], search)
      if (targetItems.length > 0) {
        const topDoc = targetItems[0]
        const href =
          topDoc.status === 'draft'
            ? `/send/${topDoc.id}/place`
            : `/documents/${topDoc.id}`
        router.push(href)
        setIsOpen(false)
      }
    }
  }

  const dropdownBoxShadow =
    'rgba(0, 0, 0, 0.07) 0px 4px 9px 0px, rgba(0, 0, 0, 0.06) 0px 16px 16px 0px, rgba(0, 0, 0, 0.04) 0px 36px 22px 0px, rgba(0, 0, 0, 0.01) 0px 65px 26px 0px, rgba(0, 0, 0, 0) 0px 101px 28px 0px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px'

  return (
    <div ref={containerRef} className="relative w-full flex justify-center">
      {/* Search Input Container */}
      <div
        onClick={() => setIsOpen(true)}
        className="main-search-bar relative flex items-center min-[900px]:min-w-[480px] cursor-text"
        style={{
          height: '32px',
          paddingLeft: '6px',
          paddingRight: '6px',
          backgroundColor: 'transparent',
          boxShadow:
            isFocused || isOpen
              ? 'rgba(26, 28, 30, 0.16) 0px 0px 0px 1px inset'
              : 'rgba(26, 28, 30, 0.08) 0px 0px 0px 1px inset',
          borderRadius: '12px',
          transition:
            'box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <img
          src="/icons/search.svg"
          alt="Search"
          className="h-4 w-4 shrink-0 select-none mr-1.5"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            setIsFocused(true)
            setIsOpen(true)
          }}
          onBlur={() => setIsFocused(false)}
          placeholder="Search..."
          className="flex-1 bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-[#5F6269] h-full"
        />
        {search && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSearch('')
            }}
            className="text-[#5F6269] hover:text-foreground transition-colors p-0.5"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 min-[900px]:left-0 min-[900px]:translate-x-0 z-50">
          <div
            data-testid="search-dropdown-menu"
            className="search-dropdown-menu overflow-y-auto flex flex-col p-3.5 select-none"
            style={{
              width: '480px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - calc(0px + 56px) - 16px)',
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
            {/* Header */}
            <div className="text-[13px] font-medium text-[#8F94A0] px-2.5 pb-1.5 pt-1">
              {debouncedQuery.trim() ? 'Documents' : 'Recent documents'}
            </div>

            {/* Document Results or Empty State */}
            {displayedItems.length === 0 ? (
              <div
                data-testid="search-empty-state"
                className="px-3 py-6 text-center text-xs text-[#8A8F98]"
              >
                {debouncedQuery.trim()
                  ? `No documents match "${debouncedQuery}"`
                  : 'No recent documents'}
              </div>
            ) : (
              <div className="space-y-0.5" data-testid="search-results-list">
                {displayedItems.map((item) => {
                  const recipient = getRecipientSubtitle(item)
                  const badge = item.status
                    ? getStatusBadgeInfo(item.status as DocumentStatus)
                    : null

                  return (
                    <div
                      key={item.id}
                      data-testid={`search-result-item-${item.id}`}
                      onClick={() => handleSelectDocument(item)}
                      className="flex items-center gap-3.5 px-2.5 py-1.5 rounded-[12px] hover:bg-black/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Miniature Document Thumbnail Icon */}
                      <div className="relative shrink-0 w-[24px] h-[32px] bg-white rounded-[3px] border border-black/[0.1] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-start p-[3px] overflow-visible">
                        <div className="w-[10px] h-[1.5px] bg-zinc-400 rounded-full mb-1" />
                        <div className="w-[14px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[12px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[14px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[8px] h-[1.2px] bg-zinc-200 rounded-full" />
                      </div>

                      {/* Title & Recipient Subtitle */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-[#121417] truncate leading-tight">
                          {item.title || 'Untitled Document'}
                        </div>
                        <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5">
                          {recipient}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {badge && (
                        <span
                          className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0',
                            badge.color
                          )}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
