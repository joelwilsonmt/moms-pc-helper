import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { UpdatesAvailable } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

export default function Updates(): React.JSX.Element {
  const { back } = useNav()
  const [updates, setUpdates] = useState<UpdatesAvailable | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.system.getUpdatesAvailable().then((u) => {
      setUpdates(u)
      setLoading(false)
    })
  }, [])

  const totalMinutes = updates
    ? updates.windows.estimatedMinutes + updates.apps.reduce((s, a) => s + a.estimatedMinutes, 0)
    : 0

  const hasUpdates = updates && (updates.windows.count > 0 || updates.apps.length > 0)

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Updates</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {loading
            ? 'Checking for updates…'
            : hasUpdates
              ? `${updates!.windows.count + updates!.apps.length} update${updates!.windows.count + updates!.apps.length === 1 ? '' : 's'} waiting. About ${totalMinutes} minutes total.`
              : 'Everything is up to date.'}
        </p>
      </div>

      {!loading && updates && (
        <>
          <ConfirmList>
            {/* Windows updates */}
            {updates.windows.count > 0 ? (
              <ConfirmRow
                check="!"
                checkVariant="warn"
                what={`Windows — ${updates.windows.count} update${updates.windows.count === 1 ? '' : 's'}`}
                det={updates.windows.needsRestart
                  ? `Needs a restart · about ${updates.windows.estimatedMinutes} min`
                  : `About ${updates.windows.estimatedMinutes} min`}
                pill={updates.windows.needsRestart ? 'Restart needed' : undefined}
                pillVariant="warn"
              />
            ) : (
              <ConfirmRow
                check="✓"
                checkVariant="good"
                what="Windows"
                det="Up to date"
              />
            )}

            {/* App updates */}
            {updates.apps.map((app) => (
              <ConfirmRow
                key={app.name}
                check="!"
                checkVariant="warn"
                what={app.name}
                det={`${app.fromVersion} → ${app.toVersion} · about ${app.estimatedMinutes} min`}
              />
            ))}

            {updates.apps.length === 0 && updates.windows.count === 0 && (
              <ConfirmRow check="✓" checkVariant="good" what="All apps" det="Up to date" />
            )}
          </ConfirmList>

          {updates.windows.needsRestart && (
            <div style={{ background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 12, padding: '14px 16px', fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
              Windows needs to restart to finish installing. Save anything you're working on first, then let it restart — it should only take a few minutes.
            </div>
          )}

          {!hasUpdates && (
            <div style={{ background: 'var(--good-soft)', border: '1.5px solid var(--good)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--ink)' }}>
              ✓ Everything is up to date. Nothing to do here.
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasUpdates && (
              <BigButton
                variant="accent"
                onClick={() => window.api.launch.settings('windowsupdate')}
              >
                Open Windows Update to install
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
