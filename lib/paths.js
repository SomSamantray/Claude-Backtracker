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
