import { getDb } from "../connection.js";
import type {
  DanaCreateInput,
  DanaDateGroup,
  DanaEndType,
  DanaHouseHistory,
  DanaMonthDaySummary,
  DanaOccurrence,
  DanaRecurrenceType,
  DanaRecurrenceUnit,
  DanaSchedule,
  DanaType,
  DanaUpdateScheduleInput,
} from "../../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar YYYY-MM-DD (never use UTC slice). */
export function localToday(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = dateStr.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function formatLocalDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

/**
 * Add N months, clamping day-of-month to the last valid day
 * (e.g. 31 Jan + 1 month → 28/29 Feb).
 */
function addMonthsClamped(dateStr: string, months: number): string {
  const { y, m, d } = parseLocalDate(dateStr);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dim = daysInMonth(ny, nm);
  return formatLocalDate(ny, nm, Math.min(d, dim));
}

function addYearsClamped(dateStr: string, years: number): string {
  return addMonthsClamped(dateStr, years * 12);
}

function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseLocalDate(dateStr);
  const dt = new Date(y, m - 1, d + days);
  return localToday(dt);
}

function assertDate(dateStr: string, label = "Date"): void {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const { y, m, d } = parseLocalDate(dateStr);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new Error(`${label} is not a valid calendar date`);
  }
}

function normalizeRecurrence(input: {
  recurrenceType: DanaRecurrenceType;
  recurrenceInterval?: number;
  recurrenceUnit?: DanaRecurrenceUnit;
}): {
  recurrence_type: DanaRecurrenceType;
  recurrence_interval: number;
  recurrence_unit: DanaRecurrenceUnit;
} {
  const type = input.recurrenceType;
  switch (type) {
    case "once":
      return {
        recurrence_type: "once",
        recurrence_interval: 1,
        recurrence_unit: "months",
      };
    case "monthly":
      return {
        recurrence_type: "monthly",
        recurrence_interval: 1,
        recurrence_unit: "months",
      };
    case "every_3_months":
      return {
        recurrence_type: "every_3_months",
        recurrence_interval: 3,
        recurrence_unit: "months",
      };
    case "every_6_months":
      return {
        recurrence_type: "every_6_months",
        recurrence_interval: 6,
        recurrence_unit: "months",
      };
    case "annually":
      return {
        recurrence_type: "annually",
        recurrence_interval: 1,
        recurrence_unit: "years",
      };
    case "custom": {
      const interval = Math.max(1, Math.floor(input.recurrenceInterval ?? 1));
      const unit = input.recurrenceUnit ?? "months";
      if (!["days", "months", "years"].includes(unit)) {
        throw new Error("Invalid recurrence unit");
      }
      return {
        recurrence_type: "custom",
        recurrence_interval: interval,
        recurrence_unit: unit,
      };
    }
    default:
      throw new Error("Invalid recurrence type");
  }
}

function nextDate(
  dateStr: string,
  interval: number,
  unit: DanaRecurrenceUnit,
): string {
  if (unit === "days") return addDays(dateStr, interval);
  if (unit === "years") return addYearsClamped(dateStr, interval);
  return addMonthsClamped(dateStr, interval);
}

type Rule = {
  start_date: string;
  recurrence_type: DanaRecurrenceType;
  recurrence_interval: number;
  recurrence_unit: DanaRecurrenceUnit;
  end_type: DanaEndType;
  end_date: string | null;
  occurrence_count: number | null;
};

/**
 * Enumerate occurrence dates from the schedule rule up to `rangeEnd`
 * (inclusive). Does not write to the database.
 */
function generateDates(rule: Rule, rangeEnd: string): string[] {
  const dates: string[] = [];
  if (rule.recurrence_type === "once") {
    if (rule.start_date <= rangeEnd) dates.push(rule.start_date);
    return dates;
  }

  let cursor = rule.start_date;
  const maxCount =
    rule.end_type === "count"
      ? Math.max(1, Math.floor(rule.occurrence_count ?? 1))
      : Number.POSITIVE_INFINITY;
  const until =
    rule.end_type === "until" && rule.end_date
      ? rule.end_date < rangeEnd
        ? rule.end_date
        : rangeEnd
      : rangeEnd;

  let guard = 0;
  while (cursor <= until && dates.length < maxCount && guard < 10000) {
    dates.push(cursor);
    cursor = nextDate(
      cursor,
      rule.recurrence_interval,
      rule.recurrence_unit,
    );
    guard += 1;
  }
  return dates;
}

