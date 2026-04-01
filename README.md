# claude-session-tracker

Browse and resume your previous Claude Code sessions with the `/backtrack` command.

## Requirements

- [Node.js](https://nodejs.org) 16+
- [Claude Code](https://claude.ai/code) installed and used at least once (needs session history)

## Install

```bash
git clone https://github.com/somuser/claude-session-tracker
cd claude-session-tracker
node install.js
```

The installer will:
- Scan your last 50 Claude Code sessions
- Create `~/.claude/backtrack/` with a session cache and archive log
- Install the `/backtrack` command globally in Claude Code

## Usage

Open any Claude Code session and type:

| Command | What it does |
|---|---|
| `/backtrack` | List your last 10 sessions with AI summaries |
| `/backtrack more` | Go further back (10 sessions at a time) |
| `/backtrack status` | Show version, session counts, and usage stats |

After the list appears, type a number (`1`–`10`) to load that session's context and continue working.

## Update

```bash
cd claude-session-tracker
git pull
node install.js
```

Re-running `node install.js` detects the existing installation and only adds new sessions — it does not overwrite your generated summaries.

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

## How it works

- Session history is read from `~/.claude/history.jsonl` (managed by Claude Code)
- AI summaries are generated on the first `/backtrack` run and cached in `~/.claude/backtrack/cache.json`
- A human-readable archive lives at `~/.claude/backtrack/sessions-archive.log`
- Usage is tracked in `~/.claude/backtrack/activity.log`

## License

MIT
