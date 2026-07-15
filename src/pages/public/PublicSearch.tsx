import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { EmptyState, FilterBar, ListPageHeader, ResultMeta } from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type Person = {
  id: number;
  full_name_si: string;
  full_name_en: string;
  phone: string;
  nic: string;
  house_name_si?: string;
  house_name_en?: string;
};
type House = {
  id: number;
  name_si: string;
  name_en: string;
  village_si: string;
  house_number: string | null;
  member_count?: number;
};

export function PublicSearch() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [kind, setKind] = useState<"all" | "people" | "houses">(
    (params.get("kind") as "all" | "people" | "houses") || "all",
  );
  const [people, setPeople] = useState<Person[]>([]);
  const [houses, setHouses] = useState<House[]>([]);

  useEffect(() => {
    void (async () => {
      if (!q.trim()) {
        setPeople([]);
        setHouses([]);
        return;
      }
      if (kind !== "houses") {
        setPeople((await api(window.electronAPI.listPeople({ q }))) as Person[]);
      } else setPeople([]);
      if (kind !== "people") {
        setHouses((await api(window.electronAPI.listHouses({ q, active: "active" }))) as House[]);
      } else setHouses([]);
    })();
  }, [q, kind]);

  const total = people.length + houses.length;

  return (
    <div>
      <ListPageHeader
        title={t("findMe")}
        subtitle={t("publicHint")}
        actions={
          <IconButton
            icon={Icons.arrowLeft()}
            variant="secondary"
            onClick={() => navigate("/public")}
          >
            {t("back")}
          </IconButton>
        }
      />
      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setKind("all");
          setParams({});
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input
            className="input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setParams({ q: e.target.value, kind });
            }}
          />
        </div>
        <div className="field">
          <label className="label">{t("type")}</label>
          <select
            className="select"
            value={kind}
            onChange={(e) => {
              const v = e.target.value as "all" | "people" | "houses";
              setKind(v);
              setParams({ q, kind: v });
            }}
          >
            <option value="all">{t("all")}</option>
            <option value="people">{t("people")}</option>
            <option value="houses">{t("houses")}</option>
          </select>
        </div>
      </FilterBar>
      <ResultMeta count={total} label={t("results")} />
      <div className="panel">
        {!total && q ? <EmptyState message={t("noResults")} /> : null}
        {!q ? <EmptyState message={t("search")} /> : null}
        {people.length > 0 && (
          <div className="table-wrap">
            <h3>{t("people")}</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("nameSi")}</th>
                  <th>{t("currentHouse")}</th>
                  <th>{t("phone")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>{displayName(p.full_name_si, p.full_name_en, locale)}</td>
                    <td>{displayName(p.house_name_si, p.house_name_en, locale)}</td>
                    <td>{p.phone}</td>
                    <td>
                      <Link to={`/public/person/${p.id}`}>{t("view")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {houses.length > 0 && (
          <div className="table-wrap" style={{ marginTop: "1rem" }}>
            <h3>{t("houses")}</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("nameSi")}</th>
                  <th>{t("houseNumber")}</th>
                  <th>{t("village")}</th>
                  <th>{t("members")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {houses.map((h) => (
                  <tr key={h.id}>
                    <td>{displayName(h.name_si, h.name_en, locale)}</td>
                    <td>{h.house_number}</td>
                    <td>{h.village_si}</td>
                    <td>{h.member_count ?? 0}</td>
                    <td>
                      <Link to={`/public/house/${h.id}`}>{t("view")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
