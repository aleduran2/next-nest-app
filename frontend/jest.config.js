const nextJest = require('next/jest');

// next/jest configura automáticamente el transform (SWC), el mapeo de CSS/
// imágenes, y carga .env.test si existe. Es la forma recomendada por Next.js
// de testear un proyecto con App Router sin pelearse con babel a mano.
const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEach: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

module.exports = createJestConfig(customJestConfig);
