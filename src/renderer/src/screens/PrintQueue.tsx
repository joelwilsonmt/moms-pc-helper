import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import { useSystemStore } from '../store'
import type { PrintJobInfo } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

function stuckLabel(minutes: number): string {
  if (minutes < 60) return `Stuck ${minutes} min`
  return `Stuck ${Math.round(minutes / 60)} hr`
}

export default function PrintQueue(): React.JSX.Element {
  const { back, navigate } = useNav()
  const { printers, loading } = useSystemStore()
  const [jobs, setJobs] = useState<PrintJobInfo[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)

  useEffect(() => {
    window.api.system.getPrintJobs().then((j) => {
      setJobs(j)
      setJobsLoading(false)
    })
  }, [])

  const stuckPrinter = printers.find((p) => p.jobsStuck > 0)
  const anyStuck = jobs.some((j) => j.stuckMinutes > 0)

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Printer</h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15, margin: 0 }}>
          {loading || jobsLoading
            ? 'Checking your printer…'
            : anyStuck
              ? `${jobs.filter((j) => j.stuckMinutes > 0).length} document${jobs.filter((j) => j.stuckMinutes > 0).length === 1 ? '' : 's'} stuck in the queue. Here's how to fix it.`
              : printers.length === 0
                ? 'No printer found.'
                : 'Your printer looks fine.'}
        </p>
      </div>

      {!loading && !jobsLoading && (
        <>
          {/* Printer status cards */}
          {printers.map((p) => (
            <div
              key={p.name}
              style={{
                background: 'var(--surface)',
                border: `1.5px solid ${p.status === 'ready' ? 'var(--border)' : 'var(--bad)'}`,
                borderRadius: 12,
                padding: '14px 16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
                <span className={`pill${p.status !== 'ready' ? ' bad' : ''}`}>
                  {p.status === 'ready' ? 'Ready' : p.status === 'offline' ? 'Offline' : p.status === 'error' ? 'Error' : 'Paused'}
                </span>
              </div>
              {p.jobsStuck > 0 && (
                <div style={{ fontSize: 14, color: 'var(--bad)', marginTop: 6 }}>
                  {p.jobsStuck} document{p.jobsStuck === 1 ? '' : 's'} stuck
                </div>
              )}
              {p.lastUsed && p.jobsStuck === 0 && (
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                  Last used {Math.floor((Date.now() - new Date(p.lastUsed).getTime()) / 86_400_000)} days ago
                </div>
              )}
            </div>
          ))}

          {/* Stuck jobs list */}
          {jobs.length > 0 && (
            <ConfirmList>
              {jobs.map((job, i) => (
                <ConfirmRow
                  key={i}
                  check={job.stuckMinutes > 0 ? '!' : '→'}
                  checkVariant={job.stuckMinutes > 0 ? 'bad' : 'muted'}
                  what={job.documentName}
                  det={`${job.pages} page${job.pages === 1 ? '' : 's'} · ${stuckLabel(job.stuckMinutes)}`}
                  pill={job.status}
                  pillVariant="bad"
                />
              ))}
            </ConfirmList>
          )}

          {!anyStuck && printers.some((p) => p.status === 'ready') && (
            <div style={{ background: 'var(--good-soft)', border: '1.5px solid var(--good)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: 'var(--ink)' }}>
              ✓ No stuck jobs. Your printer is ready to go.
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(anyStuck || stuckPrinter) && (
              <BigButton
                variant="accent"
                onClick={() => navigate('guide', { guideId: 'printer/clear-stuck-jobs' })}
              >
                Walk me through clearing the stuck jobs
              </BigButton>
            )}
            {!anyStuck && (
              <BigButton
                variant="default"
                onClick={() => window.api.launch.settings('printers')}
              >
                Open printer settings
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
