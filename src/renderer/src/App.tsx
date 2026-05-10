import React, { useEffect, useState } from 'react'
import { NavProvider, useNav } from './nav'
import type { Screen } from './nav'
import Home from './screens/Home'
import VaultLocked from './screens/VaultLocked'
import VaultOpen from './screens/VaultOpen'
import Stuck from './screens/Stuck'
import DiskReport from './screens/DiskReport'
import GuideViewer from './screens/GuideViewer'
import ChecklistView from './screens/ChecklistView'
import Manuals from './screens/Manuals'
import Checklists from './screens/Checklists'
import Scam from './screens/Scam'
import Internet from './screens/Internet'
import Backup from './screens/Backup'
import PrintQueue from './screens/PrintQueue'
import Updates from './screens/Updates'
import Subs from './screens/Subs'
import Onboarding from './screens/Onboarding'
import Advanced from './screens/Advanced'

function Router(): React.JSX.Element {
  const { screen, back } = useNav()

  switch (screen) {
    case 'home':         return <Home />
    case 'stuck':        return <Stuck />
    case 'vault-locked': return <VaultLocked />
    case 'vault-open':   return <VaultOpen />
    case 'disk':         return <DiskReport />
    case 'guide':        return <GuideViewer />
    case 'checklist':    return <ChecklistView />
    case 'manuals':      return <Manuals />
    case 'checklists':   return <Checklists />
    case 'scam':         return <Scam />
    case 'internet':     return <Internet />
    case 'backup':       return <Backup />
    case 'print':        return <PrintQueue />
    case 'updates':      return <Updates />
    case 'subs':         return <Subs />
    case 'onboarding':   return <Onboarding />
    case 'advanced':     return <Advanced />
    default:             return <Placeholder screen={screen} onBack={back} />
  }
}

function Placeholder({ screen, onBack }: { screen: string; onBack: () => void }): React.JSX.Element {
  return (
    <div className="screen" style={{ height: '100vh' }}>
      <button className="greeting-back" onClick={onBack} type="button">
        ← Back to home
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
        <div style={{ fontSize: 40 }}>🚧</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {screen} — coming soon
        </div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>This screen is built in a later milestone.</div>
      </div>
    </div>
  )
}

export default function App(): React.JSX.Element {
  const [initialScreen, setInitialScreen] = useState<Screen | null>(null)

  useEffect(() => {
    window.api.app.isFirstRun().then((first) => {
      setInitialScreen(first ? 'onboarding' : 'home')
    })
  }, [])

  if (!initialScreen) {
    // Blank while we check — avoids flash of home before redirecting to onboarding
    return <div style={{ height: '100vh', background: 'var(--bg)' }} />
  }

  return (
    <NavProvider initial={initialScreen}>
      <Router />
    </NavProvider>
  )
}
