#!/usr/bin/env node
/**
 * scripts/generate-release-notes.mjs
 * Automated Release Notes & Changelog Generator for Privacy-First AI Photo Gallery
 * 
 * Usage:
 *   node scripts/generate-release-notes.mjs --version 1.0.0
 *   node scripts/generate-release-notes.mjs --dry-run
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
let targetVersion = '1.0.0';
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' || args[i] === '-v') {
    targetVersion = args[i + 1] || targetVersion;
    i++;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

function getLatestGitTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8', cwd: rootDir }).trim();
    return tag;
  } catch {
    return null; // Initial release
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  try {
    const rawLog = execSync(`git log ${range} --pretty=format:"%h|%s|%an|%ad" --date=short`, {
      encoding: 'utf-8',
      cwd: rootDir,
    }).trim();
    if (!rawLog) return [];
    return rawLog.split('\n').map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  } catch (err) {
    console.warn(`[WARN] Could not retrieve git log: ${err.message}. Using fallback entry.`);
    return [{
      hash: 'initial',
      subject: 'feat(core): initialize master architecture and AI memory system',
      author: 'AI Agent',
      date: new Date().toISOString().split('T')[0]
    }];
  }
}

function parseCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    performance: [],
    security: [],
    documentation: [],
    other: [],
  };

  const pattern = /^(feat|fix|perf|sec|security|docs|refactor|test|chore)(?:\(([^)]+)\))?:\s*(.+)$/i;

  for (const commit of commits) {
    const match = commit.subject.match(pattern);
    if (!match) {
      categories.other.push(commit.subject);
      continue;
    }

    const type = match[1].toLowerCase();
    const scope = match[2] ? `**${match[2]}**: ` : '';
    const message = match[3];
    const formatted = `- ${scope}${message} (\`${commit.hash}\`)`;

    if (type === 'feat') categories.features.push(formatted);
    else if (type === 'fix') categories.fixes.push(formatted);
    else if (type === 'perf') categories.performance.push(formatted);
    else if (type === 'sec' || type === 'security') categories.security.push(formatted);
    else if (type === 'docs') categories.documentation.push(formatted);
    else categories.other.push(formatted);
  }

  return categories;
}

function generateMarkdown(version, categories) {
  const today = new Date().toISOString().split('T')[0];
  let md = `## Version ${version} — ${today}\n\n`;

  if (categories.features.length > 0) {
    md += `### 🚀 New Features\n${categories.features.join('\n')}\n\n`;
  }
  if (categories.fixes.length > 0) {
    md += `### 🐛 Bug Fixes\n${categories.fixes.join('\n')}\n\n`;
  }
  if (categories.security.length > 0) {
    md += `### 🔒 Security & Privacy\n${categories.security.join('\n')}\n\n`;
  }
  if (categories.performance.length > 0) {
    md += `### ⚡ Performance Improvements\n${categories.performance.join('\n')}\n\n`;
  }
  if (categories.documentation.length > 0) {
    md += `### 📚 Documentation\n${categories.documentation.join('\n')}\n\n`;
  }
  if (categories.other.length > 0) {
    md += `### 🛠️ Maintenance & Refactoring\n${categories.other.join('\n')}\n\n`;
  }

  md += `### 📦 Release Assets\n`;
  md += `- \`PhotoGallery-Setup-${version}.exe\` (Windows 10/11 x64 Installer)\n`;
  md += `- \`PhotoGallery-${version}.apk\` (Android Universal Release APK)\n`;
  md += `- \`SHA256SUMS.txt\` (Cryptographic Checksums)\n`;

  return md;
}

// Main execution
const lastTag = getLatestGitTag();
console.log(`[INFO] Generating release notes for version ${targetVersion}`);
console.log(`[INFO] Previous tag: ${lastTag || 'None (Initial commit)'}`);

const commits = getCommitsSince(lastTag);
const categories = parseCommits(commits);
const releaseNotes = generateMarkdown(targetVersion, categories);

if (dryRun) {
  console.log('\n--- DRY RUN OUTPUT ---\n');
  console.log(releaseNotes);
  process.exit(0);
}

// Update RELEASE_NOTES.md
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');
fs.writeFileSync(releaseNotesPath, `# RELEASE NOTES\n\n${releaseNotes}`, 'utf-8');
console.log(`[SUCCESS] Updated ${releaseNotesPath}`);

// Update CHANGELOG.md (Prepend under [Unreleased])
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const existing = fs.readFileSync(changelogPath, 'utf-8');
  const insertionPoint = existing.indexOf('## [Unreleased]');
  if (insertionPoint !== -1) {
    const afterUnreleased = insertionPoint + '## [Unreleased]'.length;
    const updated = existing.slice(0, afterUnreleased) + '\n\n' + releaseNotes + '\n' + existing.slice(afterUnreleased);
    fs.writeFileSync(changelogPath, updated, 'utf-8');
    console.log(`[SUCCESS] Updated ${changelogPath}`);
  }
}

