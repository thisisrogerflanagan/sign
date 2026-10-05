'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'

export interface SearchItem {
  id: string
  title: string
  subsection: string
  badgeColor: string
  badgeText?: string
  hasImageBanner?: boolean
  url?: string
}

interface SearchBarProps {
  documents?: Array<{
    id: string
    title: string
    status?: string
  }>
}

const DEFAULT_DOCUMENTS: SearchItem[] = [
  {
    id: 'doc-mock-1',
    title: 'Untitled Document',
    subsection: 'The Flanagans',
    badgeColor: '#4CA4B7',
  },
  {
    id: 'doc-mock-2',
    title: '🦷 Dental Surgery',
    subsection: 'The Flanagans',
    badgeColor: '#4CA4B7',
    hasImageBanner: true,
  },
  {
    id: 'doc-mock-3',
    title: 'Untitled Document',
    subsection: 'The Flanagans',
    badgeColor: '#4CA4B7',
  },
  {
    id: 'doc-mock-4',
    title: '🪀 [2s TTH] Bluebird Christian Pre-School',
    subsection: 'The Flanagans',
    badgeColor: '#4CA4B7',
  },
  {
    id: 'doc-mock-5',
    title: '🥡 Food',
    subsection: 'The Flanagans',
    badgeColor: '#4CA4B7',
  },
  {
    id: 'doc-mock-6',
    title: '💡 Product Inspiration',
    subsection: 'Meltdown',
    badgeColor: '#D31E44',
    badgeText: 'M',
  },
  {
    id: 'doc-mock-7',
    title: 'Changelog',
    subsection: 'WhatsApp',
    badgeColor: '#25D366',
    badgeText: 'W',
  },
]

const SUBSECTIONS = [
  { name: 'The Flanagans', badgeColor: '#4CA4B7', count: 5 },
  { name: 'Meltdown', badgeColor: '#D31E44', badgeText: 'M', count: 1 },
  { name: 'WhatsApp', badgeColor: '#25D366', badgeText: 'W', count: 1 },
]

export function SearchBar({ documents }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentQuery = searchParams.get('q') || ''
  const [search, setSearch] = useState(currentQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSearch(currentQuery)
  }, [currentQuery])

  // Handle click outside & escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
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

  function handleSearch(newQuery: string) {
    setSearch(newQuery)
    const params = new URLSearchParams(searchParams.toString())

    if (!newQuery.trim()) {
      params.delete('q')
    } else {
      params.set('q', newQuery.trim())
    }

    params.delete('page')

    startTransition(() => {
      router.push(`/?${params.toString()}`)
    })
  }

  // Combine real database documents with the demo collection from mockup
  const allItems = useMemo(() => {
    const realItems: SearchItem[] = (documents || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      subsection: 'The Flanagans',
      badgeColor: '#4CA4B7',
      url: `/documents/${doc.id}`,
    }))

    const existingTitles = new Set(realItems.map((d) => d.title.toLowerCase()))
    const remainingDefaults = DEFAULT_DOCUMENTS.filter(
      (d) => !existingTitles.has(d.title.toLowerCase())
    )

    return [...realItems, ...remainingDefaults]
  }, [documents])

  // Filter items matching title or sub-section
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.toLowerCase().trim()
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subsection.toLowerCase().includes(q)
    )
  }, [allItems, search])

  // Match sub-sections directly when typing
  const matchingSubsections = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase().trim()
    return SUBSECTIONS.filter((s) => s.name.toLowerCase().includes(q))
  }, [search])

  function handleSelectItem(item: SearchItem) {
    if (item.url) {
      router.push(item.url)
    } else {
      handleSearch(item.title)
    }
    setIsOpen(false)
  }

  function handleSelectSubsection(subName: string) {
    handleSearch(subName)
    setIsOpen(false)
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
            handleSearch(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
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
              handleSearch('')
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
        <div
          className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 min-[900px]:left-0 min-[900px]:translate-x-0 z-50 overflow-y-auto flex flex-col p-3.5 select-none"
          style={{
            width: '480px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - calc(0px + 56px) - 16px)',
            borderRadius: '18px',
            boxShadow: dropdownBoxShadow,
            background: 'rgba(250, 250, 250, 0.85)',
            backdropFilter: 'saturate(1.5) blur(32px)',
            WebkitBackdropFilter: 'saturate(1.5) blur(32px)',
          }}
        >
          {/* Sub-sections Group (when typing matches sub-sections) */}
          {matchingSubsections.length > 0 && (
            <div className="mb-2">
              <div className="text-[13px] font-medium text-[#8F94A0] px-2.5 pb-1.5 pt-1">
                Sub-sections
              </div>
              <div className="space-y-0.5">
                {matchingSubsections.map((sub) => (
                  <div
                    key={sub.name}
                    onClick={() => handleSelectSubsection(sub.name)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-[12px] hover:bg-black/[0.04] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                        style={{ backgroundColor: sub.badgeColor }}
                      >
                        {sub.badgeText || (
                          <span className="w-2 h-2 rounded-full bg-white/70" />
                        )}
                      </div>
                      <span className="text-[14px] font-medium text-[#121417]">
                        {sub.name}
                      </span>
                    </div>
                    <span className="text-[12px] text-muted-foreground font-normal">
                      Filter by section
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section Header */}
          <div className="text-[13px] font-medium text-[#8F94A0] px-2.5 pb-1.5 pt-1">
            Documents
          </div>

          {/* Documents List */}
          {filteredItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matching documents or sub-sections found.
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="flex items-center gap-3.5 px-2.5 py-1.5 rounded-[12px] hover:bg-black/[0.04] transition-colors cursor-pointer group"
                >
                  {/* Miniature Document Thumbnail Icon */}
                  <div className="relative shrink-0 w-[24px] h-[32px] bg-white rounded-[3px] border border-black/[0.1] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-start p-[3px] overflow-visible">
                    {item.hasImageBanner ? (
                      <>
                        <div className="w-full h-[7px] bg-[#93C5FD]/30 rounded-[1px] mb-1 flex items-center justify-center">
                          <div className="w-2 h-1 bg-[#60A5FA]/40 rounded-full" />
                        </div>
                        <div className="w-[12px] h-[1.5px] bg-zinc-300 rounded-full mb-0.5" />
                        <div className="w-[8px] h-[1.5px] bg-zinc-200 rounded-full" />
                      </>
                    ) : (
                      <>
                        <div className="w-[10px] h-[1.5px] bg-zinc-400 rounded-full mb-1" />
                        <div className="w-[14px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[12px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[14px] h-[1.2px] bg-zinc-200 rounded-full mb-0.5" />
                        <div className="w-[8px] h-[1.2px] bg-zinc-200 rounded-full" />
                      </>
                    )}

                    {/* Sub-section Corner Badge */}
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-[2.5px] flex items-center justify-center text-[7px] font-bold text-white shadow-sm overflow-hidden"
                      style={{ backgroundColor: item.badgeColor }}
                    >
                      {item.badgeText ? (
                        item.badgeText
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      )}
                    </div>
                  </div>

                  {/* Title & Sub-section */}
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-[#121417] truncate leading-tight">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-[#6B7280] truncate leading-tight mt-0.5">
                      In {item.subsection}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
