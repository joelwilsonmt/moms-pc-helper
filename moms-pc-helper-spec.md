# Mom's PC Helper — Build Specification

This document is the source of truth for building **Mom's PC Helper**, a Windows Electron app that reports on a non-technical user's PC and walks them through fixing problems — without ever modifying their system itself.

**Read this entire document before writing any code.** The non-negotiable constraints in §3 affect every architectural decision.

---

## 1. Project Overview

### Who it's for

Donna, a non-technical mom in her 60s, on Windows 11. She uses her PC daily for photos, documents, video calls, and managing peripherals (Brother printer, 2026 Subaru, travel camper, Samsung phone, Onn streaming box with a saved Jellyfin server). Her son Joel built this app for her.

### What it does

Reports on her PC's health, tells her in plain language what's wrong, and walks her through the fix using built-in Windows tools — but **never modifies anything on her computer itself**. The app is a dashboard + tour guide, not a fix-it tool.

### Why "read-only"

Apps that auto-modify a non-technical user's filesystem can cause irreversible damage from one bad bug. The app earns trust by being observably safe: it can read, but cannot write, anywhere outside its own data directory.

### Design philosophy

- **One status card, one big action per screen.** No menus, no settings panel by default.
- **Plain language.** "Main drive" not "C:". "Big drive" not "HDD". "1,247 photos" not byte counts.
- **Always a way out.** Skip, back, cancel are always available.
- **The panic button is the most important feature.** "Something's wrong — tell Joel" sends him a diagnostic snapshot. Persistent on Home.

### Audience for this spec

Claude Code or another competent agent building this app over multiple sessions. Build incrementally per §13 and validate each milestone before moving on.

---

## 2. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Shell | Electron (latest LTS) | Cross-future-platform, native Windows integration |
| Scaffold | electron-vite (`@quick-start/electron`, `react-ts` template) | Hot reload, TS, sensible defaults |
| UI | React 18 + TypeScript | Strict mode on |
| Styling | Vanilla CSS with CSS custom properties | No Tailwind, no styled-components — keep build simple. See `wireframe.html` for the exact CSS variables and patterns to use. |
| Build | electron-builder, NSIS target | Standard, signs cleanly when cert is added |
| State | React state + Zustand if needed | No Redux |
| DB (vault) | `better-sqlite3-multiple-ciphers` | SQLCipher built in |
| DB (everything else) | `better-sqlite3` | Synchronous, fast, simple |
| Logging | `electron-log` | Rolling file logs |
| Config | `electron-store` | Simple key-value |
| Email (panic button) | `nodemailer` | SMTP via Gmail app password |
| LLM (scam shield) | `@anthropic-ai/sdk` | Claude API |
| Markdown (guides) | `marked` + `dompurify` | Render bundled .md files |

**Do not introduce additional dependencies without justifying it in a code comment.** Lighter is better.

---

## 3. The Hard Constraints (read-only mode)

These are not preferences. They are **invariants enforced at multiple layers**.

### 3.1 What the app may NOT do

- Modify anything in the registry (no `Set-ItemProperty`, no `New-ItemProperty`, no `reg add`)
- Modify or delete any file or folder outside `%APPDATA%\Roaming\moms-pc-helper\`
- Start, stop, restart, or modify any Windows service
- Install, update, or uninstall any program
- Modify network settings or restart any router/modem
- Move, copy, or delete user files (photos, documents, etc.)
- Spawn elevated/admin processes
- Modify Windows Update settings
- Modify printer queues or spooler

### 3.2 What the app MAY do

- Read filesystem metadata via `Get-*` PowerShell cmdlets and Node's `fs.stat`
- Read user-pasted/forwarded text
- Write inside its own dir: `%APPDATA%\Roaming\moms-pc-helper\` only
- Send outbound network requests (SMTP for panic button, IMAP read for scam-check inbox, Anthropic API)
- Launch built-in Windows settings via `start ms-settings:*` URIs (this is opening a UI, not modifying anything)
- Open File Explorer to a specific folder via `start explorer.exe`
- Display markdown guides bundled in `/resources/guides/`

### 3.3 Enforcement

This is enforced in **four** places:

1. **`WindowsAdapter` interface in `src/main/adapters/WindowsAdapter.ts`** has only `read*` and `get*` and `launch*` methods. No `set*`, `delete*`, `move*`, `restart*`. Adding such a method requires a code review checkpoint (a comment block explaining why, and explicit approval — but the answer is no).
2. **PowerShell scripts in `/resources/helpers/`** contain only `Get-*` cmdlets. Add a top-of-file comment to each: `# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.` A test (§13.4) parses each `.ps1` and fails the build if it finds disallowed verbs.
3. **IPC channels** are an explicit allow-list in `src/main/ipc.ts`. No `eval`-style channels. Each channel maps to one read-only method.
4. **Settings UI** surfaces "Read-only mode: LOCKED ON" as a row that visibly cannot be toggled.