function ruleFromSchedule(s: DanaSchedule): Rule {
  return {
    start_date: s.start_date,
    recurrence_type: s.recurrence_type,
    recurrence_interval: s.recurrence_interval,
    recurrence_unit: s.recurrence_unit,
    end_type: s.end_type,
    end_date: s.end_date,
    occurrence_count: s.occurrence_count,
  };
}

function getHouseOrThrow(houseId: number): {
  id: number;
  is_archived: number;
} {
  const row = getDb()
    .prepare("SELECT id, is_archived FROM houses WHERE id = ?")
    .get(houseId) as { id: number; is_archived: number } | undefined;
  if (!row) throw new Error("Household not found");
  return row;
}

function assertDanaType(t: string): asserts t is DanaType {
  if (t !== "heel" && t !== "dawal") throw new Error("Invalid Dāna type");
}

function scheduleSelect(id: number): DanaSchedule | null {
  return (
    (getDb()
      .prepare(
        `SELECT s.*,
          h.house_number AS house_number,
          h.name_si AS house_name_si,
          h.name_en AS house_name_en
         FROM dana_schedules s
         JOIN houses h ON h.id = s.house_id
         WHERE s.id = ?`,
      )
      .get(id) as DanaSchedule | undefined) ?? null
  );
}

function listActiveSchedules(): DanaSchedule[] {
  return getDb()
    .prepare(
      `SELECT s.*,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en
       FROM dana_schedules s
       JOIN houses h ON h.id = s.house_id
       WHERE s.is_active = 1`,
    )
    .all() as DanaSchedule[];
}

function cancelledSetForDate(date: string): Set<string> {
  const rows = getDb()
    .prepare(
      `SELECT house_id, dana_type FROM dana_occurrences
       WHERE dana_date = ? AND status = 'cancelled'`,
    )
    .all(date) as { house_id: number; dana_type: string }[];
  return new Set(rows.map((r) => `${r.house_id}:${r.dana_type}`));
}

function cancelledKeysForSchedule(scheduleId: number): Set<string> {
  const rows = getDb()
    .prepare(
      `SELECT dana_date FROM dana_occurrences
       WHERE schedule_id = ? AND status = 'cancelled'`,
    )
    .all(scheduleId) as { dana_date: string }[];
  return new Set(rows.map((r) => r.dana_date));
}

function hasScheduledOccurrence(
  houseId: number,
  date: string,
  danaType: DanaType,
): boolean {
  return !!getDb()
    .prepare(
      `SELECT id FROM dana_occurrences
       WHERE house_id = ? AND dana_date = ? AND dana_type = ? AND status = 'scheduled'`,
    )
    .get(houseId, date, danaType);
}

function insertScheduledOccurrence(
  scheduleId: number,
  houseId: number,
  danaType: DanaType,
  date: string,
): void {
  if (hasScheduledOccurrence(houseId, date, danaType)) return;
  const cancelled = getDb()
    .prepare(
      `SELECT id FROM dana_occurrences
       WHERE house_id = ? AND dana_date = ? AND dana_type = ? AND status = 'cancelled'`,
    )
    .get(houseId, date, danaType);
  if (cancelled) return;
  const ts = nowIso();
  getDb()
    .prepare(
      `INSERT INTO dana_occurrences
        (schedule_id, house_id, dana_type, dana_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'scheduled', ?, ?)`,
    )
    .run(scheduleId, houseId, danaType, date, ts, ts);
}

/**
 * Persist past Dāna dates from active schedules into dana_occurrences.
 * Only fills dates that are still missing between start_date and yesterday.
 * Schedule edits bump start_date to today+, so they never rewrite history.
 */
