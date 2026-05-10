// Simple screen-based router with optional params.
// Components call navigate('screen', { guideId: '...' }) and read useParams().

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
  | 'guide'           // params: { guideId: string }
  | '_component-demo'

export type NavParams = Record<string, string>

interface HistoryEntry { screen: Screen; params: NavParams }

interface NavState {
  screen: Screen
  params: NavParams
  navigate: (s: Screen, params?: NavParams) => void
  back: () => void
}

const NavContext = createContext<NavState | null>(null)

export function NavProvider({
  children,
  initial = 'home',
  initialParams = {}
}: {
  children: React.ReactNode
  initial?: Screen
  initialParams?: NavParams
}): React.JSX.Element {
  const [history, setHistory] = useState<HistoryEntry[]>([{ screen: initial, params: initialParams }])

  const navigate = (s: Screen, params: NavParams = {}): void =>
    setHistory((h) => [...h, { screen: s, params }])

  const back = (): void =>
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))

  const current = history[history.length - 1]

  return (
    <NavContext.Provider value={{ screen: current.screen, params: current.params, navigate, back }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav(): NavState {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used inside NavProvider')
  return ctx
}
