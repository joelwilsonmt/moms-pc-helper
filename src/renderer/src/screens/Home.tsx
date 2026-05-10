import React, { useEffect, useRef } from 'react'
import { useNav } from '../nav'
import {
  useSystemStore,
  computeHeadline,
  lastCheckedLabel,
  printerPill,
  internetPill,
  backupPill,
  diskPill
} from '../store'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import StatusCard from '../components/StatusCard'
import ActionCard from '../components/ActionCard'
import PanicBar from '../components/PanicBar'

const POLL_MS = 5 * 60 * 1000 // 5 minutes per spec §7.1

export default function Home(): React.JSX.Element {
  const { navigate } = useNav()
  const { volumes, printers, internet, backup, config, loading, lastChecked, error, refresh } =
    useSystemStore()

  // Initial load + 5-minute polling
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const headline = computeHeadline(volumes, printers, internet, backup)
  const prPill = printerPill(printers)
  const inPill = internetPill(internet)
  const bkPill = backupPill(backup)
  const dkPill = diskPill(volumes)
  const printerName = printers[0]?.name ?? 'Printer'
  const checkedLabel = lastCheckedLabel(lastChecked)

  // Suppress duplicate refresh calls from StrictMode double-invoke
  const hasRefreshed = useRef(false)
  useEffect(() => {
    if (!hasRefreshed.current) {
      hasRefreshed.current = true
    }
  }, [])

  return (
    <div className="screen" style={{ height: '100vh', boxSizing: 'border-box' }}>
      <Greeting name={config?.userName ?? 'Donna'} />

      {/* ── Headline status card ─────────────────────────────────────── */}
      {loading && !lastChecked ? (
        <div
          style={{
            background: 'var(--paper)',
            border: '1.5px solid var(--line)',
            borderRadius: 14,
            padding: '22px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13
          }}
        >
          Checking your PC…
        </div>
      ) : error ? (
        <StatusCard
          variant="default"
          eyebrow="Couldn't check"
          headline="Something went wrong reading your PC"
          sub="Joel will see this if you tap the button below."
        />
      ) : (
        <StatusCard
          variant={headline.variant}
          eyebrow={headline.eyebrow}
          headline={headline.headline}
          sub={
            headline.variant === 'good' && checkedLabel
              ? `Last checked ${checkedLabel}.`
              : headline.sub
          }
        >
          {headline.ctaLabel && (
            <BigButton
              variant={headline.variant === 'warn' ? 'default' : 'accent'}
              meta={headline.ctaMeta}
              onClick={() => headline.ctaScreen && navigate(headline.ctaScreen)}
            >
              {headline.ctaLabel}
            </BigButton>
          )}
        </StatusCard>
      )}

      {/* ── 4-card grid ─────────────────────────────────────────────── */}
      <div className="grid-cards">
        <ActionCard
          icon="💾"
          title="Main drive"
          pill={dkPill.label}
          pillVariant={dkPill.variant === 'default' ? 'default' : dkPill.variant}
          desc={
            volumes.find((v) => v.isSystemDrive)
              ? `${Math.round(volumes.find((v) => v.isSystemDrive)!.freeGB)} GB free`
              : 'Tap to see details'
          }
          onClick={() => navigate('disk')}
        />
        <ActionCard
          icon="🖨️"
          title={printerName.length > 20 ? 'Printer' : printerName}
          pill={prPill.label}
          pillVariant={prPill.variant}
          desc={
            prPill.variant === 'good'
              ? printers[0]?.lastUsed
                ? `Last used ${daysAgoLabel(printers[0].lastUsed)}`
                : 'Ready to print'
              : prPill.variant === 'bad'
                ? 'Tap to fix it'
                : 'Tap to see details'
          }
          onClick={() => navigate('print')}
        />
        <ActionCard
          icon="📡"
          title="Internet"
          pill={inPill.label}
          pillVariant={inPill.variant}
          desc={
            internet?.latencyMs
              ? `${internet.latencyMs} ms · speed looks good`
              : internet && !internet.online
                ? 'Tap to fix it'
                : 'Tap to see details'
          }
          onClick={() => navigate('internet')}
        />
        <ActionCard
          icon="🔒"
          title="Backup"
          pill={bkPill.label}
          pillVariant={bkPill.variant}
          desc={
            bkPill.variant === 'good'
              ? 'Photos & documents safe'
              : 'Tap to check'
          }
          onClick={() => navigate('backup')}
        />
      </div>

      {/* ── Last-checked footnote ────────────────────────────────────── */}
      {lastChecked && !loading && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--muted)',
            textAlign: 'center',
            letterSpacing: '0.08em'
          }}
        >
          Last checked {checkedLabel}
          {loading && ' · refreshing…'}
        </div>
      )}

      {/* ── Panic bar — always last ──────────────────────────────────── */}
      <PanicBar onClick={() => navigate('stuck')} />
    </div>
  )
}

function daysAgoLabel(iso: string): string {
  const daysAgo = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (daysAgo === 0) return 'today'
  if (daysAgo === 1) return 'yesterday'
  return `${daysAgo} days ago`
}
