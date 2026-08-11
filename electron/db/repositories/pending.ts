import { getDb } from "../connection.js";
import type { PendingRequest } from "../../types.js";
import { createHouse, updateHouse } from "./houses.js";
import { createPerson, updatePerson } from "./people.js";

function nowIso(): string {
  return new Date().toISOString();
}

export type PendingFilters = {
  q?: string;
  status?: string;
  requestType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function listPending(filters: PendingFilters = {}): PendingRequest[] {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (filters.q?.trim()) {
    where.push("payload_json LIKE ?");
    params.push(`%${filters.q.trim()}%`);
  }
  if (filters.status && filters.status !== "all") {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters.requestType && filters.requestType !== "all") {
    where.push("request_type = ?");
    params.push(filters.requestType);
  }
  if (filters.dateFrom) {
    where.push("submitted_at >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.push("submitted_at <= ?");
    params.push(`${filters.dateTo}T23:59:59.999Z`);
  }
  return getDb()
    .prepare(
      `SELECT * FROM pending_requests
       WHERE ${where.join(" AND ")}
       ORDER BY
         CASE status WHEN 'pending' THEN 0 ELSE 1 END,
         submitted_at DESC`,
    )
    .all(...(params as never[])) as PendingRequest[];
}

export function getPending(id: number): PendingRequest | null {
  return (
    (getDb().prepare("SELECT * FROM pending_requests WHERE id = ?").get(id) as
      | PendingRequest
      | undefined) ?? null
  );
}

export function createPending(input: {
  requestType: string;
  payload: unknown;
  targetPersonId?: number | null;
  targetHouseId?: number | null;
}): PendingRequest {
  const r = getDb()
    .prepare(
      `INSERT INTO pending_requests (
        request_type, payload_json, target_person_id, target_house_id,
        status, submitted_at, review_note
      ) VALUES (?, ?, ?, ?, 'pending', ?, '')`,
    )
    .run(
      input.requestType,
      JSON.stringify(input.payload ?? {}),
      input.targetPersonId ?? null,
      input.targetHouseId ?? null,
      nowIso(),
    );
  return getPending(Number(r.lastInsertRowid))!;
}

export function pendingCount(): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM pending_requests WHERE status = 'pending'",
    )
    .get() as { c: number | bigint } | undefined;
  // node:sqlite may return bigint — coerce so IPC/React badge stays correct
  return Number(row?.c ?? 0);
}

export function rejectPending(
  id: number,
  note: string,
): PendingRequest {
  getDb()
    .prepare(
      `UPDATE pending_requests SET status='rejected', reviewed_at=?, review_note=? WHERE id=?`,
    )
    .run(nowIso(), note || "", id);
  return getPending(id)!;
}

export function approvePending(id: number, note = ""): PendingRequest {
  const req = getPending(id);
  if (!req) throw new Error("Request not found");
  if (req.status !== "pending") throw new Error("Request already reviewed");

  const payload = JSON.parse(req.payload_json) as Record<string, unknown>;
  const db = getDb();
  db.exec("BEGIN");
  try {
    switch (req.request_type) {
      case "create_house":
        createHouse(payload as Parameters<typeof createHouse>[0]);
        break;
      case "update_house": {
        const houseId = req.target_house_id;
        if (!houseId) throw new Error("Missing house target");
        updateHouse(houseId, payload as Parameters<typeof updateHouse>[1]);
        break;
      }
      case "create_person":
        createPerson(payload as Parameters<typeof createPerson>[0]);
        break;
      case "update_person": {
        const personId = req.target_person_id;
        if (!personId) throw new Error("Missing person target");
        updatePerson(personId, payload as Parameters<typeof updatePerson>[1]);
        break;
      }
      case "create_household": {
        const housePayload = payload.house as
          | Parameters<typeof createHouse>[0]
          | undefined;
        const peoplePayload = payload.people as
          | Parameters<typeof createPerson>[0][]
          | undefined;
        if (!housePayload || typeof housePayload !== "object") {
          throw new Error("Household request is missing house details");
        }
        if (!Array.isArray(peoplePayload) || peoplePayload.length === 0) {
          throw new Error("Household request needs at least one person");
        }
        const house = createHouse(housePayload);
        for (const person of peoplePayload) {
          createPerson({
            ...person,
            current_house_id: house.id,
          });
        }
        break;
      }
      default:
        throw new Error(`Unknown request type: ${req.request_type}`);
    }
    db.prepare(
      `UPDATE pending_requests SET status='approved', reviewed_at=?, review_note=? WHERE id=?`,
    ).run(nowIso(), note || "", id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return getPending(id)!;
}
