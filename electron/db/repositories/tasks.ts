import { getDb } from "../connection.js";
import type {
  TempleTask,
  TempleTaskInput,
  TempleTaskLocation,
} from "../../types.js";

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

function normalizeDateTime(value: string, label: string): string {
  const v = (value ?? "").trim().replace(" ", "T");
  const m = /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d)?$/.exec(
    v,
  );
  if (!m) {
    throw new Error(`${label} must be YYYY-MM-DDTHH:MM`);
  }
  return m[1]!;
}

function normalizeLocation(
  value: string | null | undefined,
): TempleTaskLocation {
  if (value === "outside" || value === "inside") return value;
  throw new Error("Task type must be inside or outside");
}

function validateInput(input: TempleTaskInput): {
  start_at: string;
  end_at: string;
  location_type: TempleTaskLocation;
} {
  const nameSi = input.name_si?.trim() ?? "";
  const nameEn = input.name_en?.trim() ?? "";
  if (!nameSi && !nameEn) {
    throw new Error("Task name is required");
  }
  const start_at = normalizeDateTime(input.start_at, "Start");
  const end_at = normalizeDateTime(input.end_at, "End");
  if (end_at < start_at) {
    throw new Error("End must be on or after start");
  }
  return {
    start_at,
    end_at,
    location_type: normalizeLocation(input.location_type ?? "inside"),
  };
}

function getTask(id: number): TempleTask | null {
  return (
    (getDb()
      .prepare("SELECT * FROM temple_tasks WHERE id = ?")
      .get(id) as TempleTask | undefined) ?? null
  );
}

function nextColorIndex(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM temple_tasks")
    .get() as { c: number };
  return Number(row.c) % COLOR_COUNT;
}

function sortTasks(rows: TempleTask[]): TempleTask[] {
  return [...rows].sort((a, b) => {
    if (a.start_at !== b.start_at) return a.start_at.localeCompare(b.start_at);
    if (a.end_at !== b.end_at) return a.end_at.localeCompare(b.end_at);
    return a.id - b.id;
  });
}

/** Tasks that overlap any moment on this calendar date. */
function listOverlappingDate(date: string): TempleTask[] {
  assertDate(date, "Date");
  const dayStart = `${date}T00:00`;
  const dayEnd = `${date}T23:59`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM temple_tasks
       WHERE start_at <= ? AND end_at >= ?
       ORDER BY start_at, id`,
    )
    .all(dayEnd, dayStart) as TempleTask[];
  return sortTasks(rows);
}

export function listTasksByMonth(year: number, month: number): TempleTask[] {
  if (month < 1 || month > 12) throw new Error("Invalid month");
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01T00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59`;
  const rows = getDb()
    .prepare(
      `SELECT * FROM temple_tasks
       WHERE start_at <= ? AND end_at >= ?
       ORDER BY start_at, id`,
    )
    .all(monthEnd, monthStart) as TempleTask[];
  return sortTasks(rows);
}

export function listTasksByDate(date: string): TempleTask[] {
  return listOverlappingDate(date);
}

export function listTodayTasks(): TempleTask[] {
  return listOverlappingDate(localToday());
}

export function getTempleTask(id: number): TempleTask | null {
  return getTask(id);
}

export function createTempleTask(input: TempleTaskInput): TempleTask {
  const parsed = validateInput(input);
  const ts = nowIso();
  const color =
    typeof input.color_index === "number"
      ? Math.abs(Math.floor(input.color_index)) % COLOR_COUNT
      : nextColorIndex();
  const r = getDb()
    .prepare(
      `INSERT INTO temple_tasks (
        name_si, name_en, description_si, description_en,
        start_at, end_at, location_type,
        color_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name_si.trim(),
      input.name_en.trim(),
      (input.description_si ?? "").trim(),
      (input.description_en ?? "").trim(),
      parsed.start_at,
      parsed.end_at,
      parsed.location_type,
      color,
      ts,
      ts,
    );
  return getTask(Number(r.lastInsertRowid))!;
}

export function updateTempleTask(
  id: number,
  input: TempleTaskInput,
): TempleTask {
  const existing = getTask(id);
  if (!existing) throw new Error("Task not found");
  const parsed = validateInput(input);
  const ts = nowIso();
  const color =
    typeof input.color_index === "number"
      ? Math.abs(Math.floor(input.color_index)) % COLOR_COUNT
      : existing.color_index;
  getDb()
    .prepare(
      `UPDATE temple_tasks SET
        name_si = ?, name_en = ?,
        description_si = ?, description_en = ?,
        start_at = ?, end_at = ?,
        location_type = ?, color_index = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.name_si.trim(),
      input.name_en.trim(),
      (input.description_si ?? "").trim(),
      (input.description_en ?? "").trim(),
      parsed.start_at,
      parsed.end_at,
      parsed.location_type,
      color,
      ts,
      id,
    );
  return getTask(id)!;
}

export function deleteTempleTask(id: number): void {
  const r = getDb().prepare("DELETE FROM temple_tasks WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Task not found");
}
