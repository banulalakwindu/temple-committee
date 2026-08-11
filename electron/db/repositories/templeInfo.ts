import { getDb } from "../connection.js";
import type { TempleInfoItem, TempleInfoInput } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function listTempleInfo(): TempleInfoItem[] {
  return getDb()
    .prepare(
      `SELECT * FROM temple_info ORDER BY sort_order ASC, id ASC`,
    )
    .all() as TempleInfoItem[];
}

export function getTempleInfo(id: number): TempleInfoItem | null {
  return (
    (getDb()
      .prepare("SELECT * FROM temple_info WHERE id = ?")
      .get(id) as TempleInfoItem | undefined) ?? null
  );
}

export function upsertTempleInfo(input: TempleInfoInput): TempleInfoItem {
  const labelSi = (input.label_si ?? "").trim();
  const labelEn = (input.label_en ?? "").trim();
  const valueSi = (input.value_si ?? "").trim();
  const valueEn = (input.value_en ?? "").trim();
  if (!labelSi && !labelEn) throw new Error("Label is required");

  const ts = nowIso();

  if (input.id) {
    const existing = getTempleInfo(input.id);
    if (!existing) throw new Error("Temple info item not found");
    const sort =
      input.sort_order !== undefined
        ? Math.max(0, Math.floor(input.sort_order))
        : existing.sort_order;
    getDb()
      .prepare(
        `UPDATE temple_info SET
          label_si=?, label_en=?, value_si=?, value_en=?, sort_order=?, updated_at=?
         WHERE id=?`,
      )
      .run(labelSi, labelEn, valueSi, valueEn, sort, ts, input.id);
    return getTempleInfo(input.id)!;
  }

  const maxRow = getDb()
    .prepare("SELECT IFNULL(MAX(sort_order), 0) AS m FROM temple_info")
    .get() as { m: number };
  const sort =
    input.sort_order !== undefined
      ? Math.max(0, Math.floor(input.sort_order))
      : maxRow.m + 1;

  const r = getDb()
    .prepare(
      `INSERT INTO temple_info (
        label_si, label_en, value_si, value_en, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(labelSi, labelEn, valueSi, valueEn, sort, ts, ts);
  return getTempleInfo(Number(r.lastInsertRowid))!;
}

export function deleteTempleInfo(id: number): void {
  const r = getDb().prepare("DELETE FROM temple_info WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Temple info item not found");
}

/** Persist drag-reorder: ordered ids become sort_order 1..n */
export function reorderTempleInfo(orderedIds: number[]): TempleInfoItem[] {
  const ids = orderedIds.map(Number).filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return listTempleInfo();

  const db = getDb();
  const update = db.prepare(
    "UPDATE temple_info SET sort_order = ?, updated_at = ? WHERE id = ?",
  );
  const ts = nowIso();
  db.exec("BEGIN");
  try {
    ids.forEach((id, index) => {
      update.run(index + 1, ts, id);
    });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return listTempleInfo();
}

/** Ensure starter temple metadata rows exist. */
export function seedDefaultTempleInfo(): void {
  const defaults: Array<{
    label_en: string;
    label_si: string;
    sort_order: number;
  }> = [
    {
      label_en: "Temple start date",
      label_si: "පන්සල ආරම්භක දිනය",
      sort_order: 1,
    },
    {
      label_en: "First Thero",
      label_si: "ප්‍රථම ස්වාමීන් වහන්සේ",
      sort_order: 2,
    },
    {
      label_en: "Current Main Thero",
      label_si: "වත්මන් නායක ස්වාමීන් වහන්සේ",
      sort_order: 3,
    },
  ];

  const existing = getDb()
    .prepare("SELECT label_en, label_si FROM temple_info")
    .all() as { label_en: string; label_si: string }[];

  const has = (labelEn: string, labelSi: string) =>
    existing.some(
      (row) =>
        row.label_en.trim().toLowerCase() === labelEn.toLowerCase() ||
        row.label_si.trim() === labelSi,
    );

  const ts = nowIso();
  const ins = getDb().prepare(
    `INSERT INTO temple_info (
      label_si, label_en, value_si, value_en, sort_order, created_at, updated_at
    ) VALUES (?, ?, '', '', ?, ?, ?)`,
  );
  for (const row of defaults) {
    if (has(row.label_en, row.label_si)) continue;
    ins.run(row.label_si, row.label_en, row.sort_order, ts, ts);
  }
}
