import { useEffect, useState } from "react";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { SearchInput } from "@/components/SearchInput";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

type Event = { id: number; name_si: string; name_en: string };
type House = { id: number; name_si: string; name_en: string; house_number: string | null };
type Person = { id: number; full_name_si: string; full_name_en: string; current_house_id: number | null };
type Att = {
  id: number;
  attendance_date: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  event_name_si?: string;
  event_name_en?: string;
  event_other?: string | null;
};

const OTHER_EVENT_ID = -1;

export function AttendancePage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState<"house" | "person" | "history">("house");
  const [events, setEvents] = useState<Event[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseQ, setHouseQ] = useState("");
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventOther, setEventOther] = useState("");
  const [date, setDate] = useState(localDateString());
  const [personQ, setPersonQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [personHouseFilter, setPersonHouseFilter] = useState<number | null>(null);
  const [history, setHistory] = useState<Att[]>([]);
  const [historyPersonId, setHistoryPersonId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyEventId, setHistoryEventId] = useState<number | null>(null);

  useEffect(() => {
    void api(window.electronAPI.listAttendanceEvents()).then((e) => {
      const list = e as Event[];
      setEvents(list);
      setEventId((prev) => prev ?? list[0]?.id ?? null);
    });
  }, []);

  const eventOptions: Event[] = [
    ...events,
    { id: OTHER_EVENT_ID, name_si: t("other"), name_en: t("other") },
  ];
  const isOtherEvent = eventId === OTHER_EVENT_ID;

  useEffect(() => {
    if (tab !== "house") return;
    void api(
      window.electronAPI.listHouses({
        q: houseQ,
      }),
    ).then((h) => setHouses(h as House[]));
  }, [tab, houseQ]);

  useEffect(() => {
    if (!selectedHouse) {
      setMembers([]);
      return;
    }
    void api(window.electronAPI.peopleByHouse(selectedHouse)).then((m) => {
      setMembers(m as Person[]);
      setChecked({});
    });
  }, [selectedHouse]);

  useEffect(() => {
    if (tab !== "person") return;
    void api(
      window.electronAPI.listPeople({
        q: personQ,
        houseId: personHouseFilter,
      }),
    ).then((p) => setPeople(p as Person[]));
  }, [tab, personQ, personHouseFilter]);

  useEffect(() => {
    if (tab !== "history") return;
    void api(
      window.electronAPI.listAttendance({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        eventId: historyEventId,
        houseId: selectedHouse,
        personId: historyPersonId,
      }),
    ).then((a) => setHistory(a as Att[]));
  }, [tab, dateFrom, dateTo, historyEventId, selectedHouse, historyPersonId]);

  const houseLabel = (h: House) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  const mark = (personIds: number[]) => {
    if (isOtherEvent && !eventOther.trim()) {
      notify(t("programOther"), { tone: "error", scrollTop: true });
      return;
    }
    void api(
      window.electronAPI.markAttendance({
        personIds,
        houseId: selectedHouse,
        attendanceDate: date,
        eventId: isOtherEvent ? null : eventId,
        eventOther: isOtherEvent ? eventOther.trim() : null,
      }),
    )
      .then(() => notify(t("attendanceMarked")))
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      );
  };

  return (
    <div>
      <ListPageHeader title={t("attendance")} />
      <div className="detail-tabs no-print">
        <button
          type="button"
          className={`detail-tab ${tab === "house" ? "active" : ""}`}
          onClick={() => setTab("house")}
        >
          {t("houseAttendance")}
        </button>
        <button
          type="button"
          className={`detail-tab ${tab === "person" ? "active" : ""}`}
          onClick={() => setTab("person")}
        >
          {t("personAttendance")}
        </button>
        <button
          type="button"
          className={`detail-tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          {t("history")}
        </button>
      </div>

      {(tab === "house" || tab === "person") && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div className={`attendance-mark-row ${isOtherEvent ? "has-other" : ""}`}>
            <div className="field">
              <label className="label">{t("date")}</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("program")}</label>
              <SearchSelect<Event>
                value={eventId}
                onChange={(id) => {
                  setEventId(id);
                  if (id !== OTHER_EVENT_ID) setEventOther("");
                }}
                placeholder={t("program")}
                clearable={false}
                options={eventOptions}
                getOptionLabel={(ev) => displayName(ev.name_si, ev.name_en, locale)}
                getOptionValue={(ev) => ev.id}
              />
            </div>
            {isOtherEvent ? (
              <div className="field">
                <label className="label">{t("programOther")}</label>
                <input
                  className="input"
                  value={eventOther}
                  onChange={(e) => setEventOther(e.target.value)}
                  placeholder={t("programOther")}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === "house" && (
        <>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setHouseQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={houseQ} onChange={(e) => setHouseQ(e.target.value)} placeholder={t("search")} />
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
              setPersonHouseFilter(null);
            }}
          >
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={personQ} onChange={(e) => setPersonQ(e.target.value)} placeholder={t("search")} />
            </div>
            <div className="field">
              <label className="label">{t("currentHouse")}</label>
              <SearchSelect<House>
                value={personHouseFilter}
                onChange={setPersonHouseFilter}
                placeholder={t("selectHouse")}
                emptyLabel={t("all")}
                getOptionLabel={houseLabel}
                getOptionValue={(h) => h.id}
                loadOptions={async (query) =>
                  (await api(
                    window.electronAPI.listHouses({ q: query }),
                  )) as House[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getHouse(id))) as House
                }
              />
            </div>
          </FilterBar>
          <div className="panel table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
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
              setDateFrom("");
              setDateTo("");
              setHistoryEventId(null);
              setSelectedHouse(null);
              setHistoryPersonId(null);
            }}
          >
            <div className="field">
              <label className="label">{t("dateFrom")}</label>
              <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("dateTo")}</label>
              <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("program")}</label>
              <SearchSelect<Event>
                value={historyEventId}
                onChange={setHistoryEventId}
                placeholder={t("program")}
                emptyLabel={t("all")}
                options={events}
                getOptionLabel={(ev) => displayName(ev.name_si, ev.name_en, locale)}
                getOptionValue={(ev) => ev.id}
              />
            </div>
            <div className="field">
              <label className="label">{t("houses")}</label>
              <SearchSelect<House>
                value={selectedHouse}
                onChange={setSelectedHouse}
                placeholder={t("selectHouse")}
                emptyLabel={t("all")}
                getOptionLabel={houseLabel}
                getOptionValue={(h) => h.id}
                loadOptions={async (query) =>
                  (await api(
                    window.electronAPI.listHouses({ q: query }),
                  )) as House[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getHouse(id))) as House
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("people")}</label>
              <SearchSelect<Person>
                value={historyPersonId}
                onChange={setHistoryPersonId}
                placeholder={t("people")}
                emptyLabel={t("all")}
                getOptionLabel={(p) => displayName(p.full_name_si, p.full_name_en, locale)}
                getOptionValue={(p) => p.id}
                loadOptions={async (query) =>
                  (await api(
                    window.electronAPI.listPeople({
                      q: query,
                      houseId: selectedHouse,
                    }),
                  )) as Person[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getPerson(id))) as Person
                }
              />
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
                  <th>{t("program")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id}>
                    <td>{a.attendance_date}</td>
                    <td>{displayName(a.person_name_si, a.person_name_en, locale)}</td>
                    <td>{displayName(a.house_name_si, a.house_name_en, locale)}</td>
                    <td>
                      {a.event_name_si || a.event_name_en
                        ? displayName(a.event_name_si, a.event_name_en, locale)
                        : a.event_other || "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          void confirm({
                            message: t("confirmDeleteAttendance"),
                            confirmLabel: t("delete"),
                            tone: "danger",
                          }).then((ok) => {
                            if (!ok) return;
                            void api(window.electronAPI.deleteAttendance(a.id))
                              .then(() => {
                                notify(t("deletedOk"));
                                setHistory((rows) => rows.filter((r) => r.id !== a.id));
                              })
                              .catch((e: Error) =>
                                notify(e.message || t("saveFailed"), {
                                  tone: "error",
                                  scrollTop: true,
                                }),
                              );
                          });
                        }}
                      >
                        {t("delete")}
                      </button>
                    </td>
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
