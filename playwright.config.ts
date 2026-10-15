import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  // Axe audits the final state: entrance animations are skipped.
  use: {
    baseURL: 'http://127.0.0.1:4381',
    browserName: 'chromium',
    reducedMotion: 'reduce',
  },
  reporter: 'list',
  timeout: 30000,
});
