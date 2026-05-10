import React, { useEffect, useState } from 'react'
import type { ChecklistTemplate, ChecklistRun } from '../../../shared/types'
import ConfirmList, { ChecklistRow } from './ConfirmList'
import BigButton from './BigButton'

interface ChecklistViewProps {
  templateId: string
}

export default function ChecklistView({ templateId }: ChecklistViewProps): React.JSX.Element {
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [run, setRun] = useState<ChecklistRun | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.api.content.listChecklists(),
      window.api.content.getChecklistRun(templateId)
    ]).then(([templates, r]) => {
      setTemplate(templates.find((t) => t.id === templateId) ?? null)
      setRun(r)
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

  if (loading) {
    return (
      <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 16 }}>
        Loading checklist…
      </div>
    )
  }

  if (!template) {
    return <div style={{ color: 'var(--bad)', padding: 16 }}>Checklist not found.</div>
  }

  const completed = new Set(run?.completedItems ?? [])
  const doneCount = completed.size
  const totalCount = template.items.length
  const allDone = doneCount === totalCount

  return (
    <div className="checklist-view">
      <ConfirmList>
        {template.items.map((item) => (
          <ChecklistRow
            key={item.id}
            id={item.id}
            text={item.text}
            hint={item.hint}
            checked={completed.has(item.id)}
            onToggle={toggle}
          />
        ))}
      </ConfirmList>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--muted)',
          textAlign: 'center',
          padding: '10px 0'
        }}
      >
        {doneCount} of {totalCount} done
      </div>

      {allDone && (
        <BigButton variant="good" onClick={reset}>
          ✓ All done — reset for next time
        </BigButton>
      )}
    </div>
  )
}
