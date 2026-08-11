/**
 * Quick recurrence / clamp checks (mirrors dana.ts date helpers).
 * Run: node scripts/test-dana-recurrence.mjs
 */

function localToday(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  const [ys, ms, ds] = dateStr.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function formatLocalDate(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function addMonthsClamped(dateStr, months) {
  const { y, m, d } = parseLocalDate(dateStr);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const dim = daysInMonth(ny, nm);
  return formatLocalDate(ny, nm, Math.min(d, dim));
}

function addDays(dateStr, days) {
  const { y, m, d } = parseLocalDate(dateStr);
  const dt = new Date(y, m - 1, d + days);
  return localToday(dt);
}

function nextDate(dateStr, interval, unit) {
  if (unit === "days") return addDays(dateStr, interval);
  if (unit === "years") return addMonthsClamped(dateStr, interval * 12);
  return addMonthsClamped(dateStr, interval);
}

function generateDates(rule, horizonEnd) {
  const dates = [];
  if (rule.recurrence_type === "once") {
    if (rule.start_date <= horizonEnd) dates.push(rule.start_date);
    return dates;
  }
  let cursor = rule.start_date;
  const maxCount =
    rule.end_type === "count"
      ? Math.max(1, Math.floor(rule.occurrence_count ?? 1))
      : Number.POSITIVE_INFINITY;
  const until =
    rule.end_type === "until" && rule.end_date ? rule.end_date : horizonEnd;
  let guard = 0;
  while (cursor <= until && dates.length < maxCount && guard < 5000) {
    dates.push(cursor);
    cursor = nextDate(cursor, rule.recurrence_interval, rule.recurrence_unit);
    guard += 1;
  }
  return dates;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Jan 31 monthly clamp
assert(addMonthsClamped("2026-01-31", 1) === "2026-02-28", "Jan31→Feb clamp");
assert(addMonthsClamped("2024-01-31", 1) === "2024-02-29", "leap Feb");
assert(addMonthsClamped("2026-01-31", 2) === "2026-03-31", "Jan31→Mar31");

// Monthly 6 occurrences
const monthly = generateDates(
  {
    start_date: "2026-08-10",
    recurrence_type: "monthly",
    recurrence_interval: 1,
    recurrence_unit: "months",
    end_type: "count",
    end_date: null,
    occurrence_count: 6,
  },
  "2099-01-01",
);
assert(
  monthly.join(",") ===
    "2026-08-10,2026-09-10,2026-10-10,2026-11-10,2026-12-10,2027-01-10",
  "monthly 6",
);

// Every 3 months
const q3 = generateDates(
  {
    start_date: "2026-08-10",
    recurrence_type: "every_3_months",
    recurrence_interval: 3,
    recurrence_unit: "months",
    end_type: "count",
    end_date: null,
    occurrence_count: 4,
  },
  "2099-01-01",
);
assert(
  q3.join(",") === "2026-08-10,2026-11-10,2027-02-10,2027-05-10",
  "every 3 months",
);

// Annual
const annual = generateDates(
  {
    start_date: "2026-08-10",
    recurrence_type: "annually",
    recurrence_interval: 1,
    recurrence_unit: "years",
    end_type: "count",
    end_date: null,
    occurrence_count: 3,
  },
  "2099-01-01",
);
assert(
  annual.join(",") === "2026-08-10,2027-08-10,2028-08-10",
  "annually",
);

// Until
const until = generateDates(
  {
    start_date: "2026-08-10",
    recurrence_type: "monthly",
    recurrence_interval: 1,
    recurrence_unit: "months",
    end_type: "until",
    end_date: "2026-10-10",
    occurrence_count: null,
  },
  "2099-01-01",
);
assert(until.join(",") === "2026-08-10,2026-09-10,2026-10-10", "until");

console.log("dana recurrence checks passed");
