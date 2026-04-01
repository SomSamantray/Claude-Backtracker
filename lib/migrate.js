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
    return migrateOldCache(oldData);
  } catch {
    return null; // migration failure is non-fatal
  }
}
