// AppConfig persistence — plain JSON in userData/config.json.
// isFirstRun is true until completeOnboarding() is called.

import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { AppConfig } from '../../shared/types'

function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

const DEFAULTS: AppConfig = {
  userName:             'Jan',
  panicEmail:           '',
  quietHoursStart:      '21:00',
  quietHoursEnd:        '07:00',
  vaultAutoLockMinutes: 15,
  scanIntervalMinutes:  5,
  smtp: { host: '', port: 587, user: '', password: '' }
}

interface StoredConfig extends AppConfig {
  _onboardingDone?: boolean
}

function load(): StoredConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8'))
    return { ...DEFAULTS, ...raw }
  } catch {
    return { ...DEFAULTS }
  }
}

function save(cfg: StoredConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8')
}

export function isFirstRun(): boolean {
  return !load()._onboardingDone
}

export function completeOnboarding(): void {
  const cfg = load()
  cfg._onboardingDone = true
  save(cfg)
}

export function getConfig(): AppConfig {
  const { _onboardingDone: _, ...cfg } = load()
  return cfg
}

export function updateConfig(patch: Partial<AppConfig>): AppConfig {
  const current = load()
  const updated = { ...current, ...patch }
  save(updated)
  const { _onboardingDone: _, ...cfg } = updated
  return cfg
}
