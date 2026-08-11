import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import {
  DataRowLink,
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { SearchInput } from "@/components/SearchInput";
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
  village_en: string;
  house_number: string | null;
  member_count?: number;
};

type DanaOcc = {
  dana_date: string;
  dana_type: "heel" | "dawal";
};

type HouseDanaSummary = {
  heel?: string;
  dawal?: string;
};

function summarizeUpcoming(upcoming: DanaOcc[]): HouseDanaSummary {
  const out: HouseDanaSummary = {};
  for (const row of upcoming) {
    if (row.dana_type === "heel" && !out.heel) out.heel = row.dana_date;
    if (row.dana_type === "dawal" && !out.dawal) out.dawal = row.dana_date;
  }
  return out;
}

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
  const [houseDana, setHouseDana] = useState<Record<number, HouseDanaSummary>>(
    {},
  );

  useEffect(() => {
    void (async () => {
      if (!q.trim()) {
        setPeople([]);
        setHouses([]);
        setHouseDana({});
        return;
      }
      if (kind !== "houses") {
        setPeople((await api(window.electronAPI.listPeople({ q }))) as Person[]);
      } else setPeople([]);
      if (kind !== "people") {
        const rows = (await api(
          window.electronAPI.listHouses({ q }),
        )) as House[];
        setHouses(rows);
        const entries = await Promise.all(
          rows.map(async (h) => {
            try {
              const history = (await api(
                window.electronAPI.listDanaByHouse(h.id),
              )) as { upcoming: DanaOcc[] };
              return [h.id, summarizeUpcoming(history.upcoming || [])] as const;
            } catch {
              return [h.id, {}] as const;
            }
          }),
        );
        setHouseDana(Object.fromEntries(entries));
      } else {
        setHouses([]);
        setHouseDana({});
      }
    })();
  }, [q, kind]);

  const total = people.length + houses.length;

  return (
    <div className="page-sheet">
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
      <div className="page-sheet-body">
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
          <SearchInput
            value={q}
            placeholder={t("search")}
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
      <div className="panel table-wrap">
        {!total && q ? <EmptyState message={t("noResults")} /> : null}
        {!q ? <EmptyState message={t("search")} /> : null}
        {people.length > 0 && (
          <div>
            <h3 className="search-section-title">{t("people")}</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("currentHouse")}</th>
                  <th>{t("phone")}</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <DataRowLink key={p.id} to={`/public/person/${p.id}`}>
                    <td>{displayName(p.full_name_si, p.full_name_en, locale)}</td>
                    <td>{displayName(p.house_name_si, p.house_name_en, locale)}</td>
                    <td>{p.phone}</td>
                  </DataRowLink>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {houses.length > 0 && (
          <div className={people.length ? "search-section-block" : undefined}>
            <h3 className="search-section-title">{t("houses")}</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("houseNumber")}</th>
                  <th>{t("village")}</th>
                  <th>{t("members")}</th>
                  <th>{t("heelDana")}</th>
                  <th>{t("dawalDana")}</th>
                </tr>
              </thead>
              <tbody>
                {houses.map((h) => {
                  const dana = houseDana[h.id] || {};
                  return (
                    <DataRowLink key={h.id} to={`/public/house/${h.id}`}>
                      <td>{displayName(h.name_si, h.name_en, locale)}</td>
                      <td>{h.house_number}</td>
                      <td>{displayName(h.village_si, h.village_en, locale)}</td>
                      <td>{h.member_count ?? 0}</td>
                      <td>{dana.heel || "—"}</td>
                      <td>{dana.dawal || "—"}</td>
                    </DataRowLink>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
