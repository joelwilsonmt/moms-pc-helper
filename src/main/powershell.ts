// Safe PowerShell execution wrapper — §9.
// Spawns powershell.exe with -NoProfile -ExecutionPolicy Bypass -File <path>.
// Parses JSON output. Hard timeout: 10 seconds per call.
// Only called from RealWindowsAdapter; never from renderer.

import { spawn } from 'child_process'
import { join } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

function helpersDir(): string {
  if (is.dev) {
    return join(process.cwd(), 'resources', 'helpers')
  }
  return join(process.resourcesPath, 'helpers')
}

export function runScript<T>(scriptName: string, args: string[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(helpersDir(), scriptName)
    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      ...args
    ], { windowsHide: true })

    let stdout = ''
    let stderr = ''

    ps.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    ps.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      ps.kill()
      reject(new Error(`PowerShell script ${scriptName} timed out after 10s`))
    }, 10_000)

    ps.on('close', (code) => {
      clearTimeout(timer)
      const output = stdout.trim()
      if (!output) {
        reject(new Error(`${scriptName} produced no output (exit ${code}). stderr: ${stderr.trim()}`))
        return
      }
      try {
        const parsed = JSON.parse(output) as { error?: string } & T
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          reject(new Error(`${scriptName}: ${parsed.error}`))
        } else {
          resolve(parsed as T)
        }
      } catch {
        reject(new Error(`${scriptName} returned invalid JSON: ${output.slice(0, 200)}`))
      }
    })

    ps.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`Failed to spawn PowerShell: ${err.message}`))
    })
  })
}
