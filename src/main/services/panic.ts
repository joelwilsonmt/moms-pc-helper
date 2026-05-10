// Panic button sender — SMTP via nodemailer.
// Reads SMTP config from AppConfig (stored in electron-store).
// Dev override: set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, PANIC_EMAIL env vars.
// Outbound only — no firewall changes, no write to filesystem outside app dir.

import nodemailer from 'nodemailer'
import type { WindowsAdapter } from '../adapters/WindowsAdapter'
import { buildBundle, captureScreenshot, formatEmailBody } from './diagnostics'

export interface PanicConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  toEmail: string        // Joel's email
  fromName: string       // "Jan's PC Helper"
}

function configFromEnv(): Partial<PanicConfig> {
  return {
    smtpHost:     process.env['SMTP_HOST'],
    smtpPort:     process.env['SMTP_PORT'] ? parseInt(process.env['SMTP_PORT']) : undefined,
    smtpUser:     process.env['SMTP_USER'],
    smtpPassword: process.env['SMTP_PASSWORD'],
    toEmail:      process.env['PANIC_EMAIL']
  }
}

export async function sendPanic(
  message: string,
  includeScreenshot: boolean,
  panicConfig: PanicConfig,
  adapter: WindowsAdapter
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Merge env overrides (useful for dev without unlocking vault every time)
  const env = configFromEnv()
  const cfg: PanicConfig = {
    smtpHost:     env.smtpHost     ?? panicConfig.smtpHost,
    smtpPort:     env.smtpPort     ?? panicConfig.smtpPort,
    smtpUser:     env.smtpUser     ?? panicConfig.smtpUser,
    smtpPassword: env.smtpPassword ?? panicConfig.smtpPassword,
    toEmail:      env.toEmail      ?? panicConfig.toEmail,
    fromName:     panicConfig.fromName
  }

  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword || !cfg.toEmail) {
    return {
      ok: false,
      error: 'Panic button isn\'t set up yet — Joel needs to add his email settings. Tell him in person or by phone.'
    }
  }

  try {
    const [bundle, screenshot] = await Promise.all([
      buildBundle(message, adapter),
      includeScreenshot ? captureScreenshot() : Promise.resolve(null)
    ])

    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpPort === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPassword }
    })

    const attachments: nodemailer.Attachment[] = [
      {
        filename: 'diagnostic-bundle.json',
        content: JSON.stringify(bundle, null, 2),
        contentType: 'application/json'
      }
    ]

    if (screenshot) {
      attachments.push({
        filename: 'screenshot.png',
        content: screenshot,
        contentType: 'image/png'
      })
    }

    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.smtpUser}>`,
      to: cfg.toEmail,
      subject: `⚠️ Jan's PC — Something's wrong`,
      text: formatEmailBody(bundle, !!screenshot),
      attachments
    })

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Couldn't send the message: ${msg}` }
  }
}
