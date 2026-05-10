import React from 'react'
import { useNav } from '../nav'
import { useSystemStore } from '../store'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

function stateCheck(state: 'safe' | 'behind' | 'off'): string {
  if (state === 'safe') return '✓'
  if (state === 'behind') return '!'
  return '✗'
}

function stateVariant(state: 'safe' | 'behind' | 'off'): 'good' | 'warn' | 'bad' {
  if (state === 'safe') return 'good'
  if (state === 'behind') return 'warn'
  return 'bad'
}

export default function Backup(): React.JSX.Element {
  const { back } = useNav()
  const { backup, loading } = useSystemStore()

  const anyIssue = backup?.categories.some((c) => c.state !== 'safe')
  const allSafe  = backup?.categories.every((c) => c.state === 'safe')

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Backup</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {loading
            ? 'Checking your backups…'
            : allSafe
              ? 'Everything important is backed up. You\'re in good shape.'
              : 'A few things aren\'t fully backed up yet.'}
        </p>
      </div>

      {!loading && backup && (
        <>
          {/* Backup methods summary */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>File History</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: backup.fileHistoryEnabled ? 'var(--good)' : 'var(--bad)' }}>
                {backup.fileHistoryEnabled ? 'On' : 'Off'}
              </div>
              {backup.fileHistoryLastRun && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Last ran {daysAgo(backup.fileHistoryLastRun)}</div>
              )}
            </div>
            <div style={{
              flex: 1,
              background: 'var(--surface)',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px'
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>OneDrive</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: backup.oneDriveSyncing ? 'var(--good)' : 'var(--muted)' }}>
                {backup.oneDriveSyncing ? 'Syncing' : 'Off'}
              </div>
              {backup.oneDriveLastSync && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>Last synced {daysAgo(backup.oneDriveLastSync)}</div>
              )}
            </div>
          </div>

          {/* Category rows */}
          <ConfirmList>
            {backup.categories.map((cat) => (
              <ConfirmRow
                key={cat.name}
                check={stateCheck(cat.state)}
                checkVariant={stateVariant(cat.state)}
                what={cat.name}
                det={
                  cat.state === 'safe'
                    ? cat.coveredBy.length > 0
                      ? `Covered by ${cat.coveredBy.join(' and ')}`
                      : cat.lastBackup
                        ? `Last backed up ${daysAgo(cat.lastBackup)}`
                        : undefined
                    : cat.state === 'behind'
                      ? `Last backed up ${cat.lastBackup ? daysAgo(cat.lastBackup) : 'a long time ago'} — needs attention`
                      : 'Not being backed up'
                }
              />
            ))}
          </ConfirmList>

          {anyIssue && (
            <div style={{ background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
              To set up Windows Backup, press the button below. It opens Settings directly — I can't change anything for you, but I'll walk you through each step.
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anyIssue && (
              <BigButton
                variant="accent"
                onClick={() => window.api.launch.settings('backup')}
              >
                Open Windows Backup settings
              </BigButton>
            )}
            <BigButton variant="default" onClick={back}>
              ← Back
            </BigButton>
          </div>
        </>
      )}
    </div>
  )
}
