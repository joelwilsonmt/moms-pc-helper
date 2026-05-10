// Vault service — SQLCipher-encrypted store for passwords, Wi-Fi, documents, etc.
// Uses better-sqlite3-multiple-ciphers (SQLCipher AES-256).
// Key derivation: scryptSync(masterPassword, salt, 32) → 64-char hex key passed to PRAGMA key.
// Master password is never stored; only the derived key lives in memory while unlocked.
//
// On non-Windows dev machines, better-sqlite3-multiple-ciphers may not be built.
// In that case, all vault methods throw VaultUnavailableError — the UI shows a graceful message.

import { createHash, scryptSync, randomBytes } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import type { VaultEntry } from '@shared/types'

// ── Types ────────────────────────────────────────────────────────────────────

type BetterSQLite3MC = typeof import('better-sqlite3-multiple-ciphers')
type Database = InstanceType<BetterSQLite3MC>

export class VaultUnavailableError extends Error {
  constructor() {
    super('Vault database is not available on this platform (Windows only in production)')
  }
}

export class VaultLockedError extends Error {
  constructor() { super('Vault is locked — unlock it first') }
}

// ── Paths ────────────────────────────────────────────────────────────────────

function dataDir(): string {
  return join(app.getPath('userData'))
}

function vaultDbPath(): string {
  return join(dataDir(), 'vault.db')
}

function saltPath(): string {
  return join(dataDir(), 'vault.salt')
}

// ── Key derivation ───────────────────────────────────────────────────────────

function loadOrCreateSalt(): Buffer {
  const p = saltPath()
  if (existsSync(p)) return readFileSync(p)
  const salt = randomBytes(32)
  mkdirSync(dataDir(), { recursive: true })
  writeFileSync(p, salt)
  return salt
}

function deriveKey(masterPassword: string): string {
  const salt = loadOrCreateSalt()
  const key = scryptSync(masterPassword, salt, 32)
  return key.toString('hex')
}

// ── Module load ──────────────────────────────────────────────────────────────

function loadSQLCipher(): BetterSQLite3MC {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('better-sqlite3-multiple-ciphers')
  } catch {
    throw new VaultUnavailableError()
  }
}

// ── Schema ───────────────────────────────────────────────────────────────────

const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    attachment_ids TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
    USING fts5(title, body, content='entries', content_rowid='rowid');

  CREATE TRIGGER IF NOT EXISTS entries_fts_insert
    AFTER INSERT ON entries BEGIN
      INSERT INTO entries_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
    END;

  CREATE TRIGGER IF NOT EXISTS entries_fts_update
    AFTER UPDATE ON entries BEGIN
      UPDATE entries_fts SET title = new.title, body = new.body WHERE rowid = new.rowid;
    END;

  CREATE TRIGGER IF NOT EXISTS entries_fts_delete
    AFTER DELETE ON entries BEGIN
      DELETE FROM entries_fts WHERE rowid = old.rowid;
    END;
`

// ── VaultService ─────────────────────────────────────────────────────────────

class VaultService {
  private db: Database | null = null

  isInitialized(): boolean {
    return existsSync(vaultDbPath()) && existsSync(saltPath())
  }

  isUnlocked(): boolean {
    return this.db !== null
  }

  initialize(masterPassword: string): void {
    if (this.isInitialized()) throw new Error('Vault is already initialized')
    const SQLCipher = loadSQLCipher()
    mkdirSync(dataDir(), { recursive: true })
    const key = deriveKey(masterPassword)
    const db = new SQLCipher(vaultDbPath()) as Database
    db.pragma(`key='${key}'`)
    db.pragma('journal_mode = WAL')
    db.exec(CREATE_TABLES)
    db.close()
    // Re-open as the unlocked session
    this.db = new SQLCipher(vaultDbPath()) as Database
    this.db.pragma(`key='${key}'`)
    this.db.pragma('journal_mode = WAL')
  }

  unlock(masterPassword: string): boolean {
    const SQLCipher = loadSQLCipher()
    if (!this.isInitialized()) return false
    try {
      const key = deriveKey(masterPassword)
      const db = new SQLCipher(vaultDbPath()) as Database
      db.pragma(`key='${key}'`)
      // Probe — will throw if key is wrong
      db.pragma('user_version')
      this.db = db
      return true
    } catch {
      return false
    }
  }

  // Windows Hello integration — stub for v1.
  // To implement: call Windows.Security.Credentials.UI.UserConsentVerifier via
  // node-addon-api or edge-js, get the master password from a secure OS credential
  // store (Windows Credential Manager), then call this.unlock(password).
  async unlockWithHello(): Promise<boolean> {
    return false
  }

  lock(): void {
    this.db?.close()
    this.db = null
  }

  private requireDb(): Database {
    if (!this.db) throw new VaultLockedError()
    return this.db
  }

  list(category?: string): VaultEntry[] {
    const db = this.requireDb()
    const rows = category
      ? db.prepare('SELECT * FROM entries WHERE category = ? ORDER BY updated_at DESC').all(category)
      : db.prepare('SELECT * FROM entries ORDER BY updated_at DESC').all()
    return (rows as RawEntry[]).map(toEntry)
  }

  get(id: string): VaultEntry | null {
    const db = this.requireDb()
    const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(id) as RawEntry | undefined
    return row ? toEntry(row) : null
  }

  create(entry: Omit<VaultEntry, 'id' | 'updatedAt'>): VaultEntry {
    const db = this.requireDb()
    const id = randomBytes(12).toString('hex')
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO entries (id, category, title, body, attachment_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, entry.category, entry.title, entry.body, JSON.stringify(entry.attachmentIds), now, now)
    return this.get(id)!
  }

  update(id: string, patch: Partial<VaultEntry>): VaultEntry {
    const db = this.requireDb()
    const existing = this.get(id)
    if (!existing) throw new Error(`Vault entry not found: ${id}`)
    const now = new Date().toISOString()
    const merged = { ...existing, ...patch }
    db.prepare(`
      UPDATE entries SET category=?, title=?, body=?, attachment_ids=?, updated_at=? WHERE id=?
    `).run(merged.category, merged.title, merged.body, JSON.stringify(merged.attachmentIds), now, id)
    return this.get(id)!
  }

  delete(id: string): void {
    this.requireDb().prepare('DELETE FROM entries WHERE id = ?').run(id)
  }

  search(query: string): VaultEntry[] {
    const db = this.requireDb()
    const rows = db.prepare(`
      SELECT e.* FROM entries e
      JOIN entries_fts f ON e.rowid = f.rowid
      WHERE entries_fts MATCH ?
      ORDER BY rank
    `).all(query) as RawEntry[]
    return rows.map(toEntry)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface RawEntry {
  id: string
  category: string
  title: string
  body: string
  attachment_ids: string
  created_at: string
  updated_at: string
}

function toEntry(r: RawEntry): VaultEntry {
  return {
    id: r.id,
    category: r.category as VaultEntry['category'],
    title: r.title,
    body: r.body,
    attachmentIds: JSON.parse(r.attachment_ids) as string[],
    updatedAt: r.updated_at
  }
}

// Singleton
export const vault = new VaultService()
