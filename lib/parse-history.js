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
      sessions[sessionId] = { sessionId, display, project, firstTimestamp: timestamp, lastTimestamp: timestamp };
    } else {
      if (timestamp < sessions[sessionId].firstTimestamp) {
        sessions[sessionId].firstTimestamp = timestamp;
        sessions[sessionId].display = display;
        sessions[sessionId].project = project;
      }
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
