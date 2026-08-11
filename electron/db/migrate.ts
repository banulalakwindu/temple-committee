import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { scryptSync, randomBytes } from "node:crypto";
import { seedDefaultVillages } from "./repositories/villages.js";
import { seedDefaultTempleInfo } from "./repositories/templeInfo.js";

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
    // Packaged app: copied via electron-builder extraResources
    typeof process.resourcesPath === "string"
      ? path.join(process.resourcesPath, "migrations")
      : "",
    path.join(__dirname, "migrations"),
    path.join(__dirname, "db", "migrations"),
    path.join(__dirname, "..", "db", "migrations"),
    path.join(__dirname, "..", "electron", "db", "migrations"),
    path.join(process.cwd(), "electron", "db", "migrations"),
  ].filter(Boolean);
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
    insert.run("db_version", "1");
  }

  const eventCount = db
    .prepare("SELECT COUNT(*) AS c FROM attendance_events")
    .get() as { c: number };
  if (eventCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO attendance_events (name_si, name_en, sort_order) VALUES (?, ?, ?)",
    );
    ins.run("පෝය දිනය", "Poya Day", 1);
    ins.run("වෙසක් දිනය", "Vesak Day", 2);
    ins.run("ධර්ම පාසල", "Dhamma School", 3);
  }

  const docCount = db
    .prepare("SELECT COUNT(*) AS c FROM document_types")
    .get() as { c: number };
  if (docCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO document_types (name_si, name_en, sort_order) VALUES (?, ?, ?)",
    );
    ins.run("නිවාස සහතිකය", "Residence Letter", 1);
    ins.run("සාමාජිකත්ව තහවුරුව", "Membership Confirmation", 2);
    ins.run("චරිත සහතිකය", "Character Certificate", 3);
  }

  const payTypeCount = db
    .prepare("SELECT COUNT(*) AS c FROM payment_types")
    .get() as { c: number };
  if (payTypeCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO payment_types (name_si, name_en, amount, sort_order) VALUES (?, ?, ?, ?)",
    );
    ins.run("සාමාජික ගාස්තුව", "Membership fee", 500, 1);
  }

  // Default temple-area villages when catalog is empty.
  seedDefaultVillages();
  seedDefaultTempleInfo();
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
  is_archived INTEGER NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_houses_archived ON houses(is_archived);
CREATE TABLE IF NOT EXISTS villages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
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
  is_archived INTEGER NOT NULL DEFAULT 0,
  daham_school_child INTEGER NOT NULL DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_people_birthday ON people(birthday);
CREATE INDEX IF NOT EXISTS idx_people_archived ON people(is_archived);
CREATE INDEX IF NOT EXISTS idx_people_daham_school ON people(daham_school_child);
CREATE TABLE IF NOT EXISTS attendance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
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
CREATE TABLE IF NOT EXISTS dana_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  dana_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  recurrence_type TEXT NOT NULL,
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_unit TEXT NOT NULL DEFAULT 'months',
  end_type TEXT NOT NULL DEFAULT 'never',
  end_date TEXT,
  occurrence_count INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dana_sched_house ON dana_schedules(house_id);
CREATE TABLE IF NOT EXISTS dana_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES dana_schedules(id) ON DELETE SET NULL,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  dana_type TEXT NOT NULL,
  dana_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dana_occ_unique
  ON dana_occurrences(house_id, dana_date, dana_type)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_dana_occ_date ON dana_occurrences(dana_date);
CREATE INDEX IF NOT EXISTS idx_dana_occ_house ON dana_occurrences(house_id);
CREATE INDEX IF NOT EXISTS idx_dana_occ_schedule ON dana_occurrences(schedule_id);
CREATE TABLE IF NOT EXISTS temple_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_si TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_events_start ON temple_events(start_date);
CREATE INDEX IF NOT EXISTS idx_temple_events_end ON temple_events(end_date);
CREATE TABLE IF NOT EXISTS temple_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_si TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'inside',
  color_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_start ON temple_tasks(start_at);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_end ON temple_tasks(end_at);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_location ON temple_tasks(location_type);
CREATE TABLE IF NOT EXISTS payment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT NOT NULL,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  house_id INTEGER REFERENCES houses(id) ON DELETE CASCADE,
  payment_type_id INTEGER REFERENCES payment_types(id) ON DELETE SET NULL,
  type_name_si TEXT NOT NULL DEFAULT '',
  type_name_en TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  payment_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_person ON payments(person_id);
CREATE INDEX IF NOT EXISTS idx_payments_house ON payments(house_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type_id);
CREATE TABLE IF NOT EXISTS temple_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_si TEXT NOT NULL DEFAULT '',
  label_en TEXT NOT NULL DEFAULT '',
  value_si TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_info_sort ON temple_info(sort_order);
