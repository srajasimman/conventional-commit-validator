module.exports = {
    clearMocks: true,
    moduleFileExtensions: ['js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    testEnvironment: 'node',
    collectCoverage: true,
    collectCoverageFrom: ['*.js', '!dist/**', '!node_modules/**', '!coverage/**', '!jest.config.js'],
    coverageReporters: ['text', 'lcov'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  };