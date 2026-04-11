// @ts-nocheck
import Dexie from "dexie"

export const db = new Dexie("control_app_db")

db.version(1).stores({
  goals: "id, createdAt",
  sessions: "id, goalId, createdAt",
  failures: "id, goalId, createdAt",
  journals: "id, goalId, createdAt",
  settings: "key",
})

db.version(2).stores({
  goals: "id, createdAt",
  sessions: "id, goalId, createdAt",
  failures: "id, goalId, createdAt",
  journals: "id, goalId, createdAt",
  frameworks: "id, createdAt",
  settings: "key",
})

// v3: no schema changes, just ensures all tables are stable with a newer version
db.version(3).stores({
  goals: "id, createdAt",
  sessions: "id, goalId, status, createdAt",
  failures: "id, goalId, createdAt",
  journals: "id, goalId, type, createdAt",
  frameworks: "id, createdAt",
  settings: "key",
})

/**
 * Save (upsert) a record to IndexedDB.
 * Immediately persists — no delay, no batching.
 */
export const saveToDB = async (table: string, data: unknown): Promise<void> => {
  try {
    if (!data || typeof data !== 'object') return;
    await db.table(table).put(data)
  } catch (e) {
    console.error("[persistence] DB save failed:", table, e)
  }
}

/**
 * Load all records from a table.
 * Returns [] on error — never throws.
 */
export const getAllFromDB = async (table: string): Promise<unknown[]> => {
  try {
    return await db.table(table).toArray()
  } catch (e) {
    console.error("[persistence] DB load failed:", table, e)
    return []
  }
}

/**
 * Delete a record from IndexedDB by id.
 * Tries both string and numeric forms of the id to handle
 * cases where the key was saved as one type but referenced as another.
 */
export const deleteFromDB = async (table: string, id: string | number): Promise<void> => {
  try {
    const strId = String(id)
    const numId = Number(id)
    await db.table(table).delete(strId)
    // Also attempt numeric deletion in case the record was originally saved with a numeric key
    if (!isNaN(numId) && numId !== 0) {
      try { await db.table(table).delete(numId) } catch { /* ignore */ }
    }
  } catch (e) {
    console.error("[persistence] DB delete failed:", table, e)
  }
}
