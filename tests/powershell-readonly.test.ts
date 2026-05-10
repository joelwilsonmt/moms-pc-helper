// §3.3 enforcement test — parses every .ps1 and fails if it finds disallowed verbs.
// Run with: npm test

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const HELPERS_DIR = join(__dirname, '..', 'resources', 'helpers')

// Verbs that must never appear in any .ps1 file.
// Note: "New-Object" is intentionally excluded — it is used read-only for COM
// query instantiation (e.g. Microsoft.Update.Session). What is forbidden is
// New-Item, New-ItemProperty, etc. which create registry/filesystem objects.
const FORBIDDEN_VERBS = [
  'Set-Item',
  'Set-ItemProperty',
  'Set-Content',
  'Set-Service',
  'New-Item',
  'New-ItemProperty',
  'New-PSDrive',
  'New-Service',
  'Remove-',
  'Move-',
  'Copy-Item',
  'Rename-',
  'Clear-',
  'Reset-',
  'Write-',
  'Add-Content',
  'Add-Member',
  'Import-',
  'Export-',
  'Install-',
  'Uninstall-',
  'Enable-',
  'Disable-',
  'Start-Service',
  'Stop-Service',
  'Restart-Service',
  'Restart-Computer',
  'Invoke-Expression',
  'Invoke-Command',
  'Register-',
  'Unregister-',
  'reg add',
  'reg delete',
  'reg copy',
  'reg import',
  'net start',
  'net stop',
]

// Lines that are allowed to contain a forbidden-looking word (comments)
function isComment(line: string): boolean {
  return line.trimStart().startsWith('#')
}

describe('PowerShell read-only enforcement', () => {
  const scripts = readdirSync(HELPERS_DIR).filter((f) => f.endsWith('.ps1'))

  it('finds at least one .ps1 script', () => {
    expect(scripts.length).toBeGreaterThan(0)
  })

  it('every script starts with the READ-ONLY header', () => {
    for (const script of scripts) {
      const content = readFileSync(join(HELPERS_DIR, script), 'utf8')
      expect(
        content,
        `${script} is missing the READ-ONLY header comment`
      ).toMatch(/^# READ-ONLY: this script must contain only Get-\* cmdlets/)
    }
  })

  for (const verb of FORBIDDEN_VERBS) {
    it(`no script contains "${verb}"`, () => {
      for (const script of scripts) {
        const lines = readFileSync(join(HELPERS_DIR, script), 'utf8').split('\n')
        for (const line of lines) {
          if (isComment(line)) continue
          expect(
            line.toLowerCase(),
            `${script} contains forbidden verb "${verb}" on line: ${line.trim()}`
          ).not.toContain(verb.toLowerCase())
        }
      }
    })
  }
})
