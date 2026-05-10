import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { AppConfig } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

interface Field {
  key: keyof AppConfig | 'smtp.host' | 'smtp.port' | 'smtp.user' | 'smtp.password'
  label: string
  type: 'text' | 'email' | 'number' | 'password' | 'time'
  hint?: string
}

const FIELDS: Field[] = [
  { key: 'userName',             label: 'Your name',                  type: 'text',     hint: 'Used in greetings and the Get Help message.' },
  { key: 'panicEmail',           label: 'Help contact email',         type: 'email',    hint: 'Where the Get Help message gets sent.' },
  { key: 'quietHoursStart',      label: 'Quiet hours start',          type: 'time',     hint: 'No alerts after this time.' },
  { key: 'quietHoursEnd',        label: 'Quiet hours end',            type: 'time',     hint: 'Alerts resume after this time.' },
  { key: 'vaultAutoLockMinutes', label: 'Vault auto-lock (minutes)',  type: 'number',   hint: 'Lock the vault after this many minutes of inactivity.' },
  { key: 'smtp.host',            label: 'SMTP server',                type: 'text',     hint: 'e.g. smtp.gmail.com — needed to send the Get Help email.' },
  { key: 'smtp.port',            label: 'SMTP port',                  type: 'number',   hint: 'Usually 587 (TLS) or 465 (SSL).' },
  { key: 'smtp.user',            label: 'SMTP username',              type: 'email',    hint: 'Usually the email address used to send.' },
  { key: 'smtp.password',        label: 'SMTP password / app password', type: 'password', hint: 'For Gmail, use a 16-character App Password, not your login password.' },
]

function getNestedValue(cfg: AppConfig, key: Field['key']): string {
  if (key.startsWith('smtp.')) {
    const sub = key.split('.')[1] as keyof AppConfig['smtp']
    return String(cfg.smtp[sub] ?? '')
  }
  return String(cfg[key as keyof AppConfig] ?? '')
}

function applyNestedPatch(key: Field['key'], value: string, current: AppConfig): Partial<AppConfig> {
  if (key.startsWith('smtp.')) {
    const sub = key.split('.')[1] as keyof AppConfig['smtp']
    return { smtp: { ...current.smtp, [sub]: sub === 'port' ? parseInt(value, 10) || 587 : value } }
  }
  const k = key as keyof AppConfig
  if (k === 'vaultAutoLockMinutes' || k === 'scanIntervalMinutes') {
    return { [k]: parseInt(value, 10) || 15 }
  }
  return { [k]: value }
}

export default function Advanced(): React.JSX.Element {
  const { back, navigate } = useNav()
  const [config, setConfig]   = useState<AppConfig | null>(null)
  const [values, setValues]   = useState<Record<string, string>>({})
  const [saved, setSaved]     = useState(false)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    window.api.app.getConfig().then((cfg) => {
      setConfig(cfg)
      const init: Record<string, string> = {}
      for (const f of FIELDS) init[f.key] = getNestedValue(cfg, f.key)
      setValues(init)
    })
  }, [])

  const handleChange = (key: string, value: string): void => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  const save = async (): Promise<void> => {
    if (!config) return
    setSaving(true)
    let patch: Partial<AppConfig> = {}
    for (const f of FIELDS) {
      patch = { ...patch, ...applyNestedPatch(f.key, values[f.key] ?? '', config) }
    }
    const updated = await window.api.app.updateConfig(patch)
    setConfig(updated)
    setSaving(false)
    setSaved(true)
  }

  const resetOnboarding = async (): Promise<void> => {
    navigate('onboarding')
  }

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Advanced Settings</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          These settings are mostly for Joel to configure remotely. You shouldn't need to change anything here.
        </p>
      </div>

      {!config && (
        <div style={{ color: 'var(--ink-2)', fontSize: 15 }}>Loading…</div>
      )}

      {config && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FIELDS.map((f) => (
              <div key={f.key} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--ink-2)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em'
                }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={values[f.key] ?? ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: 15,
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: f.type === 'password' ? 'var(--font-mono)' : 'inherit'
                  }}
                />
                {f.hint && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{f.hint}</div>
                )}
              </div>
            ))}

            {/* Re-run onboarding */}
            <div style={{ padding: '18px 0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Onboarding
              </div>
              <button
                type="button"
                onClick={resetOnboarding}
                style={{
                  fontSize: 14,
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Re-run setup wizard
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {saved && (
              <div style={{ fontSize: 14, color: 'var(--good)', textAlign: 'center', fontWeight: 600 }}>
                ✓ Settings saved
              </div>
            )}
            <BigButton variant="accent" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </BigButton>
          </div>
        </>
      )}
    </div>
  )
}
