import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type House = HouseFormValue & { id: number; member_count?: number };

export function HousesPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState<House[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("active");
  const [village, setVillage] = useState("");
  const [hasMembers, setHasMembers] = useState<"all" | "yes" | "no">("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());

  const load = () => {
    void api(
      window.electronAPI.listHouses({ q, active, village, hasMembers }),
    ).then((data) => setRows(data as House[]));
  };

  useEffect(() => {
    load();
  }, [q, active, village, hasMembers]);

  return (
    <div>
      <ListPageHeader
        title={t("houses")}
        actions={
          <button type="button" className="btn btn-icon" onClick={() => setCreating(true)}>
            <span className="btn-ico">+</span>
            <span>{t("create")}</span>
          </button>
        }
      />
      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setActive("all");
          setVillage("");
          setHasMembers("all");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("status")}</label>
          <select className="select" value={active} onChange={(e) => setActive(e.target.value as typeof active)}>
            <option value="all">{t("all")}</option>
            <option value="active">{t("active")}</option>
            <option value="inactive">{t("inactive")}</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("village")}</label>
          <input className="input" value={village} onChange={(e) => setVillage(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("hasMembers")}</label>
          <select className="select" value={hasMembers} onChange={(e) => setHasMembers(e.target.value as typeof hasMembers)}>
            <option value="all">{t("all")}</option>
            <option value="yes">{t("yes")}</option>
            <option value="no">{t("no")}</option>
          </select>
        </div>
      </FilterBar>
      <ResultMeta count={rows.length} label={t("results")} />
      {creating && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3>{t("create")}</h3>
          <HouseForm value={form} onChange={setForm} />
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={() => setCreating(false)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(window.electronAPI.createHouse(form)).then((h) => {
                  setCreating(false);
                  setForm(emptyHouse());
                  navigate(`/admin/houses/${(h as House).id}`);
                });
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
      )}
      <div className="panel table-wrap">
        {!rows.length ? (
          <EmptyState message={t("noResults")} />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>{t("houseNumber")}</th>
                <th>{t("nameSi")}</th>
                <th>{t("village")}</th>
                <th>{t("phone")}</th>
                <th>{t("members")}</th>
                <th>{t("status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.id}>
                  <td>{h.house_number}</td>
                  <td>{displayName(h.name_si, h.name_en, locale)}</td>
                  <td>{h.village_si || h.village_en}</td>
                  <td>{h.telephone}</td>
                  <td>{h.member_count ?? 0}</td>
                  <td>
                    <span className={`badge ${h.is_active ? "success" : "danger"}`}>
                      {h.is_active ? t("active") : t("inactive")}
                    </span>
                  </td>
                  <td>
                    <Link to={`/admin/houses/${h.id}`}>{t("view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
