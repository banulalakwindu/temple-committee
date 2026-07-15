import { useEffect, useState } from "react";
import {
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type ReportKind = "families" | "attendance" | "documents" | "birthdays";

export function ReportsPage() {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<ReportKind>("families");
  const [q, setQ] = useState("");
  const [village, setVillage] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void (async () => {
      if (kind === "families") {
        const houses = (await api(
          window.electronAPI.listHouses({ q, village, active: "active" }),
        )) as { id: number; name_si: string; name_en: string; village_si: string }[];
        const out: Record<string, unknown>[] = [];
        for (const h of houses) {
          const members = (await api(
            window.electronAPI.peopleByHouse(h.id),
          )) as { full_name_si: string; full_name_en: string; relationship_in_family: string }[];
          out.push({
            house: displayName(h.name_si, h.name_en, locale),
            village: h.village_si,
            members: members
              .map(
                (m) =>
                  `${displayName(m.full_name_si, m.full_name_en, locale)} (${m.relationship_in_family || "-"})`,
              )
              .join(", "),
          });
        }
        setRows(out);
      } else if (kind === "attendance") {
        setRows(
          (await api(
            window.electronAPI.listAttendance({ q, dateFrom, dateTo }),
          )) as Record<string, unknown>[],
        );
      } else if (kind === "documents") {
        setRows(
          (await api(
            window.electronAPI.listDocuments({ q, dateFrom, dateTo }),
          )) as Record<string, unknown>[],
        );
      } else {
        setRows(
          (await api(
            window.electronAPI.listPeople({
              q,
              birthdayMonth: month,
              active: "active",
            }),
          )) as Record<string, unknown>[],
        );
      }
    })();
  }, [kind, q, village, month, dateFrom, dateTo, locale]);

  return (
    <div>
      <ListPageHeader
        title={t("reports")}
        actions={
          <button type="button" className="btn secondary" onClick={() => window.print()}>
            {t("print")}
          </button>
        }
      />
      <div className="shortcut-row no-print" style={{ marginBottom: "1rem" }}>
        {(
          [
            ["families", t("familiesReport")],
            ["attendance", t("attendanceReport")],
            ["documents", t("documentsReport")],
            ["birthdays", t("birthdaysReport")],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn ${kind === k ? "" : "secondary"}`}
            onClick={() => setKind(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setVillage("");
          setDateFrom("");
          setDateTo("");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {kind === "families" && (
          <div className="field">
            <label className="label">{t("village")}</label>
            <input className="input" value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
        )}
        {(kind === "attendance" || kind === "documents") && (
          <>
            <div className="field">
              <label className="label">{t("dateFrom")}</label>
              <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("dateTo")}</label>
              <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </>
        )}
        {kind === "birthdays" && (
          <div className="field">
            <label className="label">{t("birthdayMonth")}</label>
            <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </FilterBar>
      <ResultMeta count={rows.length} label={t("results")} />
      <div className="panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              {rows[0]
                ? Object.keys(rows[0]).map((k) => <th key={k}>{k}</th>)
                : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {Object.values(r).map((v, j) => (
                  <td key={j}>{String(v ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
