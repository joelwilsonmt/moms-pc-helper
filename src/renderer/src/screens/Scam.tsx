import React, { useState } from 'react'
import { useNav } from '../nav'
import type { ScamVerdict } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

type Phase = 'input' | 'loading' | 'result'

const VERDICT_CONFIG: Record<
  ScamVerdict['verdict'],
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  scam:       { label: 'This looks like a scam',     color: 'var(--bad)',     bg: 'var(--bad-soft)',  border: 'var(--bad)',     icon: '🚨' },
  suspicious: { label: 'Something looks off',        color: 'var(--warn)',    bg: 'var(--warn-soft)', border: 'var(--warn)',    icon: '⚠️' },
  safe:       { label: 'Looks safe',                 color: 'var(--good)',    bg: 'var(--good-soft)', border: 'var(--good)',    icon: '✓'  },
  unknown:    { label: "I'm not sure",               color: 'var(--ink-2)',   bg: 'var(--surface)',   border: 'var(--border)',  icon: '?'  }
}

export default function Scam(): React.JSX.Element {
  const { back } = useNav()
  const [phase, setPhase]     = useState<Phase>('input')
  const [text, setText]       = useState('')
  const [verdict, setVerdict] = useState<ScamVerdict | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const analyze = async (): Promise<void> => {
    const trimmed = text.trim()
    if (!trimmed) return
    setPhase('loading')
    setError(null)
    try {
      const result = await window.api.scam.analyze(trimmed)
      setVerdict(result)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      setPhase('input')
    }
  }

  const reset = (): void => {
    setPhase('input')
    setText('')
    setVerdict(null)
    setError(null)
  }

  const cfg = verdict ? VERDICT_CONFIG[verdict.verdict] : null

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Is this a scam?</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {phase === 'input'
            ? 'Paste an email, text message, or website link and I\'ll check it for you.'
            : phase === 'loading'
              ? 'Checking…'
              : 'Here\'s what I found.'}
        </p>
      </div>

      {/* Input phase */}
      {phase === 'input' && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the email, text, or link here…"
            rows={8}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              borderRadius: 10,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--ink)',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />

          {error && (
            <div style={{
              background: 'var(--bad-soft)',
              border: '1.5px solid var(--bad)',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
              color: 'var(--bad)'
            }}>
              {error}
            </div>
          )}

          <BigButton
            variant="accent"
            onClick={analyze}
            style={{ marginTop: 'auto' }}
          >
            Check this for me
          </BigButton>
        </>
      )}

      {/* Loading phase */}
      {phase === 'loading' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: 'var(--ink-2)'
        }}>
          <div style={{ fontSize: 36 }}>🔍</div>
          <div style={{ fontSize: 15 }}>Analysing for scam patterns…</div>
        </div>
      )}

      {/* Result phase */}
      {phase === 'result' && verdict && cfg && (
        <>
          {/* Verdict banner */}
          <div style={{
            background: cfg.bg,
            border: `2px solid ${cfg.border}`,
            borderRadius: 14,
            padding: '20px 20px',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>{cfg.icon}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: cfg.color, marginBottom: 6 }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.5 }}>
                {verdict.reason}
              </div>
            </div>
          </div>

          {/* Flagged patterns */}
          {verdict.flaggedPatterns.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Red flags I spotted
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {verdict.flaggedPatterns.map((p, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {verdict.recommendations.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                What to do
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {verdict.recommendations.map((r, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
            <BigButton variant="default" onClick={reset} style={{ flex: 1 }}>
              Check another
            </BigButton>
            <BigButton variant="default" onClick={back} style={{ flex: 1 }}>
              ← Back
            </BigButton>
          </div>
        </>
      )}
    </div>
  )
}