`;

/**
 * Migrations that always ship inside the compiled app.
 * When you add `002_something.sql`, also add it here (or rely on packaged
 * `extraResources/migrations`). Disk files override the same version number.
 */
const EMBEDDED_MIGRATIONS: Record<number, string> = {
  1: EMBEDDED_001,
};

function loadMigrations(): { version: number; sql: string }[] {
  const byVersion = new Map<number, string>();
  for (const [version, sql] of Object.entries(EMBEDDED_MIGRATIONS)) {
    byVersion.set(Number(version), sql);
  }

  const dir = resolveMigrationsDir();
  if (dir) {
    for (const file of fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const version = Number.parseInt(file.split("_")[0] ?? "", 10);
      if (!Number.isFinite(version)) continue;
      byVersion.set(version, fs.readFileSync(path.join(dir, file), "utf8"));
    }
  }

  return [...byVersion.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([version, sql]) => ({ version, sql }));
}

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

  const migrations = loadMigrations();
  if (!migrations.length) {
    throw new Error("No database migrations found");
  }

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.exec(migration.sql);
    db.prepare(
      "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)",
    ).run(migration.version, nowIso());
  }

  // Dev/upgrade safety: patch older DBs that already recorded version 1
  // before later schema pieces existed in 001.
  ensureDanaTables(db);
  ensureTempleEventsTable(db);
  ensureTempleTasksTable(db);
  ensurePaymentTables(db);
  ensureVillagesTable(db);
  ensurePeopleDahamSchoolColumn(db);
  ensureTempleInfoTable(db);

  seedDefaults(db);
}

function ensureDanaTables(db: DatabaseSync): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS dana_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  dana_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  recurrence_type TEXT NOT NULL,
  recurrence_interval INTEGER NOT NULL DEFAULT 1,
  recurrence_unit TEXT NOT NULL DEFAULT 'months',
  end_type TEXT NOT NULL DEFAULT 'never',
  end_date TEXT,
  occurrence_count INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dana_sched_house ON dana_schedules(house_id);
CREATE TABLE IF NOT EXISTS dana_occurrences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES dana_schedules(id) ON DELETE SET NULL,
  house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  dana_type TEXT NOT NULL,
  dana_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dana_occ_unique
  ON dana_occurrences(house_id, dana_date, dana_type)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_dana_occ_date ON dana_occurrences(dana_date);
CREATE INDEX IF NOT EXISTS idx_dana_occ_house ON dana_occurrences(house_id);
CREATE INDEX IF NOT EXISTS idx_dana_occ_schedule ON dana_occurrences(schedule_id);
`);
}

function ensureTempleEventsTable(db: DatabaseSync): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS temple_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_si TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  color_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_events_start ON temple_events(start_date);
CREATE INDEX IF NOT EXISTS idx_temple_events_end ON temple_events(end_date);
`);
}

function ensureTempleTasksTable(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(temple_tasks)").all() as {
    name: string;
  }[];
  const names = new Set(cols.map((c) => c.name));
  // Dev reset when older task_date / start_time schema is present.
  if (
    cols.length > 0 &&
    (!names.has("start_at") || !names.has("end_at") || !names.has("location_type"))
  ) {
    db.exec("DROP TABLE IF EXISTS temple_tasks");
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS temple_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_si TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'inside',
  color_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_start ON temple_tasks(start_at);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_end ON temple_tasks(end_at);
CREATE INDEX IF NOT EXISTS idx_temple_tasks_location ON temple_tasks(location_type);
`);
}

function ensurePaymentTables(db: DatabaseSync): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS payment_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_type TEXT NOT NULL,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  house_id INTEGER REFERENCES houses(id) ON DELETE CASCADE,
  payment_type_id INTEGER REFERENCES payment_types(id) ON DELETE SET NULL,
  type_name_si TEXT NOT NULL DEFAULT '',
  type_name_en TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  payment_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_person ON payments(person_id);
CREATE INDEX IF NOT EXISTS idx_payments_house ON payments(house_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type_id);
`);
}

function ensureVillagesTable(db: DatabaseSync): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS villages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_si TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
`);
}

function ensurePeopleDahamSchoolColumn(db: DatabaseSync): void {
  const cols = db.prepare("PRAGMA table_info(people)").all() as {
    name: string;
  }[];
  if (cols.some((c) => c.name === "daham_school_child")) return;
  db.exec(
    "ALTER TABLE people ADD COLUMN daham_school_child INTEGER NOT NULL DEFAULT 0",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_people_daham_school ON people(daham_school_child)",
  );
}

function ensureTempleInfoTable(db: DatabaseSync): void {
  db.exec(`
CREATE TABLE IF NOT EXISTS temple_info (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label_si TEXT NOT NULL DEFAULT '',
  label_en TEXT NOT NULL DEFAULT '',
  value_si TEXT NOT NULL DEFAULT '',
  value_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_temple_info_sort ON temple_info(sort_order);
`);
}

