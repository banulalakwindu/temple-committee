import { useEffect, useMemo, useState } from "react";
import { Icons } from "@/components/Icons";
import { EmptyState, ListPageHeader } from "@/components/ListPage";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString, withMirroredSi } from "@/lib/api";

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

type EventForm = {
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_date: string;
  end_date: string;
  color_index: number;
};

function emptyForm(date?: string): EventForm {
  const d = date || localDateString();
  return {
    name_si: "",
    name_en: "",
    description_si: "",
    description_en: "",
    start_date: d,
    end_date: d,
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

function eventsOnDate(events: TempleEvent[], date: string): TempleEvent[] {
  return events.filter((e) => e.start_date <= date && e.end_date >= date);
}

export function EventsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const today = localDateString();
  const todayParts = today.split("-").map(Number);
  const [year, setYear] = useState(todayParts[0]!);
  const [month, setMonth] = useState(todayParts[1]!);
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<TempleEvent[]>([]);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(() => emptyForm(today));
  const [saving, setSaving] = useState(false);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const selectedEvents = useMemo(
    () => eventsOnDate(events, selectedDate),
    [events, selectedDate],
  );

  const loadMonth = () => {
    void api(window.electronAPI.listEventsByMonth(year, month))
      .then((rows) => setEvents(rows as TempleEvent[]))
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

  const openEdit = (ev: TempleEvent) => {
    setForm({
      name_si: ev.name_si,
      name_en: ev.name_en,
      description_si: ev.description_si,
      description_en: ev.description_en,
      start_date: ev.start_date,
      end_date: ev.end_date,
      color_index: ev.color_index,
    });
    setEditId(ev.id);
    setMode("edit");
  };

  const saveForm = () => {
    setSaving(true);
    void (async () => {
      try {
        if (mode === "edit" && editId) {
          await api(window.electronAPI.updateTempleEvent(editId, form));
          notify(t("eventUpdated"));
        } else {
          await api(window.electronAPI.createTempleEvent(form));
          notify(t("eventCreated"));
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

  const removeEvent = (ev: TempleEvent) => {
    void confirm({
      message: t("confirmDeleteEvent"),
      confirmLabel: t("delete"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.deleteTempleEvent(ev.id))
        .then(() => {
          notify(t("eventDeleted"));
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

  if (mode === "create" || mode === "edit") {
    return (
      <div>
        <ListPageHeader
          title={mode === "edit" ? t("editEvent") : t("addEvent")}
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
            <div className="field">
              <label className="label">{t("startDate")}</label>
              <input
                className="input"
                type="date"
                value={form.start_date}
                onChange={(e) => {
                  const start = e.target.value;
                  setForm({
                    ...form,
                    start_date: start,
                    end_date: form.end_date < start ? start : form.end_date,
                  });
                }}
              />
            </div>
            <div className="field">
              <label className="label">{t("endDate")}</label>
              <input
                className="input"
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
              disabled={saving || (!form.name_en.trim() && !form.name_si.trim())}
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
        title={t("events")}
        actions={
          <button type="button" className="btn btn-icon" onClick={() => openCreate()}>
            <span className="btn-ico">{Icons.plus({ size: 16 })}</span>
            <span>{t("addEvent")}</span>
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

        <div className="dana-cal-grid event-cal-grid" role="grid" aria-label={t("events")}>
          {weekdays.map((d) => (
            <div key={d} className="dana-cal-weekday">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`pad-${idx}`} className="dana-cal-day empty" />;
            }
            const dayEvents = eventsOnDate(events, cell.date);
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            return (
              <button
                key={cell.date}
                type="button"
                className={[
                  "dana-cal-day",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                  dayEvents.length ? "has-event" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span className="dana-cal-daynum">{cell.day}</span>
                <div className="event-day-bars">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={`event-day-bar c${ev.color_index % 6}`}
                      title={displayName(ev.name_si, ev.name_en, locale)}
                    />
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="event-day-more">+{dayEvents.length - 3}</span>
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
            {selectedDate} · {t("events")}
          </h3>
          <button
            type="button"
            className="btn secondary btn-sm"
            onClick={() => openCreate(selectedDate)}
          >
            {t("addEvent")}
          </button>
        </div>
        {!selectedEvents.length ? (
          <EmptyState message={t("noEventsForDate")} />
        ) : (
          <ul className="event-day-list">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className={`event-day-item c${ev.color_index % 6}`}>
                <div className="event-day-item-main">
                  <strong>{displayName(ev.name_si, ev.name_en, locale)}</strong>
                  <span className="muted">
                    {ev.start_date}
                    {ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ""}
                  </span>
                  {(ev.description_si || ev.description_en) && (
                    <p>
                      {displayName(ev.description_si, ev.description_en, locale)}
                    </p>
                  )}
                </div>
                <div className="dana-occ-actions">
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => openEdit(ev)}
                  >
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => removeEvent(ev)}
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
