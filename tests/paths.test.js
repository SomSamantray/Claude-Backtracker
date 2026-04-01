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
