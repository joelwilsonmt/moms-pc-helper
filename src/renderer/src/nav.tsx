// Simple screen-based router — no external dependency needed for this app's linear navigation.
// Each screen is a string literal. Components call navigate() to change screens.

import React, { createContext, useContext, useState } from 'react'

export type Screen =
  | 'home'
  | 'disk'
  | 'stuck'
  | 'vault-locked'
  | 'vault-open'
  | 'scam'
  | 'internet'
  | 'backup'
  | 'subs'
  | 'print'
  | 'updates'
  | 'manuals'
  | 'checklists'
  | 'onboarding'
  | 'advanced'
  | '_component-demo'

interface NavState {
  screen: Screen
  navigate: (s: Screen) => void
  back: () => void
}

const NavContext = createContext<NavState | null>(null)

export function NavProvider({
  children,
  initial = '_component-demo'
}: {
  children: React.ReactNode
  initial?: Screen
}): React.JSX.Element {
  const [history, setHistory] = useState<Screen[]>([initial])

  const navigate = (s: Screen): void => setHistory((h) => [...h, s])
  const back = (): void => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))

  return (
    <NavContext.Provider value={{ screen: history[history.length - 1], navigate, back }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav(): NavState {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used inside NavProvider')
  return ctx
}
