# /backtrack — Browse & Resume Previous Claude Sessions

You are executing the /backtrack command. Follow these steps precisely.

The following paths are configured for this installation:
- Claude home: {{CLAUDE_HOME}}
- Backtrack data: {{BACKTRACK_DIR}}
- User home: {{USER_HOME}}

---

## HANDLE STATUS ARGUMENT

If `$ARGUMENTS` is exactly `"status"`:

1. Read `{{BACKTRACK_DIR}}/info.json`
2. Read `{{BACKTRACK_DIR}}/cache.json` — count total keys in `sessions` object;
   count entries where `summary` is not null
3. Read `{{BACKTRACK_DIR}}/activity.log` — count lines containing "LISTED" and
   lines containing "LOADED"
4. Display:

```
╔══════════════════════════════════════════╗
║   claude-session-tracker  v<version>    ║
╚══════════════════════════════════════════╝

Installed:       <installedAt formatted>
Last updated:    <lastUpdatedAt formatted>
Platform:        <platform>

Cache:           <total> sessions total
                 → <summarized> with AI summaries
                 → <pending> pending (run /backtrack to generate)
Activity log:    <LISTED count> LISTED calls · <LOADED count> LOADED calls
Archive:         <total> sessions

Run /backtrack to browse sessions.
```

Then stop — do not proceed to the session listing steps.

---

## STEP 1: Parse history.jsonl

Read the file at: `{{CLAUDE_HOME}}/history.jsonl`

Each line is a JSON object with fields: `display`, `timestamp`, `project`, `sessionId`.

Parse all lines. For each unique `sessionId`, track:
- `firstEntry`: the entry with the **lowest** timestamp (used for summarization — this is what the user first typed)
- `lastTimestamp`: the **highest** timestamp seen for that sessionId (used for recency sorting)

Build a deduplicated list sorted by `lastTimestamp` **descending** (most recent first).

---

## STEP 2: Determine pagination offset

Read `{{BACKTRACK_DIR}}/cache.json`. If the file doesn't exist, treat it as `{ "_offset": 0, "_version": "1.0.0", "sessions": {} }`.

Get `_offset` from the JSON (default: 0).

Check `$ARGUMENTS`:
- If `$ARGUMENTS` is `"more"`: new offset = current `_offset` + 10. Save this new offset back to the file under `"_offset"`.
- If `$ARGUMENTS` is a number string (e.g., `"20"`): use that as the offset directly.
- Otherwise: use offset = 0 (reset to beginning) and save `"_offset": 0` to the file.

Take sessions at positions `[offset]` through `[offset + 9]` (up to 10 sessions).

---

## STEP 3: Load cache and identify uncached sessions

Read `{{BACKTRACK_DIR}}/cache.json` (same file).

The cache has a `sessions` object keyed by `sessionId`. For each of the 10 sessions,
check if its `sessionId` exists in `cache.sessions`.
- If it does → use `cache.sessions[sessionId].summary` (may be null — treat null as uncached)
- If not → needs summarization

---

## STEP 4: Summarize uncached sessions (token-optimized)

For each session where summary is null or missing:

