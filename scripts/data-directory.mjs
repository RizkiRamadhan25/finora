import { homedir } from 'node:os';
import { join, posix, win32 } from 'node:path';
import { closeSync, mkdirSync, openSync } from 'node:fs';

export function getAppDataDirectory(platform = process.platform, env = process.env, home = homedir()) {
  const path = platform === 'win32' ? win32 : posix;
  if (env.FINORA_DATA_DIR) {
    if (!path.isAbsolute(env.FINORA_DATA_DIR)) throw new Error('FINORA_DATA_DIR must be an absolute path.');
    return env.FINORA_DATA_DIR;
  }
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Finora', 'data');
  if (platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Finora');
  return path.join(env.XDG_DATA_HOME && path.isAbsolute(env.XDG_DATA_HOME) ? env.XDG_DATA_HOME : path.join(home, '.local', 'share'), 'finora');
}

export function configureDatabase(createFile = true) {
  const directory = getAppDataDirectory();
  const file = join(directory, 'finora.db');
  // The Prisma migration engine on Windows expects an existing file for an absolute path.
  if (createFile) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    closeSync(openSync(file, 'a', 0o600));
  }
  process.env.DATABASE_URL = `file:${file}`;
  return file;
}
