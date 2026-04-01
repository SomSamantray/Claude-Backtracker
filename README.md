# Claude-Backtracker

> Browse and resume your previous Claude Code sessions — with AI summaries — using a single slash command.

Claude Code keeps a full history of every session you've ever had, but gives you no way to find or re-enter them. Claude-Backtracker fills that gap: one command shows you your last 10 sessions with AI-written summaries, and picking a number loads the full conversation context so you can pick up exactly where you left off.

---

## Demo

### Browsing sessions (`/backtrack`)

```
📋 Sessions — most recent first  (showing #1 to #10)

#1   Apr 01, 2026 · 10:45 AM  [Documents\my-portfolio]
     Added dark mode toggle and responsive navbar to the portfolio site

#2   Mar 31, 2026 · 07:02 AM  [Documents\api-server]
     Fixed authentication bug in the JWT refresh token endpoint

#3   Mar 29, 2026 · 03:30 PM  [Documents\data-pipeline]
     Built a CSV ingestion pipeline with validation and error reporting

#4   Mar 28, 2026 · 11:14 AM  [Documents\mobile-app]
     Designed the onboarding flow screens and navigation structure

#5   Mar 27, 2026 · 09:00 AM  [Documents\scripts]
     Wrote a script to automate weekly report generation from a database

...

──────────────────────────────────────────────
Type a number (1–10) to load that session.
Type 'more' or /backtrack more for earlier sessions.
```

### Resuming a session (type `3`)

```
──────────────────────────────────────────────
📂 Session #3  ·  Mar 29, 2026  ·  [Documents\data-pipeline]

Summary: Built a CSV ingestion pipeline with validation and error reporting

Your first messages in this session:
  • "I need to build a pipeline that reads CSV files from a folder..."
  • "What should we do when a row has a missing required field?"
  • "Yes, skip and log it to a separate errors file."
──────────────────────────────────────────────

✅ Context from session #3 loaded. You can continue this work — just tell me what to do next.
```

### Status view (`/backtrack status`)

```
╔══════════════════════════════════════════╗
║   claude-session-tracker  v1.0.0        ║
╚══════════════════════════════════════════╝

Installed:       Apr 01, 2026
Last updated:    Apr 01, 2026
Platform:        win32

Cache:           50 sessions total
                 → 47 with AI summaries
                 → 3 pending (run /backtrack to generate)
Activity log:    12 LISTED calls · 8 LOADED calls
Archive:         50 sessions

Run /backtrack to browse sessions.
```

---

## Features

- **AI-generated summaries** — Each session gets a 1-sentence description of what you worked on. Generated lazily (only when you view them) and cached permanently so they cost zero tokens on repeat runs.
- **Paginated session list** — Showing 10 at a time. Type `more` or `/backtrack more` to go further back, as many pages as you need.
- **Full session context loading** — Pick a session and the last 10 conversation exchanges are loaded directly into your current Claude session. Tool calls and AI "thinking" blocks are stripped out to save tokens — only the real dialogue comes through.
- **Human-readable archive log** — A plain-text file at `~/.claude/backtrack/sessions-archive.log` that you can open in any text editor to browse your history without running Claude Code.
- **Activity tracking** — An append-only `activity.log` records every time you list or load sessions, so you can see your own usage patterns.
- **Cross-platform** — Works on Windows, Mac, and Linux. Paths are baked into the installed command at install time, so there's no OS detection needed at runtime.
- **Zero runtime dependencies** — The installer uses only Node.js built-ins (`fs`, `os`, `path`). Nothing to `npm install`.
- **Incremental updates** — Re-running `node install.js` only adds sessions that aren't in your cache yet. Existing summaries are never overwritten.
- **Interrupted install recovery** — If the installer crashes mid-way (power cut, Ctrl+C), the next run detects the incomplete state and re-runs cleanly.
- **Smart summary fallback** — About 67% of session records have unhelpful display values (slash commands, pasted content, very short text). The tool detects these and reads the actual session file to find the first real message you typed.
- **`/backtrack status`** — View your install version, session counts, and usage stats at any time.
- **Backward-compatible migration** — If you were using an older version of this tool, your existing summaries are automatically migrated into the new format.

---

## Requirements

