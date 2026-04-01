import fs from 'fs';
import path from 'path';

/**
 * Formats a millisecond timestamp into a human-readable string.
 * e.g. Apr 01, 2026  10:45 AM
 * @param {number} ms
 * @returns {string}
 */
export function formatTimestamp(ms) {
  const date = new Date(ms);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(',', '').replace(/(\d{4}),?\s/, '$1  ');
}

/**
 * Strips the userHome prefix from a project path for display.
 * Handles both '/' and '\' as separators.
 * @param {string} projectPath
 * @param {string} userHome
 * @returns {string}
 */
export function shortPath(projectPath, userHome) {
  // Normalize both to forward slashes for comparison
  const normProject = projectPath.replace(/\\/g, '/');
  const normHome = userHome.replace(/\\/g, '/');

  if (normProject.startsWith(normHome)) {
    // Strip the home prefix, then strip any leading separator
    const remainder = projectPath.slice(userHome.length).replace(/^[/\\]/, '');
    return remainder;
  }
  return projectPath;
}

/**
 * Builds the cache.json data structure.
 * @param {Array} sessions
 * @param {number} offset
 * @param {string} version
 * @returns {object}
 */
export function buildCacheData(sessions, offset, version) {
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
  return {
    _offset: offset,
    _version: version,
    sessions: sessionMap,
  };
}

/**
 * Builds the full archive log string for a set of sessions.
 * Each entry has ID and Summary lines, with [pending: <sessionId>] as the summary placeholder.
 * The sessionId appears exactly once as a pending marker.
 * @param {Array} sessions
 * @param {string} userHome
 * @returns {string}
 */
export function buildArchiveLog(sessions, userHome) {
  const lines = [];
  for (const s of sessions) {
    const displayProject = shortPath(s.project, userHome);
    const firstFormatted = formatTimestamp(s.firstTimestamp);
    const lastFormatted = formatTimestamp(s.lastTimestamp);

    lines.push('---');
    lines.push(`ID: ${s.sessionId}`);
    lines.push(`Project: ${displayProject}`);
    lines.push(`Started: ${firstFormatted}`);
    lines.push(`Last Active: ${lastFormatted}`);
    lines.push(`Display: ${s.display}`);
    lines.push(`Summary: [pending: ${s.sessionId}]`);
    lines.push('');
  }
  return lines.join('\n');
}

/**
 * Builds the info.json data structure.
 * @param {string} version
 * @param {string} platform
 * @param {string} claudeHome
 * @returns {object}
 */
export function buildInfoData(version, platform, claudeHome) {
  const now = new Date().toISOString();
  return {
    version,
    installedAt: now,
    lastUpdatedAt: now,
    platform,
    claudeHome,
  };
}

/**
 * Writes cache.json, sessions-archive.log, and an empty activity.log.
 * Does NOT write info.json — that is written last by the installer as an atomicity signal.
 * @param {object} paths  — object with cacheFile, archiveFile, activityFile keys
 * @param {Array} sessions
 * @param {string} userHome
 * @param {string} version
 */
export function writeAllFiles(paths, sessions, userHome, version) {
  // Write cache.json
  const cacheData = buildCacheData(sessions, sessions.length, version);
  fs.writeFileSync(paths.cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');

  // Write sessions-archive.log
  const archiveLog = buildArchiveLog(sessions, userHome);
  fs.writeFileSync(paths.archiveFile, archiveLog, 'utf8');

  // Write empty activity.log
  fs.writeFileSync(paths.activityFile, '', 'utf8');
}

/**
 * Appends new sessions to an existing archive log file.
 * No-ops if newSessions is empty.
 * @param {string} archiveFile  — path to the archive file
 * @param {Array} newSessions
 * @param {string} userHome
 */
export function appendToArchive(archiveFile, newSessions, userHome) {
  if (!newSessions || newSessions.length === 0) return;
  const appendContent = buildArchiveLog(newSessions, userHome);
  fs.appendFileSync(archiveFile, appendContent, 'utf8');
}
