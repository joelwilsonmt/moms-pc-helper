import React from 'react'
import { NavProvider, useNav } from './nav'
import Home from './screens/Home'

// Router grows one case per milestone. Screens not yet built fall back to a
// placeholder so navigation doesn't crash while we're mid-build.
function Router(): React.JSX.Element {
  const { screen, back } = useNav()

  switch (screen) {
    case 'home':
      return <Home />
    case '_component-demo':
    default:
      return <Placeholder screen={screen} onBack={back} />
  }
}

function Placeholder({ screen, onBack }: { screen: string; onBack: () => void }): React.JSX.Element {
  return (
    <div className="screen" style={{ height: '100vh' }}>
      <button
        onClick={onBack}
        className="greeting-back"
        type="button"
      >
        ← Back to home
      </button>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          gap: 12
        }}
      >
        <div style={{ fontSize: 40 }}>🚧</div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}
        >
          {screen} — coming soon
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          This screen is built in a later milestone.
        </div>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  return (
    <NavProvider initial="home">
      <Router />
    </NavProvider>
  )
}
