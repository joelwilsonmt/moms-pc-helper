import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNav } from '../nav'
import type { VaultEntry } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

const CATEGORIES: Array<{ id: VaultEntry['category']; icon: string; label: string }> = [
  { id: 'wifi',      icon: '📡', label: 'Wi-Fi' },
  { id: 'accounts',  icon: '🔑', label: 'Accounts' },
  { id: 'documents', icon: '📄', label: 'Documents' },
  { id: 'camper',    icon: '🚐', label: 'Camper' },
  { id: 'subaru',    icon: '🚗', label: 'Subaru' },
  { id: 'vet',       icon: '🐾', label: 'Vet & Pets' },
]

type View = { mode: 'list' } | { mode: 'detail'; entry: VaultEntry } | { mode: 'add' }

export default function VaultOpen(): React.JSX.Element {
  const { navigate, back } = useNav()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [filtered, setFiltered] = useState<VaultEntry[]>([])
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<VaultEntry['category'] | null>(null)
  const [view, setView] = useState<View>({ mode: 'list' })
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadEntries = useCallback(async (cat?: VaultEntry['category']): Promise<void> => {
    const result = await window.api.vault.list(cat)
    setEntries(result)
    setFiltered(result)
  }, [])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // Auto-lock on idle
  useEffect(() => {
    const reset = (): void => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(async () => {
        await window.api.vault.lock()
        navigate('vault-locked')
      }, 15 * 60 * 1000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    reset()
    return () => {
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [navigate])

  const handleSearch = async (q: string): Promise<void> => {
    setQuery(q)
    setActiveCategory(null)
    if (q.trim()) {
      const results = await window.api.vault.search(q.trim())
      setFiltered(results)
    } else {
      setFiltered(entries)
    }
  }

  const handleCategory = async (cat: VaultEntry['category']): Promise<void> => {
    setQuery('')
    if (activeCategory === cat) {
      setActiveCategory(null)
      setFiltered(entries)
    } else {
      setActiveCategory(cat)
      const results = await window.api.vault.list(cat)
      setFiltered(results)
    }
  }

  const handleLock = async (): Promise<void> => {
    await window.api.vault.lock()
    navigate('vault-locked')
  }

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view.mode === 'detail') {
    const entry = view.entry
    return (
      <div className="screen" style={{ height: '100vh' }}>
        <button
          className="greeting-back"
          onClick={() => setView({ mode: 'list' })}
          type="button"
        >
          ← Back to vault
        </button>

        <div
          style={{
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{entry.title}</div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--muted)',
                background: 'var(--canvas-2)',
                padding: '2px 6px',
                borderRadius: 4
              }}
            >
              {CATEGORIES.find((c) => c.id === entry.category)?.label}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--muted)',
              marginBottom: 4
            }}
          >
            Updated {new Date(entry.updatedAt).toLocaleDateString()}
          </div>
          <div
            style={{
              background: 'var(--canvas)',
              borderRadius: 10,
              padding: '14px 16px',
              fontSize: 15,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: 'var(--ink)',
              userSelect: 'text'
            }}
          >
            {entry.body}
          </div>
        </div>

        <AddEditForm
          existing={entry}
          onSave={async (patch) => {
            await window.api.vault.update(entry.id, patch)
            await loadEntries()
            setView({ mode: 'list' })
          }}
          onDelete={async () => {
            await window.api.vault.delete(entry.id)
            await loadEntries()
            setView({ mode: 'list' })
          }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </div>
    )
  }

  // ── Add view ───────────────────────────────────────────────────────────────
  if (view.mode === 'add') {
    return (
      <div className="screen" style={{ height: '100vh' }}>
        <button className="greeting-back" onClick={() => setView({ mode: 'list' })} type="button">
          ← Back to vault
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Add something to remember</h2>
        <AddEditForm
          onSave={async (data) => {
            await window.api.vault.create(data as Omit<VaultEntry, 'id' | 'updatedAt'>)
            await loadEntries()
            setView({ mode: 'list' })
          }}
          onCancel={() => setView({ mode: 'list' })}
        />
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const recent = entries.slice(0, 4)

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Greeting back onBack={back} />
        <button
          onClick={handleLock}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--good)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)'
          }}
          type="button"
        >
          🔓 Lock vault
        </button>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="🔍  Search your stuff…"
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 10,
          padding: '14px 18px',
          fontSize: 15,
          fontFamily: 'var(--font-ui)',
          color: query ? 'var(--ink)' : 'var(--muted)',
          width: '100%'
        }}
      />

      {/* Category grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.id)}
            type="button"
            style={{
              background: activeCategory === cat.id ? 'var(--ink)' : 'var(--paper)',
              color: activeCategory === cat.id ? 'var(--paper)' : 'var(--ink)',
              border: `1.5px solid ${activeCategory === cat.id ? 'var(--ink)' : 'var(--line)'}`,
              borderRadius: 10,
              padding: 12,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)'
            }}
          >
            <span style={{ display: 'block', fontSize: 22, marginBottom: 4 }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Entry list — recently viewed when no filter, filtered results otherwise */}
      {query || activeCategory ? (
        <EntryList
          eyebrow={`${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          entries={filtered}
          onSelect={(e) => setView({ mode: 'detail', entry: e })}
        />
      ) : (
        <EntryList
          eyebrow="Recently added"
          entries={recent}
          onSelect={(e) => setView({ mode: 'detail', entry: e })}
          empty="Nothing saved yet — tap below to add your first item."
        />
      )}

      {/* Add button */}
      <button
        onClick={() => setView({ mode: 'add' })}
        style={{
          display: 'block',
          width: '100%',
          background: 'var(--paper)',
          color: 'var(--ink)',
          border: '1.5px dashed var(--line)',
          borderRadius: 10,
          padding: '16px 20px',
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          textAlign: 'center',
          marginTop: 'auto'
        }}
        type="button"
      >
        + Add something to remember
      </button>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EntryList({
  eyebrow,
  entries,
  onSelect,
  empty
}: {
  eyebrow: string
  entries: VaultEntry[]
  onSelect: (e: VaultEntry) => void
  empty?: string
}): React.JSX.Element {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8
        }}
      >
        {eyebrow}
      </div>
      {entries.length === 0 && empty ? (
        <div style={{ color: 'var(--muted)', fontSize: 14, padding: '8px 0' }}>{empty}</div>
      ) : (
        entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            type="button"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 14px',
              background: 'var(--paper)',
              border: '1.5px solid var(--line)',
              borderRadius: 10,
              marginBottom: 8,
              width: '100%',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              textAlign: 'left'
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{entry.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Updated {new Date(entry.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--muted)' }}>›</span>
          </button>
        ))
      )}
    </div>
  )
}

interface AddEditFormProps {
  existing?: VaultEntry
  onSave: (data: Omit<VaultEntry, 'id' | 'updatedAt'>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
}

function AddEditForm({ existing, onSave, onDelete, onCancel }: AddEditFormProps): React.JSX.Element {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [category, setCategory] = useState<VaultEntry['category']>(existing?.category ?? 'accounts')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title: title.trim(), body, category, attachmentIds: existing?.attachmentIds ?? [] })
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as VaultEntry['category'])}
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 15,
          fontFamily: 'var(--font-ui)',
          color: 'var(--ink)'
        }}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
        ))}
      </select>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What is this? (e.g. Home Wi-Fi password)"
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 10,
          padding: '14px 18px',
          fontSize: 15,
          fontFamily: 'var(--font-ui)',
          color: 'var(--ink)'
        }}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="The details — password, notes, location, anything you want to remember"
        rows={4}
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 10,
          padding: '14px 18px',
          fontSize: 15,
          fontFamily: 'var(--font-ui)',
          color: 'var(--ink)',
          resize: 'vertical'
        }}
      />

      <BigButton onClick={handleSave} disabled={saving || !title.trim()}>
        {saving ? 'Saving…' : existing ? 'Save changes' : 'Save'}
      </BigButton>

      {onDelete && (
        confirmDelete ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <BigButton variant="danger" onClick={onDelete}>Yes, delete it</BigButton>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, background: 'none', border: '1.5px solid var(--line)', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 15 }}
              type="button"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'center' }}
            type="button"
          >
            Delete this entry
          </button>
        )
      )}

      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'center' }}
        type="button"
      >
        Cancel
      </button>
    </div>
  )
}
