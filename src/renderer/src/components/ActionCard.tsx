import React from 'react'

interface ActionCardProps {
  icon: string
  title: string
  desc?: string
  pill?: string
  pillVariant?: 'default' | 'good' | 'warn' | 'bad'
  onClick?: () => void
}

export default function ActionCard({
  icon,
  title,
  desc,
  pill,
  pillVariant = 'default',
  onClick
}: ActionCardProps): React.JSX.Element {
  return (
    <button className="action-card" onClick={onClick} type="button">
      <div className="card-icon">{icon}</div>
      <div className="card-title-row">
        <span className="card-name">{title}</span>
        {pill && <span className={`pill ${pillVariant !== 'default' ? pillVariant : ''}`}>{pill}</span>}
      </div>
      {desc && <span className="card-desc">{desc}</span>}
    </button>
  )
}
