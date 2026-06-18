import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  timeout: 90000, // Give Next.js dev compilation enough time to finish on first requests
  fullyParallel: false, // Run tests sequentially to avoid in-memory state conflicts between tests
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Run sequentially for predictable mock data state
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
  ],

});
