import { useEffect, useState } from "react";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type DocType = { id: number; name_si: string; name_en: string };
type Person = { id: number; full_name_si: string; full_name_en: string; current_house_id: number | null };
type Doc = {
  id: number;
  issue_date: string;
  person_name_si?: string;
  house_name_si?: string;
  type_name_si?: string;
  document_other?: string | null;
  issued_by: string;
  remarks: string;
};

export function DocumentsPage() {
  const { t, locale } = useI18n();
  const [types, setTypes] = useState<DocType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [rows, setRows] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState<number | "">("");
  const [issuedByFilter, setIssuedByFilter] = useState("");
  const [personQ, setPersonQ] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<number | "">("");
  const [docTypeId, setDocTypeId] = useState<number | "">("");
  const [docOther, setDocOther] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [issuedBy, setIssuedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [msg, setMsg] = useState("");

  const loadList = () => {
    void api(
      window.electronAPI.listDocuments({
        q,
        dateFrom,
        dateTo,
        documentTypeId: documentTypeId || null,
        issuedBy: issuedByFilter,
      }),
    ).then((d) => setRows(d as Doc[]));
  };

  useEffect(() => {
    void api(window.electronAPI.listDocumentTypes(true)).then((d) =>
      setTypes(d as DocType[]),
    );
  }, []);

  useEffect(() => {
    loadList();
  }, [q, dateFrom, dateTo, documentTypeId, issuedByFilter]);

  useEffect(() => {
    void api(window.electronAPI.listPeople({ q: personQ, active: "active" })).then(
      (p) => setPeople(p as Person[]),
    );
  }, [personQ]);

  return (
    <div>
      <ListPageHeader title={t("documents")} />
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3>{t("issueDocument")}</h3>
        <div className="grid-2">
          <div className="field">
            <label className="label">{t("search")}</label>
            <input className="input" value={personQ} onChange={(e) => setPersonQ(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("people")}</label>
            <select
              className="select"
              value={selectedPerson}
              onChange={(e) =>
                setSelectedPerson(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p.full_name_si, p.full_name_en, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">{t("documentType")}</label>
            <select
              className="select"
              value={docTypeId}
              onChange={(e) => setDocTypeId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">—</option>
              {types.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {displayName(tp.name_si, tp.name_en, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">{t("other")}</label>
            <input className="input" value={docOther} onChange={(e) => setDocOther(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("issueDate")}</label>
            <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("issuedBy")}</label>
            <input className="input" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="label">{t("remarks")}</label>
            <textarea className="textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="btn"
          disabled={!selectedPerson}
          onClick={() => {
            void api(
              window.electronAPI.issueDocument({
                personId: Number(selectedPerson),
                documentTypeId: docTypeId || null,
                documentOther: docOther || null,
                issueDate,
                issuedBy,
                remarks,
              }),
            )
              .then(() => {
                setMsg("OK");
                loadList();
              })
              .catch((e: Error) => setMsg(e.message));
          }}
        >
          {t("save")}
        </button>
        {msg ? <p>{msg}</p> : null}
      </div>

      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setDateFrom("");
          setDateTo("");
          setDocumentTypeId("");
          setIssuedByFilter("");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("dateFrom")}</label>
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("dateTo")}</label>
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("documentType")}</label>
          <select
            className="select"
            value={documentTypeId}
            onChange={(e) =>
              setDocumentTypeId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">{t("all")}</option>
            {types.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {displayName(tp.name_si, tp.name_en, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">{t("issuedBy")}</label>
          <input className="input" value={issuedByFilter} onChange={(e) => setIssuedByFilter(e.target.value)} />
        </div>
      </FilterBar>
      <ResultMeta count={rows.length} label={t("results")} />
      <div className="panel table-wrap">
        {!rows.length ? (
          <EmptyState message={t("noResults")} />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{t("issueDate")}</th>
                <th>{t("people")}</th>
                <th>{t("houses")}</th>
                <th>{t("documentType")}</th>
                <th>{t("issuedBy")}</th>
                <th>{t("remarks")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td>{d.issue_date}</td>
                  <td>{d.person_name_si}</td>
                  <td>{d.house_name_si}</td>
                  <td>{d.type_name_si || d.document_other}</td>
                  <td>{d.issued_by}</td>
                  <td>{d.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
