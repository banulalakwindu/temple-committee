import fs from "node:fs";
import path from "node:path";
import { getDb, closeDatabase, reopenDatabase } from "../db/connection.js";
import { getBackupDir, getDbPath, ensureAppDirs } from "../db/paths.js";

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function listBackups(): { name: string; path: string; mtime: string }[] {
  ensureAppDirs();
  const dir = getBackupDir();
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sqlite"))
    .map((name) => {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      return {
        name,
        path: full,
        mtime: st.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export function backupDatabase(label = "auto"): string {
  ensureAppDirs();
  const dest = path.join(getBackupDir(), `temple_${label}_${stamp()}.sqlite`);
  const db = getDb();
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    // ignore
  }
  closeDatabase();
  fs.copyFileSync(getDbPath(), dest);
  reopenDatabase();
  try {
    getDb()
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .run("last_backup_at", new Date().toISOString());
  } catch {
    // settings may not exist yet
  }
  return dest;
}

export function restoreDatabase(backupPath: string): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error("Backup file not found");
  }
  backupDatabase("pre-restore");
  const dbPath = getDbPath();
  closeDatabase();
  fs.copyFileSync(backupPath, dbPath);
  reopenDatabase();
}

export function maybeAutoBackup(): void {
  const db = getDb();
  const enabled = (
    db.prepare("SELECT value FROM settings WHERE key = ?").get(
      "auto_backup_enabled",
    ) as { value: string } | undefined
  )?.value;
  if (enabled !== "1") return;

  const days = Number(
    (
      db.prepare("SELECT value FROM settings WHERE key = ?").get(
        "auto_backup_interval_days",
      ) as { value: string } | undefined
    )?.value ?? "1",
  );
  const last = (
    db.prepare("SELECT value FROM settings WHERE key = ?").get(
      "last_backup_at",
    ) as { value: string } | undefined
  )?.value;

  if (!last) {
    backupDatabase("auto");
    return;
  }
  const lastMs = Date.parse(last);
  const intervalMs = Math.max(1, days) * 24 * 60 * 60 * 1000;
  if (Number.isNaN(lastMs) || Date.now() - lastMs >= intervalMs) {
    backupDatabase("auto");
  }
}
