/**
 * Demo data seeder for local testing.
 * Usage: npm run seed
 * Force add again: FORCE_SEED=1 npm run seed
 * Optional: TEMPLE_DB_PATH=C:\path\to\temple.sqlite npm run seed
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";

function resolveDbPath() {
  if (process.env.TEMPLE_DB_PATH) return process.env.TEMPLE_DB_PATH;
  const appData =
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const candidates = [
    path.join(appData, "temple-community", "TempleCommunity", "data", "temple.sqlite"),
    path.join(appData, "Temple Community", "TempleCommunity", "data", "temple.sqlite"),
    path.join(appData, "TempleCommunity", "data", "temple.sqlite"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

function nowIso() {
  return new Date().toISOString();
}

function ensureSchema(db) {
  db.exec(`
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
      custom_field_1 TEXT NOT NULL DEFAULT '',
      custom_field_2 TEXT NOT NULL DEFAULT '',
      custom_field_3 TEXT NOT NULL DEFAULT '',
      custom_field_4 TEXT NOT NULL DEFAULT '',
      custom_field_5 TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
      is_active INTEGER NOT NULL DEFAULT 1,
      custom_field_1 TEXT NOT NULL DEFAULT '',
      custom_field_2 TEXT NOT NULL DEFAULT '',
      custom_field_3 TEXT NOT NULL DEFAULT '',
      custom_field_4 TEXT NOT NULL DEFAULT '',
      custom_field_5 TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS person_house_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      from_house_id INTEGER REFERENCES houses(id) ON DELETE SET NULL,
      to_house_id INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
      moved_at TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
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
  `);
}

const houses = [
  ["H-001", "Wijesinghe House", "Wijesinghe House", "12 Daranagama Road", "12 Daranagama Road", "Kalutara", "Kalutara", "0342221100"],
  ["H-002", "Perera House", "Perera House", "45 Riverside", "45 Riverside", "Panadura", "Panadura", "0382233445"],
  ["H-003", "Silva House", "Silva House", "7 Bodhi Mawatha", "7 Bodhi Mawatha", "Horana", "Horana", "0345678901"],
  ["H-004", "Fernando House", "Fernando House", "22 Temple Road", "22 Temple Road", "Kalutara", "Kalutara", "0771234567"],
  ["H-005", "Jayasuriya House", "Jayasuriya House", "9 School Road", "9 School Road", "Bandaragama", "Bandaragama", "0719988776"],
];

/** @type {Array<Array<{en:string,gender:string,rel:string,nic:string,phone:string,birth:string,occ:string}>>} */
const families = [
  [
    { en: "Nimal Wijesinghe", gender: "male", rel: "Father", nic: "781234567V", phone: "0771112233", birth: "1978-03-12", occ: "Teacher" },
    { en: "Kusum Wijesinghe", gender: "female", rel: "Mother", nic: "825678901V", phone: "0771112244", birth: "1982-07-21", occ: "Homemaker" },
    { en: "Amal Wijesinghe", gender: "male", rel: "Son", nic: "200512345678", phone: "0715556677", birth: "2005-11-02", occ: "Student" },
  ],
  [
    { en: "Sunil Perera", gender: "male", rel: "Father", nic: "701112223V", phone: "0772223344", birth: "1970-01-15", occ: "Trader" },
    { en: "Malani Perera", gender: "female", rel: "Mother", nic: "755556667V", phone: "0772223355", birth: "1975-09-08", occ: "Nurse" },
    { en: "Sachini Perera", gender: "female", rel: "Daughter", nic: "200812345679", phone: "", birth: "2008-04-30", occ: "Student" },
  ],
  [
    { en: "Ranjith Silva", gender: "male", rel: "Father", nic: "680998877V", phone: "0763334455", birth: "1968-12-01", occ: "Farmer" },
    { en: "Chandra Silva", gender: "female", rel: "Mother", nic: "723334445V", phone: "0763334466", birth: "1972-06-18", occ: "Homemaker" },
  ],
  [
    { en: "Pradeep Fernando", gender: "male", rel: "Father", nic: "850112233V", phone: "0754445566", birth: "1985-02-20", occ: "Engineer" },
    { en: "Nilmini Fernando", gender: "female", rel: "Mother", nic: "880445566V", phone: "0754445577", birth: "1988-08-14", occ: "Accountant" },
    { en: "Kawindu Fernando", gender: "male", rel: "Son", nic: "", phone: "", birth: "2015-05-05", occ: "Student" },
  ],
  [
    { en: "Asanka Jayasuriya", gender: "male", rel: "Father", nic: "920556677V", phone: "0746667788", birth: "1992-10-10", occ: "Driver" },
    { en: "Dilhani Jayasuriya", gender: "female", rel: "Mother", nic: "945667788V", phone: "0746667799", birth: "1994-03-25", occ: "Teacher" },
  ],
];

