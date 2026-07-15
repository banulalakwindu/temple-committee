import { getDb } from "../db/connection.js";

export type GlobalSearchHit =
  | {
      kind: "person";
      id: number;
      title: string;
      subtitle: string;
    }
  | {
      kind: "house";
      id: number;
      title: string;
      subtitle: string;
    }
  | {
      kind: "pending";
      id: number;
      title: string;
      subtitle: string;
    };

export function globalSearch(
  query: string,
  opts: { includePending?: boolean } = {},
): GlobalSearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const db = getDb();
  const hits: GlobalSearchHit[] = [];

  const people = db
    .prepare(
      `SELECT p.id, p.full_name_si, p.full_name_en, p.nic, p.phone,
              h.name_si AS house_name_si, h.name_en AS house_name_en
       FROM people p
       LEFT JOIN houses h ON h.id = p.current_house_id
       WHERE p.full_name_si LIKE ? OR p.full_name_en LIKE ?
          OR p.nic LIKE ? OR p.phone LIKE ?
          OR p.address_si LIKE ? OR p.address_en LIKE ?
       ORDER BY p.full_name_si LIMIT 25`,
    )
    .all(like, like, like, like, like, like) as {
    id: number;
    full_name_si: string;
    full_name_en: string;
    nic: string;
    phone: string;
    house_name_si: string | null;
    house_name_en: string | null;
  }[];

  for (const p of people) {
    hits.push({
      kind: "person",
      id: p.id,
      title: p.full_name_si || p.full_name_en || `#${p.id}`,
      subtitle: [
        p.full_name_en && p.full_name_si ? p.full_name_en : "",
        p.house_name_si || p.house_name_en || "",
        p.phone,
        p.nic,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  const houses = db
    .prepare(
      `SELECT h.id, h.name_si, h.name_en, h.house_number, h.village_si, h.village_en, h.telephone,
        (SELECT COUNT(*) FROM people p WHERE p.current_house_id = h.id AND p.is_active = 1) AS member_count
       FROM houses h
       WHERE h.name_si LIKE ? OR h.name_en LIKE ?
          OR IFNULL(h.house_number,'') LIKE ?
          OR h.village_si LIKE ? OR h.village_en LIKE ?
          OR h.telephone LIKE ?
          OR h.address_si LIKE ? OR h.address_en LIKE ?
       ORDER BY h.name_si LIMIT 25`,
    )
    .all(like, like, like, like, like, like, like, like) as {
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
    hits.push({
      kind: "house",
      id: h.id,
      title: h.name_si || h.name_en || `#${h.id}`,
      subtitle: [
        h.house_number ? `#${h.house_number}` : "",
        h.village_si || h.village_en,
        `${h.member_count} members`,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  if (opts.includePending && /^\d+$/.test(q)) {
    const pending = db
      .prepare("SELECT id, request_type, status FROM pending_requests WHERE id = ?")
      .get(Number(q)) as
      | { id: number; request_type: string; status: string }
      | undefined;
    if (pending) {
      hits.push({
        kind: "pending",
        id: pending.id,
        title: `Pending #${pending.id}`,
        subtitle: `${pending.request_type} · ${pending.status}`,
      });
    }
  }

  return hits;
}
