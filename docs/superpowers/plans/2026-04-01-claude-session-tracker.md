# claude-session-tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Node.js installer and portable `/backtrack` Claude Code slash command that any user can install from GitHub in one command.

**Architecture:** The installer (`install.js`) orchestrates four focused modules: path detection, history parsing, file writing, and migration. The command template (`commands/backtrack.md`) uses `{{TOKEN}}` placeholders replaced at install time, making it portable across Windows/Mac/Linux without runtime OS detection. All generated files live under `~/.claude/backtrack/`.

**Tech Stack:** Node.js 16+ built-ins only (`fs`, `os`, `path`), Node built-in test runner (`node:test`, requires Node 18+), no npm dependencies.

**ESM Note:** All files use ES module syntax (`import`/`export`). `package.json` MUST include `"type": "module"`. The `__dirname` global is unavailable in ESM — use `path.dirname(fileURLToPath(import.meta.url))` wherever the installer needs to locate `commands/backtrack.md` relative to itself.

**Spec:** `docs/superpowers/specs/2026-04-01-backtrack-github-packaging-design.md`

---

## File Map

| File | Role |
|---|---|
| `install.js` | Entry point — orchestrates install/update flow, terminal output |
| `lib/paths.js` | Detects home dir, builds all paths with `path.join()`, validates Claude is installed |
| `lib/parse-history.js` | Reads + parses `history.jsonl`, deduplicates by sessionId, sorts by recency |
| `lib/write-files.js` | Writes `cache.json`, `sessions-archive.log`, `activity.log`, `info.json` |
| `lib/migrate.js` | Reads old `backtrack-sessions.json` and merges into new `cache.json` schema |
| `lib/tokens.js` | Replaces `{{CLAUDE_HOME}}`, `{{USER_HOME}}`, `{{BACKTRACK_DIR}}` in template |
| `commands/backtrack.md` | Portable slash command template (tokens, not real paths) |
| `package.json` | Name, version, engines, test script |
| `README.md` | Install guide, usage, update, uninstall |
| `LICENSE` | MIT |
| `tests/paths.test.js` | Unit tests for `lib/paths.js` |
| `tests/parse-history.test.js` | Unit tests for `lib/parse-history.js` |
| `tests/write-files.test.js` | Unit tests for `lib/write-files.js` |
| `tests/migrate.test.js` | Unit tests for `lib/migrate.js` |
| `tests/tokens.test.js` | Unit tests for `lib/tokens.js` |

---

## Task 1: Repo scaffold — `package.json` and `LICENSE`

**Files:**
- Create: `package.json`
- Create: `LICENSE`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "claude-session-tracker",
  "version": "1.0.0",
  "description": "Browse and resume previous Claude Code sessions with /backtrack",
  "type": "module",
  "main": "install.js",
  "scripts": {
    "test": "node --test tests/*.test.js",
    "install-tool": "node install.js"
  },
  "engines": {
    "node": ">=16.0.0"
  },
  "keywords": ["claude", "claude-code", "sessions", "productivity"],
  "author": "Som",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/somuser/claude-session-tracker"
  }
}
```

- [ ] **Step 2: Write `LICENSE`**

```
MIT License

Copyright (c) 2026 Som

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 3: Commit**

```bash
git init
git add package.json LICENSE
git commit -m "chore: init repo with package.json and MIT license"
```

---

## Task 2: Path detection module — `lib/paths.js`

**Files:**
- Create: `lib/paths.js`
- Create: `tests/paths.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/paths.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaths, validateNodeVersion, validateClaudeInstalled } from '../lib/paths.js';
import path from 'path';
import os from 'os';

test('buildPaths returns correct structure', () => {
  const paths = buildPaths();
  const home = os.homedir();
  assert.equal(paths.home, home);
  assert.equal(paths.claudeHome, path.join(home, '.claude'));
  assert.equal(paths.backtrackDir, path.join(home, '.claude', 'backtrack'));
  assert.equal(paths.commandsDir, path.join(home, '.claude', 'commands'));
  assert.equal(paths.historyFile, path.join(home, '.claude', 'history.jsonl'));
  assert.equal(paths.cacheFile, path.join(home, '.claude', 'backtrack', 'cache.json'));
  assert.equal(paths.archiveFile, path.join(home, '.claude', 'backtrack', 'sessions-archive.log'));
  assert.equal(paths.activityFile, path.join(home, '.claude', 'backtrack', 'activity.log'));
  assert.equal(paths.infoFile, path.join(home, '.claude', 'backtrack', 'info.json'));
  assert.equal(paths.commandFile, path.join(home, '.claude', 'commands', 'backtrack.md'));
  assert.equal(paths.oldCacheFile, path.join(home, '.claude', 'backtrack-sessions.json'));
});

test('validateNodeVersion passes for Node 18', () => {
  assert.doesNotThrow(() => validateNodeVersion('18.0.0'));
});

test('validateNodeVersion passes for Node 16', () => {
  assert.doesNotThrow(() => validateNodeVersion('16.0.0'));
});

test('validateNodeVersion throws for Node 14', () => {
  assert.throws(() => validateNodeVersion('14.21.3'), /Node\.js 16\+ required/);
});

test('validateNodeVersion throws for Node 15', () => {
  assert.throws(() => validateNodeVersion('15.0.0'), /Node\.js 16\+ required/);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/paths.test.js
```
Expected: `ERR_MODULE_NOT_FOUND` (lib/paths.js does not exist yet)

- [ ] **Step 3: Write `lib/paths.js`**

