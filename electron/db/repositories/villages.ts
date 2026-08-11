import { getDb } from "../connection.js";
import type { NamedType } from "../../types.js";

export type Village = NamedType;

export type VillageInput = {
  id?: number;
  name_si: string;
  name_en: string;
  sort_order?: number;
};

export function listVillages(): Village[] {
  return getDb()
    .prepare("SELECT * FROM villages ORDER BY sort_order, id")
    .all() as Village[];
}

export function upsertVillage(input: VillageInput): Village {
  const nameSi = (input.name_si ?? "").trim();
  const nameEn = (input.name_en ?? "").trim();
  if (!nameSi && !nameEn) throw new Error("Village name is required");
  const sort = Math.max(0, Math.floor(input.sort_order ?? 0));

  if (input.id) {
    getDb()
      .prepare(
        `UPDATE villages SET name_si=?, name_en=?, sort_order=? WHERE id=?`,
      )
      .run(nameSi, nameEn, sort, input.id);
    return getDb()
      .prepare("SELECT * FROM villages WHERE id = ?")
      .get(input.id) as Village;
  }

  const r = getDb()
    .prepare(
      `INSERT INTO villages (name_si, name_en, sort_order) VALUES (?, ?, ?)`,
    )
    .run(nameSi, nameEn, sort);
  return getDb()
    .prepare("SELECT * FROM villages WHERE id = ?")
    .get(Number(r.lastInsertRowid)) as Village;
}

export function deleteVillage(id: number): void {
  const r = getDb().prepare("DELETE FROM villages WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Village not found");
}

/** Ensure known temple-area villages exist in the catalog. */
export function seedDefaultVillages(): void {
  const defaults: Array<{ name_en: string; name_si: string; sort_order: number }> =
    [
      { name_en: "Welimaluwa", name_si: "වැලිමලුව", sort_order: 1 },
      { name_en: "Pitakumbura", name_si: "පිටකුඹුර", sort_order: 2 },
      { name_en: "Gonakumbura", name_si: "ගෝණකුඹුර", sort_order: 3 },
    ];

  const existing = getDb()
    .prepare("SELECT name_en, name_si FROM villages")
    .all() as { name_en: string; name_si: string }[];

  const has = (nameEn: string, nameSi: string) =>
    existing.some(
      (row) =>
        row.name_en.trim().toLowerCase() === nameEn.toLowerCase() ||
        row.name_si.trim() === nameSi,
    );

  const ins = getDb().prepare(
    `INSERT INTO villages (name_si, name_en, sort_order) VALUES (?, ?, ?)`,
  );
  for (const v of defaults) {
    if (has(v.name_en, v.name_si)) continue;
    ins.run(v.name_si, v.name_en, v.sort_order);
  }
}
