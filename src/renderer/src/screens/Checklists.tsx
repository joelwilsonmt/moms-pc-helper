import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { ChecklistTemplate, ChecklistRun } from '../../../shared/types'
import Greeting from '../components/Greeting'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

interface TemplateWithRun {
  template: ChecklistTemplate
  run: ChecklistRun | null
}

function progressLabel(t: ChecklistTemplate, run: ChecklistRun | null): string {
  const done = run?.completedItems.length ?? 0
  const total = t.items.length
  if (done === 0) return `${total} steps`
  if (done === total) return 'Done ✓'
  return `${done} of ${total} done`
}

function progressVariant(t: ChecklistTemplate, run: ChecklistRun | null): 'good' | 'warn' | 'default' {
  const done = run?.completedItems.length ?? 0
  const total = t.items.length
  if (done === total && total > 0) return 'good'
  if (done > 0) return 'warn'
  return 'default'
}

export default function Checklists(): React.JSX.Element {
  const { back, navigate } = useNav()
  const [items, setItems] = useState<TemplateWithRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.content.listChecklists().then(async (templates) => {
      const withRuns = await Promise.all(
        templates.map(async (t) => ({
          template: t,
          run: await window.api.content.getChecklistRun(t.id)
        }))
      )
      setItems(withRuns)
      setLoading(false)
    })
  }, [])

  const goToChecklist = (templateId: string): void =>
    navigate('checklist', { templateId })

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Checklists</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          Step-by-step lists for common situations. Your progress is saved as you go.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Loading…</div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
            No checklists available yet.
          </div>
        )}

        {!loading && items.length > 0 && (
          <ConfirmList>
            {items.map(({ template, run }) => (
              <ConfirmRow
                key={template.id}
                check="→"
                checkVariant="muted"
                what={template.title}
                det={template.description}
                pill={progressLabel(template, run)}
                pillVariant={progressVariant(template, run)}
                onClick={() => goToChecklist(template.id)}
              />
            ))}
          </ConfirmList>
        )}
      </div>
    </div>
  )
}
