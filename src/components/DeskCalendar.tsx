import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

type DanaOcc = {
  id: number;
  house_id: number;
  dana_type: "heel" | "dawal";
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
};

type DanaGroup = {
  date: string;
  heel: DanaOcc[];
  dawal: DanaOcc[];
};

type TempleEvent = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_date: string;
  end_date: string;
  color_index: number;
};

type TempleTask = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_at: string;
  end_at: string;
  location_type: "inside" | "outside";
  color_index: number;
};

type DayMarks = {
  dana: boolean;
  events: boolean;
  tasks: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function monthLabel(year: number, month: number, locale: string): string {
  const d = new Date(year, month - 1, 1);
  try {
    return d.toLocaleDateString(locale === "si" ? "si-LK" : "en-GB", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return `${year}-${String(month).padStart(2, "0")}`;
  }
}

function buildMonthCells(
  year: number,
  month: number,
): Array<{ date: string; day: number } | null> {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatTaskRange(task: TempleTask): string {
  return `${task.start_at.replace("T", " ")} → ${task.end_at.replace("T", " ")}`;
}

function houseLabel(
  o: DanaOcc,
  locale: string,
): string {
  const name = displayName(o.house_name_si, o.house_name_en, locale);
  return o.house_number ? `${name} (#${o.house_number})` : name;
}

export function DeskCalendar({ open, onClose }: Props) {
  const { t, locale } = useI18n();
  const today = localDateString();
  const todayParts = today.split("-").map(Number);
  const [year, setYear] = useState(todayParts[0]!);
  const [month, setMonth] = useState(todayParts[1]!);
  const [selectedDate, setSelectedDate] = useState(today);
  const [marks, setMarks] = useState<Record<string, DayMarks>>({});
  const [dana, setDana] = useState<DanaGroup | null>(null);
  const [events, setEvents] = useState<TempleEvent[]>([]);
  const [tasks, setTasks] = useState<TempleTask[]>([]);
  const [loading, setLoading] = useState(false);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const [danaMonth, eventMonth, taskMonth] = await Promise.all([
          api(window.electronAPI.listDanaByMonth(year, month)),
          api(window.electronAPI.listEventsByMonth(year, month)),
          api(window.electronAPI.listTasksByMonth(year, month)),
        ]);
        const next: Record<string, DayMarks> = {};
        const ensure = (date: string) => {
          if (!next[date]) {
            next[date] = { dana: false, events: false, tasks: false };
          }
          return next[date]!;
        };
        for (const row of danaMonth as {
          date: string;
          heel_count: number;
          dawal_count: number;
        }[]) {
          if (row.heel_count > 0 || row.dawal_count > 0) {
            ensure(row.date).dana = true;
          }
        }
        const dim = new Date(year, month, 0).getDate();
        for (let day = 1; day <= dim; day++) {
          const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          for (const ev of eventMonth as TempleEvent[]) {
            if (ev.start_date <= date && ev.end_date >= date) {
              ensure(date).events = true;
            }
          }
          for (const task of taskMonth as TempleTask[]) {
            if (
              task.start_at <= `${date}T23:59` &&
              task.end_at >= `${date}T00:00`
            ) {
              ensure(date).tasks = true;
            }
          }
        }
        setMarks(next);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, year, month]);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [d, e, tk] = await Promise.all([
        api(window.electronAPI.listDanaByDate(selectedDate)),
        api(window.electronAPI.listEventsByDate(selectedDate)),
        api(window.electronAPI.listTasksByDate(selectedDate)),
      ]);
      setDana(d as DanaGroup);
      setEvents(e as TempleEvent[]);
      setTasks(tk as TempleTask[]);
    })();
  }, [open, selectedDate]);

  if (!open) return null;

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  };

  const goToday = () => {
    const [y, m] = today.split("-").map(Number);
    setYear(y!);
    setMonth(m!);
    setSelectedDate(today);
  };

  const weekdays = [
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
    t("weekdaySun"),
  ];

  const insideTasks = tasks.filter((x) => x.location_type === "inside");
  const outsideTasks = tasks.filter((x) => x.location_type === "outside");
  const hasAnything =
    (dana?.heel.length ?? 0) +
      (dana?.dawal.length ?? 0) +
      events.length +
      tasks.length >
    0;

  return (
    <div className="desk-cal-overlay" role="dialog" aria-modal aria-label={t("deskCalendar")}>
      <div className="desk-cal-shell">
        <header className="desk-cal-header">
          <div>
            <h2>{t("deskCalendar")}</h2>
            <p className="muted">{t("deskCalendarHint")}</p>
          </div>
          <button type="button" className="btn secondary" onClick={onClose}>
            {t("close")}
          </button>
        </header>

        <div className="desk-cal-body">
          <section className="panel desk-cal-month">
            <div className="dana-cal-toolbar">
              <button type="button" className="btn secondary" onClick={() => goMonth(-1)}>
                {t("prevMonth")}
              </button>
              <button type="button" className="btn secondary" onClick={goToday}>
                {t("thisMonth")}
              </button>
              <strong className="dana-cal-title">
                {monthLabel(year, month, locale)}
              </strong>
              <button type="button" className="btn secondary" onClick={() => goMonth(1)}>
                {t("nextMonth")}
              </button>
            </div>

            <div className="desk-cal-legend">
              <span>
                <i className="desk-dot dana" /> {t("dana")}
              </span>
              <span>
                <i className="desk-dot events" /> {t("events")}
              </span>
              <span>
                <i className="desk-dot tasks" /> {t("tasks")}
              </span>
            </div>

            <div className="dana-cal-grid desk-cal-grid">
              {weekdays.map((d) => (
                <div key={d} className="dana-cal-weekday">
                  {d}
                </div>
              ))}
              {cells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`pad-${idx}`} className="dana-cal-day empty" />;
                }
                const mark = marks[cell.date];
                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={[
                      "dana-cal-day desk-cal-day",
                      cell.date === today ? "is-today" : "",
                      cell.date === selectedDate ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    <span className="dana-cal-daynum">{cell.day}</span>
                    <div className="desk-day-dots">
                      {mark?.dana ? <i className="desk-dot dana" /> : null}
                      {mark?.events ? <i className="desk-dot events" /> : null}
                      {mark?.tasks ? <i className="desk-dot tasks" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
            {loading ? <p className="muted">{t("loading")}</p> : null}
          </section>

          <section className="panel desk-cal-detail">
            <h3>
              {selectedDate} · {t("details")}
            </h3>
            {!hasAnything ? (
              <p className="muted">{t("deskCalendarEmpty")}</p>
            ) : (
              <div className="desk-cal-sections">
                <div>
                  <h4>{t("heelDana")}</h4>
                  {!dana?.heel.length ? (
                    <p className="muted">{t("noDana")}</p>
                  ) : (
                    <ul className="desk-cal-links">
                      {dana.heel.map((o) => (
                        <li key={`h-${o.id || o.house_id}`}>
                          <Link
                            to={`/public/house/${o.house_id}`}
                            onClick={onClose}
                          >
                            {houseLabel(o, locale)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>{t("dawalDana")}</h4>
                  {!dana?.dawal.length ? (
                    <p className="muted">{t("noDana")}</p>
                  ) : (
                    <ul className="desk-cal-links">
                      {dana.dawal.map((o) => (
                        <li key={`d-${o.id || o.house_id}`}>
                          <Link
                            to={`/public/house/${o.house_id}`}
                            onClick={onClose}
                          >
                            {houseLabel(o, locale)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>{t("events")}</h4>
                  {!events.length ? (
                    <p className="muted">{t("noEventsForDate")}</p>
                  ) : (
                    <ul className="desk-detail-cards">
                      {events.map((ev) => (
                        <li key={ev.id} className={`current-event-card c${ev.color_index % 6}`}>
                          <strong>
                            {displayName(ev.name_si, ev.name_en, locale)}
                          </strong>
                          <span className="current-event-dates">
                            {ev.start_date}
                            {ev.end_date !== ev.start_date
                              ? ` → ${ev.end_date}`
                              : ""}
                          </span>
                          {(ev.description_si || ev.description_en) && (
                            <p>
                              {displayName(
                                ev.description_si,
                                ev.description_en,
                                locale,
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>{t("taskInside")}</h4>
                  {!insideTasks.length ? (
                    <p className="muted">{t("noTasksForDate")}</p>
                  ) : (
                    <ul className="desk-detail-cards">
                      {insideTasks.map((task) => (
                        <li
                          key={task.id}
                          className={`today-task-card c${task.color_index % 6}`}
                        >
                          <span className="task-item-time">
                            {formatTaskRange(task)}
                          </span>
                          <strong>
                            {displayName(task.name_si, task.name_en, locale)}
                          </strong>
                          {(task.description_si || task.description_en) && (
                            <p>
                              {displayName(
                                task.description_si,
                                task.description_en,
                                locale,
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>{t("taskOutside")}</h4>
                  {!outsideTasks.length ? (
                    <p className="muted">{t("noTasksForDate")}</p>
                  ) : (
                    <ul className="desk-detail-cards">
                      {outsideTasks.map((task) => (
                        <li
                          key={task.id}
                          className={`today-task-card c${task.color_index % 6}`}
                        >
                          <span className="task-item-time">
                            {formatTaskRange(task)}
                          </span>
                          <strong>
                            {displayName(task.name_si, task.name_en, locale)}
                          </strong>
                          {(task.description_si || task.description_en) && (
                            <p>
                              {displayName(
                                task.description_si,
                                task.description_en,
                                locale,
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
