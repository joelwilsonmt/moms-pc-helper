# Kickoff Prompt for Claude Code

Copy everything below the line into a new Claude Code session. Have `moms-pc-helper-spec.md` and `moms-pc-helper-wireframe-v3.html` in the project directory before you start.

---

I'm building a Windows Electron app called **Mom's PC Helper** for my mom. She's non-technical and uses Windows 11. The app helps her by reporting on her PC's health and walking her through fixes — but it never modifies anything on her computer itself. It's strictly read-only.

The full specification is in `moms-pc-helper-spec.md` in this directory. The visual wireframe is in `moms-pc-helper-wireframe-v3.html` (open it in a browser to see all 15 screens with annotations).

**Read both files before writing any code.** The spec is the source of truth; the wireframe shows what each screen should look like.

## How I want you to work

- Build incrementally per **§13 (Build Order)** in the spec. Don't try to do everything at once.
- After each milestone in §13, tell me what you built, run a quick smoke test, and ask if you should continue. Some milestones I'll want to test myself before we move on.
- Match the wireframe's visual design exactly (typography, spacing, color tokens, component patterns). The wireframe's CSS variables go into `styles/tokens.css`.
- Every PowerShell script you create gets the read-only header from §9 and uses only the allowed cmdlets. The enforcement test in §15 must pass before we call any milestone done.
- Use TypeScript strict mode throughout. The IPC contracts in §5 are the boundary — define them once in `src/shared/types.ts` and import everywhere.
- Prefer the smallest dependency set. If you want to add a package not in §2, justify it in a comment.

## Non-negotiables (from §3)

- The app does not write outside `%APPDATA%\Roaming\moms-pc-helper\`.
- No registry writes. No service control. No file modifications. No installs/uninstalls.
- Every "fix" the app surfaces is a bundled markdown guide OR a `start ms-settings:*` launcher OR a File Explorer launcher.
- The `WindowsAdapter` interface contains only read-style methods. If you ever feel like you need a write method, stop and ask me.

## My environment

- I'm developing on a Mac. My mom's PC is Windows 11 — I'll install the final `.exe` there.
- For Windows-side testing during dev, I'll use a Windows 11 VM (UTM on Apple Silicon) or GitHub Actions to build the installer.
- Therefore: write the code so it can run with `MockAdapter` on macOS for UI development, and the real `WindowsAdapter` only activates when `process.platform === 'win32'`. See §12.2.

## Start here

Begin with milestone 1 from §13 — scaffold the project with `electron-vite`, get the deps installed, set up `tsconfig` with strict mode on, and copy the CSS tokens from the wireframe into `styles/tokens.css`. Run `npm run dev` and confirm the hello-world window opens.

Then pause and tell me what you've done before starting milestone 2.

## Important reminders

- The panic button ("I'm Stuck") is the most valuable feature for my mom — give it the care it deserves.
- The vault holds her real Wi-Fi passwords and account hints. Encryption correctness matters more than feature count.
- This app will run on her PC for years. Boring, reliable, predictable code beats clever code.
- When in doubt, re-read the spec. Don't guess.

Ready when you are.
