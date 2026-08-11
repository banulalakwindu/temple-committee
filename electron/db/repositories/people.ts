import { getDb } from "../connection.js";
import type { Person } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export type PeopleFilters = {
  q?: string;
  houseId?: number | null;
  gender?: string;
  birthdayMonth?: number | null;
  hasNic?: "all" | "yes" | "no";
  dahamSchool?: "all" | "yes" | "no";
  /** Default: current (non-archived). Use "archived" on People page only. */
  archived?: "current" | "archived";
};

const selectSql = `
  SELECT p.*,
    h.name_si AS house_name_si,
    h.name_en AS house_name_en,
    h.house_number AS house_number
  FROM people p
  LEFT JOIN houses h ON h.id = p.current_house_id
`;

export function listPeople(filters: PeopleFilters = {}): Person[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  const archived = filters.archived ?? "current";
  if (archived === "archived") where.push("IFNULL(p.is_archived, 0) = 1");
  else where.push("IFNULL(p.is_archived, 0) = 0");

  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(p.full_name_si LIKE ? OR p.full_name_en LIKE ? OR p.nic LIKE ? OR p.phone LIKE ? OR p.address_si LIKE ? OR p.address_en LIKE ?)`,
    );
    params.push(like, like, like, like, like, like);
  }
  if (filters.houseId) {
    where.push("p.current_house_id = ?");
    params.push(filters.houseId);
  }
  if (filters.gender?.trim()) {
    where.push("p.gender = ?");
    params.push(filters.gender.trim());
  }
  if (filters.birthdayMonth) {
    where.push("CAST(strftime('%m', p.birthday) AS INTEGER) = ?");
    params.push(filters.birthdayMonth);
  }
  if (filters.hasNic === "yes") where.push("p.nic != ''");
  if (filters.hasNic === "no") where.push("p.nic = ''");
  if (filters.dahamSchool === "yes") {
    where.push("IFNULL(p.daham_school_child, 0) = 1");
  }
  if (filters.dahamSchool === "no") {
    where.push("IFNULL(p.daham_school_child, 0) = 0");
  }

  return getDb()
    .prepare(
      `${selectSql} WHERE ${where.join(" AND ")}
       ORDER BY p.full_name_si COLLATE NOCASE, p.full_name_en COLLATE NOCASE`,
    )
    .all(...(params as never[])) as Person[];
}

export function getPerson(id: number): Person | null {
  return (
    (getDb().prepare(`${selectSql} WHERE p.id = ?`).get(id) as
      | Person
      | undefined) ?? null
  );
}

function asFlag(value: unknown, fallback = 0): number {
  if (value === true || value === 1 || value === "1") return 1;
  if (value === false || value === 0 || value === "0") return 0;
  return fallback;
}

export function createPerson(input: Partial<Person>): Person {
  const ts = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO people (
        full_name_si, full_name_en, gender, birthday, nic, phone,
        occupation_si, occupation_en, relationship_in_family,
        address_si, address_en, notes, current_house_id, is_archived,
        daham_school_child,
        custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.full_name_si ?? "",
      input.full_name_en ?? "",
      input.gender ?? "",
      input.birthday || null,
      input.nic ?? "",
      input.phone ?? "",
      input.occupation_si ?? "",
      input.occupation_en ?? "",
      input.relationship_in_family ?? "",
      input.address_si ?? "",
      input.address_en ?? "",
      input.notes ?? "",
      input.current_house_id ?? null,
      asFlag(input.daham_school_child, 0),
      input.custom_field_1 ?? "",
      input.custom_field_2 ?? "",
      input.custom_field_3 ?? "",
      input.custom_field_4 ?? "",
      input.custom_field_5 ?? "",
      ts,
      ts,
    );
  const id = Number(result.lastInsertRowid);
  return getPerson(id) as Person;
}

export function updatePerson(id: number, input: Partial<Person>): Person {
  const existing = getPerson(id);
  if (!existing) throw new Error("Person not found");
  getDb()
    .prepare(
      `UPDATE people SET
        full_name_si = ?, full_name_en = ?, gender = ?, birthday = ?, nic = ?, phone = ?,
        occupation_si = ?, occupation_en = ?, relationship_in_family = ?,
        address_si = ?, address_en = ?, notes = ?, current_house_id = ?,
        daham_school_child = ?,
        custom_field_1 = ?, custom_field_2 = ?, custom_field_3 = ?, custom_field_4 = ?, custom_field_5 = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.full_name_si ?? existing.full_name_si,
      input.full_name_en ?? existing.full_name_en,
      input.gender ?? existing.gender,
      input.birthday !== undefined ? input.birthday || null : existing.birthday,
      input.nic ?? existing.nic,
      input.phone ?? existing.phone,
      input.occupation_si ?? existing.occupation_si,
      input.occupation_en ?? existing.occupation_en,
      input.relationship_in_family ?? existing.relationship_in_family,
      input.address_si ?? existing.address_si,
      input.address_en ?? existing.address_en,
      input.notes ?? existing.notes,
      input.current_house_id !== undefined
        ? input.current_house_id
        : existing.current_house_id,
      input.daham_school_child !== undefined
        ? asFlag(input.daham_school_child, existing.daham_school_child ?? 0)
        : (existing.daham_school_child ?? 0),
      input.custom_field_1 ?? existing.custom_field_1,
      input.custom_field_2 ?? existing.custom_field_2,
      input.custom_field_3 ?? existing.custom_field_3,
      input.custom_field_4 ?? existing.custom_field_4,
      input.custom_field_5 ?? existing.custom_field_5,
      nowIso(),
      id,
    );
  return getPerson(id)!;
}

export function setPersonArchived(id: number, archived: boolean): Person {
  const existing = getPerson(id);
  if (!existing) throw new Error("Person not found");
  getDb()
    .prepare("UPDATE people SET is_archived = ?, updated_at = ? WHERE id = ?")
    .run(archived ? 1 : 0, nowIso(), id);
  return getPerson(id)!;
}

export function peopleByHouse(houseId: number): Person[] {
  return listPeople({ houseId, archived: "current" });
}
