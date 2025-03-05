#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

try {
  // Clean dist
  execSync('rm -rf dist', { stdio: 'inherit', cwd: rootDir });
  
  // Build ESM version (default)
  execSync('npx tsc', { stdio: 'inherit', cwd: rootDir });
  
  // Copy files to dist
  execSync('cp package.json README.md LICENSE dist/', { stdio: 'inherit', cwd: rootDir });
  
  // Create package.json for dist
  const pkg = JSON.parse(fs.readFileSync(join(rootDir, 'package.json'), 'utf8'));
  const distPackage = {
    ...pkg,
    type: "module",
    exports: {
      ".": {
        "import": "./index.js",
        "require": "./cjs/index.js",
        "types": "./index.d.ts"
      }
    }
  };
  
  fs.writeFileSync(
    join(rootDir, 'dist', 'package.json'),
    JSON.stringify(distPackage, null, 2)
  );
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
