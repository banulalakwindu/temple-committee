import { getDb } from "../connection.js";
import type { TempleEvent, TempleEventInput } from "../../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COLOR_COUNT = 6;

function nowIso(): string {
  return new Date().toISOString();
}

function localToday(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function assertDate(dateStr: string, label: string): void {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
}

function validateInput(input: TempleEventInput): void {
  const nameSi = input.name_si?.trim() ?? "";
  const nameEn = input.name_en?.trim() ?? "";
  if (!nameSi && !nameEn) {
    throw new Error("Event name is required");
  }
  assertDate(input.start_date, "Start date");
  assertDate(input.end_date, "End date");
  if (input.end_date < input.start_date) {
    throw new Error("End date must be on or after start date");
  }
}

function getEvent(id: number): TempleEvent | null {
  return (
    (getDb()
      .prepare("SELECT * FROM temple_events WHERE id = ?")
      .get(id) as TempleEvent | undefined) ?? null
  );
}

function nextColorIndex(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM temple_events")
    .get() as { c: number };
  return Number(row.c) % COLOR_COUNT;
}

export function listEventsByMonth(year: number, month: number): TempleEvent[] {
  if (month < 1 || month > 12) throw new Error("Invalid month");
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  // Overlap: start <= monthEnd AND end >= monthStart
  return getDb()
    .prepare(
      `SELECT * FROM temple_events
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY start_date, id`,
    )
    .all(monthEnd, monthStart) as TempleEvent[];
}

export function listEventsByDate(date: string): TempleEvent[] {
  assertDate(date, "Date");
  return getDb()
    .prepare(
      `SELECT * FROM temple_events
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY start_date, id`,
    )
    .all(date, date) as TempleEvent[];
}

export function listCurrentEvents(): TempleEvent[] {
  return listEventsByDate(localToday());
}

export function getTempleEvent(id: number): TempleEvent | null {
  return getEvent(id);
}

export function createTempleEvent(input: TempleEventInput): TempleEvent {
  validateInput(input);
  const ts = nowIso();
  const color =
    typeof input.color_index === "number"
      ? Math.abs(Math.floor(input.color_index)) % COLOR_COUNT
      : nextColorIndex();
  const r = getDb()
    .prepare(
      `INSERT INTO temple_events (
        name_si, name_en, description_si, description_en,
        start_date, end_date, color_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name_si.trim(),
      input.name_en.trim(),
      (input.description_si ?? "").trim(),
      (input.description_en ?? "").trim(),
      input.start_date,
      input.end_date,
      color,
      ts,
      ts,
    );
  return getEvent(Number(r.lastInsertRowid))!;
}

export function updateTempleEvent(
  id: number,
  input: TempleEventInput,
): TempleEvent {
  const existing = getEvent(id);
  if (!existing) throw new Error("Event not found");
  validateInput(input);
  const ts = nowIso();
  const color =
    typeof input.color_index === "number"
      ? Math.abs(Math.floor(input.color_index)) % COLOR_COUNT
      : existing.color_index;
  getDb()
    .prepare(
      `UPDATE temple_events SET
        name_si = ?, name_en = ?,
        description_si = ?, description_en = ?,
        start_date = ?, end_date = ?,
        color_index = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name_si.trim(),
      input.name_en.trim(),
      (input.description_si ?? "").trim(),
      (input.description_en ?? "").trim(),
      input.start_date,
      input.end_date,
      color,
      ts,
      id,
    );
  return getEvent(id)!;
}

export function deleteTempleEvent(id: number): void {
  const r = getDb().prepare("DELETE FROM temple_events WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Event not found");
}
