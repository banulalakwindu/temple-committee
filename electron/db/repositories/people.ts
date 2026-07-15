import { getDb } from "../connection.js";
import type { Person } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export type PeopleFilters = {
  q?: string;
  houseId?: number | null;
  gender?: string;
  active?: "all" | "active" | "inactive";
  birthdayMonth?: number | null;
  hasNic?: "all" | "yes" | "no";
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
  if (filters.active === "active") where.push("p.is_active = 1");
  if (filters.active === "inactive") where.push("p.is_active = 0");
  if (filters.birthdayMonth) {
    where.push("CAST(strftime('%m', p.birthday) AS INTEGER) = ?");
    params.push(filters.birthdayMonth);
  }
  if (filters.hasNic === "yes") where.push("p.nic != ''");
  if (filters.hasNic === "no") where.push("p.nic = ''");

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

export function createPerson(input: Partial<Person>): Person {
  const ts = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO people (
        full_name_si, full_name_en, gender, birthday, nic, phone,
        occupation_si, occupation_en, relationship_in_family,
        address_si, address_en, notes, current_house_id, is_active,
        custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      input.is_active ?? 1,
      input.custom_field_1 ?? "",
      input.custom_field_2 ?? "",
      input.custom_field_3 ?? "",
      input.custom_field_4 ?? "",
      input.custom_field_5 ?? "",
      ts,
      ts,
    );
  const id = Number(result.lastInsertRowid);
  if (input.current_house_id) {
    getDb()
      .prepare(
        `INSERT INTO person_house_history (person_id, from_house_id, to_house_id, moved_at, reason, created_at)
         VALUES (?, NULL, ?, ?, ?, ?)`,
      )
      .run(id, input.current_house_id, ts, "Initial assignment", ts);
  }
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
        address_si = ?, address_en = ?, notes = ?, is_active = ?,
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
      input.is_active ?? existing.is_active,
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

export function movePerson(
  personId: number,
  toHouseId: number,
  reason: string,
  movedAt?: string,
): Person {
  const person = getPerson(personId);
  if (!person) throw new Error("Person not found");
  const ts = nowIso();
  const when = movedAt || ts;
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO person_house_history (person_id, from_house_id, to_house_id, moved_at, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      personId,
      person.current_house_id,
      toHouseId,
      when,
      reason || "",
      ts,
    );
    db.prepare(
      "UPDATE people SET current_house_id = ?, updated_at = ? WHERE id = ?",
    ).run(toHouseId, ts, personId);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return getPerson(personId) as Person;
}

export function peopleByHouse(houseId: number): Person[] {
  return listPeople({ houseId, active: "all" });
}

export function houseHistory(personId: number) {
  return getDb()
    .prepare(
      `SELECT ph.*,
        fh.name_si AS from_name_si, fh.name_en AS from_name_en,
        th.name_si AS to_name_si, th.name_en AS to_name_en
       FROM person_house_history ph
       LEFT JOIN houses fh ON fh.id = ph.from_house_id
       LEFT JOIN houses th ON th.id = ph.to_house_id
       WHERE ph.person_id = ?
       ORDER BY ph.moved_at DESC, ph.id DESC`,
    )
    .all(personId);
}
