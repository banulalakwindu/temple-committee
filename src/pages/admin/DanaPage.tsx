import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  DanaForm,
  danaFormToCreateInput,
  emptyDanaForm,
  type DanaFormValue,
  type HouseOpt,
} from "@/components/DanaForm";
import { Icons } from "@/components/Icons";
import { EmptyState, ListPageHeader } from "@/components/ListPage";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

type MonthDay = {
  date: string;
  heel_count: number;
  dawal_count: number;
  heel_houses: string[];
  dawal_houses: string[];
};

type Occurrence = {
  id: number;
  schedule_id: number | null;
  house_id: number;
  dana_type: "heel" | "dawal";
  dana_date: string;
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
  schedule_active?: number | null;
};

type DateGroup = {
  date: string;
  heel: Occurrence[];
  dawal: Occurrence[];
};

type Schedule = {
  id: number;
  house_id: number;
  dana_type: "heel" | "dawal";
  start_date: string;
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_unit: "days" | "months" | "years";
  end_type: "never" | "until" | "count";
  end_date: string | null;
  occurrence_count: number | null;
  is_active: number;
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

/** Monday-first calendar cells for a month (null = padding). */
function buildMonthCells(
  year: number,
  month: number,
): Array<{ date: string; day: number } | null> {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  // JS: 0=Sun … 6=Sat → Mon-first index
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

function scheduleToForm(s: Schedule, today: string): DanaFormValue {
  const once = s.recurrence_type === "once";
  const preset =
    s.recurrence_type === "monthly" ||
    s.recurrence_type === "every_3_months" ||
    s.recurrence_type === "every_6_months" ||
    s.recurrence_type === "annually" ||
    s.recurrence_type === "custom"
      ? s.recurrence_type
      : "custom";
  // Edit form is "effective from" for the future rule — never a past start.
  const startDate = s.start_date < today ? today : s.start_date;
  return {
    houseId: s.house_id,
    danaType: s.dana_type,
    startDate,
    mode: once ? "once" : "recurring",
    recurrenceType: once ? "monthly" : preset,
    recurrenceInterval: s.recurrence_interval,
    recurrenceUnit: s.recurrence_unit,
    endType: s.end_type,
    endDate: s.end_date || "",
    occurrenceCount: s.occurrence_count ?? 12,
  };
}

export function DanaPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();

  const today = localDateString();
  const todayParts = today.split("-").map(Number);
  const [year, setYear] = useState(todayParts[0]!);
  const [month, setMonth] = useState(todayParts[1]!);
  const [selectedDate, setSelectedDate] = useState(today);
  const [summary, setSummary] = useState<MonthDay[]>([]);
  const [details, setDetails] = useState<DateGroup | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit" | "editDay">(
    "browse",
  );
  const [form, setForm] = useState<DanaFormValue>(() => emptyDanaForm(today));
  const [editScheduleId, setEditScheduleId] = useState<number | null>(null);
  const [dayEdit, setDayEdit] = useState<{
    date: string;
    houseId: number;
    danaType: "heel" | "dawal";
    occurrenceId: number | null;
    scheduleId: number | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const summaryMap = useMemo(() => {
    const m = new Map<string, MonthDay>();
    for (const row of summary) m.set(row.date, row);
    return m;
  }, [summary]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const loadMonth = () => {
    void api(window.electronAPI.listDanaByMonth(year, month))
      .then((rows) => setSummary(rows as MonthDay[]))
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  const loadDate = (date: string) => {
    void api(window.electronAPI.listDanaByDate(date))
      .then((g) => setDetails(g as DateGroup))
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  useEffect(() => {
    loadMonth();
  }, [year, month]);

  useEffect(() => {
    if (mode === "browse") loadDate(selectedDate);
  }, [selectedDate, mode]);

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

  const houseLabel = (o: Occurrence) => {
    const name = displayName(o.house_name_si, o.house_name_en, locale);
    return o.house_number ? `${name} (#${o.house_number})` : name;
  };

  const openCreate = (date?: string) => {
    setForm(emptyDanaForm(date || selectedDate));
    setEditScheduleId(null);
    setMode("create");
  };

  const openEdit = (scheduleId: number) => {
    void api(window.electronAPI.getDanaSchedule(scheduleId))
      .then((s) => {
        if (!s) throw new Error("Dāna schedule not found");
        setForm(scheduleToForm(s as Schedule, today));
        setEditScheduleId(scheduleId);
        setMode("edit");
      })
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  const saveForm = () => {
    setSaving(true);
    void (async () => {
      try {
        const input = danaFormToCreateInput(form);
        if (mode === "edit" && editScheduleId) {
          await api(
            window.electronAPI.updateDanaSchedule(editScheduleId, {
              startDate: input.startDate,
              recurrenceType: input.recurrenceType,
              recurrenceInterval: input.recurrenceInterval,
              recurrenceUnit: input.recurrenceUnit,
              endType: input.endType,
              endDate: input.endDate,
              occurrenceCount: input.occurrenceCount,
              danaType: form.danaType === "both" ? undefined : form.danaType,
            }),
          );
          notify(t("danaUpdated"));
        } else {
          await api(window.electronAPI.createDana(input));
          notify(t("danaCreated"));
        }
        setMode("browse");
        loadMonth();
        loadDate(selectedDate);
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

  const cancelOccurrence = (row: Occurrence) => {
    void confirm({
      message: t("confirmCancelOccurrence"),
      confirmLabel: t("cancelOccurrence"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      const run =
        row.schedule_id != null
          ? api(window.electronAPI.skipDanaDate(row.schedule_id, row.dana_date))
          : row.id
            ? api(window.electronAPI.cancelDanaOccurrence(row.id))
            : Promise.reject(new Error(t("saveFailed")));
      void run
        .then(() => {
          notify(t("danaOccurrenceCancelled"));
          loadMonth();
          loadDate(selectedDate);
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
  };

  const openEditDay = (row: Occurrence) => {
    setDayEdit({
      date: row.dana_date,
      houseId: row.house_id,
      danaType: row.dana_type,
      occurrenceId: row.id > 0 ? row.id : null,
      scheduleId: row.id > 0 ? null : row.schedule_id,
    });
    setMode("editDay");
  };

  const saveDayEdit = () => {
    if (!dayEdit) return;
    setSaving(true);
    void api(
      window.electronAPI.updateDanaDay({
        date: dayEdit.date,
        houseId: dayEdit.houseId,
        danaType: dayEdit.danaType,
        occurrenceId: dayEdit.occurrenceId,
        scheduleId: dayEdit.scheduleId,
      }),
    )
      .then(() => {
        notify(t("danaDayUpdated"));
        setMode("browse");
        setDayEdit(null);
        loadMonth();
        loadDate(selectedDate);
      })
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      )
      .finally(() => setSaving(false));
  };

  const removeDay = (row: Occurrence) => {
    if (!(row.id > 0)) return;
    void confirm({
      message: t("confirmRemoveDanaDay"),
      confirmLabel: t("removeThisDay"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.deleteDanaDay(row.id))
        .then(() => {
          notify(t("danaDayRemoved"));
          loadMonth();
          loadDate(selectedDate);
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
  };

  const cancelFuture = (scheduleId: number) => {
    void confirm({
      message: t("confirmCancelFutureDana"),
      confirmLabel: t("cancelFutureDana"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.cancelDanaFuture(scheduleId))
        .then(() => {
          notify(t("danaCancelled"));
          loadMonth();
          loadDate(selectedDate);
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
  };

  const renderOccList = (title: string, rows: Occurrence[]) => (
    <div className="dana-type-block">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p className="muted">{t("noDana")}</p>
      ) : (
        <ol className="dana-occ-list">
          {rows.map((row, i) => (
            <li key={row.id || `${row.schedule_id}-${row.dana_date}-${row.dana_type}`}>
              <div className="dana-occ-main">
                <span>
                  {i + 1}. {houseLabel(row)}
                </span>
                <div className="dana-occ-actions">
                  <Link className="btn secondary btn-sm" to={`/admin/houses/${row.house_id}`}>
                    {t("viewHouse")}
                  </Link>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    onClick={() => openEditDay(row)}
                  >
                    {t("editThisDay")}
                  </button>
                  {row.id > 0 ? (
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={() => removeDay(row)}
                    >
                      {t("removeThisDay")}
                    </button>
                  ) : null}
                  {row.schedule_id && row.schedule_active ? (
                    <>
                      <button
                        type="button"
                        className="btn secondary btn-sm"
                        onClick={() => openEdit(row.schedule_id!)}
                      >
                        {t("changeFutureSchedule")}
                      </button>
                      <button
                        type="button"
                        className="btn secondary btn-sm"
                        onClick={() => cancelFuture(row.schedule_id!)}
                      >
                        {t("cancelFutureDana")}
                      </button>
                    </>
                  ) : null}
                  {row.dana_date >= today && row.schedule_id ? (
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={() => cancelOccurrence(row)}
                    >
                      {t("cancelOccurrence")}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  const weekdays = [
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
    t("weekdaySun"),
  ];

  if (mode === "editDay" && dayEdit) {
    const houseLabelOpt = (h: HouseOpt) => {
      const name = displayName(h.name_si, h.name_en, locale);
      return h.house_number ? `${name} (#${h.house_number})` : name;
    };
    return (
      <div>
        <ListPageHeader
          title={t("editThisDay")}
          actions={
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setMode("browse");
                setDayEdit(null);
              }}
            >
              {t("back")}
            </button>
          }
        />
        <div className="panel">
          <p className="dana-future-warning">{t("editThisDayHint")}</p>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("date")}</label>
              <input className="input" type="date" value={dayEdit.date} readOnly disabled />
            </div>
            <div className="field">
              <label className="label">{t("danaType")}</label>
              <select
                className="select"
                value={dayEdit.danaType}
                onChange={(e) =>
                  setDayEdit({
                    ...dayEdit,
                    danaType: e.target.value as "heel" | "dawal",
                  })
                }
              >
                <option value="heel">{t("heelDana")}</option>
                <option value="dawal">{t("dawalDana")}</option>
              </select>
            </div>
            <div className="field field-full">
              <label className="label">{t("houses")}</label>
              <SearchSelect<HouseOpt>
                value={dayEdit.houseId}
                onChange={(id) =>
                  setDayEdit({ ...dayEdit, houseId: id ?? dayEdit.houseId })
                }
                placeholder={t("selectHouse")}
                emptyLabel="—"
                getOptionLabel={houseLabelOpt}
                getOptionValue={(h) => h.id}
                loadOptions={async (q) =>
                  (await api(
                    window.electronAPI.listHouses({ q, archived: "current" }),
                  )) as HouseOpt[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getHouse(id))) as HouseOpt
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setMode("browse");
                setDayEdit(null);
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving || !dayEdit.houseId}
              onClick={saveDayEdit}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create" || mode === "edit") {
    return (
      <div>
        <ListPageHeader
          title={mode === "edit" ? t("editDana") : t("addDana")}
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
          <DanaForm
            value={form}
            onChange={setForm}
            editMode={mode === "edit"}
            showFutureWarning={mode === "edit"}
          />
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
              disabled={saving || !form.houseId || !form.startDate}
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
        title={t("dana")}
        actions={
          <button type="button" className="btn btn-icon" onClick={() => openCreate()}>
            <span className="btn-ico">{Icons.plus({ size: 16 })}</span>
            <span>{t("addDana")}</span>
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

        <div className="dana-cal-grid" role="grid" aria-label={t("dana")}>
          {weekdays.map((d) => (
            <div key={d} className="dana-cal-weekday">
              {d}
            </div>
          ))}
          {cells.map((cell, idx) => {
            if (!cell) {
              return <div key={`pad-${idx}`} className="dana-cal-day empty" />;
            }
            const info = summaryMap.get(cell.date);
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedDate;
            const isPast = cell.date < today;
            return (
              <button
                key={cell.date}
                type="button"
                className={[
                  "dana-cal-day",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                  isPast ? "is-past" : "",
                  info && (info.heel_count > 0 || info.dawal_count > 0)
                    ? "has-dana"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedDate(cell.date)}
              >
                <span className="dana-cal-daynum">{cell.day}</span>
                {info && info.heel_count > 0 ? (
                  <span className="dana-cal-marker heel">
                    {t("heelShort")}: {info.heel_count}
                  </span>
                ) : null}
                {info && info.dawal_count > 0 ? (
                  <span className="dana-cal-marker dawal">
                    {t("dawalShort")}: {info.dawal_count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="detail-panel-title">
          <h3>
            {selectedDate} · {t("dana")}
          </h3>
          <button
            type="button"
            className="btn secondary btn-sm"
            onClick={() => openCreate(selectedDate)}
          >
            {t("addDana")}
          </button>
        </div>
        {!details ||
        (details.heel.length === 0 && details.dawal.length === 0) ? (
          <EmptyState message={t("noDanaForDate")} />
        ) : (
          <>
            {renderOccList(t("heelDana"), details.heel)}
            {renderOccList(t("dawalDana"), details.dawal)}
          </>
        )}
      </div>
    </div>
  );
}
