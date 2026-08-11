import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
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

type House = HouseFormValue & { id: number; member_count?: number; is_archived?: number };
type Village = { id: number; name_si: string; name_en: string };

export function HousesPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [rows, setRows] = useState<House[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [q, setQ] = useState("");
  const [villageId, setVillageId] = useState<number | null>(null);
  const [archived, setArchived] = useState<"current" | "archived">("current");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());

  const selectedVillage = villages.find((v) => v.id === villageId) ?? null;

  const load = () => {
    void api(
      window.electronAPI.listHouses({
        q,
        archived,
        village: selectedVillage
          ? selectedVillage.name_si || selectedVillage.name_en
          : undefined,
        villageAlt: selectedVillage
          ? selectedVillage.name_en || selectedVillage.name_si
          : undefined,
      }),
    ).then((data) => setRows(data as House[]));
  };

  useEffect(() => {
    void api(window.electronAPI.listVillages())
      .then((list) => setVillages(list as Village[]))
      .catch(() => setVillages([]));
  }, []);

  useEffect(() => {
    load();
  }, [q, archived, villageId]);

  const setArchivedState = (id: number, next: boolean) => {
    void confirm({
      message: next ? t("confirmArchive") : t("confirmRestore"),
      confirmLabel: next ? t("archive") : t("restore"),
      tone: next ? "danger" : "default",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.setHouseArchived(id, next))
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
        title={t("houses")}
        actions={
          !creating ? (
            <button type="button" className="btn btn-icon" onClick={() => setCreating(true)}>
              <span className="btn-ico">+</span>
              <span>{t("create")}</span>
            </button>
          ) : null
        }
      />
      {creating ? (
        <div className="panel">
          <h3>{t("create")}</h3>
          <HouseForm value={form} onChange={setForm} />
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setCreating(false);
                setForm(emptyHouse());
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
                void api(window.electronAPI.createHouse(form))
                  .then((h) => {
                    setCreating(false);
                    setForm(emptyHouse());
                    notify(t("created"));
                    navigate(`/admin/houses/${(h as House).id}`);
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
          <FilterBar
            clearLabel={t("clearFilters")}
            onClear={() => {
              setQ("");
              setVillageId(null);
              setArchived("current");
            }}
          >
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
            </div>
            <div className="field">
              <label className="label">{t("village")}</label>
              <SearchSelect<Village>
                value={villageId}
                onChange={setVillageId}
                placeholder={t("selectVillage")}
                emptyLabel={t("all")}
                options={villages}
                getOptionLabel={(v) => displayName(v.name_si, v.name_en, locale)}
                getOptionValue={(v) => v.id}
              />
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
          </FilterBar>
          <ResultMeta count={rows.length} label={t("results")} />
          <div className="panel table-wrap">
            {!rows.length ? (
              <EmptyState
                message={t("emptyHousesHint")}
                actionLabel={t("createHouse")}
                onAction={() => setCreating(true)}
              />
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("houseNumber")}</th>
                    <th>{t("name")}</th>
                    <th>{t("village")}</th>
                    <th>{t("phone")}</th>
                    <th>{t("members")}</th>
                    <th>{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <DataRowLink key={h.id} to={`/admin/houses/${h.id}`}>
                      <td>{h.house_number}</td>
                      <td>{displayName(h.name_si, h.name_en, locale)}</td>
                      <td>{displayName(h.village_si, h.village_en, locale)}</td>
                      <td>{h.telephone}</td>
                      <td>{h.member_count ?? 0}</td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setArchivedState(h.id, archived !== "archived")}
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
