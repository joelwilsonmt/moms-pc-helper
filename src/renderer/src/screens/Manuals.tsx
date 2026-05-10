import React, { useEffect, useRef, useState } from 'react'
import { useNav } from '../nav'
import type { Guide } from '../../../shared/types'
import Greeting from '../components/Greeting'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

const CATEGORY_LABEL: Record<string, string> = {
  computer: 'Computer',
  printer:  'Printer',
  internet: 'Internet',
  backup:   'Backup'
}

function groupByCategory(guides: Guide[]): Array<{ category: string; guides: Guide[] }> {
  const map = new Map<string, Guide[]>()
  for (const g of guides) {
    const cat = g.category || 'other'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(g)
  }
  return Array.from(map.entries()).map(([category, gs]) => ({ category, guides: gs }))
}

export default function Manuals(): React.JSX.Element {
  const { back, navigate } = useNav()
  const [allGuides, setAllGuides] = useState<Guide[]>([])
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState<Guide[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading]     = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.content.listGuides().then((gs) => {
      setAllGuides(gs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) { setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const found = await window.api.content.searchGuides(q)
      setResults(found)
      setSearching(false)
    }, 250)
  }, [query])

  const goToGuide = (id: string): void => navigate('guide', { guideId: id })

  const groups = groupByCategory(allGuides)
  const displayGuides = query.trim() ? results : null

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Guides &amp; How-tos</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          Step-by-step instructions for common tasks. Tap any guide to get started.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="search"
          placeholder="Search guides…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 15,
            borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {searching && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 13 }}>
            …
          </span>
        )}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Loading guides…</div>
        )}

        {!loading && displayGuides !== null && (
          <>
            {displayGuides.length === 0 && !searching && (
              <div style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
                No guides found for "{query}".
              </div>
            )}
            {displayGuides.length > 0 && (
              <ConfirmList>
                {displayGuides.map((g) => (
                  <ConfirmRow
                    key={g.id}
                    check="→"
                    checkVariant="muted"
                    what={g.title}
                    det={`${CATEGORY_LABEL[g.category] ?? g.category} · ${g.estimatedMinutes ?? '?'} min`}
                    onClick={() => goToGuide(g.id)}
                  />
                ))}
              </ConfirmList>
            )}
          </>
        )}

        {!loading && displayGuides === null && (
          <>
            {groups.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
                No guides available yet.
              </div>
            )}
            {groups.map(({ category, guides }) => (
              <div key={category} style={{ marginBottom: 24 }}>
                <div style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 8
                }}>
                  {CATEGORY_LABEL[category] ?? category}
                </div>
                <ConfirmList>
                  {guides.map((g) => (
                    <ConfirmRow
                      key={g.id}
                      check="→"
                      checkVariant="muted"
                      what={g.title}
                      det={`${g.estimatedMinutes ?? '?'} min`}
                      onClick={() => goToGuide(g.id)}
                    />
                  ))}
                </ConfirmList>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