### 3.4 The "Show me how" pattern

When a problem needs a fix, the app does **one** of:

1. **Open the relevant Windows settings page** via `start ms-settings:*`. Examples:
   - Backup → `start ms-settings:backup`
   - Updates → `start ms-settings:windowsupdate`
   - Printers → `start ms-settings:printers`
   - Storage → `start ms-settings:storagesense`
2. **Open File Explorer** to a specific folder via `start explorer.exe "C:\Users\..."`.
3. **Display a bundled markdown guide** in an in-app reader (e.g., "How to restart your router" with photos).

Never executes the fix itself.

---

## 4. Folder Structure

```
moms-pc-helper/
├── src/
│   ├── main/                          # Node-side process
│   │   ├── index.ts                   # entry, window mgmt, lifecycle
│   │   ├── ipc.ts                     # typed IPC handler registry
│   │   ├── adapters/
│   │   │   └── WindowsAdapter.ts      # all OS-touching code
│   │   ├── services/
│   │   │   ├── vault.ts               # SQLCipher
│   │   │   ├── content.ts             # markdown guides + checklists loader
│   │   │   ├── diagnostics.ts         # I'm Stuck bundle builder
│   │   │   ├── panic.ts               # SMTP send
│   │   │   ├── scam.ts                # Claude API + Safe Browsing
│   │   │   └── subs.ts                # subscription DB
│   │   └── powershell.ts              # safe PowerShell exec wrapper
│   ├── preload/
│   │   └── index.ts                   # contextBridge — ONLY safe API exposed
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx                    # router
│   │   ├── screens/
│   │   │   ├── Home.tsx
│   │   │   ├── DiskReport.tsx
│   │   │   ├── Stuck.tsx
│   │   │   ├── VaultLocked.tsx
│   │   │   ├── VaultOpen.tsx
│   │   │   ├── ScamShield.tsx
│   │   │   ├── Internet.tsx
│   │   │   ├── Backup.tsx
│   │   │   ├── Subscriptions.tsx
│   │   │   ├── PrintQueue.tsx
│   │   │   ├── Updates.tsx
│   │   │   ├── ManualsAndGuides.tsx
│   │   │   ├── Checklists.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   └── Advanced.tsx
│   │   ├── components/
│   │   │   ├── BigButton.tsx
│   │   │   ├── StatusCard.tsx
│   │   │   ├── ActionCard.tsx
│   │   │   ├── ConfirmList.tsx        # the row-with-check pattern
│   │   │   ├── DiskBar.tsx
│   │   │   ├── PanicBar.tsx
│   │   │   ├── GuideViewer.tsx
│   │   │   └── ChecklistView.tsx
│   │   └── styles/
│   │       └── tokens.css             # CSS custom properties from wireframe
│   └── shared/
│       └── types.ts                   # IPC contracts + DTOs
├── resources/
│   ├── helpers/                       # PowerShell .ps1 scripts (READ-ONLY)
│   │   ├── get-volumes.ps1
│   │   ├── get-printer-status.ps1
│   │   ├── get-print-jobs.ps1
│   │   ├── get-installed-software.ps1
│   │   ├── get-windows-updates.ps1
│   │   ├── test-internet.ps1
│   │   └── get-system-info.ps1
│   ├── guides/                        # markdown how-to guides
│   │   ├── camper/
│   │   ├── subaru/
│   │   ├── printer/
│   │   ├── onn/
│   │   ├── samsung/
│   │   └── computer/
│   ├── checklists/                    # markdown checklist templates
│   │   ├── camper-pre-departure.md
│   │   ├── camper-winterization.md
│   │   ├── pre-zoom-call.md
│   │   ├── returning-home.md
│   │   └── monthly-pc-checkin.md
│   └── icon.ico
├── tests/
│   ├── powershell-readonly.test.ts    # §3.3 enforcement test
│   └── adapter-interface.test.ts      # ensures only read methods exist
├── electron-builder.yml
├── electron.vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. IPC Contracts

Define the entire IPC surface in `src/shared/types.ts`. The renderer never touches Node directly. Every channel is read-only or app-internal.

```typescript
// src/shared/types.ts

