import React, { useEffect, useState } from 'react'
import { useNav } from '../nav'
import { useSystemStore } from '../store'
import type { FolderSize } from '../../../shared/types'
import Greeting from '../components/Greeting'
import BigButton from '../components/BigButton'
import DiskBar from '../components/DiskBar'
import ConfirmList, { ConfirmRow } from '../components/ConfirmList'

// Maps folder name → guide ID (implemented in milestone 9)
const FOLDER_GUIDE: Record<string, string> = {
  'Pictures':                  'computer/free-space-pictures',
  'Downloads':                 'computer/free-space-downloads',
  'OneDrive':                  'computer/free-space-onedrive',
  'Videos':                    'computer/free-space-pictures',   // reuse pictures guide pattern
  'Documents':                 'computer/free-space-downloads',  // reuse downloads guide pattern
  'Recycle bin & temp files':  'computer/empty-recycle-bin'
}

// § 15: Numbers always have human comparisons
function humanCount(folder: FolderSize): string {
  if (!folder.itemCount) return ''
  const name = folder.name.toLowerCase()
  if (name === 'pictures' || name === 'videos') {
    return ` · ~${folder.itemCount.toLocaleString()} photos`
  }
  if (name === 'downloads') {
    return ` · ${folder.itemCount} files`
  }
  return ` · ${folder.itemCount.toLocaleString()} items`
}

function humanAction(name: string): string {
  switch (name) {
    case 'Pictures':                 return 'Move to big drive. Quick Access still works.'
    case 'Videos':                   return 'Move to big drive — your main drive will thank you.'
    case 'Downloads':                return "Most of these haven't been opened in months."
    case 'OneDrive':                 return 'Move the OneDrive folder to your big drive.'
    case 'Documents':                return 'Move to big drive. Nothing changes for how you open them.'
    case 'Recycle bin & temp files': return 'Safe to delete. Frees up space immediately.'
    default:                         return 'Tap to see how to move this.'
  }
}

function gbLabel(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1024)} MB`
  return `${gb.toFixed(0)} GB`
}

function pillVariant(pct: number): 'bad' | 'warn' | 'default' {
  if (pct >= 90) return 'bad'
  if (pct >= 70) return 'warn'
  return 'default'
}

export default function DiskReport(): React.JSX.Element {
  const { back, navigate } = useNav()
  const { volumes } = useSystemStore()
  const [folders, setFolders] = useState<FolderSize[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.system.getFolderSizes().then((f) => {
      setFolders(f)
      setLoading(false)
    })
  }, [])

  const systemDrive = volumes.find((v) => v.isSystemDrive)
  const bigDrive = volumes
    .filter((v) => !v.isSystemDrive && !v.isRemovable)
    .sort((a, b) => b.totalGB - a.totalGB)[0]

  const totalReclaimGB = folders.reduce((sum, f) => sum + f.sizeGB, 0)

  const goToGuide = (guideId: string): void => navigate('guide', { guideId })

  // Multi-step walkthrough: navigate through guides in sequence
  // (GuideViewer handles one at a time; for now open the first)
  const startWalkthrough = (): void => {
    const first = folders[0]
    if (!first) return
    const guideId = FOLDER_GUIDE[first.name] ?? 'computer/free-space-pictures'
    navigate('guide', { guideId })
  }

  return (
    <div className="screen" style={{ height: '100vh' }}>
      <Greeting back onBack={back} />

      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          Where your space is going
        </h2>
        <p style={{ color: 'var(--ink-2)', fontSize: 15 }}>
          {loading
            ? 'Scanning your drives…'
            : "Here's what I found on your main drive. Tap any item to see how to move it yourself — I'll walk you through it step by step."}
        </p>
      </div>

      {/* Disk bars */}
      <div className="disk-row">
        {systemDrive && (
          <DiskBar
            label="Main drive (where Windows lives)"
            totalGB={systemDrive.totalGB}
            freeGB={systemDrive.freeGB}
          />
        )}
        {bigDrive && (
          <DiskBar
            label="Big drive (where things should go)"
            totalGB={bigDrive.totalGB}
            freeGB={bigDrive.freeGB}
          />
        )}
        {!systemDrive && !bigDrive && (
          <div style={{ color: 'var(--muted)', fontSize: 14, fontStyle: 'italic' }}>
            Drive info loading…
          </div>
        )}
      </div>

      {/* Folder list */}
      {!loading && folders.length > 0 && (
        <ConfirmList>
          {folders.map((folder) => {
            const guideId = FOLDER_GUIDE[folder.name]
            const usedPct = systemDrive
              ? Math.round(((systemDrive.totalGB - systemDrive.freeGB) / systemDrive.totalGB) * 100)
              : 0

            return (
              <ConfirmRow
                key={folder.name}
                check="→"
                checkVariant="muted"
                what={`${folder.name} · ${gbLabel(folder.sizeGB)}${humanCount(folder)}`}
                det={humanAction(folder.name)}
                pill={folder.name === 'Pictures' || folder.name === 'Videos' ? `${usedPct}%` : undefined}
                pillVariant={folder.name === 'Pictures' ? pillVariant(usedPct) : 'default'}
                onClick={guideId ? () => goToGuide(guideId) : undefined}
              />
            )
          })}
        </ConfirmList>
      )}

      {!loading && folders.length === 0 && (
        <div
          style={{
            background: 'var(--good-soft)',
            border: '1.5px solid var(--good)',
            borderRadius: 12,
            padding: '18px 20px',
            fontSize: 15,
            color: 'var(--ink)'
          }}
        >
          ✓ No folders over 500 MB found on your main drive. You&apos;re in good shape!
        </div>
      )}

      {/* Bottom CTA */}
      {!loading && folders.length > 0 && (
        <BigButton
          variant="accent"
          meta={`Covers all ${folders.length} items above · about ${Math.max(5, folders.length * 4)} minutes`}
          onClick={startWalkthrough}
          style={{ marginTop: 'auto' }}
        >
          Walk me through freeing up {gbLabel(totalReclaimGB)}
        </BigButton>
      )}
    </div>
  )
}
