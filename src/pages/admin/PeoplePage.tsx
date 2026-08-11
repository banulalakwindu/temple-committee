import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import {
  DataRowLink,
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
import { api, displayName } from "@/lib/api";

type Person = PersonFormValue & {
  id: number;
  house_name_si?: string;
  house_name_en?: string;
  is_archived?: number;
};

type HouseOpt = { id: number; name_si: string; name_en: string; house_number?: string | null };

export function PeoplePage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Person[]>([]);
  const [q, setQ] = useState("");
  const [houseId, setHouseId] = useState<number | null>(null);
  const [dahamSchool, setDahamSchool] = useState<"all" | "yes" | "no">("all");
  const [archived, setArchived] = useState<"current" | "archived">("current");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());

  const load = () => {
    void api(
      window.electronAPI.listPeople({
        q,
        houseId,
        archived,
        dahamSchool,
      }),
    ).then((data) => setRows(data as Person[]));
  };

  useEffect(() => {
    load();
  }, [q, houseId, archived, dahamSchool]);

  const houseLabel = (h: HouseOpt) => {
    const name = displayName(h.name_si, h.name_en, locale);
    return h.house_number ? `${name} (#${h.house_number})` : name;
  };

  const setArchivedState = (id: number, next: boolean) => {
    void confirm({
      message: next ? t("confirmArchive") : t("confirmRestore"),
      confirmLabel: next ? t("archive") : t("restore"),
      tone: next ? "danger" : "default",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.setPersonArchived(id, next))
        .then(() => {
          notify(next ? t("archivedOk") : t("restoredOk"));
          load();
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
  };

  return (
    <div>
      <ListPageHeader
        title={t("people")}
        actions={
          !creating ? (
            <button type="button" className="btn btn-icon" onClick={() => setCreating(true)}>
              <span className="btn-ico">+</span>
              <span>{t("create")}</span>
            </button>
          ) : null
        }
      />
      {!creating && (
      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setHouseId(null);
          setDahamSchool("all");
          setArchived("current");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
        </div>
        <div className="field">
          <label className="label">{t("status")}</label>
          <select
            className="select"
            value={archived}
            onChange={(e) => setArchived(e.target.value as "current" | "archived")}
          >
            <option value="current">{t("current")}</option>
            <option value="archived">{t("archived")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("dahamSchoolChild")}</label>
          <select
            className="select"
            value={dahamSchool}
            onChange={(e) => setDahamSchool(e.target.value as "all" | "yes" | "no")}
          >
            <option value="all">{t("all")}</option>
            <option value="yes">{t("yes")}</option>
            <option value="no">{t("no")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("currentHouse")}</label>
          <SearchSelect<HouseOpt>
            value={houseId}
            onChange={setHouseId}
            placeholder={t("selectHouse")}
            emptyLabel={t("all")}
            getOptionLabel={houseLabel}
            getOptionValue={(h) => h.id}
            loadOptions={async (query) =>
              (await api(
                window.electronAPI.listHouses({ q: query }),
              )) as HouseOpt[]
            }
            resolveSelected={async (id) =>
              (await api(window.electronAPI.getHouse(id))) as HouseOpt
            }
          />
        </div>
      </FilterBar>
      )}
      {creating ? (
        <div className="panel">
          <PersonForm value={form} onChange={setForm} />
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setCreating(false);
                setForm(emptyPerson());
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                void api(window.electronAPI.createPerson(form))
                  .then((p) => {
                    notify(t("created"));
                    navigate(`/admin/people/${(p as Person).id}`);
                  })
                  .catch((e: Error) =>
                    notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
                  )
                  .finally(() => setSaving(false));
              }}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <ResultMeta count={rows.length} label={t("results")} />
          <div className="panel table-wrap">
            {!rows.length ? (
              <EmptyState
                message={t("emptyPeopleHint")}
                actionLabel={t("createPerson")}
                onAction={() => setCreating(true)}
              />
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("currentHouse")}</th>
                    <th>{t("dahamSchoolShort")}</th>
                    <th>{t("phone")}</th>
                    <th>{t("nic")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <DataRowLink key={p.id} to={`/admin/people/${p.id}`}>
                      <td>{displayName(p.full_name_si, p.full_name_en, locale)}</td>
                      <td>{displayName(p.house_name_si, p.house_name_en, locale)}</td>
                      <td>{p.daham_school_child ? t("yes") : t("no")}</td>
                      <td>{p.phone}</td>
                      <td>{p.nic}</td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setArchivedState(p.id, archived !== "archived")}
                        >
                          {archived === "archived" ? t("restore") : t("archive")}
                        </button>
                      </td>
                    </DataRowLink>
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
