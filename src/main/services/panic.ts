// Panic button — opens Jan's default email client pre-filled with a help message.
// Saves a screenshot + diagnostic JSON to the Desktop so she can attach them if needed.
// Read-only: only writes to Desktop (user data area) and opens a mailto: URL.

import { app, shell } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import type { WindowsAdapter } from '../adapters/WindowsAdapter'
import { buildBundle, captureScreenshot, formatEmailBody } from './diagnostics'

const MAX_MAILTO_BODY = 1800  // chars — keeps the URL under typical client limits

function buildMailtoBody(rawBody: string, desktopFiles: string[]): string {
  let body = rawBody
  if (desktopFiles.length > 0) {
    body += `\nFiles saved to your Desktop:\n${desktopFiles.map((f) => `  ${f}`).join('\n')}\n`
  }
  if (body.length > MAX_MAILTO_BODY) {
    body = body.slice(0, MAX_MAILTO_BODY) + '\n…(truncated — see diagnostic file on Desktop)'
  }
  return body
}

export async function sendPanic(
  message: string,
  includeScreenshot: boolean,
  toEmail: string,
  adapter: WindowsAdapter
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!toEmail) {
    return {
      ok: false,
      error: "The help email address isn't set up yet. Ask Joel to add it in Advanced Settings."
    }
  }

  try {
    const [bundle, screenshot] = await Promise.all([
      buildBundle(message, adapter),
      includeScreenshot ? captureScreenshot() : Promise.resolve(null)
    ])

    const desktop = app.getPath('desktop')
    const desktopFiles: string[] = []

    // Save diagnostic JSON to Desktop
    const jsonName = 'pc-helper-diagnostic.json'
    try {
      writeFileSync(join(desktop, jsonName), JSON.stringify(bundle, null, 2), 'utf8')
      desktopFiles.push(jsonName)
    } catch { /* not critical if Desktop write fails */ }

    // Save screenshot to Desktop if requested
    if (screenshot) {
      const pngName = 'pc-helper-screenshot.png'
      try {
        writeFileSync(join(desktop, pngName), screenshot)
        desktopFiles.push(pngName)
      } catch { /* not critical */ }
    }

    const subject = encodeURIComponent("Jan's PC — Something's wrong")
    const rawBody = formatEmailBody(bundle, !!screenshot)
    const body = encodeURIComponent(buildMailtoBody(rawBody, desktopFiles))
    const mailto = `mailto:${encodeURIComponent(toEmail)}?subject=${subject}&body=${body}`

    await shell.openExternal(mailto)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Couldn't open your email: ${msg}` }
  }
}
