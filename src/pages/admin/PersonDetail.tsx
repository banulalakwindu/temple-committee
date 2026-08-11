import { useEffect, useState } from "react";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { EmptyState, FilterBar } from "@/components/ListPage";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";
import { useParams } from "react-router-dom";

type Named = { id: number; name_si: string; name_en: string };

type AttendanceRow = {
  id: number;
  attendance_date: string;
  event_id?: number | null;
  event_name_si?: string;
  event_name_en?: string;
  event_other?: string | null;
};

type DocumentRow = {
  id: number;
  issue_date: string;
  document_type_id?: number | null;
  type_name_si?: string;
  type_name_en?: string;
  document_other?: string | null;
  issued_by: string;
  remarks: string;
};

type Tab = "attendance" | "documents" | "details";

export function PersonDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState<Tab>("attendance");
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());
  const [houseSi, setHouseSi] = useState("");
  const [houseEn, setHouseEn] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [attTotal, setAttTotal] = useState(0);
  const [docTotal, setDocTotal] = useState(0);
  const [events, setEvents] = useState<Named[]>([]);
  const [docTypes, setDocTypes] = useState<Named[]>([]);
  const [attDateFrom, setAttDateFrom] = useState("");
  const [attDateTo, setAttDateTo] = useState("");
  const [attEventId, setAttEventId] = useState<number | null>(null);
  const [docDateFrom, setDocDateFrom] = useState("");
  const [docDateTo, setDocDateTo] = useState("");
  const [docTypeId, setDocTypeId] = useState<number | null>(null);
  const [isArchived, setIsArchived] = useState(false);

  const personId = Number(id);

  const loadPerson = () => {
    void (async () => {
      const p = (await api(window.electronAPI.getPerson(personId))) as PersonFormValue & {
        birthday: string | null;
        house_name_si?: string;
        house_name_en?: string;
        is_archived?: number;
      };
      setForm({ ...emptyPerson(), ...p, birthday: p.birthday || "" });
      setHouseSi(p.house_name_si || "");
      setHouseEn(p.house_name_en || "");
      setIsArchived(!!p.is_archived);
      const [attAll, docAll] = await Promise.all([
        api(window.electronAPI.listAttendance({ personId })),
        api(window.electronAPI.listDocuments({ personId })),
      ]);
      setAttTotal((attAll as AttendanceRow[]).length);
      setDocTotal((docAll as DocumentRow[]).length);
    })();
  };

  const loadAttendance = () => {
    void api(
      window.electronAPI.listAttendance({
        personId,
        dateFrom: attDateFrom || undefined,
        dateTo: attDateTo || undefined,
        eventId: attEventId,
      }),
    ).then((rows) => setAttendance(rows as AttendanceRow[]));
  };

  const loadDocuments = () => {
    void api(
      window.electronAPI.listDocuments({
        personId,
        dateFrom: docDateFrom || undefined,
        dateTo: docDateTo || undefined,
        documentTypeId: docTypeId,
      }),
    ).then((rows) => setDocs(rows as DocumentRow[]));
  };

  useEffect(() => {
    setTab("attendance");
    setAttDateFrom("");
    setAttDateTo("");
    setAttEventId(null);
    setDocDateFrom("");
    setDocDateTo("");
    setDocTypeId(null);
    loadPerson();
    void api(window.electronAPI.listAttendanceEvents()).then((e) =>
      setEvents(e as Named[]),
    );
    void api(window.electronAPI.listDocumentTypes()).then((d) =>
      setDocTypes(d as Named[]),
    );
  }, [id]);

  useEffect(() => {
    if (!Number.isFinite(personId)) return;
    loadAttendance();
  }, [id, attDateFrom, attDateTo, attEventId]);

  useEffect(() => {
    if (!Number.isFinite(personId)) return;
    loadDocuments();
  }, [id, docDateFrom, docDateTo, docTypeId]);

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
            <h2>{displayName(form.full_name_si, form.full_name_en, locale)}</h2>
            <p>
              {t("currentHouse")}: {displayName(houseSi, houseEn, locale)}
              {form.daham_school_child ? ` · ${t("dahamSchoolChild")}` : ""}
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
                  void api(window.electronAPI.setPersonArchived(personId, next))
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
            <ActionLink to="/admin/people" icon={Icons.arrowLeft()} variant="secondary">
              {t("back")}
            </ActionLink>
          </div>
        </div>
        <div className="detail-tabs no-print">
          {tabBtn("attendance", t("attendance"), attTotal)}
          {tabBtn("documents", t("documents"), docTotal)}
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
          </FilterBar>
          {!attendance.length ? (
            <EmptyState message={t("empty")} />
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>{t("date")}</th>
                  <th>{t("program")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td>{a.attendance_date}</td>
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
                                loadAttendance();
                                loadPerson();
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
                  <th>{t("documentType")}</th>
                  <th>{t("issuedBy")}</th>
                  <th>{t("remarks")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.issue_date}</td>
                    <td>
                      {d.type_name_si || d.type_name_en
                        ? displayName(d.type_name_si, d.type_name_en, locale)
                        : d.document_other || "—"}
                    </td>
                    <td>{d.issued_by || "—"}</td>
                    <td>{d.remarks || "—"}</td>
                    <td>
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
                                loadPerson();
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
          )}
        </div>
      )}

      {tab === "details" && (
        <div className="panel">
          <h3>{t("details")}</h3>
          <PersonForm value={form} onChange={setForm} />
          <div className="form-actions">
            <IconButton
              icon={Icons.check()}
              onClick={() => {
                void api(window.electronAPI.updatePerson(personId, form))
                  .then(() => {
                    loadPerson();
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
