import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDb, queryAll, queryOne, run, getDb } from './db';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = './test_productivity.db';

describe('Database Utility (better-sqlite3)', () => {
  beforeAll(async () => {
    process.env['DB_PATH'] = TEST_DB_PATH;
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    await initDb();
  });

  afterAll(() => {
    const db = getDb();
    if (db) db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should initialize and create tables', () => {
    const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.map((t: any) => t.name);
    expect(tableNames).toContain('goals');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('frameworks');
  });

  it('should perform CRUD on frameworks', () => {
    const now = Date.now();
    const { lastInsertRowid } = run(
      'INSERT INTO frameworks (name, createdAt) VALUES (?, ?)',
      ['Test Framework', now]
    );
    expect(lastInsertRowid).toBeGreaterThan(0);

    const fw = queryOne('SELECT * FROM frameworks WHERE id = ?', [lastInsertRowid]);
    expect(fw).toBeDefined();
    expect((fw as any).name).toBe('Test Framework');

    run('UPDATE frameworks SET name = ? WHERE id = ?', ['Updated Name', lastInsertRowid]);
    const updated = queryOne('SELECT * FROM frameworks WHERE id = ?', [lastInsertRowid]);
    expect((updated as any).name).toBe('Updated Name');

    run('UPDATE frameworks SET deletedAt = ? WHERE id = ?', [Date.now(), lastInsertRowid]);
    const softDeleted = queryOne('SELECT * FROM frameworks WHERE id = ? AND deletedAt IS NULL', [lastInsertRowid]);
    expect(softDeleted).toBeUndefined();
  });
});