function main() {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  console.log("Seeding:", dbPath);

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  ensureSchema(db);

  const force =
    process.env.FORCE_SEED === "1" || process.argv.includes("--force");
  const houseCount = db.prepare("SELECT COUNT(*) AS c FROM houses").get().c;
  if (houseCount > 0 && !force) {
    console.log(
      `DB already has ${houseCount} houses. Use npm run seed:force to add more.`,
    );
    db.close();
    process.exit(0);
  }

  const ts = nowIso();
  const insertHouse = db.prepare(`
    INSERT INTO houses (
      house_number, name_si, name_en, address_si, address_en,
      village_si, village_en, telephone, notes, is_active,
      custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 1, '', '', '', '', '', ?, ?)
  `);
  const insertPerson = db.prepare(`
    INSERT INTO people (
      full_name_si, full_name_en, gender, birthday, nic, phone,
      occupation_si, occupation_en, relationship_in_family,
      address_si, address_en, notes, current_house_id, is_active,
      custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '', ?, 1, '', '', '', '', '', ?, ?)
  `);
  const insertHist = db.prepare(`
    INSERT INTO person_house_history (person_id, from_house_id, to_house_id, moved_at, reason, created_at)
    VALUES (?, NULL, ?, ?, 'Seeded', ?)
  `);

  if (db.prepare("SELECT COUNT(*) AS c FROM attendance_events").get().c === 0) {
    const ins = db.prepare(
      "INSERT INTO attendance_events (name_si, name_en, is_active, sort_order) VALUES (?, ?, 1, ?)",
    );
    ins.run("Poya Day", "Poya Day", 1);
    ins.run("Vesak", "Vesak", 2);
    ins.run("Dhamma School", "Dhamma School", 3);
  }

  if (db.prepare("SELECT COUNT(*) AS c FROM document_types").get().c === 0) {
    const ins = db.prepare(
      "INSERT INTO document_types (name_si, name_en, is_active, sort_order) VALUES (?, ?, 1, ?)",
    );
    ins.run("Residence Letter", "Residence Letter", 1);
    ins.run("Membership Confirmation", "Membership Confirmation", 2);
    ins.run("Character Certificate", "Character Certificate", 3);
  }

  const houseIds = [];
  for (const h of houses) {
    const r = insertHouse.run(...h, ts, ts);
    houseIds.push(Number(r.lastInsertRowid));
  }

  let people = 0;
  families.forEach((members, idx) => {
    const houseId = houseIds[idx];
    for (const m of members) {
      const r = insertPerson.run(
        m.en,
        m.en,
        m.gender,
        m.birth,
        m.nic,
        m.phone,
        m.occ,
        m.occ,
        m.rel,
        houseId,
        ts,
        ts,
      );
      insertHist.run(Number(r.lastInsertRowid), houseId, ts, ts);
      people += 1;
    }
  });

  const eventId = db.prepare("SELECT id FROM attendance_events ORDER BY id LIMIT 1").get()?.id;
  const firstPeople = db.prepare("SELECT id, current_house_id FROM people ORDER BY id DESC LIMIT 5").all();
  const mark = db.prepare(`
    INSERT INTO attendance (person_id, house_id, attendance_date, event_id, event_other, notes, marked_at)
    VALUES (?, ?, ?, ?, NULL, 'Seed attendance', ?)
  `);
  const today = new Date().toISOString().slice(0, 10);
  for (const p of firstPeople) {
    mark.run(p.id, p.current_house_id, today, eventId ?? null, ts);
  }

  const person1 = firstPeople[0];
  if (person1) {
    const dtype = db.prepare("SELECT id FROM document_types ORDER BY id LIMIT 1").get()?.id;
    db.prepare(`
      INSERT INTO document_logs (person_id, house_id, document_type_id, document_other, issue_date, issued_by, remarks, created_at)
      VALUES (?, ?, ?, NULL, ?, 'Temple Office', 'School application', ?)
    `).run(person1.id, person1.current_house_id, dtype ?? null, today, ts);
  }

  db.prepare(`
    INSERT INTO pending_requests (request_type, payload_json, target_person_id, target_house_id, status, submitted_at, review_note)
    VALUES ('create_person', ?, NULL, ?, 'pending', ?, '')
  `).run(
    JSON.stringify({
      full_name_si: "New Applicant",
      full_name_en: "New Applicant",
      gender: "male",
      phone: "0700001111",
      current_house_id: houseIds[0],
    }),
    houseIds[0],
    ts,
  );

  db.close();
  console.log(
    `Done. Seeded ${houseIds.length} houses, ${people} people, sample attendance/docs/pending.`,
  );
}

main();
