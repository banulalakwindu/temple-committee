import { useEffect, useState } from "react";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { DataRowLink, EmptyState, FilterBar } from "@/components/ListPage";
import { SearchInput } from "@/components/SearchInput";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";
import { useParams } from "react-router-dom";

type Member = {
  id: number;
  full_name_si: string;
  full_name_en: string;
  relationship_in_family: string;
  daham_school_child?: number;
};

type Named = { id: number; name_si: string; name_en: string };

type AttendanceRow = {
  id: number;
  attendance_date: string;
  person_id: number;
  event_id?: number | null;
  person_name_si?: string;
  person_name_en?: string;
  event_name_si?: string;
  event_name_en?: string;
  event_other?: string | null;
};

type DocumentRow = {
  id: number;
  issue_date: string;
  person_id: number;
  document_type_id?: number | null;
  person_name_si?: string;
  person_name_en?: string;
  type_name_si?: string;
  type_name_en?: string;
  document_other?: string | null;
  issued_by: string;
  remarks: string;
};

type DanaOccurrence = {
  id: number;
  dana_date: string;
  dana_type: "heel" | "dawal";
  schedule_id?: number | null;
  schedule_active?: number | null;
};

type Tab = "attendance" | "documents" | "members" | "dana" | "details";

export function HouseDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState<Tab>("attendance");
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [attTotal, setAttTotal] = useState(0);
  const [docTotal, setDocTotal] = useState(0);
  const [danaPast, setDanaPast] = useState<DanaOccurrence[]>([]);
  const [danaUpcoming, setDanaUpcoming] = useState<DanaOccurrence[]>([]);
  const [danaTotal, setDanaTotal] = useState(0);
  const [events, setEvents] = useState<Named[]>([]);
  const [docTypes, setDocTypes] = useState<Named[]>([]);
  const [memberQ, setMemberQ] = useState("");
  const [attDateFrom, setAttDateFrom] = useState("");
  const [attDateTo, setAttDateTo] = useState("");
  const [attEventId, setAttEventId] = useState<number | null>(null);
  const [attPersonId, setAttPersonId] = useState<number | null>(null);
  const [docDateFrom, setDocDateFrom] = useState("");
  const [docDateTo, setDocDateTo] = useState("");
  const [docPersonId, setDocPersonId] = useState<number | null>(null);
  const [docTypeId, setDocTypeId] = useState<number | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  const houseId = Number(id);

  const loadBase = () => {
    void (async () => {
      const h = (await api(window.electronAPI.getHouse(houseId))) as HouseFormValue & {
        house_number: string | null;
        is_archived?: number;
      };
      setForm({ ...emptyHouse(), ...h, house_number: h.house_number || "" });
      setIsArchived(!!h.is_archived);
      setMembers((await api(window.electronAPI.peopleByHouse(houseId))) as Member[]);
      const [attAll, docAll, danaAll] = await Promise.all([
        api(window.electronAPI.listAttendance({ houseId })),
        api(window.electronAPI.listDocuments({ houseId })),
        api(window.electronAPI.listDanaByHouse(houseId)),
      ]);
      setAttTotal((attAll as AttendanceRow[]).length);
      setDocTotal((docAll as DocumentRow[]).length);
      const history = danaAll as {
        past: DanaOccurrence[];
        upcoming: DanaOccurrence[];
      };
      setDanaPast(history.past);
      setDanaUpcoming(history.upcoming);
      setDanaTotal(history.past.length);
    })();
  };

  const loadAttendance = () => {
    void api(
      window.electronAPI.listAttendance({
        houseId,
        dateFrom: attDateFrom || undefined,
        dateTo: attDateTo || undefined,
        eventId: attEventId,
        personId: attPersonId,
      }),
    ).then((rows) => setAttendance(rows as AttendanceRow[]));
  };

  const loadDocuments = () => {
    void api(
      window.electronAPI.listDocuments({
        houseId,
        dateFrom: docDateFrom || undefined,
        dateTo: docDateTo || undefined,
        personId: docPersonId,
        documentTypeId: docTypeId,
      }),
    ).then((rows) => setDocs(rows as DocumentRow[]));
  };

  useEffect(() => {
    setTab("attendance");
    setAttDateFrom("");
    setAttDateTo("");
    setAttEventId(null);
    setAttPersonId(null);
    setDocDateFrom("");
    setDocDateTo("");
    setDocPersonId(null);
    setDocTypeId(null);
    setMemberQ("");
    loadBase();
    void api(window.electronAPI.listAttendanceEvents()).then((e) =>
      setEvents(e as Named[]),
    );
    void api(window.electronAPI.listDocumentTypes()).then((d) =>
      setDocTypes(d as Named[]),
    );
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(houseId)) return;
    loadAttendance();
  }, [id, attDateFrom, attDateTo, attEventId, attPersonId]);

  useEffect(() => {
    if (!Number.isFinite(houseId)) return;
    loadDocuments();
  }, [id, docDateFrom, docDateTo, docPersonId, docTypeId]);

  const filteredMembers = members.filter((m) => {
    if (!memberQ.trim()) return true;
    const q = memberQ.toLowerCase();
    return (
      m.full_name_si.toLowerCase().includes(q) ||
      m.full_name_en.toLowerCase().includes(q) ||
      (m.relationship_in_family || "").toLowerCase().includes(q)
    );
  });

  const personLabel = (p: Member) => displayName(p.full_name_si, p.full_name_en, locale);

  const tabBtn = (key: Tab, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      className={`detail-tab ${tab === key ? "active" : ""}`}
      onClick={() => setTab(key)}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className="detail-tab-count">{count}</span> : null}
    </button>
  );

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <div>
            <h2>{displayName(form.name_si, form.name_en, locale)}</h2>
            <p>
              {t("houseNumber")}: {form.house_number || "—"} · {t("members")}:{" "}
              {members.length}
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                const next = !isArchived;
                void confirm({
                  message: next ? t("confirmArchive") : t("confirmRestore"),
                  confirmLabel: next ? t("archive") : t("restore"),
                  tone: next ? "danger" : "default",
                }).then((ok) => {
                  if (!ok) return;
                  void api(window.electronAPI.setHouseArchived(houseId, next))
                    .then(() => {
                      setIsArchived(next);
                      notify(next ? t("archivedOk") : t("restoredOk"));
                    })
                    .catch((e: Error) =>
                      notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
                    );
                });
              }}
            >
              {isArchived ? t("restore") : t("archive")}
            </button>
            <ActionLink to="/admin/houses" icon={Icons.arrowLeft()} variant="secondary">
              {t("back")}
            </ActionLink>
          </div>
        </div>
        <div className="detail-tabs no-print">
          {tabBtn("attendance", t("attendance"), attTotal)}
          {tabBtn("documents", t("documents"), docTotal)}
          {tabBtn("dana", t("dana"), danaTotal)}
          {tabBtn("members", t("members"), members.length)}
          {tabBtn("details", t("details"))}
        </div>
      </div>

      {tab === "attendance" && (
        <div className="panel table-wrap">
          <div className="detail-panel-title">
            <h3>{t("attendance")}</h3>
            <span>
              {attendance.length} {t("results")}
            </span>
          </div>
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setAttDateFrom("");
              setAttDateTo("");
              setAttEventId(null);
              setAttPersonId(null);
            }}
          >
            <div className="field">
              <label className="label">{t("dateFrom")}</label>
              <input
                className="input"
                type="date"
                value={attDateFrom}
                onChange={(e) => setAttDateFrom(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{t("dateTo")}</label>
              <input
                className="input"
                type="date"
                value={attDateTo}
                onChange={(e) => setAttDateTo(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{t("program")}</label>
              <SearchSelect<Named>
                value={attEventId}
                onChange={setAttEventId}
                placeholder={t("program")}
                emptyLabel={t("all")}
                options={events}
                getOptionLabel={(ev) => displayName(ev.name_si, ev.name_en, locale)}
                getOptionValue={(ev) => ev.id}
              />
            </div>
            <div className="field">
              <label className="label">{t("people")}</label>
              <SearchSelect<Member>
                value={attPersonId}
                onChange={setAttPersonId}
                placeholder={t("people")}
                emptyLabel={t("all")}
                options={members}
                getOptionLabel={personLabel}
                getOptionValue={(p) => p.id}
              />
            </div>
          </FilterBar>
          {!attendance.length ? (
            <EmptyState message={t("empty")} />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("people")}</th>
                  <th>{t("program")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <DataRowLink key={a.id} to={`/admin/people/${a.person_id}`}>
                    <td>{a.attendance_date}</td>
                    <td>{displayName(a.person_name_si, a.person_name_en, locale)}</td>
                    <td>
                      {a.event_name_si || a.event_name_en
                        ? displayName(a.event_name_si, a.event_name_en, locale)
                        : a.event_other || "—"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
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
                                loadAttendance();
                                loadBase();
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
                  </DataRowLink>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="panel table-wrap">
          <div className="detail-panel-title">
            <h3>{t("documents")}</h3>
            <span>
              {docs.length} {t("results")}
            </span>
          </div>
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setDocDateFrom("");
              setDocDateTo("");
              setDocPersonId(null);
              setDocTypeId(null);
            }}
          >
            <div className="field">
              <label className="label">{t("dateFrom")}</label>
              <input
                className="input"
                type="date"
                value={docDateFrom}
                onChange={(e) => setDocDateFrom(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{t("dateTo")}</label>
              <input
                className="input"
                type="date"
                value={docDateTo}
                onChange={(e) => setDocDateTo(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="label">{t("people")}</label>
              <SearchSelect<Member>
                value={docPersonId}
                onChange={setDocPersonId}
                placeholder={t("people")}
                emptyLabel={t("all")}
                options={members}
                getOptionLabel={personLabel}
                getOptionValue={(p) => p.id}
              />
            </div>
            <div className="field">
              <label className="label">{t("documentType")}</label>
              <SearchSelect<Named>
                value={docTypeId}
                onChange={setDocTypeId}
                placeholder={t("documentType")}
                emptyLabel={t("all")}
                options={docTypes}
                getOptionLabel={(tp) => displayName(tp.name_si, tp.name_en, locale)}
                getOptionValue={(tp) => tp.id}
              />
            </div>
          </FilterBar>
          {!docs.length ? (
            <EmptyState message={t("empty")} />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>{t("issueDate")}</th>
                  <th>{t("people")}</th>
                  <th>{t("documentType")}</th>
                  <th>{t("issuedBy")}</th>
                  <th>{t("remarks")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <DataRowLink key={d.id} to={`/admin/people/${d.person_id}`}>
                    <td>{d.issue_date}</td>
                    <td>{displayName(d.person_name_si, d.person_name_en, locale)}</td>
                    <td>
                      {d.type_name_si || d.type_name_en
                        ? displayName(d.type_name_si, d.type_name_en, locale)
                        : d.document_other || "—"}
                    </td>
                    <td>{d.issued_by || "—"}</td>
                    <td>{d.remarks || "—"}</td>
                    <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => {
                          void confirm({
                            message: t("confirmDeleteDocument"),
                            confirmLabel: t("delete"),
                            tone: "danger",
                          }).then((ok) => {
                            if (!ok) return;
                            void api(window.electronAPI.deleteDocument(d.id))
                              .then(() => {
                                notify(t("deletedOk"));
                                loadDocuments();
                                loadBase();
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
                  </DataRowLink>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "dana" && (
        <div className="panel table-wrap">
          <div className="detail-panel-title">
            <h3>{t("danaHistory")}</h3>
            <span>
              {danaTotal} {t("results")}
            </span>
          </div>
          {!danaPast.length && !danaUpcoming.length ? (
            <EmptyState message={t("emptyDanaHint")} />
          ) : (
            <>
              <h4>{t("upcoming")}</h4>
              <p className="muted" style={{ marginBottom: "0.75rem" }}>
                {t("nextDanaOnly")}
              </p>
              {!danaUpcoming.length ? (
                <p className="muted">{t("noDana")}</p>
              ) : (
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("danaType")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danaUpcoming.map((d) => (
                      <tr key={`${d.schedule_id}-${d.dana_date}-${d.dana_type}`}>
                        <td>{d.dana_date}</td>
                        <td>
                          {d.dana_type === "heel" ? t("heelDana") : t("dawalDana")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <h4 style={{ marginTop: "1.25rem" }}>{t("past")}</h4>
              {!danaPast.length ? (
                <p className="muted">{t("noDana")}</p>
              ) : (
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("danaType")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danaPast.map((d) => (
                      <tr key={d.id}>
                        <td>{d.dana_date}</td>
                        <td>
                          {d.dana_type === "heel" ? t("heelDana") : t("dawalDana")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      {tab === "members" && (
        <div className="panel table-wrap">
          <div className="detail-panel-title">
            <h3>{t("members")}</h3>
            <span>
              {filteredMembers.length} {t("results")}
            </span>
          </div>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setMemberQ("")}>
            <div className="field search">
              <label className="label">{t("people")}</label>
              <SearchInput
                value={memberQ}
                onChange={(e) => setMemberQ(e.target.value)}
                placeholder={t("name")}
              />
            </div>
          </FilterBar>
          {!filteredMembers.length ? (
            <EmptyState message={t("empty")} />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("relationship")}</th>
                  <th>{t("dahamSchoolShort")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <DataRowLink key={m.id} to={`/admin/people/${m.id}`}>
                    <td>{displayName(m.full_name_si, m.full_name_en, locale)}</td>
                    <td>{m.relationship_in_family}</td>
                    <td>{m.daham_school_child ? t("yes") : t("no")}</td>
                  </DataRowLink>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="panel">
          <h3>{t("details")}</h3>
          <HouseForm value={form} onChange={setForm} />
          <div className="form-actions">
            <IconButton
              icon={Icons.check()}
              onClick={() => {
                void api(window.electronAPI.updateHouse(houseId, form))
                  .then(() => {
                    loadBase();
                    notify(t("saved"));
                  })
                  .catch((e: Error) =>
                    notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
                  );
              }}
            >
              {t("save")}
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
