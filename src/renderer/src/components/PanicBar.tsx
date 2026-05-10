import React from 'react'

interface PanicBarProps {
  onClick?: () => void
}

export default function PanicBar({ onClick }: PanicBarProps): React.JSX.Element {
  return (
    <button className="panic-bar" onClick={onClick} type="button">
      <span>
        <span className="panic-label">Something&apos;s wrong — tell Joel</span>
        <br />
        <span className="panic-hint">
          Sends Joel a message with what&apos;s happening on your computer
        </span>
      </span>
      <span className="panic-arrow">→</span>
    </button>
  )
}
