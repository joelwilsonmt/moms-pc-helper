import React, { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Guide } from '../../../shared/types'
import Greeting from './Greeting'
import BigButton from './BigButton'

interface GuideViewerProps {
  guideId: string
  onBack: () => void
}

// Split markdown on level-2 headings (## Step N) to drive step-by-step navigation.
function splitSteps(markdown: string): string[] {
  const parts = markdown.split(/(?=^## )/m)
  return parts.filter((p) => p.trim().length > 0)
}

function renderMd(md: string): string {
  const raw = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(raw)
}

export default function GuideViewer({ guideId, onBack }: GuideViewerProps): React.JSX.Element {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    setLoading(true)
    setStepIdx(0)
    window.api.content.getGuide(guideId).then((g) => {
      setGuide(g)
      setLoading(false)
    })
  }, [guideId])

  const steps = useMemo(() => (guide ? splitSteps(guide.body) : []), [guide])
  const totalSteps = steps.length || 1
  const currentStep = steps[stepIdx] ?? ''

  if (loading) {
    return (
      <div className="screen">
        <Greeting back onBack={onBack} />
        <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Loading guide…
        </div>
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="screen">
        <Greeting back onBack={onBack} />
        <div style={{ color: 'var(--bad)' }}>Guide not found.</div>
      </div>
    )
  }

  return (
    <div className="screen guide-viewer">
      <Greeting back onBack={onBack} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{guide.title}</h2>
        {guide.estimatedMinutes && (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            About {guide.estimatedMinutes} minutes · {totalSteps} steps
          </div>
        )}
      </div>

      <div className="guide-step-nav">
        <button
          className="guide-step-btn"
          onClick={() => setStepIdx((i) => i - 1)}
          disabled={stepIdx === 0}
        >
          ← Previous
        </button>
        <span>
          Step {stepIdx + 1} of {totalSteps}
        </span>
        <button
          className="guide-step-btn"
          onClick={() => setStepIdx((i) => i + 1)}
          disabled={stepIdx >= totalSteps - 1}
        >
          Next →
        </button>
      </div>

      <div
        className="guide-content"
        dangerouslySetInnerHTML={{ __html: renderMd(currentStep) }}
      />

      {stepIdx === totalSteps - 1 && (
        <BigButton variant="good" onClick={onBack}>
          ✓ All done — go back
        </BigButton>
      )}
    </div>
  )
}
