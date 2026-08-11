import { getDb } from "../connection.js";
import { todayCount } from "./attendance.js";
import { listCurrentEvents } from "./events.js";
import { listToday as listDanaToday } from "./dana.js";
import { pendingCount, listPending } from "./pending.js";
import { listTodayTasks } from "./tasks.js";

function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthPrefix(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function countSql(sql: string, params: unknown[] = []): number {
  const row = getDb()
    .prepare(sql)
    .get(...(params as never[])) as { c: number | bigint };
  return Number(row.c);
}

export type DashboardRecentPending = {
  id: number;
  request_type: string;
  submitted_at: string;
};

export type DashboardStats = {
  date: string;
  houses: number;
  people: number;
  pending: number;
  todayAttendance: number;
  dahamSchoolChildren: number;
  villages: number;
  templeInfo: number;
  todayDanaHeel: number;
  todayDanaDawal: number;
  currentEvents: number;
  todayTasks: number;
  todayTasksInside: number;
  todayTasksOutside: number;
  paymentsThisMonth: number;
  paymentAmountThisMonth: number;
  documentsThisMonth: number;
  recentPending: DashboardRecentPending[];
};

export function getDashboardStats(): DashboardStats {
  const date = localDateString();
  const month = monthPrefix();
  const dana = listDanaToday();
  const tasks = listTodayTasks();

  const paymentRow = getDb()
    .prepare(
      `SELECT COUNT(*) AS c, IFNULL(SUM(amount), 0) AS total
       FROM payments WHERE payment_date LIKE ?`,
    )
    .get(`${month}%`) as { c: number | bigint; total: number };

  const recentPending = listPending({ status: "pending" })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      request_type: p.request_type,
      submitted_at: p.submitted_at,
    }));

  return {
    date,
    houses: countSql(
      "SELECT COUNT(*) AS c FROM houses WHERE IFNULL(is_archived, 0) = 0",
    ),
    people: countSql(
      "SELECT COUNT(*) AS c FROM people WHERE IFNULL(is_archived, 0) = 0",
    ),
    pending: pendingCount(),
    todayAttendance: todayCount(),
    dahamSchoolChildren: countSql(
      `SELECT COUNT(*) AS c FROM people
       WHERE IFNULL(is_archived, 0) = 0 AND IFNULL(daham_school_child, 0) = 1`,
    ),
    villages: countSql("SELECT COUNT(*) AS c FROM villages"),
    templeInfo: countSql("SELECT COUNT(*) AS c FROM temple_info"),
    todayDanaHeel: dana.heel.length,
    todayDanaDawal: dana.dawal.length,
    currentEvents: listCurrentEvents().length,
    todayTasks: tasks.length,
    todayTasksInside: tasks.filter((t) => t.location_type === "inside").length,
    todayTasksOutside: tasks.filter((t) => t.location_type === "outside").length,
    paymentsThisMonth: Number(paymentRow.c),
    paymentAmountThisMonth: Number(paymentRow.total) || 0,
    documentsThisMonth: countSql(
      `SELECT COUNT(*) AS c FROM document_logs WHERE issue_date LIKE ?`,
      [`${month}%`],
    ),
    recentPending,
  };
}
