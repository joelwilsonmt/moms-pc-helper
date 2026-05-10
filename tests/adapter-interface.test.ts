// §3.3 enforcement test — ensures WindowsAdapter has no write-style method names.
// Run with: npm test

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ADAPTER_FILE = join(__dirname, '..', 'src', 'main', 'adapters', 'WindowsAdapter.ts')

// Method name prefixes that must never appear on the WindowsAdapter interface
const FORBIDDEN_PREFIXES = [
  'set', 'delete', 'move', 'restart', 'install', 'uninstall',
  'create', 'update', 'write', 'remove', 'add', 'clear', 'reset',
  'enable', 'disable', 'start', 'stop', 'register', 'copy', 'rename'
]

describe('WindowsAdapter interface read-only enforcement', () => {
  const source = readFileSync(ADAPTER_FILE, 'utf8')

  it('contains only allowed method prefixes', () => {
    // Extract method names from the interface (e.g. "  getVolumes(): Promise<...")
    const methodRegex = /^\s+(\w+)\s*\(/gm
    let match: RegExpExecArray | null

    while ((match = methodRegex.exec(source)) !== null) {
      const methodName = match[1].toLowerCase()
      for (const prefix of FORBIDDEN_PREFIXES) {
        expect(
          methodName,
          `WindowsAdapter has a write-style method: "${match[1]}". Read-only mode is non-negotiable.`
        ).not.toMatch(new RegExp(`^${prefix}`))
      }
    }
  })

  it('contains the enforcement comment block', () => {
    expect(source).toContain('INVARIANT: this interface must contain ONLY read-style methods')
  })
})
