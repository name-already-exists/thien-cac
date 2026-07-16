import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = path.join(__dirname, '.settings.json');
const DEFAULT_ENV_PATH = path.join(__dirname, '../.env.local');

let settings = {
  concurrency: 4,
  envPath: DEFAULT_ENV_PATH,
  dryRun: false,
};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    settings = { ...settings, ...raw };
  } catch {
    // chưa có file — dùng mặc định
  }
}

function persist() {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
}

load();

export function getSettings() {
  return { ...settings };
}

export function updateSettings(patch) {
  if (patch.concurrency !== undefined) {
    const n = Number(patch.concurrency);
    if (Number.isFinite(n)) settings.concurrency = Math.max(1, Math.min(8, Math.round(n)));
  }
  if (patch.envPath !== undefined && typeof patch.envPath === 'string' && patch.envPath.trim()) {
    settings.envPath = patch.envPath.trim();
  }
  if (patch.dryRun !== undefined) {
    settings.dryRun = !!patch.dryRun;
  }
  persist();
  return getSettings();
}
