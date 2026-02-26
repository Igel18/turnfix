import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  TrophyIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useOptionalEvent } from '../contexts/EventContext'
import { useEventSearch, SearchResult } from '../hooks/useEventSearch'

interface EventSearchPaletteProps {
  open: boolean
  onClose: () => void
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  participant: 'Teilnehmer',
  competition: 'Wettkämpfe',
  squad: 'Riegen',
  discipline: 'Disziplinen',
}

const TYPE_ORDER: SearchResult['type'][] = ['participant', 'competition', 'squad', 'discipline']

function TypeIcon({ type }: { type: SearchResult['type'] }) {
  const cls = 'h-4 w-4 flex-shrink-0'
  switch (type) {
    case 'participant':  return <UserIcon className={cls} />
    case 'competition':  return <TrophyIcon className={cls} />
    case 'squad':        return <UsersIcon className={cls} />
    case 'discipline':   return <WrenchScrewdriverIcon className={cls} />
  }
}

export default function EventSearchPalette({ open, onClose }: EventSearchPaletteProps) {
  const navigate = useNavigate()
  const eventContext = useOptionalEvent()
  const selectedEvent = eventContext?.selectedEvent ?? null
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const eventId = selectedEvent?.int_eventid
  const { results, isLoading } = useEventSearch(eventId, query)

  // Group results by type, preserving relevance order within each group
  const grouped: Partial<Record<SearchResult['type'], SearchResult[]>> = {}
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = []
    grouped[r.type]!.push(r)
  }

  // Flat list of all results (for keyboard navigation)
  const flat: SearchResult[] = TYPE_ORDER.flatMap(t => grouped[t] ?? [])

  // Reset state when palette opens/closes
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Clamp active index to results length
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  const handleNavigate = useCallback(
    (result: SearchResult) => {
      const url = `${result.navigationPath}?prefillSearch=${encodeURIComponent(result.prefillSearch)}`
      if (eventId) {
        const separator = url.includes('?') ? '&' : '?'
        navigate(`${url}${separator}eventId=${eventId}`)
      } else {
        navigate(url)
      }
      onClose()
    },
    [navigate, onClose, eventId],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flat.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[activeIndex]) handleNavigate(flat[activeIndex])
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200 gap-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
            }}
            placeholder={
              selectedEvent
                ? `In „${selectedEvent.var_eventname}" suchen …`
                : 'Keine Veranstaltung gewählt'
            }
            disabled={!selectedEvent}
            className="flex-1 text-sm outline-none placeholder-gray-400 disabled:text-gray-400"
          />
          {isLoading && (
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Schließen (Esc)"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Event context hint */}
        {selectedEvent && (
          <div className="px-4 py-1 text-xs text-gray-400 border-b border-gray-100">
            Veranstaltung: <span className="font-medium text-gray-600">{selectedEvent.var_eventname}</span>
          </div>
        )}

        {/* No event selected */}
        {!selectedEvent && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Bitte zuerst eine Veranstaltung auswählen.
          </div>
        )}

        {/* Results */}
        {selectedEvent && query.trim().length >= 2 && (
          <div ref={listRef} className="max-h-96 overflow-y-auto">
            {flat.length === 0 && !isLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Keine Ergebnisse für „{query}"
              </div>
            )}

            {TYPE_ORDER.map(type => {
              const items = grouped[type]
              if (!items || items.length === 0) return null
              const startIndex = flat.findIndex(r => r === items[0])

              return (
                <div key={type}>
                  {/* Section header */}
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    {TYPE_LABELS[type]}
                  </div>
                  {items.map((result, i) => {
                    const idx = startIndex + i
                    const isActive = idx === activeIndex
                    return (
                      <button
                        key={`${result.type}:${result.id}:${i}`}
                        data-index={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleNavigate(result)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`mt-0.5 ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                          <TypeIcon type={result.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </span>
                            {result.badge && (
                              <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                                {result.badge}
                              </span>
                            )}
                          </div>
                          {result.subtitle && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* Hint when no query yet */}
        {selectedEvent && query.trim().length < 2 && query.trim().length > 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Mindestens 2 Zeichen eingeben …
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 text-xs text-gray-300 border-t border-gray-100 flex gap-4">
          <span><kbd className="font-mono">↑↓</kbd> navigieren</span>
          <span><kbd className="font-mono">Enter</kbd> öffnen</span>
          <span><kbd className="font-mono">Esc</kbd> schließen</span>
        </div>
      </div>
    </div>
  )
}