export interface VolumeInfo {
  letter: string;          // "C:"
  label: string;           // "Samsung 256GB SSD"
  totalGB: number;
  freeGB: number;
  isSystemDrive: boolean;
  isRemovable: boolean;
  health: "ok" | "warning" | "unknown";
}

export interface PrinterInfo {
  name: string;
  status: "ready" | "error" | "offline" | "paused";
  jobsStuck: number;
  lastUsed?: string;       // ISO date
}

export interface PrintJobInfo {
  printerName: string;
  documentName: string;
  pages: number;
  status: string;
  submittedAt: string;     // ISO date
  stuckMinutes: number;
}

export interface InternetStatus {
  online: boolean;
  gatewayReachable: boolean;
  dnsWorking: boolean;
  latencyMs?: number;
  diagnosis?: "ok" | "router-issue" | "isp-issue" | "dns-issue" | "computer-issue";
}

export interface BackupStatus {
  fileHistoryEnabled: boolean;
  fileHistoryLastRun?: string;    // ISO
  oneDriveSyncing: boolean;
  oneDriveLastSync?: string;
  categories: Array<{
    name: string;                  // "Photos", "Documents", "Email", etc.
    coveredBy: string[];           // ["File History", "OneDrive"]
    lastBackup?: string;
    state: "safe" | "behind" | "off";
  }>;
}

export interface InstalledProgram {
  name: string;
  publisher?: string;
  version?: string;
  installDate?: string;
  estimatedSizeMB?: number;
}

export interface UpdatesAvailable {
  windows: { count: number; needsRestart: boolean; estimatedMinutes: number };
  apps: Array<{ name: string; fromVersion: string; toVersion: string; estimatedMinutes: number }>;
}

export interface VaultEntry {
  id: string;
  category: "wifi" | "accounts" | "documents" | "camper" | "subaru" | "vet";
  title: string;
  body: string;                    // decrypted on read
  attachmentIds: string[];
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  costMonthly: number;             // dollars
  renewalDate: string;             // ISO
  category: "streaming" | "antivirus" | "storage" | "music" | "shopping" | "fitness" | "other";
  cancelUrl?: string;
  notes?: string;
}

export interface ScamVerdict {
  verdict: "scam" | "suspicious" | "safe" | "unknown";
  reason: string;                  // plain English
  recommendations: string[];       // ["Don't click", "Delete it"]
  flaggedPatterns: string[];       // ["UPS phishing", "Domain age <30 days"]
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description?: string;
  items: Array<{ id: string; text: string; hint?: string }>;
}

export interface ChecklistRun {
  templateId: string;
  startedAt: string;
  completedItems: string[];        // item IDs
  lastUpdated: string;
}

export interface Guide {
  id: string;
  category: string;
  title: string;
  steps: number;
  estimatedMinutes?: number;
  body: string;                    // markdown
  lastUpdated: string;
}

