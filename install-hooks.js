#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.debug('Installing Git hooks with Husky...');

// Create .husky directory if it doesn't exist
const huskyDir = path.join(__dirname, '.husky');

if (!fs.existsSync(huskyDir)) {
  console.debug('Creating .husky directory...');
  fs.mkdirSync(huskyDir);
}

// Create _/ directory if it doesn't exist
const huskyHelperDir = path.join(huskyDir, '_');

if (!fs.existsSync(huskyHelperDir)) {
  console.debug('Creating .husky/_ directory...');
  fs.mkdirSync(huskyHelperDir);
}

// Create pre-commit hook
const preCommitHookPath = path.join(huskyDir, 'pre-commit');
const preCommitContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run lint-staged to format and lint changed files
bun lint-staged
`;

console.debug('Creating pre-commit hook...');
fs.writeFileSync(preCommitHookPath, preCommitContent);

// Create pre-push hook
const prePushHookPath = path.join(huskyDir, 'pre-push');
const prePushContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before pushing to remote
bun test
`;

console.debug('Creating pre-push hook...');
fs.writeFileSync(prePushHookPath, prePushContent);

// Make hooks executable
console.debug('Making hooks executable...');
execSync(`chmod +x ${preCommitHookPath} ${prePushHookPath}`);

console.debug('Husky hooks installed successfully! 🎉');
