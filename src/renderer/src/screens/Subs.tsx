import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import type { Subscription } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

const CATEGORY_ICON: Record<Subscription['category'], string> = {
  streaming: '📺',
  antivirus: '🛡️',
  storage:   '☁️',
  music:     '🎵',
  shopping:  '🛒',
  fitness:   '🏃',
  other:     '📦'
}

function renewsLabel(iso: string): string {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (d < 0)  return 'Overdue'
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d < 14)  return `In ${d} days`
  if (d < 60)  return `In ${Math.round(d / 7)} weeks`
  return `In ${Math.round(d / 30)} months`
}

export default function Subs(): React.JSX.Element {
  const { back } = useNav()
  const [subs, setSubs]         = useState<Subscription[]>([])
  const [loading, setLoading]   = useState(true)
  const [overlaps, setOverlaps] = useState<Array<{ subIds: string[]; reason: string }>>([])

  useEffect(() => {
    Promise.all([
      window.api.subs.list(),
      window.api.subs.detectOverlaps()
    ]).then(([list, ov]) => {
      setSubs(list)
      setOverlaps(ov)
      setLoading(false)
    }).catch(() => {
      setSubs([])
      setOverlaps([])
      setLoading(false)
    })
  }, [])

  const totalMonthly = subs.reduce((s, sub) => s + sub.costMonthly, 0)

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Subscriptions</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {loading
            ? 'Loading…'
            : subs.length === 0
              ? 'No subscriptions added yet.'
              : `${subs.length} subscription${subs.length === 1 ? '' : 's'} · $${totalMonthly.toFixed(2)}/mo total`}
        </p>
      </div>

      {!loading && (
        <>
          {overlaps.length > 0 && (
            <div style={{ background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warn)' }}>Possible overlaps found</div>
              {overlaps.map((o, i) => (
                <div key={i} style={{ fontSize: 14, color: 'var(--ink)' }}>{o.reason}</div>
              ))}
            </div>
          )}

          {subs.length > 0 ? (
            <ConfirmList>
              {subs.map((sub) => (
                <ConfirmRow
                  key={sub.id}
                  icon={CATEGORY_ICON[sub.category]}
                  what={sub.name}
                  det={`Renews ${renewsLabel(sub.renewalDate)}`}
                  pill={`$${sub.costMonthly.toFixed(2)}/mo`}
                />
              ))}
            </ConfirmList>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '20px', textAlign: 'center', color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.6 }}>
              Add your subscriptions here to track renewal dates and spot ones you're paying for twice.
              <br /><br />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>Feature coming soon — Joel is working on it.</span>
            </div>
          )}

          <BigButton variant="default" onClick={back} style={{ marginTop: 'auto' }}>
            ← Back
          </BigButton>
        </>
      )}
    </div>
  )
}