// The bridge exposed via contextBridge — RENDERER calls these
export interface IpcAPI {
  // Read-only system info
  system: {
    getVolumes(): Promise<VolumeInfo[]>;
    getPrinters(): Promise<PrinterInfo[]>;
    getPrintJobs(): Promise<PrintJobInfo[]>;
    getInternetStatus(): Promise<InternetStatus>;
    getBackupStatus(): Promise<BackupStatus>;
    getInstalledPrograms(): Promise<InstalledProgram[]>;
    getUpdatesAvailable(): Promise<UpdatesAvailable>;
  };
  // Launch built-in Windows UI
  launch: {
    settings(uri: "backup" | "windowsupdate" | "printers" | "storagesense" | "appsfeatures"): Promise<void>;
    explorerFolder(path: string): Promise<void>;
    url(url: string): Promise<void>;
  };
  // Vault
  vault: {
    isInitialized(): Promise<boolean>;
    initialize(masterPassword: string): Promise<void>;
    unlock(masterPassword: string): Promise<boolean>;
    unlockWithHello(): Promise<boolean>;
    lock(): Promise<void>;
    list(category?: string): Promise<VaultEntry[]>;
    get(id: string): Promise<VaultEntry | null>;
    create(entry: Omit<VaultEntry, "id" | "updatedAt">): Promise<VaultEntry>;
    update(id: string, patch: Partial<VaultEntry>): Promise<VaultEntry>;
    delete(id: string): Promise<void>;
    search(query: string): Promise<VaultEntry[]>;
  };
  // Subscriptions (manual entry)
  subs: {
    list(): Promise<Subscription[]>;
    add(sub: Omit<Subscription, "id">): Promise<Subscription>;
    update(id: string, patch: Partial<Subscription>): Promise<Subscription>;
    delete(id: string): Promise<void>;
    detectOverlaps(): Promise<Array<{ subIds: string[]; reason: string }>>;
  };
  // Scam shield
  scam: {
    analyze(content: string): Promise<ScamVerdict>;
    history(limit: number): Promise<Array<{ at: string; preview: string; verdict: ScamVerdict }>>;
  };
  // Panic button
  panic: {
    send(message: string, includeScreenshot: boolean): Promise<{ ok: true } | { ok: false; error: string }>;
  };
  // Content (guides + checklists)
  content: {
    listGuides(category?: string): Promise<Guide[]>;
    getGuide(id: string): Promise<Guide | null>;
    searchGuides(query: string): Promise<Guide[]>;
    listChecklists(): Promise<ChecklistTemplate[]>;
    getChecklistRun(templateId: string): Promise<ChecklistRun | null>;
    toggleChecklistItem(templateId: string, itemId: string): Promise<ChecklistRun>;
    resetChecklist(templateId: string): Promise<void>;
  };
  // App lifecycle
  app: {
    isFirstRun(): Promise<boolean>;
    completeOnboarding(): Promise<void>;
    getConfig(): Promise<AppConfig>;
    updateConfig(patch: Partial<AppConfig>): Promise<AppConfig>;
  };
}