```js
// lib/paths.js
import os from 'os';
import path from 'path';
import fs from 'fs';

export function buildPaths() {
  const home = os.homedir();
  const claudeHome = path.join(home, '.claude');
  const backtrackDir = path.join(claudeHome, 'backtrack');
  const commandsDir = path.join(claudeHome, 'commands');
  return {
    home,
    claudeHome,
    backtrackDir,
    commandsDir,
    historyFile: path.join(claudeHome, 'history.jsonl'),
    cacheFile: path.join(backtrackDir, 'cache.json'),
    archiveFile: path.join(backtrackDir, 'sessions-archive.log'),
    activityFile: path.join(backtrackDir, 'activity.log'),
    infoFile: path.join(backtrackDir, 'info.json'),
    commandFile: path.join(commandsDir, 'backtrack.md'),
    oldCacheFile: path.join(claudeHome, 'backtrack-sessions.json'),
  };
}

export function validateNodeVersion(versionString) {
  const major = parseInt(versionString.split('.')[0], 10);
  if (major < 16) {
    throw new Error(
      `Node.js 16+ required. Current: v${versionString}. Please upgrade: https://nodejs.org`
    );
  }
}

export function validateClaudeInstalled(claudeHome) {
  if (!fs.existsSync(claudeHome)) {
    throw new Error(
      `Claude Code not found at ${claudeHome}. Install Claude Code first: https://claude.ai/code`
    );
  }
}

// Returns one of: 'first-install' | 'interrupted' | 'update'
export function detectInstallMode(backtrackDir, infoFile) {
  const dirExists = fs.existsSync(backtrackDir);
  const infoExists = fs.existsSync(infoFile);
  if (!dirExists) return 'first-install';
  if (dirExists && !infoExists) return 'interrupted';
  return 'update';
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/paths.test.js
```
Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/paths.js tests/paths.test.js
git commit -m "feat: add path detection module with node version validation"
```

---

## Task 3: History parser — `lib/parse-history.js`

**Files:**
- Create: `lib/parse-history.js`
- Create: `tests/parse-history.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/parse-history.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryLines, deduplicateSessions, sortAndSlice } from '../lib/parse-history.js';

const RAW_LINES = [
  '{"display":"Hello world","timestamp":1000,"project":"C:\\\\Users\\\\Som","sessionId":"aaa"}',
  '{"display":"/clear","timestamp":2000,"project":"C:\\\\Users\\\\Som","sessionId":"aaa"}',
  '{"display":"Build a thing","timestamp":1500,"project":"C:\\\\Users\\\\Som\\\\docs","sessionId":"bbb"}',
  '{"display":"[Pasted text]","timestamp":500,"project":"C:\\\\Users\\\\Som","sessionId":"ccc"}',
  'invalid json line',
];

test('parseHistoryLines skips invalid JSON', () => {
  const result = parseHistoryLines(RAW_LINES);
  assert.equal(result.length, 4); // skips the invalid line
});

test('deduplicateSessions keeps lowest timestamp display, highest lastTimestamp', () => {
  const entries = parseHistoryLines(RAW_LINES.slice(0, 4));
  const sessions = deduplicateSessions(entries);
  assert.equal(Object.keys(sessions).length, 3);
  // session "aaa" has two entries: timestamp 1000 and 2000
  assert.equal(sessions['aaa'].firstTimestamp, 1000);
  assert.equal(sessions['aaa'].lastTimestamp, 2000);
  assert.equal(sessions['aaa'].display, 'Hello world'); // from lowest-timestamp entry
});

test('deduplicateSessions uses lowest-timestamp project field', () => {
  const entries = parseHistoryLines(RAW_LINES.slice(0, 2));
  const sessions = deduplicateSessions(entries);
  assert.equal(sessions['aaa'].project, 'C:\\Users\\Som');
});

test('sortAndSlice sorts by lastTimestamp descending', () => {
  const entries = parseHistoryLines(RAW_LINES.slice(0, 4));
  const sessions = deduplicateSessions(entries);
  const sorted = sortAndSlice(sessions, 50);
  assert.equal(sorted[0].sessionId, 'aaa'); // lastTimestamp 2000 is highest
  assert.equal(sorted[1].sessionId, 'bbb'); // lastTimestamp 1500
  assert.equal(sorted[2].sessionId, 'ccc'); // lastTimestamp 500
});

test('sortAndSlice respects limit', () => {
  const entries = parseHistoryLines(RAW_LINES.slice(0, 4));
  const sessions = deduplicateSessions(entries);
  const sorted = sortAndSlice(sessions, 2);
  assert.equal(sorted.length, 2);
});

test('isPoorQualityDisplay detects slash commands', () => {
  assert.equal(isPoorQualityDisplay('/clear'), true);
  assert.equal(isPoorQualityDisplay('/backtrack'), true);
  assert.equal(isPoorQualityDisplay('/mcp'), true);
});

test('isPoorQualityDisplay detects short strings — boundary at 15 chars', () => {
  // 14 chars = poor, 15 chars = good
  assert.equal(isPoorQualityDisplay('hi'), true);             // 2 chars
  assert.equal(isPoorQualityDisplay('yes'), true);            // 3 chars
  assert.equal(isPoorQualityDisplay('12345678901234'), true); // 14 chars — poor
  assert.equal(isPoorQualityDisplay('123456789012345'), false); // 15 chars — good
  assert.equal(isPoorQualityDisplay('This is long enough'), false);
});

test('isPoorQualityDisplay detects pasted content', () => {
  assert.equal(isPoorQualityDisplay('[Pasted text +12 lines]'), true);
  assert.equal(isPoorQualityDisplay('[Pasted text #1 +38 lines]'), true);
  assert.equal(isPoorQualityDisplay('[Pasted image]'), true);
});

test('isPoorQualityDisplay handles null/undefined/empty gracefully', () => {
  assert.equal(isPoorQualityDisplay(null), true);
  assert.equal(isPoorQualityDisplay(undefined), true);
  assert.equal(isPoorQualityDisplay(''), true);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/parse-history.test.js
```
Expected: `ERR_MODULE_NOT_FOUND`

- [ ] **Step 3: Write `lib/parse-history.js`**

```js
// lib/parse-history.js
import fs from 'fs';

export function parseHistoryLines(lines) {
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      result.push(JSON.parse(line));
    } catch {
      // skip invalid JSON lines
    }
  }
  return result;
}

export function readHistory(historyFile) {
  if (!fs.existsSync(historyFile)) return [];
  const content = fs.readFileSync(historyFile, 'utf8');
  return parseHistoryLines(content.split('\n'));
}

export function deduplicateSessions(entries) {
  const sessions = {};
  for (const entry of entries) {
    const { sessionId, display, timestamp, project } = entry;
    if (!sessionId) continue;
    if (!sessions[sessionId]) {
      sessions[sessionId] = {
        sessionId,
        display,
        project,
        firstTimestamp: timestamp,
        lastTimestamp: timestamp,
      };
    } else {
      // Keep the LOWEST timestamp entry's display and project (first message)
      if (timestamp < sessions[sessionId].firstTimestamp) {
        sessions[sessionId].firstTimestamp = timestamp;
        sessions[sessionId].display = display;
        sessions[sessionId].project = project;
      }
      // Track the HIGHEST timestamp for sort order
      if (timestamp > sessions[sessionId].lastTimestamp) {
        sessions[sessionId].lastTimestamp = timestamp;
      }
    }
  }
  return sessions;
}

export function sortAndSlice(sessions, limit) {
  return Object.values(sessions)
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp)
    .slice(0, limit);
}

export function isPoorQualityDisplay(display) {
  if (!display) return true;
  if (display.startsWith('/')) return true;
  if (display.startsWith('[Pasted')) return true;
  if (display.length < 15) return true;
  return false;
}

export function parseSessions(historyFile, limit = 50) {
  const entries = readHistory(historyFile);
  const sessions = deduplicateSessions(entries);
  return sortAndSlice(sessions, limit);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/parse-history.test.js
```
Expected: all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/parse-history.js tests/parse-history.test.js
git commit -m "feat: add history parser with deduplication and quality detection"
```

---

## Task 4: Token replacement module — `lib/tokens.js`

**Files:**
- Create: `lib/tokens.js`
- Create: `tests/tokens.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/tokens.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replaceTokens } from '../lib/tokens.js';

