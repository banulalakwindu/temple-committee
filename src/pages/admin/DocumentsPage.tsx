import { useEffect, useState } from "react";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { SearchSelect } from "@/components/SearchSelect";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, localDateString } from "@/lib/api";

type DocType = { id: number; name_si: string; name_en: string };
type House = { id: number; name_si: string; name_en: string; house_number: string | null };
type Person = {
  id: number;
  full_name_si: string;
  full_name_en: string;
  current_house_id: number | null;
};
type Doc = {
  id: number;
  issue_date: string;
  person_name_si?: string;
  person_name_en?: string;
  house_name_si?: string;
  house_name_en?: string;
  type_name_si?: string;
  type_name_en?: string;
  document_other?: string | null;
  issued_by: string;
  remarks: string;
};

const OTHER_DOC_TYPE_ID = -1;

export function DocumentsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [types, setTypes] = useState<DocType[]>([]);
  const [rows, setRows] = useState<Doc[]>([]);
  const [issuing, setIssuing] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState<number | null>(null);
  const [filterHouseId, setFilterHouseId] = useState<number | null>(null);
  const [filterPersonId, setFilterPersonId] = useState<number | null>(null);
  const [issuedByFilter, setIssuedByFilter] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [docTypeId, setDocTypeId] = useState<number | null>(null);
  const [docOther, setDocOther] = useState("");
  const [issueDate, setIssueDate] = useState(localDateString());
  const [issuedBy, setIssuedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  const docTypeOptions: DocType[] = [
    ...types,
    { id: OTHER_DOC_TYPE_ID, name_si: t("other"), name_en: t("other") },
  ];
  const isOtherDocType = docTypeId === OTHER_DOC_TYPE_ID;

  const houseLabel = (h: House) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  const resetIssueForm = () => {
    setSelectedPerson(null);
    setDocTypeId(types[0]?.id ?? null);
    setDocOther("");
    setIssueDate(localDateString());
    setIssuedBy("");
    setRemarks("");
  };

  const loadList = () => {
    void api(
      window.electronAPI.listDocuments({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        documentTypeId,
        houseId: filterHouseId,
        personId: filterPersonId,
        issuedBy: issuedByFilter || undefined,
      }),
    ).then((d) => setRows(d as Doc[]));
  };

  useEffect(() => {
    void api(window.electronAPI.listDocumentTypes()).then((d) => {
      const list = d as DocType[];
      setTypes(list);
      setDocTypeId((prev) => prev ?? list[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!issuing) loadList();
  }, [issuing, dateFrom, dateTo, documentTypeId, filterHouseId, filterPersonId, issuedByFilter]);

  return (
    <div>
      <ListPageHeader
        title={t("documents")}
        actions={
          !issuing ? (
            <button type="button" className="btn btn-icon" onClick={() => setIssuing(true)}>
              <span className="btn-ico">+</span>
              <span>{t("issueDocument")}</span>
            </button>
          ) : null
        }
      />

      {issuing ? (
        <div className="panel">
          <h3>{t("issueDocument")}</h3>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("people")}</label>
              <SearchSelect<Person>
                value={selectedPerson}
                onChange={setSelectedPerson}
                placeholder={t("search")}
                emptyLabel="—"
                getOptionLabel={(p) => displayName(p.full_name_si, p.full_name_en, locale)}
                getOptionValue={(p) => p.id}
                loadOptions={async (query) =>
                  (await api(
                    window.electronAPI.listPeople({ q: query }),
                  )) as Person[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getPerson(id))) as Person
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("documentType")}</label>
              <SearchSelect<DocType>
                value={docTypeId}
                onChange={(id) => {
                  setDocTypeId(id);
                  if (id !== OTHER_DOC_TYPE_ID) setDocOther("");
                }}
                placeholder={t("documentType")}
                clearable={false}
                options={docTypeOptions}
                getOptionLabel={(tp) => displayName(tp.name_si, tp.name_en, locale)}
                getOptionValue={(tp) => tp.id}
              />
            </div>
            {isOtherDocType ? (
              <div className="field field-full">
                <label className="label">{t("documentOther")}</label>
                <input
                  className="input"
                  value={docOther}
                  onChange={(e) => setDocOther(e.target.value)}
                  placeholder={t("documentOther")}
                />
              </div>
            ) : null}
            <div className="field">
              <label className="label">{t("issueDate")}</label>
              <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("issuedBy")}</label>
              <input className="input" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} />
            </div>
            <div className="field field-full">
              <label className="label">{t("remarks")}</label>
              <textarea className="textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setIssuing(false);
                resetIssueForm();
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selectedPerson || !docTypeId}
              onClick={() => {
                if (isOtherDocType && !docOther.trim()) {
                  notify(t("documentOther"), { tone: "error", scrollTop: true });
                  return;
                }
                void api(
                  window.electronAPI.issueDocument({
                    personId: Number(selectedPerson),
                    documentTypeId: isOtherDocType ? null : docTypeId,
                    documentOther: isOtherDocType ? docOther.trim() : null,
                    issueDate,
                    issuedBy,
                    remarks,
                  }),
                )
                  .then(() => {
                    notify(t("documentIssued"));
                    resetIssueForm();
                    setIssuing(false);
                  })
                  .catch((e: Error) =>
                    notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
                  );
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
              setDocumentTypeId(null);
              setFilterHouseId(null);
              setFilterPersonId(null);
              setIssuedByFilter("");
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
              <label className="label">{t("houses")}</label>
              <SearchSelect<House>
                value={filterHouseId}
                onChange={setFilterHouseId}
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
                value={filterPersonId}
                onChange={setFilterPersonId}
                placeholder={t("people")}
                emptyLabel={t("all")}
                getOptionLabel={(p) => displayName(p.full_name_si, p.full_name_en, locale)}
                getOptionValue={(p) => p.id}
                loadOptions={async (query) =>
                  (await api(
                window.electronAPI.listPeople({
                  q: query,
                  houseId: filterHouseId,
                }),
                  )) as Person[]
                }
                resolveSelected={async (id) =>
                  (await api(window.electronAPI.getPerson(id))) as Person
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("documentType")}</label>
              <SearchSelect<DocType>
                value={documentTypeId}
                onChange={setDocumentTypeId}
                placeholder={t("documentType")}
                emptyLabel={t("all")}
                options={types}
                getOptionLabel={(tp) => displayName(tp.name_si, tp.name_en, locale)}
                getOptionValue={(tp) => tp.id}
              />
            </div>
            <div className="field">
              <label className="label">{t("issuedBy")}</label>
              <input className="input" value={issuedByFilter} onChange={(e) => setIssuedByFilter(e.target.value)} />
            </div>
          </FilterBar>
          <ResultMeta count={rows.length} label={t("results")} />
          <div className="panel table-wrap">
            {!rows.length ? (
              <EmptyState
                message={t("emptyDocumentsHint")}
                actionLabel={t("issueDocumentAction")}
                onAction={() => setIssuing(true)}
              />
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
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id}>
                      <td>{d.issue_date}</td>
                      <td>{displayName(d.person_name_si, d.person_name_en, locale)}</td>
                      <td>{displayName(d.house_name_si, d.house_name_en, locale)}</td>
                      <td>
                        {d.type_name_si || d.type_name_en
                          ? displayName(d.type_name_si, d.type_name_en, locale)
                          : d.document_other || "—"}
                      </td>
                      <td>{d.issued_by}</td>
                      <td>{d.remarks}</td>
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
                                  loadList();
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
        </>
      )}
    </div>
  );
}