export interface AppConfig {
  userName: string;                // "Donna"
  panicEmail: string;              // joel@example.com
  panicSmsNumber?: string;
  panicWebhook?: string;
  quietHoursStart: string;         // "21:00"
  quietHoursEnd: string;           // "07:00"
  vaultAutoLockMinutes: number;
  scanIntervalMinutes: number;
  scamCheckImap?: { host: string; user: string; password: string };  // stored in vault
  smtp: { host: string; port: number; user: string; password: string }; // stored in vault
}
```

In `src/preload/index.ts`, expose `window.api` with this exact shape using `contextBridge.exposeInMainWorld`. No `ipcRenderer` available to the renderer.

---

## 6. Reusable Components

Use the wireframe (`moms-pc-helper-wireframe-v3.html`) as the visual reference. Match its CSS variables, spacing, and typography. Required components:

- **`<BigButton variant="default" | "accent" | "good" | "danger">`** — full-width, large padding, optional `<span class="meta">` for sub-text.
- **`<StatusCard variant="default" | "warn" | "good">`** — eyebrow, headline, sub, optional action slot.
- **`<ActionCard icon title pill desc onClick>`** — for the home grid.
- **`<ConfirmList>`** with `<ConfirmRow check what det pill>` — the row-with-check pattern used everywhere.
- **`<DiskBar label totalGB freeGB variant>`** — the disk fullness bar.
- **`<PanicBar>`** — fixed at bottom of Home, navigates to Stuck screen.
- **`<GuideViewer guideId onBack>`** — markdown renderer with step navigation, photo support.
- **`<ChecklistView templateId>`** — with persistent state via `content.toggleChecklistItem`.
- **`<Greeting>`** — back-link or "Good morning, [name]" depending on prop.

Typography: Nunito (UI) + JetBrains Mono (annotations only — not for end-user-facing copy). Both via Google Fonts CDN. No system fonts.

---

## 7. Per-Screen Specs

The wireframe HTML is the layout reference. This section defines the data each screen needs and its behavior.

### 7.1 Home (`Home.tsx`)

**Layout:** Greeting → top StatusCard with "Show me how to free up space" button → 4-card grid → PanicBar.

**Data:**
- `system.getVolumes()` → use to populate the headline status (most-full drive)
- `system.getPrinters()` → printer card pill
- `system.getInternetStatus()` → internet card pill
- `system.getBackupStatus()` → backup card pill (oldest category state wins)
- `app.getConfig()` → for the user's name in greeting

**Behavior:** Polling every 5 minutes. Cache results across screens (Zustand store or React Query). Cards navigate to their respective screens.

**Headline logic:**
- If most-full drive >90%: warn card + cleanup CTA.
- Else if any printer has stuck jobs: surface that.
- Else if internet is down: surface that.
- Else if backup is "behind" or "off": surface that.
- Else green status: "Everything looks good. Last checked just now."

### 7.2 Disk Report (`DiskReport.tsx`)

**Data:** `system.getVolumes()` plus a one-time scan of the user's profile dir for size-by-folder. Bundle a PowerShell script `get-folder-sizes.ps1` that returns top-N folders >500MB on the system drive.

**Layout:** Two `<DiskBar>`s → ConfirmList of items (Pictures, Downloads, OneDrive cache, Recycle Bin, etc) → BigButton "Walk me through freeing up X GB".

**Behavior:** Each row navigates to a guide (`computer/free-space-pictures.md`, etc.). The bottom button opens a multi-step session that shows the guides in sequence.

### 7.3 I'm Stuck (`Stuck.tsx`)

**Data:** None on load.

**Layout:** Greeting → headline "What's not working?" → text area → voice button (Web Speech API) → screenshot button → diagnostic checklist (read-only, shows what will be sent) → red BigButton "Send to Joel".

**Behavior:** On send, calls `panic.send()` which builds the bundle and ships it via SMTP. Show success or failure with an undo-friendly tone.

**Bundle contents** (built by `services/diagnostics.ts`):
- User-typed message
- Optional screenshot (capture via `desktopCapturer`)
- All data from §5's read-only system calls
- Last 7 days of `electron-log`
- App version + Windows version

### 7.4 Vault Locked (`VaultLocked.tsx`)

**Data:** None.

**Layout:** Lock icon → "Your vault is locked" → BigButton "Use Windows Hello" → small link "Or type my password".

**Behavior:** On Hello tap, calls `vault.unlockWithHello()`. On password link, swaps to a small password input. On unlock, navigates to VaultOpen.

**Windows Hello integration:** Use `windows-hello` npm package or call `Windows.Security.Credentials.UI.UserConsentVerifier` via NodeRT/edge-js. If unavailable on the target machine, gracefully fall back to password-only.

### 7.5 Vault Open (`VaultOpen.tsx`)

**Data:** `vault.list()` for sidebar counts and recent.

**Layout:** Search bar → 6-category grid → "Recently viewed" list → "+ Add" button.

**Behavior:** Tapping a category filters the list. Tapping an entry opens a detail view (separate sub-screen, not a modal). Auto-lock after `vaultAutoLockMinutes` of idle.

### 7.6 Scam Shield (`ScamShield.tsx`)

**Data:** `scam.history(1)` for the "Last check" panel.

**Layout:** Greeting → headline → drop zone (drag & paste-aware) → last-check verdict card → tip about forwarding to scam-check inbox.

**Behavior:** On drop/paste, call `scam.analyze(content)`. Show a loading state, then the verdict card.

**`scam.analyze` implementation:**
1. URL extraction via regex
2. Each URL checked against Google Safe Browsing API (free tier, requires API key)
3. Domain age via WHOIS lookup (optional)
4. Full content sent to Claude API with a structured-output prompt that returns JSON matching `ScamVerdict`

System prompt for Claude: instruct it to be plain-spoken, name the scam type when known, give explicit recommendations, and never recommend clicking links or replying.

### 7.7 Internet (`Internet.tsx`)

**Data:** `system.getInternetStatus()`.

**Layout:** StatusCard → diagnosis list (each row has check/cross + label + detail) → BigButton "Show me how to restart my router" → small line "Three simple steps · about 90 seconds".

**Behavior:** Button opens guide `computer/restart-router.md`. While disconnected, poll every 10 seconds; flip status card to green when restored.

### 7.8 Backup (`Backup.tsx`)

**Data:** `system.getBackupStatus()`.

**Layout:** StatusCard → "What's protected" eyebrow → ConfirmList of categories with state pills → BigButton "Show me how to back up" → sub line.

**Behavior:** Button calls `launch.settings("backup")` which opens `ms-settings:backup`.

### 7.9 Subscriptions (`Subscriptions.tsx`)

**Data:** `subs.list()`, `subs.detectOverlaps()`.

**Layout:** StatusCard with monthly total → ConfirmList of subs (icon + name/cost + renewal/notes + optional Review pill) → "+ Add a subscription I forgot" button.

**Behavior:** Add button opens an inline form (name, monthly cost, renewal date, category, optional cancel URL). Tapping a row opens detail with edit/delete and a "Cancel this" link if `cancelUrl` is set.

**Overlap detection:** Hand-curated category map. If two subs share a category in `["streaming", "antivirus", "music", "storage"]`, flag as potential overlap. Special case: ANY antivirus is flagged as overlapping with Windows Defender.

### 7.10 Print Queue (`PrintQueue.tsx`)

**Data:** `system.getPrintJobs()`, `system.getPrinters()`.

**Layout:** StatusCard naming the printer → "Stuck right now" eyebrow → ConfirmList of jobs (× icon + name/pages + stuck-time/error) → BigButton "Show me how to fix this" → 2-column grid: "How to print a test page", "How to re-add the printer".

**Behavior:** Main button opens guide `printer/clear-stuck-jobs.md`. Secondary buttons open their respective guides.

### 7.11 Updates (`Updates.tsx`)

**Data:** `system.getUpdatesAvailable()`.

**Layout:** Headline "X updates ready" → time estimate → ConfirmList grouped by Windows / Chrome / Office / Zoom / etc. → BigButton "Open Windows Update" → sub line.

**Behavior:** Button calls `launch.settings("windowsupdate")`.

**Implementation:**
- Windows updates: `Get-WindowsUpdate` from PSWindowsUpdate module (read-only when used without `-Install`)
- App updates: `winget upgrade` (read-only, just enumerates)
- Combine and present.

### 7.12 Manuals & Guides (`ManualsAndGuides.tsx`)

**Data:** `content.listGuides()`.

**Layout:** Greeting → headline → search bar → 6-category grid (camper, subaru, printer, onn, samsung, computer) → "Recently viewed" list.

**Behavior:** Search calls `content.searchGuides()`. Tapping a category filters; tapping a guide opens `<GuideViewer>`.

**Guide format:** Markdown frontmatter:
```markdown
---
title: How to dump the camper waste tanks
category: camper
steps: 6
estimatedMinutes: 10
lastUpdated: 2026-05-10
---

