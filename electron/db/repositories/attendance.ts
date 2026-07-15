import { getDb } from "../connection.js";
import type { AttendanceRow, NamedType } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function listEvents(activeOnly = false): NamedType[] {
  const sql = activeOnly
    ? "SELECT * FROM attendance_events WHERE is_active = 1 ORDER BY sort_order, id"
    : "SELECT * FROM attendance_events ORDER BY sort_order, id";
  return getDb().prepare(sql).all() as NamedType[];
}

export function upsertEvent(
  input: Partial<NamedType> & { name_si: string; name_en: string },
): NamedType {
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE attendance_events SET name_si=?, name_en=?, is_active=?, sort_order=? WHERE id=?`,
      )
      .run(
        input.name_si,
        input.name_en,
        input.is_active ?? 1,
        input.sort_order ?? 0,
        input.id,
      );
    return getDb()
      .prepare("SELECT * FROM attendance_events WHERE id = ?")
      .get(input.id) as NamedType;
  }
  const r = getDb()
    .prepare(
      `INSERT INTO attendance_events (name_si, name_en, is_active, sort_order) VALUES (?, ?, ?, ?)`,
    )
    .run(
      input.name_si,
      input.name_en,
      input.is_active ?? 1,
      input.sort_order ?? 0,
    );
  return getDb()
    .prepare("SELECT * FROM attendance_events WHERE id = ?")
    .get(Number(r.lastInsertRowid)) as NamedType;
}


export type AttendanceFilters = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  eventId?: number | null;
  houseId?: number | null;
  village?: string;
};

export function listAttendance(
  filters: AttendanceFilters = {},
): AttendanceRow[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(p.full_name_si LIKE ? OR p.full_name_en LIKE ? OR h.name_si LIKE ? OR h.name_en LIKE ? OR IFNULL(a.event_other,'') LIKE ? OR IFNULL(e.name_si,'') LIKE ? OR IFNULL(e.name_en,'') LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like);
  }
  if (filters.dateFrom) {
    where.push("a.attendance_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push("a.attendance_date <= ?");
    params.push(filters.dateTo);
  }
  if (filters.eventId) {
    where.push("a.event_id = ?");
    params.push(filters.eventId);
  }
  if (filters.houseId) {
    where.push("a.house_id = ?");
    params.push(filters.houseId);
  }
  if (filters.village?.trim()) {
    where.push("(h.village_si LIKE ? OR h.village_en LIKE ?)");
    const like = `%${filters.village.trim()}%`;
    params.push(like, like);
  }

  return getDb()
    .prepare(
      `SELECT a.*,
        p.full_name_si AS person_name_si,
        p.full_name_en AS person_name_en,
        h.name_si AS house_name_si,
        e.name_si AS event_name_si,
        e.name_en AS event_name_en
       FROM attendance a
       JOIN people p ON p.id = a.person_id
       LEFT JOIN houses h ON h.id = a.house_id
       LEFT JOIN attendance_events e ON e.id = a.event_id
       WHERE ${where.join(" AND ")}
       ORDER BY a.attendance_date DESC, a.id DESC`,
    )
    .all(...(params as never[])) as AttendanceRow[];
}

export function markAttendance(payload: {
  personIds: number[];
  houseId?: number | null;
  attendanceDate: string;
  eventId?: number | null;
  eventOther?: string | null;
  notes?: string;
}): number {
  if (!payload.eventId && !payload.eventOther?.trim()) {
    throw new Error("Event or Other text is required");
  }
  const db = getDb();
  const ts = nowIso();
  const insert = db.prepare(
    `INSERT INTO attendance (person_id, house_id, attendance_date, event_id, event_other, notes, marked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const getPersonHouse = db.prepare(
    "SELECT current_house_id FROM people WHERE id = ?",
  );
  let count = 0;
  db.exec("BEGIN");
  try {
    for (const personId of payload.personIds) {
      const row = getPersonHouse.get(personId) as
        | { current_house_id: number | null }
        | undefined;
      const houseId = payload.houseId ?? row?.current_house_id ?? null;
      insert.run(
        personId,
        houseId,
        payload.attendanceDate,
        payload.eventId ?? null,
        payload.eventOther?.trim() || null,
        payload.notes ?? "",
        ts,
      );
      count += 1;
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return count;
}

export function attendanceForPerson(personId: number): AttendanceRow[] {
  return listAttendance({ q: "" }).filter((a) => a.person_id === personId);
}

export function todayCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM attendance WHERE attendance_date = ?",
    )
    .get(today) as { c: number | bigint } | undefined;
  return Number(row?.c ?? 0);
}
