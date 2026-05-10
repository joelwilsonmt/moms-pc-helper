import React from 'react'

interface DiskBarProps {
  label: string
  totalGB: number
  freeGB: number
}

function humanFree(freeGB: number, totalGB: number): string {
  return `${freeGB.toFixed(0)} GB free of ${totalGB >= 1000 ? (totalGB / 1000).toFixed(0) + ' TB' : totalGB + ' GB'}`
}

export default function DiskBar({ label, totalGB, freeGB }: DiskBarProps): React.JSX.Element {
  const usedPct = Math.min(100, Math.round(((totalGB - freeGB) / totalGB) * 100))
  const isWarn = usedPct >= 85

  return (
    <div className="disk-bar-wrap">
      <div className="disk-head">
        <span>{label}</span>
        <span className="free">{humanFree(freeGB, totalGB)}</span>
      </div>
      <div className="disk-track">
        <span
          className={`disk-fill ${isWarn ? 'warn' : 'ok'}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
    </div>
  )
}
