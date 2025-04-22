module.exports = {
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'docs', section: '📚 Documentation' },
    { type: 'chore', hidden: true },
    { type: 'style', hidden: true },
    { type: 'refactor', section: '♻️ Code Refactoring' },
    { type: 'perf', section: '⚡️ Performance Improvements' },
    { type: 'test', section: '✅ Tests' },
    { type: 'ci', section: '👷 CI/CD' },
    { type: 'build', hidden: true },
  ],
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat:
    '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',
  releaseCommitMessageFormat: 'chore(release): {{currentTag}}',
  skip: {
    bump: false,
    commit: false,
    changelog: false,
    tag: false,
  },
};
