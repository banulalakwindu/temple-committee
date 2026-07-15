import { DatabaseSync } from "node:sqlite";
import { getDbPath } from "./paths.js";

let db: DatabaseSync | null = null;

export type Stmt = ReturnType<DatabaseSync["prepare"]>;

export function getDb(): DatabaseSync {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

export function openDatabase(): DatabaseSync {
  if (db) return db;
  db = new DatabaseSync(getDbPath());
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function reopenDatabase(): DatabaseSync {
  closeDatabase();
  return openDatabase();
}