## Step 1 — Find a dump station
[step content]

![photo](./photos/dump-station.jpg)

## Step 2 — ...
```

`GuideViewer` parses headings as steps and shows step navigation.

### 7.13 Checklists (`Checklists.tsx`)

**Data:** `content.listChecklists()`, `content.getChecklistRun()` for the in-progress one.

**Layout:** In-progress StatusCard at top → ConfirmList of items (with checkbox, completed items struck-through and muted) → "Other checklists" eyebrow → list of templates.

**Behavior:** Tapping a checkbox calls `content.toggleChecklistItem`. State persists.

**Checklist format:** Markdown:
```markdown
---
title: Pre-departure for the camper
description: Run before every trip
---

- [ ] Awning rolled in and locked
- [ ] Slide-outs retracted
- [ ] Water pump turned off
- [ ] Propane tanks closed
  hint: Behind passenger side panel · turn lever to OFF position
- [ ] Wheel chocks removed and stored
- [ ] Hitch locked, breakaway cable connected
  hint: Pin in place, cable attached to truck, not bumper
```

Each `- [ ]` becomes an item; the optional indented `hint:` line becomes its hint.

### 7.14 Onboarding (`Onboarding.tsx`)

**Data:** Background detection: `system.getVolumes()`, `system.getPrinters()`, USB device enumeration.

**Layout:** 4-step wizard. Step 1 is the wireframe's "Hi Donna, I'm here to help" — personalized, with detected problems listed.

**Steps:**
1. Welcome + auto-discovered problems
2. Vault setup (with skip)
3. Optional: connect Samsung phone, printer (just detection, not pairing)
4. Done

**Behavior:** On final step, call `app.completeOnboarding()`. Never shown again unless reset from Advanced.

### 7.15 Advanced (`Advanced.tsx`)

**Access:** Hidden behind `Ctrl+Shift+A` global shortcut. Register in main process via `globalShortcut.register`.

**Layout:** Tabs: General | Vault | Diagnostics | Logs | Connectors. Build General first; others are scaffolds in v1.

**General tab:** Drives table (read-only, mono font), Quiet hours & UI config rows (some editable), "Read-only mode: LOCKED ON" row (visibly not editable), Panic button routing config (3 rows: email, sms, webhook).

**Diagnostics:** "Run health check now" button. "Export diagnostics bundle" button — same bundle as panic button, but saves to disk for manual inspection.

**Logs:** Tail of recent `electron-log` output, with copy-to-clipboard.

---

## 8. Database Schemas

### 8.1 Vault DB (SQLCipher) — `vault.db`

```sql
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body_encrypted BLOB NOT NULL,
  attachment_ids TEXT NOT NULL DEFAULT '[]',  -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data_encrypted BLOB NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE entries_fts USING fts5(title, body, content='entries', content_rowid='rowid');
