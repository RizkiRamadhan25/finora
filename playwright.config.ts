import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:3191' },
  webServer: {
    command: 'node scripts/finora.mjs dev --port 3191',
    url: 'http://127.0.0.1:3191',
    timeout: 120_000,
    env: { FINORA_DATA_DIR: mkdtempSync(join(tmpdir(), 'finora-e2e-')), FINORA_E2E: '1' },
  },
});
