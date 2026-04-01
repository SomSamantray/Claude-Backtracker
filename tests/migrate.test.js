import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateOldCache, tryMigrateFromOldFile } from '../lib/migrate.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

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

test('tryMigrateFromOldFile returns null when old file does not exist', () => {
  const result = tryMigrateFromOldFile('/nonexistent/backtrack-sessions.json');
  assert.equal(result, null);
});

test('tryMigrateFromOldFile returns migrated data from valid old file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-'));
  const oldFile = path.join(tmpDir, 'backtrack-sessions.json');
  try {
    fs.writeFileSync(oldFile, JSON.stringify(OLD_CACHE), 'utf8');
    const result = tryMigrateFromOldFile(oldFile);
    assert.ok(result);
    assert.ok(result.sessions['d66da164-2a45-488d-91c0-9eff60704f3e']);
    assert.equal(result._version, '1.0.0');
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

test('tryMigrateFromOldFile returns null on invalid JSON', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-'));
  const oldFile = path.join(tmpDir, 'backtrack-sessions.json');
  try {
    fs.writeFileSync(oldFile, 'not valid json', 'utf8');
    const result = tryMigrateFromOldFile(oldFile);
    assert.equal(result, null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});
