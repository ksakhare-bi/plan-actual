

import { loadEnv } from './loadEnv';
import { closeClient, ensureIndexes } from '../src/lib/db';

loadEnv();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and add your MongoDB Atlas string.');
  }

  const results = await ensureIndexes();

  for (const r of results) {
    const mark = r.status === 'created' ? '+' : r.status === 'already-present' ? '=' : '!';
    console.log(`  ${mark} ${r.collection}.${r.index}${r.detail ? ` — ${r.detail}` : ''}`);
  }

  const conflicts = results.filter((r) => r.status === 'conflict');
  if (conflicts.length > 0) {
    console.error(
      `\n${conflicts.length} index(es) could not be created because a non-unique index already ` +
        'covers the same fields. Drop the existing index, or point DATABASE_URL at a database ' +
        'this app owns, then re-run.',
    );
    process.exitCode = 1;
    return;
  }

  const created = results.filter((r) => r.status === 'created').length;
  console.log(`\nIndexes are up to date (${created} created, ${results.length - created} already present).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(closeClient);
