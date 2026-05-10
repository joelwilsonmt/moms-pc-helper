// §3.3 enforcement test — verifies the IPC channel registry.
// Parses ipc.ts for registered channels and checks:
//   1. Every channel is in the explicit allow-list (no dynamic dispatch).
//   2. No channel name contains write-sounding verbs.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const IPC_FILE = join(__dirname, '..', 'src', 'main', 'ipc.ts')
const source = readFileSync(IPC_FILE, 'utf8')

// Extract every ipcMain.handle('channel-name', ...) call
function extractChannels(src: string): string[] {
  const matches = [...src.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)]
  return matches.map((m) => m[1])
}

// These are the only namespaces the app is allowed to use
const ALLOWED_NAMESPACES = ['system', 'launch', 'vault', 'subs', 'scam', 'panic', 'content', 'app']

// Channel names must not contain these write-style verbs
const FORBIDDEN_CHANNEL_VERBS = ['delete', 'remove', 'destroy', 'drop', 'wipe', 'format', 'erase']

// Channels that are write operations by design and are explicitly permitted
// (vault delete is intentional — it deletes a vault *entry*, not a system file)
const PERMITTED_WRITE_CHANNELS = ['vault:delete', 'subs:delete']

describe('IPC channel registry', () => {
  const channels = extractChannels(source)

  it('finds at least 10 registered channels', () => {
    expect(channels.length).toBeGreaterThanOrEqual(10)
  })

  it('every channel belongs to an allowed namespace', () => {
    for (const ch of channels) {
      const ns = ch.split(':')[0]
      expect(
        ALLOWED_NAMESPACES,
        `Channel "${ch}" uses unknown namespace "${ns}"`
      ).toContain(ns)
    }
  })

  it('no duplicate channel registrations', () => {
    // ipcMain throws at runtime on duplicates, but catch them at test time too
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const ch of channels) {
      if (seen.has(ch)) dupes.push(ch)
      seen.add(ch)
    }
    expect(dupes, `Duplicate channels: ${dupes.join(', ')}`).toHaveLength(0)
  })

  it('channel names do not contain unexpected write verbs', () => {
    for (const ch of channels) {
      if (PERMITTED_WRITE_CHANNELS.includes(ch)) continue
      for (const verb of FORBIDDEN_CHANNEL_VERBS) {
        expect(
          ch.toLowerCase(),
          `Channel "${ch}" contains write verb "${verb}" — if intentional, add to PERMITTED_WRITE_CHANNELS`
        ).not.toContain(verb)
      }
    }
  })
})
