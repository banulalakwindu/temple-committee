import { useEffect, useState } from "react";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type Event = { id: number; name_si: string; name_en: string };
type House = { id: number; name_si: string; name_en: string; house_number: string | null };
type Person = { id: number; full_name_si: string; full_name_en: string; current_house_id: number | null };
type Att = {
  id: number;
  attendance_date: string;
  person_name_si?: string;
  house_name_si?: string;
  event_name_si?: string;
  event_other?: string | null;
};

export function AttendancePage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<"house" | "person" | "history">("house");
  const [events, setEvents] = useState<Event[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseQ, setHouseQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [eventId, setEventId] = useState<number | "">("");
  const [eventOther, setEventOther] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [personQ, setPersonQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [personHouseFilter, setPersonHouseFilter] = useState<number | "">("");
  const [history, setHistory] = useState<Att[]>([]);
  const [hq, setHq] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void api(window.electronAPI.listAttendanceEvents(true)).then((e) =>
      setEvents(e as Event[]),
    );
  }, []);

  useEffect(() => {
    if (tab !== "house") return;
    void api(
      window.electronAPI.listHouses({
        q: houseQ,
        active: activeOnly ? "active" : "all",
      }),
    ).then((h) => setHouses(h as House[]));
  }, [tab, houseQ, activeOnly]);

  useEffect(() => {
    if (!selectedHouse) {
      setMembers([]);
      return;
    }
    void api(window.electronAPI.peopleByHouse(selectedHouse)).then((m) => {
      const list = m as Person[];
      setMembers(list.filter((p) => (p as { is_active?: number }).is_active !== 0));
      setChecked({});
    });
  }, [selectedHouse]);

  useEffect(() => {
    if (tab !== "person") return;
    void api(
      window.electronAPI.listPeople({
        q: personQ,
        houseId: personHouseFilter || null,
        active: "active",
      }),
    ).then((p) => setPeople(p as Person[]));
  }, [tab, personQ, personHouseFilter]);

  useEffect(() => {
    if (tab !== "history") return;
    void api(
      window.electronAPI.listAttendance({
        q: hq,
        dateFrom,
        dateTo,
        eventId: eventId || null,
        houseId: selectedHouse,
      }),
    ).then((a) => setHistory(a as Att[]));
  }, [tab, hq, dateFrom, dateTo, eventId, selectedHouse]);

  const mark = (personIds: number[]) => {
    void api(
      window.electronAPI.markAttendance({
        personIds,
        houseId: selectedHouse,
        attendanceDate: date,
        eventId: eventId || null,
        eventOther: eventOther || null,
      }),
    )
      .then((count) => setMsg(`Saved ${count}`))
      .catch((e: Error) => setMsg(e.message));
  };

  return (
    <div>
      <ListPageHeader title={t("attendance")} />
      <div className="shortcut-row no-print" style={{ marginBottom: "1rem" }}>
        <button type="button" className={`btn ${tab === "house" ? "" : "secondary"}`} onClick={() => setTab("house")}>
          {t("houseAttendance")}
        </button>
        <button type="button" className={`btn ${tab === "person" ? "" : "secondary"}`} onClick={() => setTab("person")}>
          {t("personAttendance")}
        </button>
        <button type="button" className={`btn ${tab === "history" ? "" : "secondary"}`} onClick={() => setTab("history")}>
          {t("history")}
        </button>
      </div>

      {(tab === "house" || tab === "person") && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("date")}</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("event")}</label>
              <select className="select" value={eventId} onChange={(e) => setEventId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">—</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {displayName(ev.name_si, ev.name_en, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">{t("eventOther")}</label>
              <input className="input" value={eventOther} onChange={(e) => setEventOther(e.target.value)} />
            </div>
          </div>
          {msg ? <p>{msg}</p> : null}
        </div>
      )}

      {tab === "house" && (
        <>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => { setHouseQ(""); setActiveOnly(true); }}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <input className="input" value={houseQ} onChange={(e) => setHouseQ(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("active")}</label>
              <select className="select" value={activeOnly ? "1" : "0"} onChange={(e) => setActiveOnly(e.target.value === "1")}>
                <option value="1">{t("yes")}</option>
                <option value="0">{t("no")}</option>
              </select>
            </div>
          </FilterBar>
          <div className="grid-2">
            <div className="panel table-wrap">
              <ResultMeta count={houses.length} label={t("houses")} />
              <table className="data">
                <tbody>
                  {houses.map((h) => (
                    <tr key={h.id} className={selectedHouse === h.id ? "highlight" : ""}>
                      <td>
                        <button type="button" className="btn ghost" onClick={() => setSelectedHouse(h.id)}>
                          {displayName(h.name_si, h.name_en, locale)} {h.house_number ? `(#${h.house_number})` : ""}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h3>{t("selectPeople")}</h3>
              {!selectedHouse ? (
                <EmptyState message={t("selectHouse")} />
              ) : (
                <>
                  {members.map((m) => (
                    <label key={m.id} style={{ display: "block", marginBottom: "0.45rem" }}>
                      <input
                        type="checkbox"
                        checked={!!checked[m.id]}
                        onChange={(e) =>
                          setChecked((c) => ({ ...c, [m.id]: e.target.checked }))
                        }
                      />{" "}
                      {displayName(m.full_name_si, m.full_name_en, locale)}
                    </label>
                  ))}
                  <button
                    type="button"
                    className="btn"
                    style={{ marginTop: "0.75rem" }}
                    onClick={() =>
                      mark(Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k)))
                    }
                  >
                    {t("save")}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === "person" && (
        <>
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setPersonQ("");
              setPersonHouseFilter("");
            }}
          >
            <div className="field search">
              <label className="label">{t("search")}</label>
              <input className="input" value={personQ} onChange={(e) => setPersonQ(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("currentHouse")}</label>
              <select
                className="select"
                value={personHouseFilter}
                onChange={(e) =>
                  setPersonHouseFilter(e.target.value ? Number(e.target.value) : "")
                }
              >
                <option value="">{t("all")}</option>
                {houses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {displayName(h.name_si, h.name_en, locale)}
                  </option>
                ))}
              </select>
            </div>
          </FilterBar>
          <div className="panel table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("nameSi")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>{displayName(p.full_name_si, p.full_name_en, locale)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setSelectedHouse(p.current_house_id);
                          mark([p.id]);
                        }}
                      >
                        {t("markAttendance")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "history" && (
        <>
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setHq("");
              setDateFrom("");
              setDateTo("");
              setEventId("");
              setSelectedHouse(null);
            }}
          >
            <div className="field search">
              <label className="label">{t("search")}</label>
              <input className="input" value={hq} onChange={(e) => setHq(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("dateFrom")}</label>
              <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("dateTo")}</label>
              <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </FilterBar>
          <ResultMeta count={history.length} label={t("results")} />
          <div className="panel table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("people")}</th>
                  <th>{t("houses")}</th>
                  <th>{t("event")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id}>
                    <td>{a.attendance_date}</td>
                    <td>{a.person_name_si}</td>
                    <td>{a.house_name_si}</td>
                    <td>{a.event_name_si || a.event_other}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
