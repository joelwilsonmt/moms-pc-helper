import React, { useState } from 'react'
import { useNav } from '../nav'
import BigButton from '../components/BigButton'

type Step = 'welcome' | 'name' | 'help-contact' | 'done'

const STEPS: Step[] = ['welcome', 'name', 'help-contact', 'done']

function ProgressDots({ current }: { current: Step }): React.JSX.Element {
  const idx = STEPS.indexOf(current)
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
      {STEPS.map((s, i) => (
        <div
          key={s}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: i <= idx ? 'var(--accent)' : 'var(--border)'
          }}
        />
      ))}
    </div>
  )
}

export default function Onboarding(): React.JSX.Element {
  const { navigate } = useNav()
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('Jan')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const next = (s: Step): void => setStep(s)

  const finish = async (): Promise<void> => {
    setSaving(true)
    await window.api.app.updateConfig({ userName: name.trim() || 'Jan', panicEmail: email.trim() })
    await window.api.app.completeOnboarding()
    navigate('home')
  }

  return (
    <div
      className="screen"
      style={{
        height: '100vh',
        justifyContent: 'center',
        paddingTop: 40,
        paddingBottom: 40
      }}
    >
      <ProgressDots current={step} />

      {/* ── Step: Welcome ─────────────────────────────────────────────── */}
      {step === 'welcome' && (
        <>
          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 52 }}>👋</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
              Welcome to<br />PC Helper
            </h1>
            <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 320, alignSelf: 'center' }}>
              I keep an eye on your computer and walk you through fixes when something comes up — step by step, in plain English.
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 320, alignSelf: 'center' }}>
              Setup takes about 2 minutes.
            </p>
          </div>
          <BigButton variant="accent" onClick={() => next('name')}>
            Let's get started
          </BigButton>
        </>
      )}

      {/* ── Step: Name ────────────────────────────────────────────────── */}
      {step === 'name' && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>What should I call you?</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
                I'll use your name when I talk to you.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Your first name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 18,
                  fontWeight: 600,
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
          <BigButton variant="accent" onClick={() => next('help-contact')}>
            That's me →
          </BigButton>
        </>
      )}

      {/* ── Step: Help contact ────────────────────────────────────────── */}
      {step === 'help-contact' && (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
                Who should I call if something's wrong?
              </h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                If you hit the <strong>Get Help</strong> button, I'll send a message to this person with a summary of what's happening on your computer.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Their email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. joel@example.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 16,
                  borderRadius: 10,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, margin: '8px 0 0' }}>
                You can skip this and add it later in Settings.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BigButton variant="accent" onClick={() => next('done')}>
              {email.trim() ? 'Save and continue →' : 'Skip for now →'}
            </BigButton>
          </div>
        </>
      )}

      {/* ── Step: Done ────────────────────────────────────────────────── */}
      {step === 'done' && (
        <>
          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
            <div style={{ fontSize: 52 }}>✅</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
              You're all set, {name.trim() || 'Jan'}!
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 320, alignSelf: 'center' }}>
              I'm watching out for problems in the background. I'll let you know if anything needs your attention.
            </p>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, margin: 0, maxWidth: 320, alignSelf: 'center' }}>
              If you ever get stuck, just hit the <strong>Get Help</strong> button at the bottom.
            </p>
          </div>
          <BigButton variant="accent" onClick={finish} disabled={saving}>
            {saving ? 'Setting up…' : 'Take me to my dashboard'}
          </BigButton>
        </>
      )}
    </div>
  )
}
