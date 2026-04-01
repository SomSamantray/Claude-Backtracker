import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCacheData, buildArchiveLog, buildInfoData, appendToArchive } from '../lib/write-files.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

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
  assert.ok(!isNaN(new Date(info.installedAt).getTime()));
});

test('appendToArchive adds new sessions to existing file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-'));
  const archivePath = path.join(tmpDir, 'archive.log');
  try {
    fs.writeFileSync(archivePath, 'existing content\n', 'utf8');
    appendToArchive(archivePath, SAMPLE_SESSIONS, 'C:\\Users\\Som');
    const content = fs.readFileSync(archivePath, 'utf8');
    assert.ok(content.startsWith('existing content\n'));
    assert.ok(content.includes('[pending: aaa-111]'));
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('appendToArchive does nothing for empty sessions array', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-'));
  const archivePath = path.join(tmpDir, 'archive.log');
  try {
    fs.writeFileSync(archivePath, 'existing content\n', 'utf8');
    appendToArchive(archivePath, [], 'C:\\Users\\Som');
    const content = fs.readFileSync(archivePath, 'utf8');
    assert.equal(content, 'existing content\n');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
