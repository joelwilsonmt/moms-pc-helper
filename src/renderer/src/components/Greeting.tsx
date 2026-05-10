import React from 'react'

interface GreetingProps {
  /** Show a back arrow instead of the time-based greeting */
  back?: boolean
  onBack?: () => void
  /** User's name — used only when back is false */
  name?: string
}

function timeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function Greeting({ back, onBack, name = 'Jan' }: GreetingProps): React.JSX.Element {
  if (back) {
    return (
      <button className="greeting-back" onClick={onBack} type="button">
        ← Back to home
      </button>
    )
  }

  return (
    <div className="greeting">
      Good {timeOfDay()}, <strong>{name}</strong>
    </div>
  )
}
