-- Temple Community initial schema
-- TODO: replace custom_field_* with real Sinhala form attributes

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

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
  -- TODO: replace with real form attributes
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
  -- TODO: replace with real form attributes
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