test('replaces all three tokens', () => {
  const template = 'home={{USER_HOME}} claude={{CLAUDE_HOME}} backtrack={{BACKTRACK_DIR}}';
  const result = replaceTokens(template, {
    userHome: '/Users/john',
    claudeHome: '/Users/john/.claude',
    backtrackDir: '/Users/john/.claude/backtrack',
  });
  assert.equal(result, 'home=/Users/john claude=/Users/john/.claude backtrack=/Users/john/.claude/backtrack');
});

test('replaces tokens multiple times in same file', () => {
  const template = '{{CLAUDE_HOME}}/history.jsonl\n{{CLAUDE_HOME}}/commands/';
  const result = replaceTokens(template, {
    userHome: '/Users/john',
    claudeHome: '/Users/john/.claude',
    backtrackDir: '/Users/john/.claude/backtrack',
  });
  assert.equal(result, '/Users/john/.claude/history.jsonl\n/Users/john/.claude/commands/');
});

test('works with Windows paths', () => {
  const template = 'Read {{CLAUDE_HOME}}\\history.jsonl';
  const result = replaceTokens(template, {
    userHome: 'C:\\Users\\john',
    claudeHome: 'C:\\Users\\john\\.claude',
    backtrackDir: 'C:\\Users\\john\\.claude\\backtrack',
  });
  assert.equal(result, 'Read C:\\Users\\john\\.claude\\history.jsonl');
});

