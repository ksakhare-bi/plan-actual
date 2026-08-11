import { loadEnv } from '../../scripts/loadEnv';

loadEnv();


export function toTestDatabaseUrl(url: string): string {
  const match = /^(mongodb(?:\+srv)?:\/\/)([^/?]*)(?:\/([^?]*))?(\?.*)?$/.exec(url);
  if (!match) throw new Error(`Not a MongoDB connection string: ${redact(url)}`);

  const [, scheme, authority, dbName = '', query = ''] = match;
  const base = dbName === '' ? 'plan_vs_actual' : dbName;
  return `${scheme}${authority}/${base}_test${query}`;
}


export function redact(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***:***@');
}

export default async function setup() {
  const source = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!source || !/^mongodb(\+srv)?:\/\//.test(source)) {
    console.warn(
    '\n[tests] No MongoDB DATABASE_URL or TEST_DATABASE_URL set — skipping the ' +
    'database-backed lock tests. Set one in .env to run the full suite.\n',
    );
    process.env.PVA_DB_TESTS = 'off';
    return;
  }

  const testUrl = process.env.TEST_DATABASE_URL ?? toTestDatabaseUrl(source);

  if (testUrl === source && !process.env.TEST_DATABASE_URL) {
    throw new Error('Refusing to run tests against the application database. Set TEST_DATABASE_URL.');
  }

  process.env.DATABASE_URL = testUrl;
  process.env.PVA_DB_TESTS = 'on';

  console.log(`[tests] Using test database: ${redact(testUrl)}`);

  const { ensureIndexes, closeClient } = await import('../../src/lib/db');
  await ensureIndexes();
  await closeClient();
}
