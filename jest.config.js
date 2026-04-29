/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
    '^.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true }, diagnostics: false }],
  },
  transformIgnorePatterns: [
    // Transform ESM-only packages that octokit uses
    'node_modules/(?!(universal-user-agent|before-after-hook|@octokit)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  coverageDirectory: 'coverage',
}

module.exports = config
