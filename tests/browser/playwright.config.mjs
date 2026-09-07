import { defineConfig } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const local = (path) => fileURLToPath(new URL(path, import.meta.url))
const browser = process.env.BROWSER === 'webkit' ? 'webkit' : 'chromium'
const suffix = browser === 'webkit' ? '-webkit' : ''

export default defineConfig({
  testDir: '.',
  testMatch: '*.e2e.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  // Absolute paths avoid reports being nested under tests/browser/tests/browser.
  reporter: [
    ['list'],
    ['html', { outputFolder: local(`./report${suffix}`), open: 'never' }],
    ['json', { outputFile: local(`./evidence/results${suffix}.json`) }],
  ],
  outputDir: local(`./test-results${suffix}`),
  use: {
    baseURL: browser === 'webkit' ? 'https://localhost:3443' : 'http://localhost:3000',
    ignoreHTTPSErrors: browser === 'webkit',
    browserName: browser,
    viewport: { width: 1440, height: 1000 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/browser/start.mjs',
    cwd: local('../..'),
    url: browser === 'webkit' ? 'https://localhost:3443/login' : 'http://localhost:3000/login',
    ignoreHTTPSErrors: browser === 'webkit',
    reuseExistingServer: false,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
