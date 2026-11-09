import { defineConfig } from '@playwright/test';

const DEFAULT_PORT = '5173';
const port = process.env.E2E_PORT ?? DEFAULT_PORT;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  use: { baseURL },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
