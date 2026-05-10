// §3.3 enforcement test — verifies renderer code never touches Node APIs directly.
// The renderer must only use window.api (contextBridge surface); it must never
// import electron, fs, path, child_process, or other Node built-ins.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const RENDERER_DIR = join(__dirname, '..', 'src', 'renderer', 'src')

const FORBIDDEN_IMPORTS = [
  'electron',
  "from 'fs'",
  "from 'path'",
  "from 'child_process'",
  "from 'os'",
  "from 'net'",
  "from 'http'",
  "from 'https'",
  "require('electron')",
  "require('fs')",
  "require('path')",
  "require('child_process')",
]

function walkTs(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkTs(full))
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

describe('Renderer / Node boundary', () => {
  const rendererFiles = walkTs(RENDERER_DIR)

  it('finds renderer source files', () => {
    expect(rendererFiles.length).toBeGreaterThan(5)
  })

  for (const forbidden of FORBIDDEN_IMPORTS) {
    it(`no renderer file imports "${forbidden}"`, () => {
      for (const file of rendererFiles) {
        const src = readFileSync(file, 'utf8')
        const rel = file.replace(RENDERER_DIR, '')
        expect(
          src,
          `${rel} imports "${forbidden}" — renderer must only use window.api`
        ).not.toContain(forbidden)
      }
    })
  }
})
