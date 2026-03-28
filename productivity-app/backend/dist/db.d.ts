import { type Database } from 'sql.js';
export declare function getDb(): Database;
/** Run a SELECT and return all rows as plain objects */
export declare function queryAll<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
/** Run a SELECT and return a single row or undefined */
export declare function queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
/** Run an INSERT/UPDATE/DELETE and return { lastInsertRowid, changes }. Saves to disk. */
export declare function run(sql: string, params?: unknown[]): {
    lastInsertRowid: number;
    changes: number;
};
/** Run a multi-statement SQL block (no params). Used for schema creation. */
export declare function exec(sql: string): void;
export declare function initDb(): Promise<void>;
//# sourceMappingURL=db.d.ts.map