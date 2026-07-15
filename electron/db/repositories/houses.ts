import { getDb } from "../connection.js";
import type { House } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export type HouseFilters = {
  q?: string;
  active?: "all" | "active" | "inactive";
  village?: string;
  hasMembers?: "all" | "yes" | "no";
};

export function listHouses(filters: HouseFilters = {}): House[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(h.name_si LIKE ? OR h.name_en LIKE ? OR IFNULL(h.house_number,'') LIKE ? OR h.village_si LIKE ? OR h.village_en LIKE ? OR h.telephone LIKE ? OR h.address_si LIKE ? OR h.address_en LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like, like);
  }
  if (filters.active === "active") where.push("h.is_active = 1");
  if (filters.active === "inactive") where.push("h.is_active = 0");
  if (filters.village?.trim()) {
    where.push("(h.village_si LIKE ? OR h.village_en LIKE ?)");
    const like = `%${filters.village.trim()}%`;
    params.push(like, like);
  }
  if (filters.hasMembers === "yes") {
    where.push(
      "(SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND p.is_active = 1) > 0",
    );
  }
  if (filters.hasMembers === "no") {
    where.push(
      "(SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND p.is_active = 1) = 0",
    );
  }

  return getDb()
    .prepare(
      `SELECT h.*,
        (SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND p.is_active = 1) AS member_count
       FROM houses h
       WHERE ${where.join(" AND ")}
       ORDER BY h.name_si COLLATE NOCASE, h.name_en COLLATE NOCASE`,
    )
    .all(...(params as never[])) as House[];
}

export function getHouse(id: number): House | null {
  return (
    (getDb()
      .prepare(
        `SELECT h.*,
          (SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND p.is_active = 1) AS member_count
         FROM houses h WHERE h.id = ?`,
      )
      .get(id) as House | undefined) ?? null
  );
}

export function createHouse(
  input: Partial<House> & { name_si?: string; name_en?: string },
): House {
  const ts = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO houses (
        house_number, name_si, name_en, address_si, address_en,
        village_si, village_en, telephone, notes, is_active,
        custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.house_number || null,
      input.name_si ?? "",
      input.name_en ?? "",
      input.address_si ?? "",
      input.address_en ?? "",
      input.village_si ?? "",
      input.village_en ?? "",
      input.telephone ?? "",
      input.notes ?? "",
      input.is_active ?? 1,
      input.custom_field_1 ?? "",
      input.custom_field_2 ?? "",
      input.custom_field_3 ?? "",
      input.custom_field_4 ?? "",
      input.custom_field_5 ?? "",
      ts,
      ts,
    );
  return getHouse(Number(result.lastInsertRowid)) as House;
}

export function updateHouse(id: number, input: Partial<House>): House {
  const existing = getHouse(id);
  if (!existing) throw new Error("House not found");
  getDb()
    .prepare(
      `UPDATE houses SET
        house_number = ?, name_si = ?, name_en = ?, address_si = ?, address_en = ?,
        village_si = ?, village_en = ?, telephone = ?, notes = ?, is_active = ?,
        custom_field_1 = ?, custom_field_2 = ?, custom_field_3 = ?, custom_field_4 = ?, custom_field_5 = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.house_number !== undefined
        ? input.house_number || null
        : existing.house_number,
      input.name_si ?? existing.name_si,
      input.name_en ?? existing.name_en,
      input.address_si ?? existing.address_si,
      input.address_en ?? existing.address_en,
      input.village_si ?? existing.village_si,
      input.village_en ?? existing.village_en,
      input.telephone ?? existing.telephone,
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
  return getHouse(id)!;
}

export function villages(): string[] {
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT village_si AS v FROM houses WHERE village_si != ''
       UNION
       SELECT DISTINCT village_en AS v FROM houses WHERE village_en != ''
       ORDER BY 1`,
    )
    .all() as { v: string }[];
  return rows.map((r) => r.v);
}
