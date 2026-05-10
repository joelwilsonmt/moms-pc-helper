// Content service — reads guides (markdown) and checklists (JSON) from resources/.
// Checklist completion state is persisted to a JSON file in the app data dir.

import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Guide, ChecklistTemplate, ChecklistRun } from '../../shared/types'

function resourcesDir(): string {
  // In dev (electron-vite), resources/ is at the project root.
  // In production (packaged), it's in process.resourcesPath.
  if (app.isPackaged) return process.resourcesPath
  return path.join(app.getAppPath(), 'resources')
}

function guidesDir(): string   { return path.join(resourcesDir(), 'guides') }
function checklistsDir(): string { return path.join(resourcesDir(), 'checklists') }
function runsPath(): string {
  return path.join(app.getPath('userData'), 'checklist-runs.json')
}

// --- front matter parser ---

interface FrontMatter { [key: string]: string }

function parseFrontMatter(raw: string): { meta: FrontMatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta: FrontMatter = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const k = line.slice(0, colon).trim()
    const v = line.slice(colon + 1).trim()
    meta[k] = v
  }
  return { meta, body: match[2].trim() }
}

function countSteps(body: string): number {
  return (body.match(/^\d+\./gm) ?? []).length
}

// --- guides ---

function loadGuideFile(filePath: string): Guide | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const stat = fs.statSync(filePath)
    const { meta, body } = parseFrontMatter(raw)
    if (!meta.id || !meta.title) return null
    return {
      id:               meta.id,
      category:         meta.category ?? '',
      title:            meta.title,
      steps:            countSteps(body),
      estimatedMinutes: meta.minutes ? parseInt(meta.minutes, 10) : undefined,
      body,
      lastUpdated:      stat.mtime.toISOString()
    }
  } catch {
    return null
  }
}

function allGuides(): Guide[] {
  const guides: Guide[] = []
  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name))
      } else if (entry.name.endsWith('.md')) {
        const g = loadGuideFile(path.join(dir, entry.name))
        if (g) guides.push(g)
      }
    }
  }
  walk(guidesDir())
  return guides
}

export function listGuides(category?: string): Guide[] {
  const guides = allGuides()
  if (!category) return guides
  return guides.filter((g) => g.category === category)
}

export function getGuide(id: string): Guide | null {
  // id is like "computer/free-space-pictures" — convert to path
  const filePath = path.join(guidesDir(), `${id}.md`)
  return loadGuideFile(filePath)
}

export function searchGuides(query: string): Guide[] {
  const q = query.toLowerCase()
  return allGuides().filter(
    (g) => g.title.toLowerCase().includes(q) || g.body.toLowerCase().includes(q)
  )
}

// --- checklists ---

function loadChecklistFile(filePath: string): ChecklistTemplate | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed.id || !parsed.title || !Array.isArray(parsed.items)) return null
    return parsed as ChecklistTemplate
  } catch {
    return null
  }
}

export function listChecklists(): ChecklistTemplate[] {
  const dir = checklistsDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadChecklistFile(path.join(dir, f)))
    .filter((c): c is ChecklistTemplate => c !== null)
}

// --- checklist runs (persisted) ---

function loadRuns(): Record<string, ChecklistRun> {
  try {
    return JSON.parse(fs.readFileSync(runsPath(), 'utf8'))
  } catch {
    return {}
  }
}

function saveRuns(runs: Record<string, ChecklistRun>): void {
  fs.writeFileSync(runsPath(), JSON.stringify(runs, null, 2), 'utf8')
}

export function getChecklistRun(templateId: string): ChecklistRun | null {
  return loadRuns()[templateId] ?? null
}

export function toggleChecklistItem(templateId: string, itemId: string): ChecklistRun {
  const runs = loadRuns()
  const now = new Date().toISOString()
  const run: ChecklistRun = runs[templateId] ?? {
    templateId,
    startedAt: now,
    completedItems: [],
    lastUpdated: now
  }
  const idx = run.completedItems.indexOf(itemId)
  if (idx === -1) {
    run.completedItems = [...run.completedItems, itemId]
  } else {
    run.completedItems = run.completedItems.filter((id) => id !== itemId)
  }
  run.lastUpdated = now
  runs[templateId] = run
  saveRuns(runs)
  return run
}

export function resetChecklist(templateId: string): void {
  const runs = loadRuns()
  delete runs[templateId]
  saveRuns(runs)
}
