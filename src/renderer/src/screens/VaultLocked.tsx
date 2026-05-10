import React, { useState } from 'react'
import { useNav } from '../nav'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

export default function VaultLocked(): React.JSX.Element {
  const { navigate, back } = useNav()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tryHello = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const ok = await window.api.vault.unlockWithHello()
      if (ok) {
        navigate('vault-open')
      } else {
        setError("Windows Hello isn't set up on this PC. Type your password instead.")
        setShowPassword(true)
      }
    } catch {
      setError('Something went wrong. Try your password below.')
      setShowPassword(true)
    } finally {
      setLoading(false)
    }
  }

  const tryPassword = async (): Promise<void> => {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      const isInit = await window.api.vault.isInitialized()
      let ok: boolean
      if (isInit) {
        ok = await window.api.vault.unlock(password)
      } else {
        await window.api.vault.initialize(password)
        ok = true
      }
      if (ok) {
        navigate('vault-open')
      } else {
        setError("That password didn't work. Check it and try again.")
      }
    } catch (e) {
      const msg = String(e)
      if (msg.includes('Windows only')) {
        setError("The vault only works on your Windows PC, not on a Mac.")
      } else {
        setError('Something went wrong. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '40px 0',
          flex: 1
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            border: '2px solid var(--ink)',
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: 38,
            background: 'var(--paper)'
          }}
        >
          🔒
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }}>
          Your vault is locked
        </h2>
        <p
          style={{
            color: 'var(--ink-2)',
            textAlign: 'center',
            maxWidth: 320,
            fontSize: 15
          }}
        >
          Wi-Fi passwords, account info, the camper&apos;s title location, and other things you wanted to remember.
        </p>

        {error && (
          <div
            style={{
              background: 'var(--accent-soft)',
              border: '1.5px solid var(--accent)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              color: 'var(--ink)',
              maxWidth: 320,
              textAlign: 'center'
            }}
          >
            {error}
          </div>
        )}

        {!showPassword ? (
          <>
            <div style={{ maxWidth: 320, width: '100%' }}>
              <BigButton onClick={tryHello} disabled={loading}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                  <span style={{ fontSize: 22 }}>👆</span>
                  {loading ? 'Checking…' : 'Use Windows Hello'}
                </span>
              </BigButton>
            </div>

            <button
              onClick={() => setShowPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)'
              }}
              type="button"
            >
              Or type my password
            </button>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 320,
              width: '100%'
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && tryPassword()}
              placeholder="Type your password"
              autoFocus
              style={{
                background: 'var(--paper)',
                border: '1.5px solid var(--line)',
                borderRadius: 10,
                padding: '14px 18px',
                fontSize: 16,
                fontFamily: 'var(--font-ui)',
                color: 'var(--ink)',
                width: '100%'
              }}
            />
            <BigButton onClick={tryPassword} disabled={loading || !password}>
              {loading ? 'Unlocking…' : 'Unlock'}
            </BigButton>
            <button
              onClick={() => { setShowPassword(false); setError(null) }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)'
              }}
              type="button"
            >
              ← Try Windows Hello instead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
