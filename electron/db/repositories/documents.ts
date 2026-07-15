import { getDb } from "../connection.js";
import type { DocumentLog, NamedType } from "../../types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function listDocTypes(activeOnly = false): NamedType[] {
  const sql = activeOnly
    ? "SELECT * FROM document_types WHERE is_active = 1 ORDER BY sort_order, id"
    : "SELECT * FROM document_types ORDER BY sort_order, id";
  return getDb().prepare(sql).all() as NamedType[];
}

export function upsertDocType(
  input: Partial<NamedType> & { name_si: string; name_en: string },
): NamedType {
  if (input.id) {
    getDb()
      .prepare(
        `UPDATE document_types SET name_si=?, name_en=?, is_active=?, sort_order=? WHERE id=?`,
      )
      .run(
        input.name_si,
        input.name_en,
        input.is_active ?? 1,
        input.sort_order ?? 0,
        input.id,
      );
    return getDb()
      .prepare("SELECT * FROM document_types WHERE id = ?")
      .get(input.id) as NamedType;
  }
  const r = getDb()
    .prepare(
      `INSERT INTO document_types (name_si, name_en, is_active, sort_order) VALUES (?, ?, ?, ?)`,
    )
    .run(
      input.name_si,
      input.name_en,
      input.is_active ?? 1,
      input.sort_order ?? 0,
    );
  return getDb()
    .prepare("SELECT * FROM document_types WHERE id = ?")
    .get(Number(r.lastInsertRowid)) as NamedType;
}

export type DocumentFilters = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  documentTypeId?: number | null;
  issuedBy?: string;
};

export function listDocuments(filters: DocumentFilters = {}): DocumentLog[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(p.full_name_si LIKE ? OR p.full_name_en LIKE ? OR h.name_si LIKE ? OR h.name_en LIKE ? OR IFNULL(d.document_other,'') LIKE ? OR IFNULL(t.name_si,'') LIKE ? OR IFNULL(t.name_en,'') LIKE ? OR d.issued_by LIKE ? OR d.remarks LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like, like, like);
  }
  if (filters.dateFrom) {
    where.push("d.issue_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push("d.issue_date <= ?");
    params.push(filters.dateTo);
  }
  if (filters.documentTypeId) {
    where.push("d.document_type_id = ?");
    params.push(filters.documentTypeId);
  }
  if (filters.issuedBy?.trim()) {
    where.push("d.issued_by LIKE ?");
    params.push(`%${filters.issuedBy.trim()}%`);
  }

  return getDb()
    .prepare(
      `SELECT d.*,
        p.full_name_si AS person_name_si,
        p.full_name_en AS person_name_en,
        h.name_si AS house_name_si,
        t.name_si AS type_name_si,
        t.name_en AS type_name_en
       FROM document_logs d
       JOIN people p ON p.id = d.person_id
       LEFT JOIN houses h ON h.id = d.house_id
       LEFT JOIN document_types t ON t.id = d.document_type_id
       WHERE ${where.join(" AND ")}
       ORDER BY d.issue_date DESC, d.id DESC`,
    )
    .all(...(params as never[])) as DocumentLog[];
}

export function issueDocument(input: {
  personId: number;
  houseId?: number | null;
  documentTypeId?: number | null;
  documentOther?: string | null;
  issueDate: string;
  issuedBy: string;
  remarks?: string;
}): DocumentLog {
  if (!input.documentTypeId && !input.documentOther?.trim()) {
    throw new Error("Document type or Other text is required");
  }
  const person = getDb()
    .prepare("SELECT current_house_id FROM people WHERE id = ?")
    .get(input.personId) as { current_house_id: number | null } | undefined;
  if (!person) throw new Error("Person not found");

  const r = getDb()
    .prepare(
      `INSERT INTO document_logs (
        person_id, house_id, document_type_id, document_other,
        issue_date, issued_by, remarks, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.personId,
      input.houseId ?? person.current_house_id,
      input.documentTypeId ?? null,
      input.documentOther?.trim() || null,
      input.issueDate,
      input.issuedBy ?? "",
      input.remarks ?? "",
      nowIso(),
    );
  return listDocuments({}).find((d) => d.id === Number(r.lastInsertRowid))!;
}
