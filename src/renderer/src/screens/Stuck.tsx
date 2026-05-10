import React, { useRef, useState } from 'react'
import { useNav } from '../nav'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'

type SendState = 'idle' | 'sending' | 'success' | 'error'

// Web Speech API types (present in Chromium but not in TS lib by default)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: Event) => void) | null
  onend: (() => void) | null
}
declare const webkitSpeechRecognition: new () => SpeechRecognitionInstance

export default function Stuck(): React.JSX.Element {
  const { back } = useNav()
  const [message, setMessage] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null) // base64 PNG
  const [listening, setListening] = useState(false)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleVoice = (): void => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognition = typeof webkitSpeechRecognition !== 'undefined'
      ? webkitSpeechRecognition
      : null

    if (!SpeechRecognition) {
      alert("Voice input isn't available right now. Type your message instead.")
      return
    }

    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.continuous = false

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setMessage((prev) => prev ? `${prev} ${transcript}` : transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  // ── Screenshot ─────────────────────────────────────────────────────────────
  const handleScreenshot = async (): Promise<void> => {
    if (screenshot) {
      setScreenshot(null)
      return
    }
    const b64 = await window.api.panic.captureScreenshot()
    setScreenshot(b64)
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async (): Promise<void> => {
    if (!message.trim()) return
    setSendState('sending')
    const result = await window.api.panic.send(message.trim(), !!screenshot)
    if (result.ok) {
      setSendState('success')
    } else {
      setSendState('error')
      setErrorMsg(result.error)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (sendState === 'success') {
    return (
      <div className="screen" style={{ height: '100vh' }}>
        <Greeting back onBack={back} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>✅</div>
          <h2 style={{ fontSize: 26, fontWeight: 800 }}>Joel got your message</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: 16, maxWidth: 340 }}>
            He can see what was happening on your computer. He&apos;ll get back to you soon.
          </p>
          <BigButton onClick={back}>Go back home</BigButton>
        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>What&apos;s not working?</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
          Tell me in your own words. Joel will get a message with the details.
        </p>
      </div>

      {/* Message text area */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="The printer is making a weird noise and won't print my doctor's paperwork…"
        rows={5}
        style={{
          background: 'var(--paper)',
          border: `1.5px dashed ${message ? 'var(--ink)' : 'var(--line)'}`,
          borderRadius: 12,
          padding: 20,
          fontSize: 15,
          fontFamily: 'var(--font-ui)',
          color: 'var(--ink)',
          resize: 'none',
          width: '100%',
          lineHeight: 1.6
        }}
      />

      {/* Voice + screenshot actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={toggleVoice}
          type="button"
          style={{
            background: listening ? 'var(--accent-soft)' : 'var(--paper)',
            border: `1.5px solid ${listening ? 'var(--accent)' : 'var(--line)'}`,
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            color: listening ? 'var(--accent)' : 'var(--ink)'
          }}
        >
          <span style={{ display: 'block', fontSize: 22, marginBottom: 4 }}>
            {listening ? '⏹' : '🎤'}
          </span>
          {listening ? 'Listening… tap to stop' : 'Tap to speak instead'}
        </button>

        <button
          onClick={handleScreenshot}
          type="button"
          style={{
            background: screenshot ? 'var(--good-soft)' : 'var(--paper)',
            border: `1.5px solid ${screenshot ? 'var(--good)' : 'var(--line)'}`,
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            color: screenshot ? 'var(--good)' : 'var(--ink)'
          }}
        >
          <span style={{ display: 'block', fontSize: 22, marginBottom: 4 }}>
            {screenshot ? '✓' : '📸'}
          </span>
          {screenshot ? 'Screenshot added — tap to remove' : 'Add a screenshot'}
        </button>
      </div>

      {/* Screenshot preview */}
      {screenshot && (
        <img
          src={`data:image/png;base64,${screenshot}`}
          alt="Screenshot preview"
          style={{ width: '100%', borderRadius: 10, border: '1.5px solid var(--line)' }}
        />
      )}

      {/* Diagnostic checklist — read-only, shows what will be sent */}
      <div
        style={{
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 10,
          padding: 14
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 10
          }}
        >
          I&apos;ll also send Joel:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, color: 'var(--ink-2)' }}>
          <div>✓ Disk space</div>
          <div>✓ What changed today</div>
          <div>✓ Recent error messages</div>
          <div>✓ Printer status</div>
          <div>✓ Internet connection</div>
          <div>✓ App version</div>
        </div>
      </div>

      {/* Error message */}
      {sendState === 'error' && (
        <div
          style={{
            background: 'var(--accent-soft)',
            border: '1.5px solid var(--accent)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 14,
            color: 'var(--ink)'
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Send button — always last, pushed to bottom */}
      <BigButton
        variant="danger"
        onClick={handleSend}
        disabled={sendState === 'sending' || !message.trim()}
        style={{ marginTop: 'auto' }}
      >
        {sendState === 'sending' ? 'Sending to Joel…' : 'Send to Joel'}
      </BigButton>
    </div>
  )
}
