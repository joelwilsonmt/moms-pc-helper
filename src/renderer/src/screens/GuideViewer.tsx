import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { Guide } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

// Minimal markdown → HTML: bold, inline code, numbered lists, headings, paragraphs
function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // numbered list items
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // bullet list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // wrap consecutive <li> blocks in <ol>/<ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, (match) => `<ol>${match}</ol>`)
    // paragraphs (blank-line-separated non-tagged blocks)
    .replace(/^(?!<[a-z]).+$/gm, (line) => `<p>${line}</p>`)
    // clean up extra newlines around block elements
    .replace(/\n{2,}/g, '\n')
}

export default function GuideViewer(): React.JSX.Element {
  const { params, back } = useNav()
  const guideId = params.guideId ?? ''

  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!guideId) { setNotFound(true); setLoading(false); return }
    window.api.content.getGuide(guideId).then((g) => {
      if (!g) setNotFound(true)
      else setGuide(g)
      setLoading(false)
    })
  }, [guideId])

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      {loading && (
        <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Loading guide…</div>
      )}

      {!loading && notFound && (
        <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>
          Guide not found. Try going back and selecting another item.
        </div>
      )}

      {!loading && guide && (
        <>
          <div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {guide.category} · {guide.estimatedMinutes ?? '?'} min
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 0 }}>{guide.title}</h2>
          </div>

          <div
            className="guide-content"
            style={{ flex: 1, overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.body) }}
          />

          <BigButton variant="default" onClick={back} style={{ marginTop: 'auto' }}>
            ← Back
          </BigButton>
        </>
      )}
    </div>
  )
}
