# Build Configuration

## TypeScript Configuration

The project uses TypeScript for development. The following paths are included in compilation:

- `src/**/*` - All source files
- `examples/**/*` - Example files
- `src/__tests__/**/*` - Test files

### Building the Project

To build the project:

```bash
npm run build
```

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Setup husky pre-commit hooks:
```bash
npm run prepare
```

## Testing

Tests are run using Bun:

```bash
bun test
```

## Pre-commit Checks

The following checks run before each commit:

- ESLint validation
- Test execution

## Project Structure

- `/src` - Main source code
- `/examples` - Usage examples
- `/src/__tests__` - Test files
- `/dist` - Compiled output

## Configuration Files

- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `jest.config.js` - Test configuration
- `.husky/pre-commit` - Pre-commit hook configuration