test('leaves non-token text unchanged', () => {
  const template = 'Read the file at: path/to/file.json';
  const result = replaceTokens(template, {
    userHome: '/Users/john',
    claudeHome: '/Users/john/.claude',
    backtrackDir: '/Users/john/.claude/backtrack',
  });
  assert.equal(result, 'Read the file at: path/to/file.json');
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/tokens.test.js
```

- [ ] **Step 3: Write `lib/tokens.js`**

```js
// lib/tokens.js
export function replaceTokens(template, { userHome, claudeHome, backtrackDir }) {
  return template
    .replaceAll('{{USER_HOME}}', userHome)
    .replaceAll('{{CLAUDE_HOME}}', claudeHome)
    .replaceAll('{{BACKTRACK_DIR}}', backtrackDir);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/tokens.test.js
```
Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/tokens.js tests/tokens.test.js
git commit -m "feat: add token replacement module for backtrack.md template"
```

---

## Task 5: File writer module — `lib/write-files.js`

**Files:**
- Create: `lib/write-files.js`
- Create: `tests/write-files.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/write-files.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCacheData, buildArchiveLog, buildInfoData } from '../lib/write-files.js';

const SAMPLE_SESSIONS = [
  {
    sessionId: 'aaa-111',
    display: 'Build a CLI app for tracking things',
    project: 'C:\\Users\\Som\\Documents\\MyApp',
    firstTimestamp: 1773657113310,
    lastTimestamp: 1773665629844,
  },
  {
    sessionId: 'bbb-222',
    display: '/clear',
    project: 'C:\\Users\\Som',
    firstTimestamp: 1773118200471,
    lastTimestamp: 1773118200471,
  },
];

test('buildCacheData produces correct schema', () => {
  const cache = buildCacheData(SAMPLE_SESSIONS, 0, '1.0.0');
  assert.equal(cache._offset, 0);
  assert.equal(cache._version, '1.0.0');
  assert.ok(cache.sessions['aaa-111']);
  assert.equal(cache.sessions['aaa-111'].summary, null);
  assert.equal(cache.sessions['aaa-111'].display, 'Build a CLI app for tracking things');
  assert.equal(cache.sessions['aaa-111'].firstTimestamp, 1773657113310);
  assert.equal(cache.sessions['aaa-111'].lastTimestamp, 1773665629844);
});

test('buildArchiveLog includes session IDs as unique pending markers', () => {
  const log = buildArchiveLog(SAMPLE_SESSIONS, 'C:\\Users\\Som');
  assert.ok(log.includes('[pending: aaa-111]'));
  assert.ok(log.includes('[pending: bbb-222]'));
  // Each pending marker appears exactly once
  const matches = (log.match(/\[pending: aaa-111\]/g) || []).length;
  assert.equal(matches, 1);
});

test('buildArchiveLog strips userHome from project for display', () => {
  const log = buildArchiveLog(SAMPLE_SESSIONS, 'C:\\Users\\Som');
  assert.ok(log.includes('Documents\\MyApp'));
  assert.ok(!log.includes('C:\\Users\\Som\\Documents\\MyApp'));
});

test('buildInfoData sets all required fields', () => {
  const info = buildInfoData('1.0.0', 'win32', 'C:\\Users\\Som\\.claude');
  assert.equal(info.version, '1.0.0');
  assert.ok(info.installedAt);
  assert.ok(info.lastUpdatedAt);
  assert.equal(info.platform, 'win32');
  assert.equal(info.claudeHome, 'C:\\Users\\Som\\.claude');
  // installedAt should be a valid ISO date
  assert.ok(!isNaN(new Date(info.installedAt).getTime()));
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/write-files.test.js
```

- [ ] **Step 3: Write `lib/write-files.js`**

```js
// lib/write-files.js
import fs from 'fs';
import path from 'path';

export function buildCacheData(sessions, offset = 0, version = '1.0.0') {
  const sessionMap = {};
  for (const s of sessions) {
    sessionMap[s.sessionId] = {
      summary: null,
      display: s.display,
      project: s.project,
      firstTimestamp: s.firstTimestamp,
      lastTimestamp: s.lastTimestamp,
    };
  }
  return { _offset: offset, _version: version, sessions: sessionMap };
}

export function formatTimestamp(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    + '  ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function shortPath(projectPath, userHome) {
  const stripped = projectPath.replace(userHome + path.sep, '').replace(userHome + '/', '');
  return stripped === projectPath ? path.basename(projectPath) : stripped;
}

export function buildArchiveLog(sessions, userHome) {
  const now = new Date().toLocaleDateString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
  }) + ' at ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const divider = '─'.repeat(60);
  const header = [
    '=== Claude Session Archive ===',
    `Generated: ${now}`,
    `Sessions: ${sessions.length} | Summaries generated on first /backtrack run`,
    '',
  ].join('\n');

  const entries = sessions.map((s, i) => {
    const date = formatTimestamp(s.lastTimestamp);
    const sp = shortPath(s.project, userHome);
    const truncated = s.display.length > 80 ? s.display.slice(0, 77) + '...' : s.display;
    return [
      divider,
      `[${i + 1}]  ${date}  |  ${sp}`,
      `     ID: ${s.sessionId}`,
      `     Summary: [pending: ${s.sessionId}]`,
      `     First message: ${truncated}`,
    ].join('\n');
  });

  return header + entries.join('\n\n') + '\n' + divider + '\n';
}

export function buildInfoData(version, platform, claudeHome) {
  const now = new Date().toISOString();
  return { version, installedAt: now, lastUpdatedAt: now, platform, claudeHome };
}

export function writeAllFiles({ cacheFile, archiveFile, activityFile, infoFile }, sessions, userHome, version) {
  const cache = buildCacheData(sessions, 0, version);
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');

  const archive = buildArchiveLog(sessions, userHome);
  fs.writeFileSync(archiveFile, archive, 'utf8');

  fs.writeFileSync(activityFile, '', 'utf8');

  const info = buildInfoData(version, process.platform, path.dirname(path.dirname(cacheFile)));
  fs.writeFileSync(infoFile, JSON.stringify(info, null, 2), 'utf8');
}

// Used by update flow: appends new sessions to an existing archive
export function appendToArchive(archiveFile, newSessions, userHome) {
  if (newSessions.length === 0) return;
  const appendix = '\n' + buildArchiveLog(newSessions, userHome);
  fs.appendFileSync(archiveFile, appendix, 'utf8');
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/write-files.test.js
```
Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/write-files.js tests/write-files.test.js
git commit -m "feat: add file writer module for cache, archive, activity, info"
```

---

## Task 6: Migration module — `lib/migrate.js`

**Files:**
- Create: `lib/migrate.js`
- Create: `tests/migrate.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/migrate.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateOldCache } from '../lib/migrate.js';

const OLD_CACHE = {
  "_offset": 5,
  "d66da164-2a45-488d-91c0-9eff60704f3e": {
    "summary": "Building VibePro CLI wrapper",
    "display": "Now I am looking to build a CLI wrapper",
    "project": "C:\\Users\\Som",
    "firstTimestamp": 1773657113310,
    "lastTimestamp": 1773665629844
  },
  "02535541-f461-49a1-ae9f-b390ccd46c08": {
    "summary": null,
    "display": "Go to Documents/Easter-Egg folder",
    "project": "C:\\Users\\Som",
    "firstTimestamp": 1775017021369,
    "lastTimestamp": 1775017021369
  }
};

test('migrateOldCache transfers sessions correctly', () => {
  const result = migrateOldCache(OLD_CACHE);
  assert.ok(result.sessions['d66da164-2a45-488d-91c0-9eff60704f3e']);
  assert.ok(result.sessions['02535541-f461-49a1-ae9f-b390ccd46c08']);
});

test('migrateOldCache skips _offset key as session', () => {
  const result = migrateOldCache(OLD_CACHE);
  assert.ok(!result.sessions['_offset']);
});

test('migrateOldCache preserves offset in new format', () => {
  const result = migrateOldCache(OLD_CACHE);
  assert.equal(result._offset, 5);
});

test('migrateOldCache sets _version', () => {
  const result = migrateOldCache(OLD_CACHE);
  assert.equal(result._version, '1.0.0');
});

test('migrateOldCache preserves summary values', () => {
  const result = migrateOldCache(OLD_CACHE);
  assert.equal(result.sessions['d66da164-2a45-488d-91c0-9eff60704f3e'].summary, 'Building VibePro CLI wrapper');
  assert.equal(result.sessions['02535541-f461-49a1-ae9f-b390ccd46c08'].summary, null);
});

test('migrateOldCache returns null when old cache has no sessions', () => {
  const result = migrateOldCache({ _offset: 0 });
  assert.equal(result, null);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/migrate.test.js
```

- [ ] **Step 3: Write `lib/migrate.js`**

```js
// lib/migrate.js
import fs from 'fs';

export function migrateOldCache(oldData) {
  const sessions = {};
  for (const [key, value] of Object.entries(oldData)) {
    if (key.startsWith('_')) continue; // skip _offset, _version etc
    if (typeof value !== 'object' || value === null) continue;
    sessions[key] = value;
  }
  if (Object.keys(sessions).length === 0) return null;
  return {
    _offset: oldData._offset ?? 0,
    _version: '1.0.0',
    sessions,
  };
}

// Returns migrated cache data object or null (does NOT write to disk — caller decides)
export function tryMigrateFromOldFile(oldCacheFile) {
  if (!fs.existsSync(oldCacheFile)) return null;
  try {
    const raw = fs.readFileSync(oldCacheFile, 'utf8');
    const oldData = JSON.parse(raw);
    return migrateOldCache(oldData); // null if no sessions
  } catch {
    return null; // migration failure is non-fatal
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/migrate.test.js
```
Expected: all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/migrate.js tests/migrate.test.js
git commit -m "feat: add migration module for old backtrack-sessions.json format"
```

---

## Task 7: Main installer — `install.js`

**Files:**
- Create: `install.js`

No unit tests for this file (it is an orchestrator with side effects — verified by integration testing in Task 10).

- [ ] **Step 1: Write `install.js`**

```js
// install.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPaths, validateNodeVersion, validateClaudeInstalled, detectInstallMode } from './lib/paths.js';
import { parseSessions } from './lib/parse-history.js';
import { writeAllFiles, buildCacheData } from './lib/write-files.js';
import { tryMigrateFromOldFile } from './lib/migrate.js';
import { replaceTokens } from './lib/tokens.js';

const VERSION = '1.0.0';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Terminal output helpers ────────────────────────────────────────────────

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function banner() {
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║   claude-session-tracker  v${VERSION}        ║`);
  console.log(`║   /backtrack for Claude Code            ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
}

function ok(msg) { console.log(c.green('✓') + ' ' + msg); }
function info(msg) { console.log(c.dim('  ' + msg)); }
function err(msg) { console.error(c.red('✗') + ' ' + msg); }

// ─── Core logic ─────────────────────────────────────────────────────────────

function installCommand(paths) {
  const templatePath = path.join(__dirname, 'commands', 'backtrack.md');
  const template = fs.readFileSync(templatePath, 'utf8');
  const content = replaceTokens(template, {
    userHome: paths.home,
    claudeHome: paths.claudeHome,
    backtrackDir: paths.backtrackDir,
  });
  fs.mkdirSync(paths.commandsDir, { recursive: true });
  fs.writeFileSync(paths.commandFile, content, 'utf8');
  ok(`Installed:  ${paths.commandFile}`);
}

function runFirstInstall(paths, sessions) {
  fs.mkdirSync(paths.backtrackDir, { recursive: true });
  installCommand(paths);

  // Migration MUST happen before writing cache.json so preserved summaries
  // are included in the initial write (not overwritten afterwards)
  const migratedData = tryMigrateFromOldFile(paths.oldCacheFile);
  const mergedSessions = sessions.map(s => {
    const old = migratedData?.sessions?.[s.sessionId];
    return old ? { ...s, summary: old.summary ?? null } : s;
  });

  writeAllFiles(paths, mergedSessions, paths.home, VERSION);
  ok(`Written:    ${paths.archiveFile}  (${mergedSessions.length} sessions)`);
  ok(`Written:    ${paths.cacheFile}  (${mergedSessions.length} session stubs)`);
  ok(`Created:    ${paths.activityFile}`);

  // info.json is written LAST (atomicity signal)
  const { buildInfoData } = await import('./lib/write-files.js');
  const info = buildInfoData(VERSION, process.platform, paths.claudeHome);
  fs.writeFileSync(paths.infoFile, JSON.stringify(info, null, 2), 'utf8');
  ok(`Written:    ${paths.infoFile}`);
}

function runUpdate(paths, allSessions) {
  installCommand(paths);

  const existingCache = JSON.parse(fs.readFileSync(paths.cacheFile, 'utf8'));
  const knownIds = new Set(Object.keys(existingCache.sessions || {}));

  // Update lastTimestamp for resumed sessions
  for (const s of allSessions) {
    if (knownIds.has(s.sessionId)) {
      const cached = existingCache.sessions[s.sessionId];
      if (s.lastTimestamp > cached.lastTimestamp) {
        cached.lastTimestamp = s.lastTimestamp;
      }
    }
  }

  // Add new sessions
  const newSessions = allSessions.filter(s => !knownIds.has(s.sessionId));
  for (const s of newSessions) {
    existingCache.sessions[s.sessionId] = {
      summary: null,
      display: s.display,
      project: s.project,
      firstTimestamp: s.firstTimestamp,
      lastTimestamp: s.lastTimestamp,
    };
  }

  fs.writeFileSync(paths.cacheFile, JSON.stringify(existingCache, null, 2), 'utf8');

  // Append new sessions to archive
  if (newSessions.length > 0) {
    const { buildArchiveLog } = await import('./lib/write-files.js');
    const appendix = '\n' + buildArchiveLog(newSessions, paths.home);
    fs.appendFileSync(paths.archiveFile, appendix, 'utf8');
  }

  // Update info.json
  const info = JSON.parse(fs.readFileSync(paths.infoFile, 'utf8'));
  info.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(paths.infoFile, JSON.stringify(info, null, 2), 'utf8');

  ok(`Updated: ${newSessions.length} new session(s) added`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  banner();

  try {
    validateNodeVersion(process.versions.node);
    ok(`Node.js v${process.versions.node} detected`);

    const paths = buildPaths();
    validateClaudeInstalled(paths.claudeHome);
    ok(`Claude Code found at: ${paths.claudeHome}`);

    if (!fs.existsSync(paths.historyFile)) {
      err('No session history found. Use Claude Code for a while, then re-run this installer.');
      process.exit(1);
    }

    const mode = detectInstallMode(paths.backtrackDir, paths.infoFile);

    if (mode === 'interrupted') {
      console.log(c.yellow('\n⚠ Incomplete installation detected. Cleaning up and reinstalling...'));
    }

    console.log('\n📚 Scanning session history...');
    const allSessions = parseSessions(paths.historyFile, 50);
    info(`Found ${allSessions.length} unique sessions`);
    info('Archiving last 50...\n');

    if (mode === 'update') {
      runUpdate(paths, allSessions);
    } else {
      runFirstInstall(paths, allSessions);
    }

    console.log('\n══════════════════════════════════════════');
    console.log(c.green('✅ Installation complete!'));
    console.log('\nOpen Claude Code and type:');
    console.log(c.bold('   /backtrack') + '         → browse your last 10 sessions');
    console.log(c.bold('   /backtrack more') + '    → go further back');
    console.log(c.bold('   /backtrack status') + '  → see install info & stats');
    console.log('══════════════════════════════════════════\n');

  } catch (e) {
    err(e.message);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: Fix the `async import` anti-pattern**

The `await import()` inside non-async functions is wrong. Refactor `runFirstInstall` and `runUpdate` to be `async` functions, and move `buildInfoData` import to the top:

```js
// At top of file, add to existing imports:
import { writeAllFiles, buildCacheData, buildInfoData, buildArchiveLog } from './lib/write-files.js';

// Remove the dynamic import() calls inside runFirstInstall and runUpdate
// Change runFirstInstall signature to: function runFirstInstall(paths, sessions)
// Change runUpdate signature to: function runUpdate(paths, allSessions)
```

- [ ] **Step 3: Run the installer on your own machine to do a smoke test**

```bash
cd /c/Users/Som/Documents/claude-session-tracker
node install.js
```

Expected output: banner, checkmarks, 50 sessions archived, completion message.

- [ ] **Step 4: Verify files were created**

```bash
ls ~/.claude/backtrack/
# Should show: cache.json  sessions-archive.log  activity.log  info.json
cat ~/.claude/backtrack/info.json
# Should show version, installedAt, platform
cat ~/.claude/backtrack/sessions-archive.log | head -20
# Should show archive header and first few sessions with [pending: <id>] markers
```

- [ ] **Step 5: Commit**

```bash
git add install.js
git commit -m "feat: add main installer with first-install and update flows"
```

---

## Task 8: Portable `commands/backtrack.md` template

**Files:**
- Create: `commands/backtrack.md` (template version — tokens, not real paths)
- Modify: `~/.claude/commands/backtrack.md` (replace installed version with new portable one post-install)

This file is the updated version of the existing `~/.claude/commands/backtrack.md`, adapted to:
1. Use `{{TOKEN}}` placeholders instead of hardcoded paths
2. Use new cache schema (`sessions` sub-object)
3. Add `activity.log` appending
4. Add `sessions-archive.log` back-filling
5. Add `/backtrack status` argument handler
6. Read from `{{BACKTRACK_DIR}}/cache.json` instead of `backtrack-sessions.json`

- [ ] **Step 1: Write `commands/backtrack.md`**

```markdown
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
- `firstEntry`: the entry with the **lowest** timestamp (for summarization)
- `lastTimestamp`: the **highest** timestamp seen (for recency sorting)

Build a deduplicated list sorted by `lastTimestamp` **descending** (most recent first).

---

## STEP 2: Determine pagination offset

Read `{{BACKTRACK_DIR}}/cache.json`. If missing, treat as `{ "_offset": 0, "_version": "1.0.0", "sessions": {} }`.

Get `_offset` from the JSON (default: 0).

Check `$ARGUMENTS`:
- If `"more"`: new offset = current `_offset` + 10. Save this new offset back to cache file.
- If a number string (e.g., `"20"`): use as direct offset.
- Otherwise: offset = 0 and save `_offset: 0` to cache file.

Take sessions at positions `[offset]` through `[offset + 9]` (up to 10).

---

## STEP 3: Load cache and identify uncached sessions

Read `{{BACKTRACK_DIR}}/cache.json`.

The cache has a `sessions` object keyed by `sessionId`. For each of the 10 sessions,
check if its `sessionId` exists in `cache.sessions`.
- If it does → use `cache.sessions[sessionId].summary` (may be null — treat null as uncached)
- If not → needs summarization

---

## STEP 4: Summarize uncached sessions (token-optimized)

For each session where summary is null or missing:

**Get summary input:**
1. Take `display` from `firstEntry`.
2. Check if poor quality:
   - Starts with `/` (slash command)
   - Length under 15 characters
   - Starts with `[Pasted`
3. If poor quality → resolve session JSONL:
   - List directories in `{{CLAUDE_HOME}}/projects/`
   - Encode `project` path: replace all `[^a-zA-Z0-9]` with `-`
   - Find best matching directory
   - Read `{{CLAUDE_HOME}}/projects/<matched-dir>/<sessionId>.jsonl`
   - Extract entries where `type == "user"` and `message.role == "user"`
   - Use the longest of the first 3 as summary input
   - If file missing: use display as-is

**Batch summarize all uncached sessions in ONE call.** For each, write a 1-sentence
summary of max 12 words. Be specific — avoid vague phrases.

**Save to cache:**
For each summarized session, write to `cache.sessions[sessionId]`:
```json
{
  "summary": "<summary>",
  "display": "<original display>",
  "project": "<project path>",
  "firstTimestamp": <number>,
  "lastTimestamp": <number>
}
```
Write the updated `cache.json` file.

**Back-fill sessions-archive.log:**
For each newly summarized session, use the Edit tool:
- `old_string`: `[pending: <sessionId>]`
- `new_string`: `<summary text>`
- `file_path`: `{{BACKTRACK_DIR}}/sessions-archive.log`

This replaces the unique pending marker for that session only.

---

## STEP 5: Display the session list

Format and print:

```
📋 Sessions — most recent first  (showing #N to #M)

#1  <date>  [<shortPath>]
    <summary>

#2  <date>  [<shortPath>]
    <summary>

... (up to #10)

─────────────────────────────────────────────
Type a number (1–10) to load that session.
Type 'more' or /backtrack more for earlier sessions.
```

**Date format:** `Apr 01, 2026 · 10:45 AM` (convert ms timestamp)

**Short path rule:** Strip prefix `{{USER_HOME}}/` or `{{USER_HOME}}\` from project path.
If path IS exactly `{{USER_HOME}}`, show the last two components.

**Append to activity log:**
Read `{{BACKTRACK_DIR}}/activity.log`, append:
`[<timestamp>] LISTED sessions <from>-<to> (offset: <offset>)`
Write back.

**Your turn ends here.** Do not wait for input. User types their response next.

---

## STEP 6: Handle user response (next turn)

When the user's next message after the list is a number (1–10) or `more`:

**If `more`:** Re-execute this command mentally with offset + 10.

**If number N (1–10):**

1. Look up session #N from the list shown. Get `sessionId` and `project`.

2. Resolve session JSONL path (same encoding logic as Step 4).

3. If file not found:
   ```
   ⚠️  Session file unavailable — remote agent session or file moved.
   Summary: <cached summary>
   Project: <project>
   Date: <date>
   ```
   Stop.

4. If file exists, read it and extract:
   - **Display:** first 3 `type == "user"` entries, text truncated to 80 chars each
   - **Context:** last 10 user+assistant pairs.
     Strip from assistant messages: `"type": "thinking"`, `"type": "tool_use"`, `"type": "tool_result"`.
     Keep only `"type": "text"` content.

5. Display detail block:
   ```
   ─────────────────────────────────────────────
   📂 Session #N  ·  <date>  ·  [<shortPath>]

   Summary: <summary>

   Your first messages:
     • "<first user message>"
     • "<second>"
     • "<third>"
   ─────────────────────────────────────────────
   ```

6. Present last 10 exchanges as inline context.

7. **Append to activity log:**
   `[<timestamp>] LOADED session #N — <shortPath> (id: <first 8 chars of sessionId>)`

8. Announce:
   ```
   ✅ Context from session #N loaded. You can continue this work — just tell me what to do next.
   ```

---

## EDGE CASES

- Fewer than 10 sessions at offset → show however many exist
- History file missing → output: `No sessions found in history.`
- Number outside 1–10 → ask for a valid number from the list
- Number typed several messages after list → `The session list may have scrolled out of context. Run /backtrack again.`
- Special characters in project path → use directory listing + last-component matching, not manual encoding
- `cache.json` missing → create it as `{ "_offset": 0, "_version": "1.0.0", "sessions": {} }`
```

- [ ] **Step 2: Verify tokens are present and correct**

Check the template contains all three tokens: `{{CLAUDE_HOME}}`, `{{USER_HOME}}`, `{{BACKTRACK_DIR}}`. Verify none of the old hardcoded `C:\Users\Som` paths remain.

```bash
grep -c "{{CLAUDE_HOME}}" commands/backtrack.md  # should be > 0
grep -c "C:\\\\Users\\\\Som" commands/backtrack.md  # should be 0
```

- [ ] **Step 3: Run the installer to deploy the updated command**

```bash
node install.js
```

This will replace `~/.claude/commands/backtrack.md` with the token-replaced version of this template.

- [ ] **Step 4: Verify the installed file has real paths**

```bash
grep "CLAUDE_HOME" ~/.claude/commands/backtrack.md  # should be 0 (tokens replaced)
grep "Users/Som" ~/.claude/commands/backtrack.md    # should show real paths
```

- [ ] **Step 5: Commit**

```bash
git add commands/backtrack.md
git commit -m "feat: add portable backtrack.md template with token placeholders"
```

---

## Task 9: README and final polish

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# claude-session-tracker

Browse and resume your previous Claude Code sessions with `/backtrack`.

Instantly see a summarized list of your last 10 sessions — what you were working on, when, and in which project. Pick any session to load its context and continue right where you left off.

## Requirements

- [Node.js](https://nodejs.org) 16+
- [Claude Code](https://claude.ai/code) installed and used at least once

## Install

```bash
git clone https://github.com/somuser/claude-session-tracker
cd claude-session-tracker
node install.js
```

That's it. The installer:
- Detects your Claude Code installation automatically
- Installs the `/backtrack` command globally (available in every Claude Code session)
- Archives your last 50 sessions with dates and projects
- Sets up AI summary generation (happens lazily on first `/backtrack` run)

## Usage

Open any Claude Code session and type:

| Command | What it does |
|---|---|
| `/backtrack` | List your 10 most recent sessions with AI summaries |
| `/backtrack more` | Go further back (10 sessions at a time) |
| `1`, `2` ... `10` | Load that session's context into the current conversation |
| `/backtrack status` | See version, session count, and usage stats |

## Update

```bash
cd claude-session-tracker
git pull
node install.js
```

Re-running the installer detects your existing installation and only adds new sessions to the archive. Your existing summaries and logs are preserved.

## Files created

All files live in `~/.claude/backtrack/`:

| File | Purpose |
|---|---|
| `cache.json` | Session metadata and AI summaries |
| `sessions-archive.log` | Human-readable archive of your sessions |
| `activity.log` | Log of every `/backtrack` call |
| `info.json` | Version and install metadata |

## Uninstall

```bash
rm ~/.claude/commands/backtrack.md
rm -rf ~/.claude/backtrack/
```

On Windows (PowerShell):
```powershell
Remove-Item "$env:USERPROFILE\.claude\commands\backtrack.md"
Remove-Item -Recurse "$env:USERPROFILE\.claude\backtrack"
```

## How it works

`/backtrack` is a Claude Code slash command — a Markdown file that gives Claude a set of instructions to follow. When you run it, Claude reads your session history, generates AI summaries (cached so they're free on repeat runs), and displays a numbered list. When you pick a session, Claude loads the last 10 exchanges as inline context so you can continue the work immediately.

## License

MIT
```

- [ ] **Step 2: Run all unit tests**

```bash
node --test tests/*.test.js
```
Expected: all tests pass with no failures.

- [ ] **Step 3: Commit README**

```bash
git add README.md
git commit -m "docs: add README with install, usage, and how it works"
```

---

## Task 10: Integration verification

No code changes — this task verifies everything works end-to-end.

- [ ] **Step 1: Verify all files exist in repo**

```bash
ls -la commands/backtrack.md install.js lib/ tests/ README.md LICENSE package.json
```

- [ ] **Step 2: Run all unit tests clean**

```bash
node --test tests/*.test.js
```
Expected: all tests green.

- [ ] **Step 3: Smoke test the installer (update mode)**

```bash
node install.js
```
Expected: update mode detected, 0 or more new sessions added, no errors.

- [ ] **Step 4: Open Claude Code and test `/backtrack status`**

In Claude Code, run `/backtrack status`.
Expected: version 1.0.0, installed date today, session counts.

- [ ] **Step 5: Test `/backtrack` list view**

Run `/backtrack` in Claude Code.
Expected: 10 sessions listed with dates, short paths, AI summaries.
Check `activity.log` has a new LISTED entry.

- [ ] **Step 6: Test session selection**

Type `1` after the list is shown.
Expected: detail block shown, context loaded message.
Check `activity.log` has a new LOADED entry.

- [ ] **Step 7: Test pagination**

After the list, type `more`.
Expected: sessions 11–20 shown.

- [ ] **Step 8: Test archive back-fill**

```bash
cat ~/.claude/backtrack/sessions-archive.log | grep pending | head -5
```
Expected: 0 `[pending: ...]` entries remaining (or fewer than before) after `/backtrack` ran.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "chore: verify integration — all tests passing, installer working"
```

- [ ] **Step 10: Push to GitHub**

```bash
git remote add origin https://github.com/somuser/claude-session-tracker.git
git branch -M main
git push -u origin main
```

---

## Quick Reference

| Command | What it runs |
|---|---|
| `node install.js` | Install or update |
| `node --test tests/*.test.js` | Run all unit tests |
| `/backtrack` | Browse sessions (in Claude Code) |
| `/backtrack status` | Show version and stats |
