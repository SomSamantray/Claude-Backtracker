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
