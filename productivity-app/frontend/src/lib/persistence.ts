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

export const saveToDB = async (table, data) => {
  try {
    await db.table(table).put(data)
  } catch (e) {
    console.error("DB save failed:", table, e)
  }
}

export const getAllFromDB = async (table) => {
  try {
    return await db.table(table).toArray()
  } catch (e) {
    console.error("DB load failed:", table, e)
    return []
  }
}

export const deleteFromDB = async (table, id) => {
  try {
    await db.table(table).delete(id)
  } catch (e) {
    console.error("DB delete failed:", table, e)
  }
}
