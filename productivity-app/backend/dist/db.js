"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.queryAll = queryAll;
exports.queryOne = queryOne;
exports.run = run;
exports.exec = exec;
exports.initDb = initDb;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sql_js_1 = __importDefault(require("sql.js"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbPath = path_1.default.resolve(process.env['DB_PATH'] ?? './productivity.db');
// ---- Synchronous-style wrapper over sql.js ----
// sql.js is in-memory; we persist to disk after every write.
let _db;
function getDb() {
    return _db;
}
function save() {
    const data = _db.export();
    fs_1.default.writeFileSync(dbPath, Buffer.from(data));
}
/** Run a SELECT and return all rows as plain objects */
function queryAll(sql, params = []) {
    const results = _db.exec(sql, params);
    if (!results.length || !results[0])
        return [];
    const cols = results[0].columns;
    return results[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => { obj[col] = row[i] ?? null; });
        return obj;
    });
}
/** Run a SELECT and return a single row or undefined */
function queryOne(sql, params = []) {
    const rows = queryAll(sql, params);
    return rows[0];
}
/** Run an INSERT/UPDATE/DELETE and return { lastInsertRowid, changes }. Saves to disk. */
function run(sql, params = []) {
    _db.run(sql, params);
    const lastId = queryOne('SELECT last_insert_rowid() as id');
    const changes = queryOne('SELECT changes() as c');
    save();
    return {
        lastInsertRowid: lastId?.id ?? 0,
        changes: changes?.c ?? 0,
    };
}
/** Run a multi-statement SQL block (no params). Used for schema creation. */
function exec(sql) {
    _db.run(sql);
    save();
}
// ---- Initialise (async, called once at startup) ----
async function initDb() {
    const SQL = await (0, sql_js_1.default)();
    if (fs_1.default.existsSync(dbPath)) {
        const fileContent = fs_1.default.readFileSync(dbPath);
        _db = new SQL.Database(fileContent);
        console.log(`Database loaded from: ${dbPath}`);
    }
    else {
        _db = new SQL.Database();
        console.log(`New database created at: ${dbPath}`);
    }
    // ---- Base schema (idempotent) ----
    _db.run(`
    CREATE TABLE IF NOT EXISTS frameworks (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT    NOT NULL,
      keys      TEXT    NOT NULL DEFAULT '[]',
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS goals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      frameworkId   INTEGER NOT NULL,
      goalType      TEXT    NOT NULL DEFAULT 'daily',
      parentId      INTEGER,
      isIndependent INTEGER NOT NULL DEFAULT 1,
      data          TEXT    NOT NULL DEFAULT '{}',
      progress      INTEGER NOT NULL DEFAULT 0,
      status        TEXT    NOT NULL DEFAULT 'active',
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL,
      deletedAt     INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      goalId        INTEGER NOT NULL,
      startTime     INTEGER NOT NULL,
      endTime       INTEGER,
      status        TEXT    NOT NULL DEFAULT 'active',
      didAchieveGoal INTEGER,
      mistake       TEXT,
      improvementSuggestion TEXT,
      skipReason    TEXT,
      frameworkData TEXT,
      -- Legacy fields
      start         INTEGER,
      target        TEXT,
      workTime      INTEGER,
      restTime      INTEGER,
      startedAt     INTEGER,
      endedAt       INTEGER,
      elapsedWork   INTEGER,
      elapsedRest   INTEGER,
      phase         TEXT,
      result        TEXT,
      failureReason TEXT,
      improvement   TEXT,
      deletedAt     INTEGER
    );

    CREATE TABLE IF NOT EXISTS journals (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      type      TEXT    NOT NULL,
      date      TEXT    NOT NULL,
      goalId    INTEGER,
      category  TEXT,
      content   TEXT    NOT NULL DEFAULT '{}',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS failures (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      type      TEXT    NOT NULL,
      linkedId  INTEGER NOT NULL,
      note      TEXT    NOT NULL,
      createdAt INTEGER NOT NULL,
      deletedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      username  TEXT    NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_questions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      category  TEXT    NOT NULL,
      question  TEXT    NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );
  `);
    // ---- Idempotent column migrations (for existing databases) ----
    const safeAlter = (sql) => {
        try {
            _db.run(sql);
        }
        catch { /* column already exists */ }
    };
    // Goals table migrations
    safeAlter('ALTER TABLE goals ADD COLUMN goalType TEXT NOT NULL DEFAULT \'daily\'');
    safeAlter('ALTER TABLE goals ADD COLUMN parentId INTEGER');
    safeAlter('ALTER TABLE goals ADD COLUMN isIndependent INTEGER NOT NULL DEFAULT 1');
    safeAlter('ALTER TABLE goals ADD COLUMN progress INTEGER NOT NULL DEFAULT 0');
    safeAlter('ALTER TABLE goals ADD COLUMN status TEXT NOT NULL DEFAULT \'active\'');
    // Sessions table migrations
    safeAlter('ALTER TABLE sessions ADD COLUMN skipReason TEXT');
    safeAlter('ALTER TABLE sessions ADD COLUMN target TEXT NOT NULL DEFAULT \'\'');
    safeAlter('ALTER TABLE sessions ADD COLUMN failureReason TEXT');
    safeAlter('ALTER TABLE sessions ADD COLUMN didAchieveGoal INTEGER');
    safeAlter('ALTER TABLE sessions ADD COLUMN startTime INTEGER');
    safeAlter('ALTER TABLE sessions ADD COLUMN endTime INTEGER');
    safeAlter('ALTER TABLE sessions ADD COLUMN mistake TEXT');
    safeAlter('ALTER TABLE sessions ADD COLUMN improvementSuggestion TEXT');
    safeAlter('ALTER TABLE sessions ADD COLUMN frameworkData TEXT');
    // Frameworks table migrations
    safeAlter('ALTER TABLE frameworks ADD COLUMN isDefault INTEGER NOT NULL DEFAULT 0');
    // Journals table migrations
    safeAlter('ALTER TABLE journals ADD COLUMN category TEXT');
    // Soft Delete migrations
    safeAlter('ALTER TABLE frameworks ADD COLUMN deletedAt INTEGER');
    safeAlter('ALTER TABLE goals ADD COLUMN deletedAt INTEGER');
    safeAlter('ALTER TABLE sessions ADD COLUMN deletedAt INTEGER');
    safeAlter('ALTER TABLE journals ADD COLUMN deletedAt INTEGER');
    safeAlter('ALTER TABLE failures ADD COLUMN deletedAt INTEGER');
    // ---- Seed default frameworks (only if none exist with isDefault=1) ----
    const defaultFws = queryAll('SELECT id FROM frameworks WHERE isDefault = 1');
    if (defaultFws.length === 0) {
        const now = Date.now();
        const defaults = [
            {
                name: 'Discipline Framework',
                keys: [
                    { key: 'what', label: 'What', description: 'What do you want to achieve?' },
                    { key: 'why', label: 'Why', description: 'Why is this important?' },
                    { key: 'how', label: 'How', description: 'How will you do it?' },
                ],
            },
            {
                name: 'SMART Goals',
                keys: [
                    { key: 'specific', label: 'Specific', description: 'What exactly?' },
                    { key: 'measurable', label: 'Measurable', description: 'How will you measure?' },
                    { key: 'achievable', label: 'Achievable', description: 'Is it realistic?' },
                    { key: 'relevant', label: 'Relevant', description: 'Does it matter?' },
                    { key: 'timeBound', label: 'Time-bound', description: 'By when?' },
                ],
            },
        ];
        for (const fw of defaults) {
            run('INSERT INTO frameworks (name, keys, isDefault, createdAt) VALUES (?, ?, 1, ?)', [fw.name, JSON.stringify(fw.keys), now]);
        }
        console.log('Seeded default frameworks.');
    }
    // ---- Seed default journal questions ----
    const defaultQs = queryAll('SELECT id FROM journal_questions WHERE isDefault = 1');
    if (defaultQs.length === 0) {
        const now = Date.now();
        const questions = [
            { category: 'reflection', question: 'What went well today?' },
            { category: 'reflection', question: 'What could have been better?' },
            { category: 'emotions', question: 'How are you feeling right now?' },
            { category: 'goals', question: 'Did you make progress toward your main goal?' },
            { category: 'problems', question: 'What obstacles did you face?' },
            { category: 'ideas', question: 'Any new ideas or insights?' },
        ];
        for (const q of questions) {
            run('INSERT INTO journal_questions (category, question, isDefault, createdAt) VALUES (?, ?, 1, ?)', [q.category, q.question, now]);
        }
        console.log('Seeded default journal questions.');
    }
    save();
}
//# sourceMappingURL=db.js.map