import { getDb } from "../connection.js";
import type {
  Payment,
  PaymentInput,
  PaymentType,
  PaymentTypeInput,
} from "../../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OTHER_TYPE_ID = -1;

function nowIso(): string {
  return new Date().toISOString();
}

function assertDate(dateStr: string, label: string): void {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
}

function normalizeAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Amount must be a non-negative number");
  }
  return Math.round(n * 100) / 100;
}

export function listPaymentTypes(): PaymentType[] {
  return getDb()
    .prepare("SELECT * FROM payment_types ORDER BY sort_order, id")
    .all() as PaymentType[];
}

export function upsertPaymentType(input: PaymentTypeInput): PaymentType {
  const nameSi = (input.name_si ?? "").trim();
  const nameEn = (input.name_en ?? "").trim();
  if (!nameSi && !nameEn) throw new Error("Payment type name is required");
  const amount = normalizeAmount(input.amount ?? 0);
  const sort = Math.max(0, Math.floor(input.sort_order ?? 0));

  if (input.id) {
    getDb()
      .prepare(
        `UPDATE payment_types SET name_si=?, name_en=?, amount=?, sort_order=? WHERE id=?`,
      )
      .run(nameSi, nameEn, amount, sort, input.id);
    return getDb()
      .prepare("SELECT * FROM payment_types WHERE id = ?")
      .get(input.id) as PaymentType;
  }

  const r = getDb()
    .prepare(
      `INSERT INTO payment_types (name_si, name_en, amount, sort_order)
       VALUES (?, ?, ?, ?)`,
    )
    .run(nameSi, nameEn, amount, sort);
  return getDb()
    .prepare("SELECT * FROM payment_types WHERE id = ?")
    .get(Number(r.lastInsertRowid)) as PaymentType;
}

export function deletePaymentType(id: number): void {
  const r = getDb().prepare("DELETE FROM payment_types WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Payment type not found");
}

export type PaymentFilters = {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentTypeId?: number | null;
  houseId?: number | null;
  personId?: number | null;
  subjectType?: "person" | "house" | null;
};

function mapPaymentRow(row: Payment): Payment {
  return row;
}

export function listPayments(filters: PaymentFilters = {}): Payment[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push(
      `(p.full_name_si LIKE ? OR p.full_name_en LIKE ?
        OR h.name_si LIKE ? OR h.name_en LIKE ?
        OR pay.type_name_si LIKE ? OR pay.type_name_en LIKE ?
        OR pay.notes LIKE ?)`,
    );
    params.push(like, like, like, like, like, like, like);
  }
  if (filters.dateFrom) {
    where.push("pay.payment_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push("pay.payment_date <= ?");
    params.push(filters.dateTo);
  }
  if (filters.paymentTypeId) {
    where.push("pay.payment_type_id = ?");
    params.push(filters.paymentTypeId);
  }
  if (filters.houseId) {
    where.push("pay.house_id = ?");
    params.push(filters.houseId);
  }
  if (filters.personId) {
    where.push("pay.person_id = ?");
    params.push(filters.personId);
  }
  if (filters.subjectType === "person" || filters.subjectType === "house") {
    where.push("pay.subject_type = ?");
    params.push(filters.subjectType);
  }

  const rows = getDb()
    .prepare(
      `SELECT pay.*,
        p.full_name_si AS person_name_si,
        p.full_name_en AS person_name_en,
        h.name_si AS house_name_si,
        h.name_en AS house_name_en,
        h.house_number AS house_number
       FROM payments pay
       LEFT JOIN people p ON p.id = pay.person_id
       LEFT JOIN houses h ON h.id = pay.house_id
       WHERE ${where.join(" AND ")}
       ORDER BY pay.payment_date DESC, pay.id DESC`,
    )
    .all(...(params as never[])) as Payment[];
  return rows.map(mapPaymentRow);
}

/** Front-safe list: same filters, without amount. */
export function listPaymentsPublic(filters: PaymentFilters = {}): Omit<
  Payment,
  "amount"
>[] {
  return listPayments(filters).map(({ amount: _a, ...rest }) => rest);
}

export function createPayment(input: PaymentInput): Payment {
  const subject =
    input.subject_type === "house" || input.subject_type === "person"
      ? input.subject_type
      : null;
  if (!subject) throw new Error("Payment must be for a person or house");

  assertDate(input.payment_date, "Payment date");

  let personId: number | null = null;
  let houseId: number | null = null;

  if (subject === "person") {
    if (!input.person_id) throw new Error("Person is required");
    const person = getDb()
      .prepare(
        "SELECT id, current_house_id, is_archived FROM people WHERE id = ?",
      )
      .get(input.person_id) as
      | { id: number; current_house_id: number | null; is_archived: number }
      | undefined;
    if (!person) throw new Error("Person not found");
    if (person.is_archived) throw new Error("Cannot record payment for archived person");
    personId = person.id;
    houseId = input.house_id ?? person.current_house_id;
  } else {
    if (!input.house_id) throw new Error("House is required");
    const house = getDb()
      .prepare("SELECT id, is_archived FROM houses WHERE id = ?")
      .get(input.house_id) as
      | { id: number; is_archived: number }
      | undefined;
    if (!house) throw new Error("House not found");
    if (house.is_archived) throw new Error("Cannot record payment for archived house");
    houseId = house.id;
    personId = null;
  }

  let typeId: number | null = null;
  let typeNameSi = "";
  let typeNameEn = "";
  let amount = 0;

  const rawTypeId = input.payment_type_id ?? null;
  if (rawTypeId && rawTypeId !== OTHER_TYPE_ID) {
    const pt = getDb()
      .prepare("SELECT * FROM payment_types WHERE id = ?")
      .get(rawTypeId) as PaymentType | undefined;
    if (!pt) throw new Error("Payment type not found");
    typeId = pt.id;
    typeNameSi = pt.name_si;
    typeNameEn = pt.name_en;
    amount =
      input.amount !== undefined && input.amount !== null
        ? normalizeAmount(input.amount)
        : normalizeAmount(pt.amount);
  } else {
    typeNameSi = (input.type_name_si ?? "").trim();
    typeNameEn = (input.type_name_en ?? "").trim();
    if (!typeNameSi && !typeNameEn) {
      throw new Error("Payment name is required for Other");
    }
    if (!typeNameSi) typeNameSi = typeNameEn;
    if (!typeNameEn) typeNameEn = typeNameSi;
    amount = normalizeAmount(input.amount ?? 0);
  }

  const ts = nowIso();
  const r = getDb()
    .prepare(
      `INSERT INTO payments (
        subject_type, person_id, house_id, payment_type_id,
        type_name_si, type_name_en, amount, payment_date, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      subject,
      personId,
      houseId,
      typeId,
      typeNameSi,
      typeNameEn,
      amount,
      input.payment_date,
      (input.notes ?? "").trim(),
      ts,
      ts,
    );

  return listPayments({}).find((p) => p.id === Number(r.lastInsertRowid))!;
}

export function deletePayment(id: number): void {
  const r = getDb().prepare("DELETE FROM payments WHERE id = ?").run(id);
  if (!r.changes) throw new Error("Payment not found");
}

export { OTHER_TYPE_ID as PAYMENT_OTHER_TYPE_ID };
