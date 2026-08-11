import { getDb } from "../db/connection.js";
import { listByHouse } from "../db/repositories/dana.js";

export type GlobalSearchHit = {
  kind:
    | "person"
    | "house"
    | "pending"
    | "event"
    | "task"
    | "document"
    | "payment"
    | "temple_info"
    | "village"
    | "dana";
  id: number;
  title: string;
  subtitle: string;
  /** Optional related ids for public navigation */
  person_id?: number | null;
  house_id?: number | null;
};

function pickName(
  si: string | null | undefined,
  en: string | null | undefined,
  locale: string,
): string {
  if (locale === "en") return (en || si || "").trim();
  return (si || en || "").trim();
}

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function globalSearch(
  query: string,
  opts: { includeAdmin?: boolean; locale?: string } = {},
): GlobalSearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const locale = opts.locale === "en" ? "en" : "si";
  const admin = Boolean(opts.includeAdmin);
  const db = getDb();
  const hits: GlobalSearchHit[] = [];
  const today = localToday();
  const perKind = admin ? 12 : 10;

  const people = db
    .prepare(
      `SELECT p.id, p.full_name_si, p.full_name_en, p.nic, p.phone,
              p.daham_school_child,
              h.name_si AS house_name_si, h.name_en AS house_name_en
       FROM people p
       LEFT JOIN houses h ON h.id = p.current_house_id
       WHERE IFNULL(p.is_archived, 0) = 0
         AND (p.full_name_si LIKE ? OR p.full_name_en LIKE ?
          OR p.nic LIKE ? OR p.phone LIKE ?
          OR p.address_si LIKE ? OR p.address_en LIKE ?
          OR p.occupation_si LIKE ? OR p.occupation_en LIKE ?)
       ORDER BY p.full_name_si LIMIT ?`,
    )
    .all(like, like, like, like, like, like, like, like, perKind) as {
    id: number;
    full_name_si: string;
    full_name_en: string;
    nic: string;
    phone: string;
    daham_school_child: number;
    house_name_si: string | null;
    house_name_en: string | null;
  }[];

  for (const p of people) {
    hits.push({
      kind: "person",
      id: p.id,
      title: pickName(p.full_name_si, p.full_name_en, locale) || `#${p.id}`,
      subtitle: [
        pickName(p.house_name_si, p.house_name_en, locale),
        p.phone,
        p.nic,
        p.daham_school_child ? "Daham school" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const houses = db
    .prepare(
      `SELECT h.id, h.name_si, h.name_en, h.house_number, h.village_si, h.village_en, h.telephone,
        (SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND IFNULL(p.is_archived, 0) = 0) AS member_count
       FROM houses h
       WHERE IFNULL(h.is_archived, 0) = 0
         AND (h.name_si LIKE ? OR h.name_en LIKE ?
          OR IFNULL(h.house_number,'') LIKE ?
          OR h.village_si LIKE ? OR h.village_en LIKE ?
          OR h.telephone LIKE ?
          OR h.address_si LIKE ? OR h.address_en LIKE ?)
       ORDER BY h.name_si LIMIT ?`,
    )
    .all(like, like, like, like, like, like, like, like, perKind) as {
    id: number;
    name_si: string;
    name_en: string;
    house_number: string | null;
    village_si: string;
    village_en: string;
    telephone: string;
    member_count: number;
  }[];

  for (const h of houses) {
    let danaBits: string[] = [];
    try {
      const history = listByHouse(h.id);
      danaBits = history.upcoming.slice(0, 2).map((u) => {
        const label = u.dana_type === "heel" ? "Heel" : "Dawal";
        return `${label} ${u.dana_date}`;
      });
    } catch {
      danaBits = [];
    }
    hits.push({
      kind: "house",
      id: h.id,
      title: pickName(h.name_si, h.name_en, locale) || `#${h.id}`,
      subtitle: [
        h.house_number ? `#${h.house_number}` : "",
        pickName(h.village_si, h.village_en, locale),
        `${h.member_count}`,
        ...danaBits,
      ]
        .filter(Boolean)
        .join(" · "),
      house_id: h.id,
    });
  }

  const events = db
    .prepare(
      `SELECT id, name_si, name_en, description_si, description_en, start_date, end_date
       FROM temple_events
       WHERE name_si LIKE ? OR name_en LIKE ?
          OR description_si LIKE ? OR description_en LIKE ?
          OR start_date LIKE ? OR end_date LIKE ?
       ORDER BY start_date DESC LIMIT ?`,
    )
    .all(like, like, like, like, like, like, perKind) as {
    id: number;
    name_si: string;
    name_en: string;
    description_si: string;
    description_en: string;
    start_date: string;
    end_date: string;
  }[];

  for (const e of events) {
    hits.push({
      kind: "event",
      id: e.id,
      title: pickName(e.name_si, e.name_en, locale) || `#${e.id}`,
      subtitle: [
        e.end_date !== e.start_date
          ? `${e.start_date} → ${e.end_date}`
          : e.start_date,
        pickName(e.description_si, e.description_en, locale),
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const tasks = db
    .prepare(
      `SELECT id, name_si, name_en, description_si, description_en,
              start_at, end_at, location_type
       FROM temple_tasks
       WHERE name_si LIKE ? OR name_en LIKE ?
          OR description_si LIKE ? OR description_en LIKE ?
          OR start_at LIKE ? OR end_at LIKE ?
          OR location_type LIKE ?
       ORDER BY start_at DESC LIMIT ?`,
    )
    .all(like, like, like, like, like, like, like, perKind) as {
    id: number;
    name_si: string;
    name_en: string;
    description_si: string;
    description_en: string;
    start_at: string;
    end_at: string;
    location_type: string;
  }[];

  for (const task of tasks) {
    hits.push({
      kind: "task",
      id: task.id,
      title: pickName(task.name_si, task.name_en, locale) || `#${task.id}`,
      subtitle: [
        task.location_type,
        `${task.start_at.replace("T", " ")} → ${task.end_at.replace("T", " ")}`,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const templeInfo = db
    .prepare(
      `SELECT id, label_si, label_en, value_si, value_en
       FROM temple_info
       WHERE label_si LIKE ? OR label_en LIKE ?
          OR value_si LIKE ? OR value_en LIKE ?
       ORDER BY sort_order, id LIMIT ?`,
    )
    .all(like, like, like, like, perKind) as {
    id: number;
    label_si: string;
    label_en: string;
    value_si: string;
    value_en: string;
  }[];

  for (const row of templeInfo) {
    hits.push({
      kind: "temple_info",
      id: row.id,
      title: pickName(row.label_si, row.label_en, locale) || `#${row.id}`,
      subtitle: pickName(row.value_si, row.value_en, locale) || "—",
    });
  }

  // Upcoming / recent dāna by house name or type keyword.
  const dana = db
    .prepare(
      `SELECT o.id, o.house_id, o.dana_type, o.dana_date, o.status,
              h.name_si, h.name_en, h.house_number
       FROM dana_occurrences o
       JOIN houses h ON h.id = o.house_id
       WHERE o.status = 'scheduled'
         AND o.dana_date >= ?
         AND (h.name_si LIKE ? OR h.name_en LIKE ?
          OR IFNULL(h.house_number,'') LIKE ?
          OR o.dana_type LIKE ?
          OR o.dana_date LIKE ?)
       ORDER BY o.dana_date ASC LIMIT ?`,
    )
    .all(today, like, like, like, like, like, perKind) as {
    id: number;
    house_id: number;
    dana_type: string;
    dana_date: string;
    status: string;
    name_si: string;
    name_en: string;
    house_number: string | null;
  }[];

  for (const d of dana) {
    const typeLabel = d.dana_type === "heel" ? "Heel" : "Dawal";
    hits.push({
      kind: "dana",
      id: d.id,
      title: `${typeLabel} · ${d.dana_date}`,
      subtitle: [
        pickName(d.name_si, d.name_en, locale),
        d.house_number ? `#${d.house_number}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      house_id: d.house_id,
    });
  }

  if (admin) {
    const pending = db
      .prepare(
        `SELECT id, request_type, status, submitted_at
         FROM pending_requests
         WHERE CAST(id AS TEXT) LIKE ?
            OR request_type LIKE ?
            OR status LIKE ?
            OR payload_json LIKE ?
            OR IFNULL(review_note,'') LIKE ?
         ORDER BY
           CASE status WHEN 'pending' THEN 0 ELSE 1 END,
           submitted_at DESC
         LIMIT ?`,
      )
      .all(like, like, like, like, like, perKind) as {
      id: number;
      request_type: string;
      status: string;
      submitted_at: string;
    }[];

    for (const p of pending) {
      hits.push({
        kind: "pending",
        id: p.id,
        title: `Pending #${p.id}`,
        subtitle: `${p.request_type} · ${p.status}`,
      });
    }

    const docs = db
      .prepare(
        `SELECT d.id, d.person_id, d.document_other, d.issue_date, d.issued_by,
                p.full_name_si, p.full_name_en,
                t.name_si AS type_si, t.name_en AS type_en
         FROM document_logs d
         JOIN people p ON p.id = d.person_id
         LEFT JOIN document_types t ON t.id = d.document_type_id
         WHERE p.full_name_si LIKE ? OR p.full_name_en LIKE ?
            OR IFNULL(t.name_si,'') LIKE ? OR IFNULL(t.name_en,'') LIKE ?
            OR IFNULL(d.document_other,'') LIKE ?
            OR d.issue_date LIKE ?
            OR d.issued_by LIKE ?
            OR d.remarks LIKE ?
         ORDER BY d.issue_date DESC, d.id DESC LIMIT ?`,
      )
      .all(like, like, like, like, like, like, like, like, perKind) as {
      id: number;
      person_id: number;
      document_other: string | null;
      issue_date: string;
      issued_by: string;
      full_name_si: string;
      full_name_en: string;
      type_si: string | null;
      type_en: string | null;
    }[];

    for (const d of docs) {
      hits.push({
        kind: "document",
        id: d.id,
        title:
          pickName(d.type_si, d.type_en, locale) ||
          d.document_other ||
          `Document #${d.id}`,
        subtitle: [
          pickName(d.full_name_si, d.full_name_en, locale),
          d.issue_date,
          d.issued_by,
        ]
          .filter(Boolean)
          .join(" · "),
        person_id: d.person_id,
      });
    }

    const payments = db
      .prepare(
        `SELECT pay.id, pay.person_id, pay.house_id, pay.payment_date, pay.amount,
                pay.type_name_si, pay.type_name_en, pay.notes,
                p.full_name_si, p.full_name_en,
                h.name_si AS house_name_si, h.name_en AS house_name_en
         FROM payments pay
         LEFT JOIN people p ON p.id = pay.person_id
         LEFT JOIN houses h ON h.id = pay.house_id
         WHERE pay.type_name_si LIKE ? OR pay.type_name_en LIKE ?
            OR pay.payment_date LIKE ?
            OR pay.notes LIKE ?
            OR IFNULL(p.full_name_si,'') LIKE ? OR IFNULL(p.full_name_en,'') LIKE ?
            OR IFNULL(h.name_si,'') LIKE ? OR IFNULL(h.name_en,'') LIKE ?
            OR CAST(pay.amount AS TEXT) LIKE ?
         ORDER BY pay.payment_date DESC, pay.id DESC LIMIT ?`,
      )
      .all(like, like, like, like, like, like, like, like, like, perKind) as {
      id: number;
      person_id: number | null;
      house_id: number | null;
      payment_date: string;
      amount: number;
      type_name_si: string;
      type_name_en: string;
      notes: string;
      full_name_si: string | null;
      full_name_en: string | null;
      house_name_si: string | null;
      house_name_en: string | null;
    }[];

    for (const pay of payments) {
      hits.push({
        kind: "payment",
        id: pay.id,
        title: pickName(pay.type_name_si, pay.type_name_en, locale) || `Payment #${pay.id}`,
        subtitle: [
          pickName(pay.full_name_si, pay.full_name_en, locale) ||
            pickName(pay.house_name_si, pay.house_name_en, locale),
          pay.payment_date,
          String(pay.amount),
        ]
          .filter(Boolean)
          .join(" · "),
        person_id: pay.person_id,
        house_id: pay.house_id,
      });
    }

    const villages = db
      .prepare(
        `SELECT id, name_si, name_en
         FROM villages
         WHERE name_si LIKE ? OR name_en LIKE ?
         ORDER BY sort_order, id LIMIT ?`,
      )
      .all(like, like, perKind) as {
      id: number;
      name_si: string;
      name_en: string;
    }[];

    for (const v of villages) {
      hits.push({
        kind: "village",
        id: v.id,
        title: pickName(v.name_si, v.name_en, locale) || `#${v.id}`,
        subtitle: "Village",
      });
    }
  }

  return hits;
}
