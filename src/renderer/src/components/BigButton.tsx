import React from 'react'

interface BigButtonProps {
  variant?: 'default' | 'accent' | 'good' | 'danger'
  meta?: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  /** Stretch to full width (default true) */
  fullWidth?: boolean
}

export default function BigButton({
  variant = 'default',
  meta,
  onClick,
  disabled,
  children,
  fullWidth = true
}: BigButtonProps): React.JSX.Element {
  const cls = ['big-btn', variant !== 'default' ? variant : '', fullWidth ? '' : 'inline']
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} onClick={onClick} disabled={disabled} type="button">
      {children}
      {meta && <span className="meta">{meta}</span>}
    </button>
  )
}
