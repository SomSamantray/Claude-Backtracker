import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHistoryLines, deduplicateSessions, sortAndSlice, isPoorQualityDisplay } from '../lib/parse-history.js';

const RAW_LINES = [
  '{"display":"Hello world","timestamp":1000,"project":"C:\\\\Users\\\\Som","sessionId":"aaa"}',
  '{"display":"/clear","timestamp":2000,"project":"C:\\\\Users\\\\Som","sessionId":"aaa"}',
  '{"display":"Build a thing","timestamp":1500,"project":"C:\\\\Users\\\\Som\\\\docs","sessionId":"bbb"}',
  '{"display":"[Pasted text]","timestamp":500,"project":"C:\\\\Users\\\\Som","sessionId":"ccc"}',
  'invalid json line',
];

test('parseHistoryLines skips invalid JSON', () => {
  const result = parseHistoryLines(RAW_LINES);
  assert.equal(result.length, 4);
});

test('deduplicateSessions keeps lowest timestamp display, highest lastTimestamp', () => {
  const entries = parseHistoryLines(RAW_LINES.slice(0, 4));
  const sessions = deduplicateSessions(entries);
  assert.equal(Object.keys(sessions).length, 3);
  assert.equal(sessions['aaa'].firstTimestamp, 1000);
  assert.equal(sessions['aaa'].lastTimestamp, 2000);
  assert.equal(sessions['aaa'].display, 'Hello world');
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
  assert.equal(sorted[0].sessionId, 'aaa');
  assert.equal(sorted[1].sessionId, 'bbb');
  assert.equal(sorted[2].sessionId, 'ccc');
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
  assert.equal(isPoorQualityDisplay('hi'), true);
  assert.equal(isPoorQualityDisplay('yes'), true);
  assert.equal(isPoorQualityDisplay('12345678901234'), true);   // 14 chars — poor
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