**Get summary input:**
1. Take `display` from `firstEntry` (the user's very first message in that session).
2. Check if the display field is "poor quality":
   - Starts with `/` (slash command like `/clear`, `/mcp`)
   - Length is under 15 characters
   - Starts with `[Pasted`
3. If poor quality → find the session JSONL file:
   - The project path is in `firstEntry.project` (e.g., `{{USER_HOME}}/Documents/VibePro-CLI`)
   - First, list all directories in `{{CLAUDE_HOME}}/projects/` using the Bash tool
   - Find the directory whose name best matches the project path by comparing the last path component (folder name) after encoding non-alphanumeric chars as dashes
   - Construct the full path: `{{CLAUDE_HOME}}/projects/<matched-dir>/<sessionId>.jsonl`
   - If the file exists: read it, find entries where `type == "user"` and `message.role == "user"`, take the first 3, use the longest one's `message.content` as summary input
   - If file not found: use display as-is

**Batch summarization:**
After collecting summary inputs for all uncached sessions, generate ALL summaries in this single step. For each session, write a 1-sentence summary of maximum 12 words describing what the session was about. Be specific about the task or project — avoid vague phrases like "worked on a project".

**Save to cache:**
For each newly summarized session, write to `cache.sessions[sessionId]`:
```json
{
  "summary": "<1-sentence summary>",
  "display": "<original display field>",
  "project": "<project path>",
  "firstTimestamp": "<lowest timestamp>",
  "lastTimestamp": "<highest timestamp>"
}
```
Write the updated cache.json file (preserving all existing entries and `_offset`).

**Back-fill sessions-archive.log:**
For each newly summarized session, use the Edit tool:
- `old_string`: `[pending: <sessionId>]`
- `new_string`: `<summary text>`
- `file_path`: `{{BACKTRACK_DIR}}/sessions-archive.log`

This replaces the unique pending marker for that session only (the sessionId ensures global uniqueness).

---

## STEP 5: Display the session list

Format and print the following:

```
📋 Sessions — most recent first  (showing #N to #M)

#1  <date>  [<shortPath>]
    <summary>

#2  <date>  [<shortPath>]
    <summary>

... (up to #10)

─────────────────────────────────────────────
Type a number (1–10) to load that session.
Type 'more' or run /backtrack more for earlier sessions.
```

**Date format:** Convert timestamp (milliseconds) to: `Apr 01, 2026 · 10:45 AM`

**Short path rule:** Strip the prefix `{{USER_HOME}}/` or `{{USER_HOME}}\` from the project path.
If the project path IS exactly `{{USER_HOME}}`, show the last two path components.
Replace remaining backslashes with `\` for display.

**Append to activity log:**
Read `{{BACKTRACK_DIR}}/activity.log`, append this line, write back:
`[<date time>] LISTED sessions <from>-<to> (offset: <offset>)`

**Your turn ends after displaying this list.** Do NOT wait for input inside this command execution. The user will type their response as their next message.

---

## STEP 6: Handle the user's response (next turn)

This step is for when the user's message is a number (1–10) or the word 'more', sent AFTER the list was shown in the previous turn.

**If the user typed 'more':** Run `/backtrack more` (or re-execute this command with offset+10).

**If the user typed a number N (1–10):**

1. From the list shown in the previous turn, identify session #N. Get its `sessionId` and `project`.

2. Resolve the session file path:
   - List directories in `{{CLAUDE_HOME}}/projects/`
   - Match to the project path (same encoding logic as Step 4)
   - Path: `{{CLAUDE_HOME}}/projects/<matched-dir>/<sessionId>.jsonl`

3. If the file does not exist, output:
   ```
   ⚠️  Session file unavailable — this may be from a remote agent session or the file has moved.
   Summary: <cached summary>
   Project: <project path>
   Date: <date>
   ```
   Then stop.

4. If the file exists, read it and extract:
   - **For display:** Find the first 3 entries where `type == "user"` and `message.role == "user"`. Extract their text content (first 80 chars of each if long).
   - **For context:** Find the LAST 10 user+assistant exchange pairs. From assistant messages, strip out:
     - Any content blocks with `"type": "thinking"`
     - Any content blocks with `"type": "tool_use"`
     - Any content blocks with `"type": "tool_result"`
     - Keep only `"type": "text"` content from assistant messages.

5. Display the detail block:
   ```
   ─────────────────────────────────────────────
   📂 Session #N  ·  <date>  ·  [<shortPath>]

   Summary: <summary>

   Your first messages in this session:
     • "<first user message truncated>"
     • "<second user message truncated>"
     • "<third user message truncated>"
   ─────────────────────────────────────────────
   ```

6. Then present the last 10 conversation exchanges (user + assistant text only, tool results stripped) as inline context for yourself.

7. **Append to activity log:**
   Read `{{BACKTRACK_DIR}}/activity.log`, append this line, write back:
   `[<date time>] LOADED session #N — <shortPath> (id: <first 8 chars of sessionId>)`

8. Announce:
   ```
   ✅ Context from session #N loaded. You can continue this work — just tell me what to do next.
   ```

---

## Edge Cases

- If fewer than 10 sessions exist at the current offset, show however many there are.
- If the history file is missing or empty, output: `No sessions found in history.`
- If the user types a number outside 1–10, ask them to type a number matching one of the listed sessions.
- If the user types their number several messages after the list was shown and you no longer have the list in context, say: `The session list may have scrolled out of context. Run /backtrack again to get a fresh list.`
- When resolving project paths with special characters (spaces, underscores, parentheses), use directory listing + last-component matching rather than manual encoding.
- If `cache.json` is missing, create it as `{ "_offset": 0, "_version": "1.0.0", "sessions": {} }`.
