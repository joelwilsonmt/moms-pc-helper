import React from 'react'
import { useNav } from '../nav'
import { useSystemStore } from '../store'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

function diagnosisRow(label: string, ok: boolean, failNote: string) {
  return { label, ok, note: ok ? 'OK' : failNote }
}

export default function Internet(): React.JSX.Element {
  const { back, navigate } = useNav()
  const { internet, loading } = useSystemStore()

  const checks = internet
    ? [
        diagnosisRow('Internet connection', internet.online, 'No internet detected'),
        diagnosisRow('Router reachable', internet.gatewayReachable, 'Can\'t reach your router'),
        diagnosisRow('DNS working', internet.dnsWorking, 'DNS lookup failing')
      ]
    : []

  const allGood = internet?.online && internet.gatewayReachable && internet.dnsWorking
  const routerIssue = internet && !internet.gatewayReachable
  const ispIssue    = internet && internet.gatewayReachable && !internet.online

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Internet</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {loading
            ? 'Checking your connection…'
            : allGood
              ? `Your internet is working fine. Speed looks good${internet?.latencyMs ? ` (${internet.latencyMs} ms ping)` : ''}.`
              : 'There\'s a problem with your connection. Here\'s what I found.'}
        </p>
      </div>

      {!loading && internet && (
        <>
          <ConfirmList>
            {checks.map(({ label, ok, note }) => (
              <ConfirmRow
                key={label}
                check={ok ? '✓' : '✗'}
                checkVariant={ok ? 'good' : 'bad'}
                what={label}
                det={ok ? undefined : note}
              />
            ))}
          </ConfirmList>

          {routerIssue && (
            <div style={{ background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--ink)' }}>
              Your router isn't responding. A quick restart usually fixes this — it only takes about 90 seconds.
            </div>
          )}

          {ispIssue && (
            <div style={{ background: 'var(--warn-soft)', border: '1.5px solid var(--warn)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--ink)' }}>
              Your router is fine but the internet itself is down. This is usually your provider's problem — try restarting the router first, then call them if it doesn't help.
            </div>
          )}

          {allGood && (
            <div style={{ background: 'var(--good-soft)', border: '1.5px solid var(--good)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--ink)' }}>
              ✓ Everything checks out. You're good to go.
            </div>
          )}

          {!allGood && (
            <BigButton
              variant="accent"
              onClick={() => navigate('guide', { guideId: 'computer/restart-router' })}
              style={{ marginTop: 'auto' }}
            >
              Walk me through restarting my router
            </BigButton>
          )}

          {allGood && (
            <BigButton variant="default" onClick={back} style={{ marginTop: 'auto' }}>
              ← Back
            </BigButton>
          )}
        </>
      )}
    </div>
  )
}
