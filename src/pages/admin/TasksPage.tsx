import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/Icons";
import { EmptyState, ListPageHeader } from "@/components/ListPage";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString, withMirroredSi } from "@/lib/api";

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

type TaskForm = {
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_at: string;
  end_at: string;
  location_type: "inside" | "outside";
  color_index: number;
};

function defaultStart(date: string): string {
  return `${date}T09:00`;
}

function defaultEnd(date: string): string {
  return `${date}T10:00`;
}

function emptyForm(date?: string): TaskForm {
  const d = date || localDateString();
  return {
    name_si: "",
    name_en: "",
    description_si: "",
    description_en: "",
    start_at: defaultStart(d),
    end_at: defaultEnd(d),
    location_type: "inside",
    color_index: 0,
  };
}

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

function taskOverlapsDate(task: TempleTask, date: string): boolean {
  return task.start_at <= `${date}T23:59` && task.end_at >= `${date}T00:00`;
}

function tasksOnDate(tasks: TempleTask[], date: string): TempleTask[] {
  return tasks
    .filter((t) => taskOverlapsDate(t, date))
    .sort((a, b) => {
      if (a.start_at !== b.start_at) return a.start_at.localeCompare(b.start_at);
      return a.id - b.id;
    });
}

function formatTaskRange(task: TempleTask): string {
  const start = task.start_at.replace("T", " ");
  const end = task.end_at.replace("T", " ");
  return `${start} → ${end}`;
}

function formatTaskChipTime(task: TempleTask, date: string): string {
  const startDate = task.start_at.slice(0, 10);
  const endDate = task.end_at.slice(0, 10);
  const startTime = task.start_at.slice(11, 16);
  const endTime = task.end_at.slice(11, 16);
  if (startDate === endDate) return `${startTime}–${endTime}`;
  if (date === startDate) return `${startTime}→`;
  if (date === endDate) return `→${endTime}`;
  return "…";
}

