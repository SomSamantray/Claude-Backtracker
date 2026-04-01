// install.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildPaths, validateNodeVersion, validateClaudeInstalled, detectInstallMode } from './lib/paths.js';
import { parseSessions } from './lib/parse-history.js';
import { writeAllFiles, buildInfoData, appendToArchive } from './lib/write-files.js';
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

  // Migration MUST happen before writeAllFiles so preserved summaries are included
  const migratedData = tryMigrateFromOldFile(paths.oldCacheFile);
  const mergedSessions = sessions.map(s => {
    const old = migratedData?.sessions?.[s.sessionId];
    return old ? { ...s, summary: old.summary ?? null } : s;
  });

  // writeAllFiles does NOT write info.json
  writeAllFiles(paths, mergedSessions, paths.home, VERSION);
  ok(`Written:    ${paths.archiveFile}  (${mergedSessions.length} sessions)`);
  ok(`Written:    ${paths.cacheFile}  (${mergedSessions.length} session stubs)`);
  ok(`Created:    ${paths.activityFile}`);

  // info.json is written LAST (atomicity signal — its presence = complete install)
  const infoData = buildInfoData(VERSION, process.platform, paths.claudeHome);
  fs.writeFileSync(paths.infoFile, JSON.stringify(infoData, null, 2), 'utf8');
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

  if (newSessions.length > 0) {
    appendToArchive(paths.archiveFile, newSessions, paths.home);
  }

  // Update lastUpdatedAt in info.json
  const infoData = JSON.parse(fs.readFileSync(paths.infoFile, 'utf8'));
  infoData.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(paths.infoFile, JSON.stringify(infoData, null, 2), 'utf8');

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
      // handles both 'first-install' and 'interrupted'
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
