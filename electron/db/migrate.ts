import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function resolveMigrationsDir(): string | null {
  const candidates = [
    path.join(__dirname, "migrations"),
    path.join(__dirname, "db", "migrations"),
    path.join(__dirname, "..", "db", "migrations"),
    path.join(__dirname, "..", "electron", "db", "migrations"),
    path.join(process.cwd(), "electron", "db", "migrations"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function seedDefaults(db: DatabaseSync): void {
  const hasAdmin = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("admin_password_hash") as { value: string } | undefined;

  if (!hasAdmin) {
    const insert = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?)",
    );
    insert.run("admin_password_hash", hashPassword("admin123"));
    insert.run("app_locale", "si");
    insert.run("auto_backup_enabled", "1");
    insert.run("auto_backup_interval_days", "1");
    insert.run("last_backup_at", "");
    insert.run("temple_name_si", "විහාරස්ථානය");
    insert.run("temple_name_en", "Temple Community");
    insert.run("db_version", "1");
  }

  const eventCount = db
    .prepare("SELECT COUNT(*) AS c FROM attendance_events")
    .get() as { c: number };
  if (eventCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO attendance_events (name_si, name_en, is_active, sort_order) VALUES (?, ?, 1, ?)",
    );
    ins.run("පෝය දිනය", "Poya Day", 1);
    ins.run("වෙසක්", "Vesak", 2);
    ins.run("ධර්ම පාසල", "Dhamma School", 3);
  }

  const docCount = db
    .prepare("SELECT COUNT(*) AS c FROM document_types")
    .get() as { c: number };
  if (docCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO document_types (name_si, name_en, is_active, sort_order) VALUES (?, ?, 1, ?)",
    );
    ins.run("නිවාස සහතිකය", "Residence Letter", 1);
    ins.run("සාමාජිකත්ව තහවුරුව", "Membership Confirmation", 2);
    ins.run("චරිත සහතිකය", "Character Certificate", 3);
  }
}

const EMBEDDED_001 = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS houses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_number TEXT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  address_si TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT '',
  village_si TEXT NOT NULL DEFAULT '',
  village_en TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  custom_field_1 TEXT NOT NULL DEFAULT '',
  custom_field_2 TEXT NOT NULL DEFAULT '',
  custom_field_3 TEXT NOT NULL DEFAULT '',
  custom_field_4 TEXT NOT NULL DEFAULT '',
  custom_field_5 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_houses_house_number
  ON houses(house_number) WHERE house_number IS NOT NULL AND house_number != '';
CREATE INDEX IF NOT EXISTS idx_houses_name_si ON houses(name_si);
CREATE INDEX IF NOT EXISTS idx_houses_name_en ON houses(name_en);
CREATE INDEX IF NOT EXISTS idx_houses_village_si ON houses(village_si);
CREATE INDEX IF NOT EXISTS idx_houses_telephone ON houses(telephone);
CREATE INDEX IF NOT EXISTS idx_houses_active ON houses(is_active);
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name_si TEXT NOT NULL DEFAULT '',
  full_name_en TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  birthday TEXT,
  nic TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  occupation_si TEXT NOT NULL DEFAULT '',
  occupation_en TEXT NOT NULL DEFAULT '',
  relationship_in_family TEXT NOT NULL DEFAULT '',
  address_si TEXT NOT NULL DEFAULT '',
  address_en TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  current_house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  custom_field_1 TEXT NOT NULL DEFAULT '',
  custom_field_2 TEXT NOT NULL DEFAULT '',
  custom_field_3 TEXT NOT NULL DEFAULT '',
  custom_field_4 TEXT NOT NULL DEFAULT '',
  custom_field_5 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_people_name_si ON people(full_name_si);
CREATE INDEX IF NOT EXISTS idx_people_name_en ON people(full_name_en);
CREATE INDEX IF NOT EXISTS idx_people_nic ON people(nic);
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone);
CREATE INDEX IF NOT EXISTS idx_people_house ON people(current_house_id);
CREATE INDEX IF NOT EXISTS idx_people_active ON people(is_active);
CREATE INDEX IF NOT EXISTS idx_people_birthday ON people(birthday);
CREATE TABLE IF NOT EXISTS person_house_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  from_house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  to_house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  moved_at TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_person ON person_house_history(person_id);
CREATE TABLE IF NOT EXISTS attendance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  attendance_date TEXT NOT NULL,
  event_id INTEGER REFERENCES attendance_events(id) ON DELETE SET NULL,
  event_other TEXT,
  notes TEXT NOT NULL DEFAULT '',
  marked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_person ON attendance(person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_house ON attendance(house_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance(event_id);
CREATE TABLE IF NOT EXISTS document_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS document_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
  document_other TEXT,
  issue_date TEXT NOT NULL,
  issued_by TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docs_person ON document_logs(person_id);
CREATE INDEX IF NOT EXISTS idx_docs_date ON document_logs(issue_date);
CREATE INDEX IF NOT EXISTS idx_docs_type ON document_logs(document_type_id);
CREATE TABLE IF NOT EXISTS pending_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  target_person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  target_house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  reviewed_at TEXT,
  review_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_requests(status);
CREATE INDEX IF NOT EXISTS idx_pending_type ON pending_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_pending_submitted ON pending_requests(submitted_at);
`;

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (
      db.prepare("SELECT version FROM schema_migrations").all() as {
        version: number;
      }[]
    ).map((r) => r.version),
  );

  const migrations: { version: number; sql: string }[] = [];
  const dir = resolveMigrationsDir();
  if (dir) {
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const version = Number.parseInt(file.split("_")[0] ?? "", 10);
      if (!Number.isFinite(version)) continue;
      migrations.push({
        version,
        sql: fs.readFileSync(path.join(dir, file), "utf8"),
      });
    }
  } else {
    migrations.push({ version: 1, sql: EMBEDDED_001 });
  }

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.exec(migration.sql);
    db.prepare(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    ).run(migration.version, nowIso());
  }

  seedDefaults(db);
}
