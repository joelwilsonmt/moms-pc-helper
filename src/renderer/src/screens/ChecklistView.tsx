import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { ChecklistTemplate, ChecklistRun } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

export default function ChecklistView(): React.JSX.Element {
  const { params, back } = useNav()
  const templateId = params.templateId ?? ''

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [run, setRun] = useState<ChecklistRun | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!templateId) { setLoading(false); return }
    Promise.all([
      window.api.content.listChecklists(),
      window.api.content.getChecklistRun(templateId)
    ]).then(([templates, existingRun]) => {
      const t = templates.find((c) => c.id === templateId) ?? null
      setTemplate(t)
      setRun(existingRun)
      setLoading(false)
    })
  }, [templateId])

  const toggle = async (itemId: string): Promise<void> => {
    const updated = await window.api.content.toggleChecklistItem(templateId, itemId)
    setRun(updated)
  }

  const reset = async (): Promise<void> => {
    await window.api.content.resetChecklist(templateId)
    setRun(null)
  }

  const completedItems = run?.completedItems ?? []
  const totalItems = template?.items.length ?? 0
  const doneCount = completedItems.length
  const allDone = totalItems > 0 && doneCount === totalItems

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      {loading && (
        <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Loading…</div>
      )}

      {!loading && !template && (
        <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Checklist not found.</div>
      )}

      {!loading && template && (
        <>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{template.title}</h2>
            {template.description && (
              <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>{template.description}</p>
            )}
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
              {doneCount} of {totalItems} done
            </p>
          </div>

          {allDone && (
            <div style={{
              background: 'var(--good-soft)',
              border: '1.5px solid var(--good)',
              borderRadius: 12,
              padding: '14px 18px',
              fontSize: 15,
              color: 'var(--ink)'
            }}>
              All done! Great work.
            </div>
          )}

          <div className="checklist-view" style={{ flex: 1, overflowY: 'auto' }}>
            {template.items.map((item) => {
              const done = completedItems.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--border)',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%'
                  }}
                >
                  <span style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: done ? 'none' : '2px solid var(--border)',
                    background: done ? 'var(--good)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700
                  }}>
                    {done ? '✓' : ''}
                  </span>
                  <span>
                    <span style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: done ? 'var(--muted)' : 'var(--ink)',
                      textDecoration: done ? 'line-through' : 'none',
                      display: 'block'
                    }}>
                      {item.text}
                    </span>
                    {item.hint && (
                      <span style={{ fontSize: 13, color: 'var(--ink-2)', display: 'block', marginTop: 3 }}>
                        {item.hint}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {doneCount > 0 && (
            <button
              type="button"
              onClick={reset}
              style={{
                fontSize: 13,
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                textDecoration: 'underline',
                alignSelf: 'flex-start'
              }}
            >
              Start over
            </button>
          )}

          <BigButton variant="default" onClick={back} style={{ marginTop: 'auto' }}>
            ← Back
          </BigButton>
        </>
      )}
    </div>
  )
}
