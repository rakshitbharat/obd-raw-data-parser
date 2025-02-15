const { execSync } = require('child_process');
const path = require('path');

try {
  // Clean dist
  execSync('rm -rf dist', { stdio: 'inherit' });
  
  // Run TypeScript compiler
  execSync('tsc', { stdio: 'inherit' });
  
  // Copy package.json and README to dist
  execSync('cp package.json README.md LICENSE dist/', { stdio: 'inherit' });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
