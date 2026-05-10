// Scam Shield — uses Claude to analyse text/URLs for scam signals.
// History is stored in userData/scam-history.json (last 50 entries).
// Safe Browsing URL check is attempted when SAFE_BROWSING_KEY is set.

import fs from 'fs'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import Anthropic from '@anthropic-ai/sdk'
import type { ScamVerdict } from '../../shared/types'

const HISTORY_LIMIT = 50
const MODEL = 'claude-haiku-4-5-20251001'

function historyPath(): string {
  return path.join(app.getPath('userData'), 'scam-history.json')
}

interface HistoryEntry {
  at: string
  preview: string
  verdict: ScamVerdict
}

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(fs.readFileSync(historyPath(), 'utf8')) } catch { return [] }
}

function saveHistory(entries: HistoryEntry[]): void {
  fs.writeFileSync(historyPath(), JSON.stringify(entries.slice(0, HISTORY_LIMIT), null, 2), 'utf8')
}

// --- Safe Browsing (optional) ---

async function checkUrlsSafeBrowsing(urls: string[]): Promise<string[]> {
  const key = process.env.SAFE_BROWSING_KEY
  if (!key || urls.length === 0) return []
  return new Promise((resolve) => {
    const body = JSON.stringify({
      client: { clientId: 'moms-pc-helper', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: urls.map((u) => ({ url: u }))
      }
    })
    const req = https.request(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            const flagged: string[] = (parsed.matches ?? []).map((m: { threat: { url: string } }) => m.threat.url)
            resolve(flagged)
          } catch { resolve([]) }
        })
      }
    )
    req.on('error', () => resolve([]))
    req.write(body)
    req.end()
  })
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
  return [...new Set(matches)]
}

// --- Claude analysis ---

const SYSTEM_PROMPT = `You are a scam detection assistant helping a non-technical older adult stay safe online.
Analyse the provided text (which may be an email, SMS, website text, or URL) and respond ONLY with a JSON object — no markdown, no explanation outside the JSON.

JSON shape:
{
  "verdict": "scam" | "suspicious" | "safe" | "unknown",
  "reason": "<one plain-English sentence explaining the verdict>",
  "recommendations": ["<short action the user should take>", ...],
  "flaggedPatterns": ["<specific thing you spotted that is a red flag>", ...]
}

Guidelines:
- "scam": clear malicious intent (fake bank, IRS/refund fraud, prize scam, phishing, urgent threats)
- "suspicious": some red flags but not conclusive (unusual sender, odd link, unexpected request)
- "safe": no meaningful red flags found
- "unknown": too little information to judge
- Keep language simple — the user is not technical.
- recommendations and flaggedPatterns may be empty arrays if not applicable.`

export async function analyze(content: string): Promise<ScamVerdict> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

  const urls = extractUrls(content)
  const flaggedUrls = await checkUrlsSafeBrowsing(urls)

  const extra = flaggedUrls.length > 0
    ? `\n\nNote: Google Safe Browsing flagged these URLs as dangerous: ${flaggedUrls.join(', ')}`
    : ''

  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: content + extra }]
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let verdict: ScamVerdict
  try {
    verdict = JSON.parse(raw)
  } catch {
    verdict = {
      verdict: 'unknown',
      reason: 'Could not parse the analysis result. Try again with more context.',
      recommendations: [],
      flaggedPatterns: []
    }
  }

  // Merge in any Safe Browsing flags
  if (flaggedUrls.length > 0 && verdict.verdict !== 'scam') {
    verdict.verdict = 'scam'
    verdict.flaggedPatterns = [
      ...verdict.flaggedPatterns,
      ...flaggedUrls.map((u) => `URL flagged by Google Safe Browsing: ${u}`)
    ]
  }

  const history = loadHistory()
  history.unshift({
    at: new Date().toISOString(),
    preview: content.slice(0, 120).replace(/\n/g, ' '),
    verdict
  })
  saveHistory(history)

  return verdict
}

export function history(limit: number): HistoryEntry[] {
  return loadHistory().slice(0, limit)
}
