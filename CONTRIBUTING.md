# Contributing to React Native Bluetooth OBD Manager

Thank you for considering contributing to React Native Bluetooth OBD Manager! This document will guide you through the contribution process.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct, which is to be respectful, collaborative, and considerate in all interactions.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please create an issue on GitHub with the following information:

1. Clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots (if applicable)
6. Environment information (OS, React Native version, etc.)

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue on GitHub with the following information:

1. Clear and descriptive title
2. Detailed explanation of the suggested enhancement
3. Any examples or mockups (if applicable)

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -am 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Create a new Pull Request

## Development Workflow

### Setting Up Your Development Environment

1. Clone your fork of the repository
2. Install dependencies: `npm install`

### Code Style

The project uses ESLint and Prettier for code formatting and linting. Before submitting a pull request, make sure your code adheres to these guidelines:

- Run `npm run lint` to check for linting issues
- Run `npm run prettier:check` to check formatting
- Run `npm run lint:fix` and `npm run prettier` to automatically fix most issues

### Testing

- All new features should have tests
- Run `npm test` to run all tests
- Run `npm run test:coverage` to see coverage report

### Commit Messages

We follow a simple convention for commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes (formatting, etc.)
- `refactor:` for code refactoring
- `test:` for adding or modifying tests
- `chore:` for tooling changes, build process, etc.

Example: `feat: Add support for ISO15765-4 protocol`

### Pull Request Review Process

1. At least one maintainer must approve a pull request before it can be merged
2. All automated checks (tests, linting) must pass
3. PRs should be focused on a single change or feature

## Release Process

1. Maintainers will create a release branch from develop
2. After final testing, the release branch is merged to main
3. A version tag is created following semantic versioning (e.g., v1.0.0)
4. GitHub Actions automatically publishes to npm

## Getting Help

If you need help with anything, feel free to:

- Open a discussion on GitHub
- Ask questions in relevant issues or pull requests

Thank you for contributing! 