export function materializePast(): void {
  const today = localToday();
  const yesterday = addDays(today, -1);
  const schedules = listActiveSchedules();
  const db = getDb();
  db.exec("BEGIN");
  try {
    for (const s of schedules) {
      if (s.start_date > yesterday) continue;
      const dates = generateDates(ruleFromSchedule(s), yesterday).filter(
        (d) => d < today && d >= s.start_date,
      );
      for (const date of dates) {
        insertScheduledOccurrence(s.id, s.house_id, s.dana_type, date);
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

function validateEnd(
  endType: DanaEndType,
  endDate: string | null | undefined,
  occurrenceCount: number | null | undefined,
  startDate: string,
): { end_type: DanaEndType; end_date: string | null; occurrence_count: number | null } {
  if (endType === "until") {
    if (!endDate) throw new Error("End date is required");
    assertDate(endDate, "End date");
    if (endDate < startDate) {
      throw new Error("End date must be on or after start date");
    }
    return { end_type: "until", end_date: endDate, occurrence_count: null };
  }
  if (endType === "count") {
    const n = Math.floor(occurrenceCount ?? 0);
    if (n < 1) throw new Error("Occurrence count must be at least 1");
    return { end_type: "count", end_date: null, occurrence_count: n };
  }
  return { end_type: "never", end_date: null, occurrence_count: null };
}

function createOneSchedule(
  houseId: number,
  danaType: DanaType,
  input: DanaCreateInput,
): DanaSchedule {
  assertDate(input.startDate, "Start date");
  const rec = normalizeRecurrence({
    recurrenceType: input.recurrenceType,
    recurrenceInterval: input.recurrenceInterval,
    recurrenceUnit: input.recurrenceUnit,
  });
  const endType =
    input.endType ?? (input.recurrenceType === "once" ? "count" : "never");
  const end = validateEnd(
    input.recurrenceType === "once" ? "count" : endType,
    input.endDate,
    input.recurrenceType === "once" ? 1 : input.occurrenceCount,
    input.startDate,
  );

  const ts = nowIso();
  const r = getDb()
    .prepare(
      `INSERT INTO dana_schedules (
        house_id, dana_type, start_date, recurrence_type, recurrence_interval,
        recurrence_unit, end_type, end_date, occurrence_count, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      houseId,
      danaType,
      input.startDate,
      rec.recurrence_type,
      rec.recurrence_interval,
      rec.recurrence_unit,
      end.end_type,
      end.end_date,
      end.occurrence_count,
      ts,
      ts,
    );

  const scheduleId = Number(r.lastInsertRowid);
  const schedule = scheduleSelect(scheduleId)!;

  // Only write past dates as historical rows. Future stays on the schedule rule.
  const today = localToday();
  if (schedule.start_date < today) {
    const dates = generateDates(ruleFromSchedule(schedule), addDays(today, -1));
    for (const date of dates) {
      insertScheduledOccurrence(scheduleId, houseId, danaType, date);
    }
  }

  return scheduleSelect(scheduleId)!;
}

export function createDana(input: DanaCreateInput): DanaSchedule[] {
  const house = getHouseOrThrow(input.houseId);
  if (house.is_archived) {
    throw new Error("Cannot assign Dāna to an archived household");
  }
  const types: DanaType[] =
    input.danaType === "both"
      ? ["heel", "dawal"]
      : input.danaType === "heel" || input.danaType === "dawal"
        ? [input.danaType]
        : (() => {
            throw new Error("Invalid Dāna type");
          })();

  const db = getDb();
  const created: DanaSchedule[] = [];
  db.exec("BEGIN");
  try {
    for (const danaType of types) {
      created.push(createOneSchedule(input.houseId, danaType, input));
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return created;
}

export function getSchedule(id: number): DanaSchedule | null {
  return scheduleSelect(id);
}

function clearFutureStored(scheduleId: number, fromDate: string): void {
  // Remove future stored rows (scheduled or cancelled exceptions) so the
  // updated rule becomes the source of truth for upcoming dates.
  getDb()
    .prepare(
      `DELETE FROM dana_occurrences
       WHERE schedule_id = ? AND dana_date >= ?`,
    )
    .run(scheduleId, fromDate);
}

export function updateSchedule(
  id: number,
  input: DanaUpdateScheduleInput,
): DanaSchedule {
  const existing = scheduleSelect(id);
  if (!existing) throw new Error("Dāna schedule not found");
  if (!existing.is_active) throw new Error("Dāna schedule is inactive");

  const today = localToday();
  // Schedule edits apply to the future only. Never use a past start date —
  // that would recreate historical rows when materializing.
  const requestedStart = input.startDate ?? existing.start_date;
  assertDate(requestedStart, "Start date");
  const startDate = requestedStart < today ? today : requestedStart;

  const rec = normalizeRecurrence({
    recurrenceType: input.recurrenceType ?? existing.recurrence_type,
    recurrenceInterval:
      input.recurrenceInterval ?? existing.recurrence_interval,
    recurrenceUnit: input.recurrenceUnit ?? existing.recurrence_unit,
  });

  const endType = input.endType ?? existing.end_type;
  const end = validateEnd(
    rec.recurrence_type === "once" ? "count" : endType,
    input.endDate !== undefined ? input.endDate : existing.end_date,
    rec.recurrence_type === "once"
      ? 1
      : input.occurrenceCount !== undefined
        ? input.occurrenceCount
        : existing.occurrence_count,
    startDate,
  );

  const danaType = input.danaType ?? existing.dana_type;
  assertDanaType(danaType);

  const db = getDb();
  const ts = nowIso();

  db.exec("BEGIN");
  try {
    // Clear only future stored rows (exceptions). Never touch past history.
    clearFutureStored(id, today);

    db.prepare(
      `UPDATE dana_schedules SET
        dana_type = ?,
        start_date = ?,
        recurrence_type = ?,
        recurrence_interval = ?,
        recurrence_unit = ?,
        end_type = ?,
        end_date = ?,
        occurrence_count = ?,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      danaType,
      startDate,
      rec.recurrence_type,
      rec.recurrence_interval,
      rec.recurrence_unit,
      end.end_type,
      end.end_date,
      end.occurrence_count,
      ts,
      id,
    );

    // Do NOT rematerialize past dates — historical rows stay as recorded.
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return scheduleSelect(id)!;
}

export function cancelFuture(scheduleId: number): DanaSchedule {
  const existing = scheduleSelect(scheduleId);
  if (!existing) throw new Error("Dāna schedule not found");
  const today = localToday();
  const ts = nowIso();
  const db = getDb();
  db.exec("BEGIN");
  try {
    clearFutureStored(scheduleId, today);
    db.prepare(
      `UPDATE dana_schedules SET is_active = 0, updated_at = ? WHERE id = ?`,
    ).run(ts, scheduleId);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return scheduleSelect(scheduleId)!;
}

/** Cancel a stored future occurrence row by id. */
export function cancelOccurrence(id: number): DanaOccurrence {
  const row = getDb()
    .prepare("SELECT * FROM dana_occurrences WHERE id = ?")
    .get(id) as DanaOccurrence | undefined;
  if (!row) throw new Error("Dāna occurrence not found");
  return skipDate(row.schedule_id ?? 0, row.dana_date, row);
}

/**
 * Skip / cancel a single future date for a schedule (exception).
 * Past historical records cannot be cancelled.
 */
export function skipDate(
  scheduleId: number,
  date: string,
  existingRow?: DanaOccurrence,
): DanaOccurrence {
  assertDate(date);
  const today = localToday();
  if (date < today) {
    throw new Error("Past Dāna records cannot be cancelled");
  }

  const schedule = scheduleSelect(scheduleId);
  if (!schedule && !existingRow) {
    throw new Error("Dāna schedule not found");
  }
  const houseId = schedule?.house_id ?? existingRow!.house_id;
  const danaType = (schedule?.dana_type ?? existingRow!.dana_type) as DanaType;
  const ts = nowIso();
  const db = getDb();

  const scheduled = db
    .prepare(
      `SELECT * FROM dana_occurrences
       WHERE house_id = ? AND dana_date = ? AND dana_type = ? AND status = 'scheduled'`,
    )
    .get(houseId, date, danaType) as DanaOccurrence | undefined;

  if (scheduled) {
    db.prepare(
      `UPDATE dana_occurrences SET status = 'cancelled', updated_at = ? WHERE id = ?`,
    ).run(ts, scheduled.id);
  } else {
    const already = db
      .prepare(
        `SELECT id FROM dana_occurrences
         WHERE house_id = ? AND dana_date = ? AND dana_type = ? AND status = 'cancelled'`,
      )
      .get(houseId, date, danaType);
    if (!already) {
      db.prepare(
        `INSERT INTO dana_occurrences
          (schedule_id, house_id, dana_type, dana_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'cancelled', ?, ?)`,
      ).run(scheduleId || null, houseId, danaType, date, ts, ts);
    }
  }

  return db
    .prepare(
      `SELECT o.*,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en,
        s.is_active AS schedule_active
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       LEFT JOIN dana_schedules s ON s.id = o.schedule_id
       WHERE o.house_id = ? AND o.dana_date = ? AND o.dana_type = ?
         AND o.status = 'cancelled'
       ORDER BY o.id DESC LIMIT 1`,
    )
    .get(houseId, date, danaType) as DanaOccurrence;
}

function occurrenceById(id: number): DanaOccurrence | null {
  return (
    (getDb()
      .prepare(
        `SELECT o.*,
          h.house_number AS house_number,
          h.name_si AS house_name_si,
          h.name_en AS house_name_en,
          s.is_active AS schedule_active
         FROM dana_occurrences o
         JOIN houses h ON h.id = o.house_id
         LEFT JOIN dana_schedules s ON s.id = o.schedule_id
         WHERE o.id = ?`,
      )
      .get(id) as DanaOccurrence | undefined) ?? null
  );
}

/**
 * Edit a single calendar day only. Does not change the recurring schedule rule.
 * - Past / stored row: update that occurrence.
 * - Future from schedule: skip that schedule date, write a one-off occurrence.
 */
export function updateDanaDay(input: {
  date: string;
  houseId: number;
  danaType: DanaType;
  occurrenceId?: number | null;
  scheduleId?: number | null;
}): DanaOccurrence {
  assertDate(input.date);
  assertDanaType(input.danaType);
  getHouseOrThrow(input.houseId);

  const ts = nowIso();
  const db = getDb();

  if (input.occurrenceId) {
    const existing = db
      .prepare("SELECT * FROM dana_occurrences WHERE id = ?")
      .get(input.occurrenceId) as DanaOccurrence | undefined;
    if (!existing || existing.status !== "scheduled") {
      throw new Error("Dāna occurrence not found");
    }
    const clash = db
      .prepare(
        `SELECT id FROM dana_occurrences
         WHERE house_id = ? AND dana_date = ? AND dana_type = ?
           AND status = 'scheduled' AND id != ?`,
      )
      .get(input.houseId, existing.dana_date, input.danaType, input.occurrenceId);
    if (clash) {
      throw new Error(
        `Dāna already scheduled for this household on ${existing.dana_date} (${input.danaType})`,
      );
    }
    db.prepare(
      `UPDATE dana_occurrences
       SET house_id = ?, dana_type = ?, updated_at = ?
       WHERE id = ?`,
    ).run(input.houseId, input.danaType, ts, input.occurrenceId);
    return occurrenceById(input.occurrenceId)!;
  }

  if (input.scheduleId) {
    const schedule = scheduleSelect(input.scheduleId);
    if (!schedule || !schedule.is_active) {
      throw new Error("Dāna schedule not found");
    }
    if (input.date < localToday()) {
      throw new Error("Use the stored history row to edit a past day");
    }
    db.exec("BEGIN");
    try {
      skipDate(input.scheduleId, input.date);
      if (hasScheduledOccurrence(input.houseId, input.date, input.danaType)) {
        throw new Error(
          `Dāna already scheduled for this household on ${input.date} (${input.danaType})`,
        );
      }
      const r = db
        .prepare(
          `INSERT INTO dana_occurrences
            (schedule_id, house_id, dana_type, dana_date, status, created_at, updated_at)
           VALUES (NULL, ?, ?, ?, 'scheduled', ?, ?)`,
        )
        .run(input.houseId, input.danaType, input.date, ts, ts);
      db.exec("COMMIT");
      return occurrenceById(Number(r.lastInsertRowid))!;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }

  throw new Error("occurrenceId or scheduleId is required");
}

/** Remove one stored day record (past correction or one-off). Does not stop the schedule. */
export function deleteDanaDay(occurrenceId: number): void {
  const existing = getDb()
    .prepare("SELECT * FROM dana_occurrences WHERE id = ?")
    .get(occurrenceId) as DanaOccurrence | undefined;
  if (!existing) throw new Error("Dāna occurrence not found");
  if (existing.status !== "scheduled") {
    throw new Error("Occurrence is already cancelled");
  }
  const r = getDb()
    .prepare("DELETE FROM dana_occurrences WHERE id = ?")
    .run(occurrenceId);
  if (!r.changes) throw new Error("Dāna occurrence not found");
}

function shortHouseLabel(row: {
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
}): string {
  const num = row.house_number?.trim();
  const name = (row.house_name_en || row.house_name_si || "").trim();
  if (num && name) return `#${num} ${name}`;
  if (num) return `#${num}`;
  return name || "—";
}

function scheduleMatchesDate(s: DanaSchedule, date: string): boolean {
  if (!s.is_active) return false;
  if (date < s.start_date) return false;
  const series = generateDates(ruleFromSchedule(s), date);
  return series.includes(date);
}

function virtualOccurrence(s: DanaSchedule, date: string): DanaOccurrence {
  return {
    id: 0,
    schedule_id: s.id,
    house_id: s.house_id,
    dana_type: s.dana_type,
    dana_date: date,
    status: "scheduled",
    created_at: s.created_at,
    updated_at: s.updated_at,
    house_number: s.house_number,
    house_name_si: s.house_name_si,
    house_name_en: s.house_name_en,
    schedule_active: s.is_active,
  };
}

function occurrencesForDate(date: string, today: string): DanaOccurrence[] {
  if (date < today) {
    return getDb()
      .prepare(
        `SELECT o.*,
          h.house_number AS house_number,
          h.name_si AS house_name_si,
          h.name_en AS house_name_en,
          s.is_active AS schedule_active
         FROM dana_occurrences o
         JOIN houses h ON h.id = o.house_id
         LEFT JOIN dana_schedules s ON s.id = o.schedule_id
         WHERE o.status = 'scheduled' AND o.dana_date = ?
         ORDER BY o.dana_type, h.house_number, h.name_en`,
      )
      .all(date) as DanaOccurrence[];
  }

  // Today/future: stored one-offs + active schedules (minus cancelled).
  const stored = getDb()
    .prepare(
      `SELECT o.*,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en,
        s.is_active AS schedule_active
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       LEFT JOIN dana_schedules s ON s.id = o.schedule_id
       WHERE o.status = 'scheduled' AND o.dana_date = ?
       ORDER BY o.dana_type, h.house_number, h.name_en`,
    )
    .all(date) as DanaOccurrence[];

  const cancelled = cancelledSetForDate(date);
  const taken = new Set(
    stored.map((r) => `${r.house_id}:${r.dana_type}`),
  );
  const out: DanaOccurrence[] = [...stored];
  for (const s of listActiveSchedules()) {
    if (!scheduleMatchesDate(s, date)) continue;
    const key = `${s.house_id}:${s.dana_type}`;
    if (cancelled.has(key) || taken.has(key)) continue;
    out.push(virtualOccurrence(s, date));
  }
  out.sort((a, b) => {
    if (a.dana_type !== b.dana_type) {
      return a.dana_type.localeCompare(b.dana_type);
    }
    return String(a.house_number || "").localeCompare(
      String(b.house_number || ""),
    );
  });
  return out;
}

export function listByMonth(
  year: number,
  month: number,
): DanaMonthDaySummary[] {
  materializePast();
  if (month < 1 || month > 12) throw new Error("Invalid month");
  const today = localToday();
  const dim = daysInMonth(year, month);
  const monthStart = formatLocalDate(year, month, 1);
  const monthEnd = formatLocalDate(year, month, dim);
  const map = new Map<string, DanaMonthDaySummary>();

  const bump = (
    date: string,
    danaType: DanaType,
    label: string,
  ) => {
    let summary = map.get(date);
    if (!summary) {
      summary = {
        date,
        heel_count: 0,
        dawal_count: 0,
        heel_houses: [],
        dawal_houses: [],
      };
      map.set(date, summary);
    }
    if (danaType === "heel") {
      summary.heel_count += 1;
      if (summary.heel_houses.length < 3) summary.heel_houses.push(label);
    } else {
      summary.dawal_count += 1;
      if (summary.dawal_houses.length < 3) summary.dawal_houses.push(label);
    }
  };

  // Past days in this month: from stored history.
  const pastRows = getDb()
    .prepare(
      `SELECT o.dana_date, o.dana_type,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       WHERE o.status = 'scheduled'
         AND o.dana_date >= ?
         AND o.dana_date <= ?
         AND o.dana_date < ?
       ORDER BY o.dana_date, h.house_number, h.name_en`,
    )
    .all(monthStart, monthEnd, today) as {
    dana_date: string;
    dana_type: DanaType;
    house_number: string | null;
    house_name_si: string;
    house_name_en: string;
  }[];
  for (const row of pastRows) {
    bump(row.dana_date, row.dana_type, shortHouseLabel(row));
  }

  // Stored one-offs for today/future in this month.
  const futureStored = getDb()
    .prepare(
      `SELECT o.dana_date, o.dana_type, o.house_id,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       WHERE o.status = 'scheduled'
         AND o.dana_date >= ?
         AND o.dana_date <= ?
         AND o.dana_date >= ?
       ORDER BY o.dana_date, h.house_number, h.name_en`,
    )
    .all(monthStart, monthEnd, today) as {
    dana_date: string;
    dana_type: DanaType;
    house_id: number;
    house_number: string | null;
    house_name_si: string;
    house_name_en: string;
  }[];
  const takenByDate = new Map<string, Set<string>>();
  for (const row of futureStored) {
    bump(row.dana_date, row.dana_type, shortHouseLabel(row));
    const key = `${row.house_id}:${row.dana_type}`;
    let set = takenByDate.get(row.dana_date);
    if (!set) {
      set = new Set();
      takenByDate.set(row.dana_date, set);
    }
    set.add(key);
  }

  // Today + future days in this month: compute from schedules.
  const schedules = listActiveSchedules();
  for (const s of schedules) {
    const dates = generateDates(ruleFromSchedule(s), monthEnd).filter(
      (d) => d >= monthStart && d <= monthEnd && d >= today,
    );
    const cancelled = cancelledKeysForSchedule(s.id);
    for (const date of dates) {
      if (cancelled.has(date)) continue;
      const key = `${s.house_id}:${s.dana_type}`;
      if (takenByDate.get(date)?.has(key)) continue;
      bump(date, s.dana_type, shortHouseLabel(s));
    }
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function listByDate(date: string): DanaDateGroup {
  assertDate(date);
  materializePast();
  const rows = occurrencesForDate(date, localToday());
  return {
    date,
    heel: rows.filter((r) => r.dana_type === "heel"),
    dawal: rows.filter((r) => r.dana_type === "dawal"),
  };
}

export function listToday(): DanaDateGroup {
  return listByDate(localToday());
}

function nextOccurrenceDate(s: DanaSchedule, fromDate: string): string | null {
  const cancelled = cancelledKeysForSchedule(s.id);
  // Search far enough for practical recurring patterns.
  const searchEnd =
    s.end_type === "until" && s.end_date
      ? s.end_date
      : addYearsClamped(fromDate, 30);
  const dates = generateDates(ruleFromSchedule(s), searchEnd);
  for (const d of dates) {
    if (d < fromDate) continue;
    if (cancelled.has(d)) continue;
    return d;
  }
  return null;
}

export function listByHouse(houseId: number): DanaHouseHistory {
  materializePast();
  const today = localToday();

  const past = getDb()
    .prepare(
      `SELECT o.*,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en,
        s.is_active AS schedule_active
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       LEFT JOIN dana_schedules s ON s.id = o.schedule_id
       WHERE o.house_id = ? AND o.status = 'scheduled' AND o.dana_date < ?
       ORDER BY o.dana_date DESC`,
    )
    .all(houseId, today) as DanaOccurrence[];

  const schedules = getDb()
    .prepare(
      `SELECT s.*,
        h.house_number AS house_number,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en
       FROM dana_schedules s
       JOIN houses h ON h.id = s.house_id
       WHERE s.house_id = ?
       ORDER BY s.is_active DESC, s.start_date DESC`,
    )
    .all(houseId) as DanaSchedule[];

  // One next date per active schedule (Heel and Dawal shown separately).
  const upcoming: DanaOccurrence[] = [];
  for (const s of schedules) {
    if (!s.is_active) continue;
    const next = nextOccurrenceDate(s, today);
    if (!next) continue;
    upcoming.push(virtualOccurrence(s, next));
  }
  upcoming.sort((a, b) => a.dana_date.localeCompare(b.dana_date));

  return { past, upcoming, schedules };
}
