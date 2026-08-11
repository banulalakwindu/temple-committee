import { getDb } from "../connection.js";

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

export function getPublicSettings(): Record<string, string> {
  const keys = [
    "app_locale",
    "auto_backup_enabled",
    "auto_backup_interval_days",
    "last_backup_at",
    "db_version",
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    out[key] = getSetting(key) ?? "";
  }
  return out;
}
