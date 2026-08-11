

import { describe, expect, it } from 'vitest';
import { redact, toTestDatabaseUrl } from './setup/testDb';


const dbNameOf = (url: string) => /^mongodb(?:\+srv)?:\/\/[^/?]*\/([^?]*)/.exec(url)?.[1] ?? '';

describe('toTestDatabaseUrl', () => {
  it('appends _test to the database name of an Atlas SRV string', () => {
    expect(
      toTestDatabaseUrl('mongodb+srv://u:p@cluster0.abcde.mongodb.net/plan_vs_actual?retryWrites=true&w=majority'),
    ).toBe('mongodb+srv://u:p@cluster0.abcde.mongodb.net/plan_vs_actual_test?retryWrites=true&w=majority');
  });

  it('handles a multi-host seed list, which `new URL()` cannot parse', () => {
    
    const seedList =
      'mongodb://user:pass@a-00.abc.mongodb.net:27017,a-01.abc.mongodb.net:27017,a-02.abc.mongodb.net:27017' +
      '/app_db?ssl=true&replicaSet=atlas-xxxx-shard-0&authSource=admin&appName=Cluster0';

    expect(toTestDatabaseUrl(seedList)).toBe(
      'mongodb://user:pass@a-00.abc.mongodb.net:27017,a-01.abc.mongodb.net:27017,a-02.abc.mongodb.net:27017' +
        '/app_db_test?ssl=true&replicaSet=atlas-xxxx-shard-0&authSource=admin&appName=Cluster0',
    );
  });

  it('preserves credentials, hosts and query options', () => {
    const out = toTestDatabaseUrl('mongodb+srv://user:s3cret@cluster0.abcde.mongodb.net/app?retryWrites=true');
    expect(out).toContain('user:s3cret@');
    expect(out).toContain('cluster0.abcde.mongodb.net');
    expect(out).toContain('retryWrites=true');
  });

  it('handles a plain local connection string', () => {
    expect(toTestDatabaseUrl('mongodb://localhost:27017/plan_vs_actual')).toBe(
      'mongodb://localhost:27017/plan_vs_actual_test',
    );
  });

  it('falls back to a named database when the URL omits one', () => {
    expect(toTestDatabaseUrl('mongodb://localhost:27017/')).toBe('mongodb://localhost:27017/plan_vs_actual_test');
    expect(toTestDatabaseUrl('mongodb://localhost:27017')).toBe('mongodb://localhost:27017/plan_vs_actual_test');
  });

  it('rejects a string that is not a MongoDB URI', () => {
    expect(() => toTestDatabaseUrl('file:./dev.db')).toThrow(/Not a MongoDB connection string/);
    expect(() => toTestDatabaseUrl('postgres://localhost/app')).toThrow(/Not a MongoDB connection string/);
  });

  it('never returns the input unchanged — the invariant that protects the app database', () => {
    for (const url of [
      'mongodb+srv://u:p@c.abcde.mongodb.net/plan_vs_actual?retryWrites=true',
      'mongodb://u:p@h1:27017,h2:27017/order_db?replicaSet=rs0',
      'mongodb://localhost:27017/app',
      'mongodb://localhost:27017/',
    ]) {
      expect(toTestDatabaseUrl(url)).not.toBe(url);
      expect(dbNameOf(toTestDatabaseUrl(url))).toMatch(/_test$/);
    }
  });
});

describe('redact', () => {
  it('removes the password before a connection string is logged', () => {
    expect(redact('mongodb+srv://user:hunter2@cluster0.abc.mongodb.net/app')).toBe(
      'mongodb+srv://***:***@cluster0.abc.mongodb.net/app',
    );
  });

  it('leaves a credential-free string alone', () => {
    expect(redact('mongodb://localhost:27017/app')).toBe('mongodb://localhost:27017/app');
  });
});
