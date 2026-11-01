// End-to-end tests in real browser engines at phone sizes: Safari (iPhone) and Chrome (Android).
const { defineConfig, devices } = require('@playwright/test');

const PORT = 8766;

module.exports = defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `node tests/e2e/server.js`,
    env: { PORT: String(PORT) },
    port: PORT,
    reuseExistingServer: true,
  },
});
