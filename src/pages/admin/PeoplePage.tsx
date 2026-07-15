import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type Person = PersonFormValue & {
  id: number;
  house_name_si?: string;
  house_name_en?: string;
};

export function PeoplePage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Person[]>([]);
  const [houses, setHouses] = useState<{ id: number; name_si: string; name_en: string }[]>([]);
  const [q, setQ] = useState("");
  const [houseId, setHouseId] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [active, setActive] = useState<"all" | "active" | "inactive">("active");
  const [birthdayMonth, setBirthdayMonth] = useState<number | "">("");
  const [hasNic, setHasNic] = useState<"all" | "yes" | "no">("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());

  useEffect(() => {
    void api(window.electronAPI.listHouses({ active: "all" })).then((h) =>
      setHouses(h as typeof houses),
    );
  }, []);

  useEffect(() => {
    void api(
      window.electronAPI.listPeople({
        q,
        houseId: houseId || null,
        gender,
        active,
        birthdayMonth: birthdayMonth || null,
        hasNic,
      }),
    ).then((data) => setRows(data as Person[]));
  }, [q, houseId, gender, active, birthdayMonth, hasNic]);

  return (
    <div>
      <ListPageHeader
        title={t("people")}
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
          setHouseId("");
          setGender("");
          setActive("all");
          setBirthdayMonth("");
          setHasNic("all");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("currentHouse")}</label>
          <select className="select" value={houseId} onChange={(e) => setHouseId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">{t("all")}</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {displayName(h.name_si, h.name_en, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">{t("gender")}</label>
          <select className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">{t("all")}</option>
            <option value="male">{t("male")}</option>
            <option value="female">{t("female")}</option>
            <option value="other">{t("other")}</option>
          </select>
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
          <label className="label">{t("birthdayMonth")}</label>
          <select
            className="select"
            value={birthdayMonth}
            onChange={(e) => setBirthdayMonth(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">{t("all")}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">{t("hasNic")}</label>
          <select className="select" value={hasNic} onChange={(e) => setHasNic(e.target.value as typeof hasNic)}>
            <option value="all">{t("all")}</option>
            <option value="yes">{t("yes")}</option>
            <option value="no">{t("no")}</option>
          </select>
        </div>
      </FilterBar>
      <ResultMeta count={rows.length} label={t("results")} />
      {creating && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <PersonForm value={form} onChange={setForm} houses={houses} />
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={() => setCreating(false)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(window.electronAPI.createPerson(form)).then((p) => {
                  navigate(`/admin/people/${(p as Person).id}`);
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
                <th>{t("nameSi")}</th>
                <th>{t("currentHouse")}</th>
                <th>{t("phone")}</th>
                <th>{t("nic")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{displayName(p.full_name_si, p.full_name_en, locale)}</td>
                  <td>{displayName(p.house_name_si, p.house_name_en, locale)}</td>
                  <td>{p.phone}</td>
                  <td>{p.nic}</td>
                  <td>
                    <Link to={`/admin/people/${p.id}`}>{t("view")}</Link>
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