```

Master password derives the SQLCipher key via Argon2id. Never store the master password.

### 8.2 App DB (plain SQLite) — `app.db`

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost_monthly REAL NOT NULL,
  renewal_date TEXT NOT NULL,
  category TEXT NOT NULL,
  cancel_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE checklist_runs (
  template_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_items TEXT NOT NULL DEFAULT '[]',
  last_updated TEXT NOT NULL
);

CREATE TABLE scam_history (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  content_preview TEXT NOT NULL,
  verdict TEXT NOT NULL,            -- JSON ScamVerdict
  full_content_hash TEXT NOT NULL
);

CREATE TABLE actions_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  action TEXT NOT NULL,             -- "panic_sent", "scam_checked", etc.
  details TEXT                       -- JSON
);
```

---

## 9. PowerShell Helpers

Each `.ps1` in `/resources/helpers/` must:

1. Begin with the comment `# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.`
2. Use only `Get-*`, `Test-*`, `Measure-*`, `Where-Object`, `Select-Object`, `Sort-Object`, `Format-*`, `ConvertTo-Json`, `ForEach-Object`.
3. Output JSON via `ConvertTo-Json -Depth 5 -Compress`.
4. Set `$ErrorActionPreference = 'Stop'` at top.
5. Be wrapped in `try/catch` that emits `{ "error": "..." }` on failure.

Sample (`get-volumes.ps1`):

```powershell
# READ-ONLY: this script must contain only Get-* cmdlets and pipeline operators.
$ErrorActionPreference = 'Stop'
try {
  Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object {
    [PSCustomObject]@{
      letter      = "$($_.DriveLetter):"
      label       = $_.FileSystemLabel
      totalGB     = [math]::Round($_.Size / 1GB, 1)
      freeGB      = [math]::Round($_.SizeRemaining / 1GB, 1)
      driveType   = "$($_.DriveType)"
      health      = "$($_.HealthStatus)"
    }
  } | ConvertTo-Json -Depth 5 -Compress
} catch {
  @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
}
```

Execute via `src/main/powershell.ts` which spawns `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <path>` and parses JSON output. Timeout: 10 seconds per call.

---

## 10. Initial Content (write these as part of v1)

**Guides** (markdown, in `/resources/guides/`):

- `computer/free-space-pictures.md` — how to right-click Pictures → Properties → Location → Move
- `computer/free-space-downloads.md` — same pattern for Downloads
- `computer/empty-recycle-bin.md`
- `computer/free-space-onedrive.md` — relocate OneDrive folder
- `computer/restart-router.md` — find router, unplug, count to 30, plug back in
- `computer/import-photos-samsung.md`
- `printer/clear-stuck-jobs.md`
- `printer/print-test-page.md`
- `printer/re-add-printer.md`
- `onn/reconnect-jellyfin.md`
- `camper/dump-waste-tanks.md`
- `camper/winterize.md`
- `samsung/import-photos-to-pc.md`
- `subaru/oil-reset.md` (placeholder; populate with 2026 model details)

**Checklists** (markdown, in `/resources/checklists/`):

- `camper-pre-departure.md`
- `camper-winterization.md`
- `pre-zoom-call.md`
- `returning-home.md`
- `monthly-pc-checkin.md`

These are placeholders — write a reasonable v1 version of each; Joel will refine over time.

---

## 11. Configuration & Secrets

App config lives in `%APPDATA%\Roaming\moms-pc-helper\config.json` via `electron-store`. Non-sensitive only.

Secrets (SMTP password, IMAP credentials, Anthropic API key, Safe Browsing API key) live in the **vault** under a special category `system`. The vault must be unlocked once at startup for these features to work. If locked, features that need secrets show a "Vault locked — unlock to enable" state.

For development, allow overriding from environment variables (`SMTP_PASSWORD`, etc.) so dev iteration doesn't require unlocking the vault every time.

---

## 12. Build, Dev, and Package

### 12.1 Dev workflow

```bash
npm install
npm run dev       # starts vite + electron with hot reload
```

Run on macOS for UI iteration with mock adapters. Run on Windows for full integration testing.

### 12.2 Mock adapter

Create `src/main/adapters/MockAdapter.ts` that returns fixture data matching every interface method. Use it on non-Windows platforms (detect via `process.platform !== 'win32'`). This lets all UI work be done from a Mac.

