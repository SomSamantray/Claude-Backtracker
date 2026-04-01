export function replaceTokens(template, { userHome, claudeHome, backtrackDir }) {
  return template
    .replaceAll('{{USER_HOME}}', userHome)
    .replaceAll('{{CLAUDE_HOME}}', claudeHome)
    .replaceAll('{{BACKTRACK_DIR}}', backtrackDir);
}
