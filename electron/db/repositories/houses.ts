import { getDb } from "../connection.js";
import type { House } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export type HouseFilters = {
  q?: string;
  /** Primary village name (SI or EN) for exact match. */
  village?: string;
  /** Alternate language name so catalog filters match either field. */
  villageAlt?: string;
  hasMembers?: "all" | "yes" | "no";
  /** Default: current (non-archived). Use "archived" on Houses page only. */
  archived?: "current" | "archived";
};

const memberCountSql =
  "(SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND IFNULL(p.is_archived, 0) = 0)";

export function listHouses(filters: HouseFilters = {}): House[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  const archived = filters.archived ?? "current";
  if (archived === "archived") where.push("IFNULL(h.is_archived, 0) = 1");
  else where.push("IFNULL(h.is_archived, 0) = 0");

  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(h.name_si LIKE ? OR h.name_en LIKE ? OR IFNULL(h.house_number,'') LIKE ? OR h.village_si LIKE ? OR h.village_en LIKE ? OR h.telephone LIKE ? OR h.address_si LIKE ? OR h.address_en LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like, like);
  }
  if (filters.village?.trim()) {
    const a = filters.village.trim();
    const b = (filters.villageAlt ?? a).trim();
    where.push(
      "(h.village_si = ? OR h.village_en = ? OR h.village_si = ? OR h.village_en = ?)",
    );
    params.push(a, a, b, b);
  }
  if (filters.hasMembers === "yes") {
    where.push(`${memberCountSql} > 0`);
  }
  if (filters.hasMembers === "no") {
    where.push(`${memberCountSql} = 0`);
  }

  return getDb()
    .prepare(
      `SELECT h.*,
        ${memberCountSql} AS member_count
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
          ${memberCountSql} AS member_count
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
        village_si, village_en, telephone, notes, is_archived,
        custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
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
        village_si = ?, village_en = ?, telephone = ?, notes = ?,
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

export function setHouseArchived(id: number, archived: boolean): House {
  const existing = getHouse(id);
  if (!existing) throw new Error("House not found");
  getDb()
    .prepare("UPDATE houses SET is_archived = ?, updated_at = ? WHERE id = ?")
    .run(archived ? 1 : 0, nowIso(), id);
  return getHouse(id)!;
}