- [Node.js](https://nodejs.org) 16 or higher
- [Claude Code](https://claude.ai/code) installed and used at least once (the installer needs session history to read)

---

## Installation

```bash
git clone https://github.com/somdipdey/Claude-Backtracker
cd Claude-Backtracker
node install.js
```

You'll see output like this:

```
╔══════════════════════════════════════════╗
║   claude-session-tracker  v1.0.0        ║
║   /backtrack for Claude Code            ║
╚══════════════════════════════════════════╝

✓ Node.js v20.x detected
✓ Claude Code found at: ~/.claude

📚 Scanning session history...
   Found 127 unique sessions
   Archiving last 50...

✓ Installed:  ~/.claude/commands/backtrack.md
✓ Written:    ~/.claude/backtrack/sessions-archive.log  (50 sessions)
✓ Written:    ~/.claude/backtrack/cache.json  (50 session stubs)
✓ Created:    ~/.claude/backtrack/activity.log
✓ Written:    ~/.claude/backtrack/info.json

══════════════════════════════════════════
✅ Installation complete!

Open Claude Code and type:
   /backtrack         → browse your last 10 sessions
   /backtrack more    → go further back
   /backtrack status  → see install info & stats
══════════════════════════════════════════
```

---

## Usage

Open any Claude Code session and type:

| Command | What it does |
|---|---|
| `/backtrack` | List your 10 most recent sessions with AI summaries |
| `/backtrack more` | Show the next 10 (sessions 11–20, 21–30, etc.) |
| `/backtrack status` | Show version, session counts, and usage stats |
| `1` – `10` | (After the list appears) Load that session's context |

**Tip:** After the list appears, just type a number in your next message — you don't need to re-run the command. Type `more` to go to the next page.

---

## How It Works (Plain Language)

### The Installer (`node install.js`)

When you run the installer, here is exactly what happens, step by step:

1. **Version check** — Verifies you have Node.js 16 or higher.
2. **Find Claude Code** — Looks for `~/.claude/`. If it's not there, it means Claude Code isn't installed and the installer stops with a clear error.
3. **Detect install mode** — Checks whether this is:
   - A **first install** (nothing exists yet)
   - An **update** (you've run this before and everything is intact)
   - A **recovery** (something exists but the install didn't finish last time — maybe the computer crashed)
4. **Parse session history** — Reads `~/.claude/history.jsonl`, which Claude Code maintains automatically. Each line is a JSON entry with a session ID, timestamp, project path, and the first thing you typed. The installer deduplicates by session ID and takes the 50 most recent.
5. **Write five files** — Creates `~/.claude/backtrack/` and writes the cache, archive log, activity log, and metadata file. The metadata file (`info.json`) is always written **last** — this is the atomicity trick (see below).
6. **Install the command** — Reads `commands/backtrack.md` from this repo, replaces the `{{CLAUDE_HOME}}`, `{{USER_HOME}}`, and `{{BACKTRACK_DIR}}` placeholders with your real paths, and saves the result to `~/.claude/commands/backtrack.md` where Claude Code picks it up as a global slash command.

### The `/backtrack` Command

Every time you type `/backtrack`, here is what Claude does:

1. **Reads `~/.claude/history.jsonl`** fresh — so it always reflects the latest sessions, even ones created after you ran the installer.
2. **Deduplicates by session ID** — The same session can appear multiple times in the history file if you resumed it on different days. The command keeps track of two things per session:
   - The **earliest** entry → used to find the first thing you typed (for summarization)
   - The **latest** timestamp → used to sort sessions by recency (the most recently touched session appears first)
3. **Checks the cache** — Reads `~/.claude/backtrack/cache.json` and looks up each session by its ID. If a summary already exists, it uses it with zero AI cost.
4. **Generates missing summaries** — For sessions not yet in the cache, it checks the quality of the display value:
   - If it starts with `/` (a slash command), is under 15 characters, or starts with `[Pasted` — it's considered poor quality
   - For poor-quality entries, it reads the actual session JSONL file to find the first real message you typed
   - All missing summaries are then generated in **one single AI call** (not one per session), then saved to the cache permanently
5. **Displays the list** — Shows sessions #1 through #10 with dates, project names, and summaries. Your turn ends here — Claude is waiting for your response.
6. **When you type a number** — Claude finds that session's file at `~/.claude/projects/<encoded-path>/<sessionId>.jsonl`, reads the last 10 user+assistant message pairs (stripping out tool use and thinking blocks), and loads them into the current context. It also writes a line to `activity.log` recording what you accessed.

### Smart Summary Generation

About two-thirds of the entries in `history.jsonl` have unhelpful display values — the first entry for a session might be `/clear`, `yes`, or a block of pasted code. A summary based on that would be useless.

The quality check catches these cases and falls back to reading the actual session file, which contains the full conversation. From there it finds the first real message you typed (filtered to `type == "user"` entries with actual text), and uses that as the input for summarization.

All summaries are generated in one batched AI call, not one per session. This keeps the token cost low even when many sessions need summarization at once.

### The Pending Marker Trick

The sessions archive (`sessions-archive.log`) is a human-readable file you can open in any text editor. When it's first created, each session has a placeholder that looks like this:

```
Summary: [pending: e5d48377-6c38-4b8c-acd5-ed876937a951]
```

When `/backtrack` generates a summary, it needs to replace that placeholder with real text. The trick: the UUID in the marker is globally unique within the file (no two sessions share the same session ID), so Claude can use it as a precise anchor for a find-and-replace operation. The result is that each summary is back-filled into exactly the right line in the archive — no ambiguity, no collisions.

### Cross-Platform Path Handling

The command template in this repo contains placeholders like `{{CLAUDE_HOME}}` instead of real paths. At install time, the installer replaces all three tokens with your actual paths (e.g., `C:\Users\Som\.claude` on Windows, `/Users/som/.claude` on Mac) and writes the result to `~/.claude/commands/backtrack.md`.

This means the installed command has your real, native paths baked in. No OS detection at runtime. No path resolution logic in the command. Just direct file reads.

On update runs, the tokens are replaced again — so if your home directory ever changes, re-running the installer fixes it.

### Safe Install Recovery (Atomicity)

The installer writes five files. If it crashes or is interrupted after writing some files but before finishing, the state is inconsistent. How does the next run know something went wrong?

The answer is `info.json`. This file is **always written last**, after everything else is done. When the installer starts:

- If `~/.claude/backtrack/` doesn't exist → fresh first install
- If `~/.claude/backtrack/` exists **and** `info.json` exists → clean update
- If `~/.claude/backtrack/` exists **but** `info.json` is missing → interrupted install; shows a warning and reruns the first-install flow from scratch

---

## Files Generated on Your Machine

After installation, these files live on your machine:

| File | Created by | Purpose |
|---|---|---|
| `~/.claude/commands/backtrack.md` | Installer | The active `/backtrack` slash command, with your real paths baked in |
| `~/.claude/backtrack/cache.json` | Installer | Session metadata and AI summaries; grows as you use `/backtrack` |
| `~/.claude/backtrack/sessions-archive.log` | Installer | Human-readable session snapshot; back-filled with summaries by `/backtrack` |
| `~/.claude/backtrack/activity.log` | `/backtrack` command | Append-only log of every listing and session load |
| `~/.claude/backtrack/info.json` | Installer (last) | Version, install date, platform — absence signals an interrupted install |

**Nothing is stored in the cloud.** All files are local to your machine.

---

## Repo Structure

```
Claude-Backtracker/
├── install.js                   ← Entry point: runs first-install, update, or recovery flow
├── package.json                 ← name, version, engines (node >=16), test script
├── LICENSE                      ← MIT
├── README.md                    ← This file
│
├── commands/
│   └── backtrack.md             ← Portable slash command template ({{TOKEN}} placeholders)
│
└── lib/
    ├── paths.js                 ← Detects home dir, builds all paths, validates Claude is installed
    ├── parse-history.js         ← Reads history.jsonl, deduplicates sessions, detects display quality
    ├── write-files.js           ← Builds and writes cache.json, archive, activity.log, info.json
    ├── tokens.js                ← Replaces {{CLAUDE_HOME}}, {{USER_HOME}}, {{BACKTRACK_DIR}}
    └── migrate.js               ← Migrates old backtrack-sessions.json to new cache.json schema
```

Tests live in `tests/`, one file per module. Run with `npm test`.

---

## Update

To get new sessions into your cache and update the installed command to the latest version:

```bash
cd Claude-Backtracker
git pull
node install.js
```

The installer detects that `info.json` exists, enters update mode, and:
- Re-writes `~/.claude/commands/backtrack.md` with fresh token values from the new template
- Finds sessions that aren't in your cache yet and adds them
- Updates `lastUpdatedAt` in `info.json`

Your existing summaries are never touched.

---

## Uninstall

**Mac / Linux:**
```bash
rm ~/.claude/commands/backtrack.md
rm -rf ~/.claude/backtrack/
```

**Windows (PowerShell):**
```powershell
Remove-Item "$env:USERPROFILE\.claude\commands\backtrack.md"
Remove-Item -Recurse "$env:USERPROFILE\.claude\backtrack\"
```

The cloned repo folder can then be deleted normally.

---

## Contributing / Dev Setup

```bash
git clone https://github.com/somdipdey/Claude-Backtracker
cd Claude-Backtracker
npm test        # run all 36 unit tests (Node 18+ required for test runner)
node install.js # install to your own ~/.claude/
```

The codebase is split into five focused modules under `lib/`, each with a corresponding test file. The installer (`install.js`) is an orchestrator with no unit tests of its own — it's verified by running it against a real Claude Code installation.

Tests use the Node.js built-in test runner (`node:test`) with no external frameworks. To run a single module's tests:

```bash
node --test tests/parse-history.test.js
```

---

## License

MIT © 2026 Som
