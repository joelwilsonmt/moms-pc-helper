import React from 'react'

interface StatusCardProps {
  variant?: 'default' | 'warn' | 'good'
  eyebrow: string
  headline: string
  sub?: string
  /** Slot for a BigButton or other action below the sub text */
  children?: React.ReactNode
}

export default function StatusCard({
  variant = 'default',
  eyebrow,
  headline,
  sub,
  children
}: StatusCardProps): React.JSX.Element {
  const cls = ['status-card', variant !== 'default' ? variant : ''].filter(Boolean).join(' ')

  return (
    <div className={cls}>
      <div className="status-eyebrow">{eyebrow}</div>
      <div className="status-headline">{headline}</div>
      {sub && <div className="status-sub">{sub}</div>}
      {children && <div className="status-card-action">{children}</div>}
    </div>
  )
}