function truncate(text: string, n: number): string {
  const t = text.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function TasksPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const today = localDateString();
  const todayParts = today.split("-").map(Number);
  const [year, setYear] = useState(todayParts[0]!);
  const [month, setMonth] = useState(todayParts[1]!);
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<TempleTask[]>([]);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<TaskForm>(() => emptyForm(today));
  const [saving, setSaving] = useState(false);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const selectedTasks = useMemo(
    () => tasksOnDate(tasks, selectedDate),
    [tasks, selectedDate],
  );

  const loadMonth = () => {
    void api(window.electronAPI.listTasksByMonth(year, month))
      .then((rows) => setTasks(rows as TempleTask[]))
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  useEffect(() => {
    loadMonth();
  }, [year, month]);

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

  const openCreate = (date?: string) => {
    setForm(emptyForm(date || selectedDate));
    setEditId(null);
    setMode("create");
  };

  const openEdit = (task: TempleTask) => {
    setForm({
      name_si: task.name_si,
      name_en: task.name_en,
      description_si: task.description_si,
      description_en: task.description_en,
      start_at: task.start_at,
      end_at: task.end_at,
      location_type: task.location_type,
      color_index: task.color_index,
    });
    setEditId(task.id);
    setMode("edit");
  };

  const saveForm = () => {
    setSaving(true);
    void (async () => {
      try {
        if (mode === "edit" && editId) {
          await api(window.electronAPI.updateTempleTask(editId, form));
          notify(t("taskUpdated"));
        } else {
          await api(window.electronAPI.createTempleTask(form));
          notify(t("taskCreated"));
        }
        setMode("browse");
        loadMonth();
      } catch (e) {
        notify(e instanceof Error ? e.message : t("saveFailed"), {
          tone: "error",
          scrollTop: true,
        });
      } finally {
        setSaving(false);
      }
    })();
  };

  const removeTask = (task: TempleTask) => {
    void confirm({
      message: t("confirmDeleteTask"),
      confirmLabel: t("delete"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.deleteTempleTask(task.id))
        .then(() => {
          notify(t("taskDeleted"));
          loadMonth();
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
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

  const locationLabel = (loc: "inside" | "outside") =>
    loc === "outside" ? t("taskOutside") : t("taskInside");

  if (mode === "create" || mode === "edit") {
    return (
      <div>
        <ListPageHeader
          title={mode === "edit" ? t("editTask") : t("addTask")}
          actions={
            <button
              type="button"
              className="btn secondary"
              onClick={() => setMode("browse")}
            >
              {t("back")}
            </button>
          }
        />
        <div className="panel">
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("nameEn")}</label>
              <input
                className="input"
                value={form.name_en}
                onChange={(e) =>
                  setForm((f) =>
                    withMirroredSi(f, "name_en", "name_si", e.target.value),
                  )
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("nameSi")}</label>
              <input
                className="input"
                value={form.name_si}
                onChange={(e) => setForm({ ...form, name_si: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label">{t("descriptionEn")}</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.description_en}
                onChange={(e) =>
                  setForm((f) =>
                    withMirroredSi(
                      f,
                      "description_en",
                      "description_si",
                      e.target.value,
                    ),
                  )
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("descriptionSi")}</label>
              <textarea
                className="textarea"
                rows={3}
                value={form.description_si}
                onChange={(e) =>
                  setForm({ ...form, description_si: e.target.value })
                }
              />
            </div>
            <div className="field field-full">
              <label className="label">{t("taskLocation")}</label>
              <select
                className="select"
                value={form.location_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    location_type: e.target.value as "inside" | "outside",
                  })
                }
              >
                <option value="inside">{t("taskInside")}</option>
                <option value="outside">{t("taskOutside")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t("startDateTime")}</label>
              <input
                className="input"
                type="datetime-local"
                value={form.start_at}
                onChange={(e) =>
                  setForm({ ...form, start_at: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("endDateTime")}</label>
              <input
                className="input"
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
              />
            </div>
            <div className="field field-full">
              <label className="label">{t("eventColor")}</label>
              <div className="event-color-picker">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`event-color-swatch c${idx} ${
                      form.color_index === idx ? "selected" : ""
                    }`}
                    aria-label={`${t("eventColor")} ${idx + 1}`}
                    onClick={() => setForm({ ...form, color_index: idx })}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setMode("browse")}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={
                saving ||
                (!form.name_en.trim() && !form.name_si.trim()) ||
                !form.start_at ||
                !form.end_at
              }
              onClick={saveForm}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ListPageHeader
        title={t("tasks")}
        actions={
          <button type="button" className="btn btn-icon" onClick={() => openCreate()}>
            <span className="btn-ico">{Icons.plus({ size: 16 })}</span>
            <span>{t("addTask")}</span>
          </button>
        }
      />

      <div className="panel dana-cal-panel">
        <div className="dana-cal-toolbar">
          <button type="button" className="btn secondary" onClick={() => goMonth(-1)}>
            {t("prevMonth")}
          </button>
          <button type="button" className="btn secondary" onClick={goToday}>
            {t("thisMonth")}
          </button>
          <strong className="dana-cal-title">{monthLabel(year, month, locale)}</strong>
          <button type="button" className="btn secondary" onClick={() => goMonth(1)}>
            {t("nextMonth")}
          </button>
        </div>

        <div className="dana-cal-grid task-cal-grid" role="grid" aria-label={t("tasks")}>
          {weekdays.map((d) => (
            <div key={d} className="dana-cal-weekday">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`pad-${idx}`} className="dana-cal-day empty" />;
            }
            const dayTasks = tasksOnDate(tasks, cell.date);
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            return (
              <button
                key={cell.date}
                type="button"
                className={[
                  "dana-cal-day task-cal-day",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                  dayTasks.length ? "has-task" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span className="dana-cal-daynum">{cell.day}</span>
                <div className="task-day-chips">
                  {dayTasks.slice(0, 2).map((task) => {
                    const label = displayName(
                      task.name_si,
                      task.name_en,
                      locale,
                    );
                    const time = formatTaskChipTime(task, cell.date);
                    return (
                      <span
                        key={task.id}
                        className={`task-day-chip c${task.color_index % 6}`}
                        title={`${locationLabel(task.location_type)} · ${formatTaskRange(task)} · ${label}`}
                      >
                        <span className="task-chip-time">{time}</span>
                        <span className="task-chip-name">
                          {truncate(label, 10)}
                        </span>
                      </span>
                    );
                  })}
                  {dayTasks.length > 2 ? (
                    <span className="event-day-more">
                      +{dayTasks.length - 2} {t("more")}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="detail-panel-title">
          <h3>
            {selectedDate} · {t("tasks")}
          </h3>
          <button
            type="button"
            className="btn secondary btn-sm"
            onClick={() => openCreate(selectedDate)}
          >
            {t("addTask")}
          </button>
        </div>
        {!selectedTasks.length ? (
          <EmptyState message={t("noTasksForDate")} />
        ) : (
          <ul className="task-day-list">
            {selectedTasks.map((task) => (
              <li
                key={task.id}
                className={`task-day-item c${task.color_index % 6}`}
              >
                <div className="event-day-item-main">
                  <span className="task-item-time">{formatTaskRange(task)}</span>
                  <strong>
                    {displayName(task.name_si, task.name_en, locale)}
                  </strong>
                  <span className="task-location-badge">
                    {locationLabel(task.location_type)}
                  </span>
                  {(task.description_si || task.description_en) && (
                    <p>
                      {displayName(
                        task.description_si,
                        task.description_en,
                        locale,
                      )}
                    </p>
                  )}
                </div>
                <div className="dana-occ-actions">
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => openEdit(task)}
                  >
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => removeTask(task)}
                  >
                    {t("delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
