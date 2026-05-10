import React from 'react'

// ── ConfirmRow ────────────────────────────────────────────────────────────────

type CheckVariant = 'good' | 'warn' | 'bad' | 'muted'
type PillVariant  = 'default' | 'good' | 'warn' | 'bad'

interface ConfirmRowProps {
  /** Symbol in the check column: ✓ ✗ ! → or undefined to show a checkbox */
  check?: string
  checkVariant?: CheckVariant
  /** Optional emoji/icon in a square badge on the far left (replaces check column) */
  icon?: string
  iconAccent?: boolean
  what: string
  det?: string | React.ReactNode
  pill?: string
  pillVariant?: PillVariant
  onClick?: () => void
  /** Render what with strikethrough (completed checklist item) */
  done?: boolean
}

export function ConfirmRow({
  check,
  checkVariant = 'good',
  icon,
  iconAccent,
  what,
  det,
  pill,
  pillVariant = 'default',
  onClick,
  done
}: ConfirmRowProps): React.JSX.Element {
  const rowCls = ['confirm-row', onClick ? 'clickable' : ''].filter(Boolean).join(' ')
  const pillCls = ['pill', pillVariant !== 'default' ? pillVariant : ''].filter(Boolean).join(' ')

  return (
    <div className={rowCls} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {icon ? (
        <div className={`confirm-row-icon${iconAccent ? ' accent' : ''}`}>{icon}</div>
      ) : (
        <span className={`confirm-check ${checkVariant}`}>{check}</span>
      )}

      <div className="confirm-body">
        <div className={`confirm-what${done ? ' done' : ''}`}>{what}</div>
        {det && <div className="confirm-det">{det}</div>}
      </div>

      {pill && <span className={pillCls}>{pill}</span>}
    </div>
  )
}

// ── ChecklistRow ──────────────────────────────────────────────────────────────

interface ChecklistRowProps {
  id: string
  text: string
  hint?: string
  checked: boolean
  onToggle: (id: string) => void
}

export function ChecklistRow({
  id,
  text,
  hint,
  checked,
  onToggle
}: ChecklistRowProps): React.JSX.Element {
  return (
    <div className="confirm-row clickable" onClick={() => onToggle(id)} role="checkbox" aria-checked={checked} tabIndex={0}>
      <input
        type="checkbox"
        className="confirm-checkbox"
        checked={checked}
        onChange={() => onToggle(id)}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="confirm-body">
        <div className={`confirm-what${checked ? ' done' : ''}`}>{text}</div>
        {hint && <div className="confirm-det">{hint}</div>}
      </div>
    </div>
  )
}

// ── ConfirmList ───────────────────────────────────────────────────────────────

interface ConfirmListProps {
  children: React.ReactNode
}

export default function ConfirmList({ children }: ConfirmListProps): React.JSX.Element {
  return <div className="confirm-list">{children}</div>
}