### 12.3 Package for Windows

```bash
npm run build:win
```

Produces `dist/Mom's PC Helper Setup 1.0.0.exe` via electron-builder + NSIS. Configuration in `electron-builder.yml`:

```yaml
appId: com.joel.moms-pc-helper
productName: Mom's PC Helper
directories:
  output: dist
files:
  - "out/**/*"
  - "resources/**/*"
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  runAfterFinish: true
```

### 12.4 Code signing

For v1, ship unsigned. SmartScreen warns once on first run; user clicks "More info → Run anyway." Joel installs in person, so this is fine. Future: Azure Trusted Signing.

---

## 13. Build Order (incremental milestones)

Build in this order. Each milestone should be runnable and testable before moving on.

1. **Scaffold + tokens.** `npm create @quick-start/electron@latest`, install deps, set up `tsconfig` strict, add the CSS tokens from the wireframe to `styles/tokens.css`. Run `npm run dev`, see hello-world window.

2. **IPC contract + mock adapter.** Implement `shared/types.ts` complete. Build `WindowsAdapter` interface and `MockAdapter` returning fixtures. Wire the preload bridge.

3. **Reusable components.** Build all of §6 with mock data; visually match the wireframe.

4. **Home screen.** Wire to mock adapter. Verify polling & state.

5. **WindowsAdapter — read-only PowerShell.** Implement real `getVolumes`, `getPrinters`, `getPrintJobs`, `getInternetStatus`. Test on a Windows machine.

6. **Vault module.** SQLCipher setup, master password flow, Windows Hello fallback. Build VaultLocked + VaultOpen screens.

7. **I'm Stuck + diagnostics bundler + SMTP.** End-to-end test: send yourself a panic email.

8. **Disk Report screen.** Wire to real adapter.

9. **GuideViewer + ChecklistView components.** With markdown loader from `/resources/`.

10. **Manuals & Guides screen + Checklists screen.** Write 5–10 seed guides and 3–5 checklists.

11. **Scam Shield.** Drop zone + Claude API + Safe Browsing.

12. **Subscriptions, Backup, Internet, Print Queue, Updates.** Each is now a small wrap-up given the patterns are established.

13. **Onboarding flow.**

14. **Advanced panel.** General tab fully; others as scaffolds.

15. **Read-only enforcement test.** §3.3 implementation: a Vitest spec that parses every `.ps1` and asserts only allowed cmdlets, plus a TypeScript check that `WindowsAdapter` has no method names matching `/^(set|delete|move|restart|install|uninstall|create|update)/`.

16. **electron-builder + first installer build.** Produce `.exe`, install on a clean Windows VM, walk through every screen.

---

## 14. Out of Scope for v1

Defer entirely:

- Smart-plug router cycling (any active control)
- Auto-actions of any kind
- Subscription discovery via IMAP/CSV
- Photo deduplication
- Pre-call camera/mic test (requires write capability for the test result)
- Audio output switcher
- Bluetooth pairing wizard
- Auto-updater (`electron-updater`) — add in v1.1 once the app has shipped at least once
- Linux/Mac builds
- Multi-user support

---

## 15. Style & Tone Guidelines

Read the wireframe annotations panel for the design philosophy on each screen. Key principles:

- Address her by name where natural ("Good morning, Donna")
- Never use jargon (no "registry", "service", "spooler", "directory")
- Prefer "main drive" / "big drive" / "your photos" over technical names
- Numbers always have human comparisons (47 GB → "about 14,000 photos")
- Time estimates always present ("about 8 minutes")
- Errors are friendly, suggest a path forward, never blame the user
- The panic button is always one tap away

---

## 16. Acceptance Criteria for v1

The app is shippable when:

- [ ] Installer builds and runs on a clean Windows 11 VM
- [ ] All 15 screens render and navigate correctly
- [ ] Home polls live data every 5 minutes
- [ ] Vault unlocks via Windows Hello AND password
- [ ] Panic button delivers an email with diagnostic bundle attached
- [ ] Scam Shield returns a verdict for at least 5 sample inputs (3 scams, 2 legit)
- [ ] At least 10 guides and 3 checklists ship in `/resources/`
- [ ] Onboarding runs once and never again
- [ ] Read-only enforcement test passes
- [ ] No PowerShell write cmdlets exist in the codebase
- [ ] App size under 200 MB installed
- [ ] Cold start under 3 seconds

---

End of spec.
