import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'],
        },
      },
    },
  ],

  webServer: [
    {
      command: 'pnpm start --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
    {
      command: 'cd api && pnpm dev',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
    },
  ],
});
