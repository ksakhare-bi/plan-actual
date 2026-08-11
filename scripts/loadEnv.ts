

import { config } from 'dotenv';

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  config({ path: '.env.local', quiet: true });
  config({ path: '.env', quiet: true });
  loaded = true;
}
