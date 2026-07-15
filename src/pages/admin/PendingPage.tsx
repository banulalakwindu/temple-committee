import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import {
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type Pending = {
  id: number;
  request_type: string;
  payload_json: string;
  status: string;
  submitted_at: string;
  review_note: string;
  target_person_id: number | null;
  target_house_id: number | null;
};

type FieldRow = {
  label: string;
  proposed: string;
  current?: string;
  changed?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  create_person: "New person",
  update_person: "Update person",
  create_house: "New house",
  update_house: "Update house",
};

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return String(v);
}

export function PendingPage() {
  const { t } = useI18n();
  const { refreshPendingCount } = useApp();
  const [rows, setRows] = useState<Pending[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [requestType, setRequestType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = () => {
    void api(
      window.electronAPI.listPending({ q, status, requestType, dateFrom, dateTo }),
    ).then((data) => setRows(data as Pending[]));
  };

  useEffect(() => {
    load();
  }, [q, status, requestType, dateFrom, dateTo]);

  return (
    <div>
      <ListPageHeader title={t("pending")} />
      <FilterBar
        clearLabel={t("clearFilters")}
        onClear={() => {
          setQ("");
          setStatus("all");
          setRequestType("all");
          setDateFrom("");
          setDateTo("");
        }}
      >
        <div className="field search">
          <label className="label">{t("search")}</label>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("status")}</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">{t("all")}</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("type")}</label>
          <select className="select" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
            <option value="all">{t("all")}</option>
            <option value="create_person">New person</option>
            <option value="update_person">Update person</option>
            <option value="create_house">New house</option>
            <option value="update_house">Update house</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{t("dateFrom")}</label>
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">{t("dateTo")}</label>
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
                <th>ID</th>
                <th>{t("type")}</th>
                <th>{t("status")}</th>
                <th>{t("date")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{TYPE_LABELS[r.request_type] || r.request_type}</td>
                  <td>
                    <span
                      className={`badge ${r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : ""}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.submitted_at.slice(0, 16).replace("T", " ")}</td>
                  <td>
                    <Link to={`/admin/pending/${r.id}`}>{t("view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PendingReview
        refresh={() => {
          load();
          void refreshPendingCount();
        }}
      />
    </div>
  );
}

function PendingReview({ refresh }: { refresh: () => void }) {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [item, setItem] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [current, setCurrent] = useState<Record<string, unknown> | null>(null);
  const [houses, setHouses] = useState<
    { id: number; name_si: string; name_en: string }[]
  >([]);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setCurrent(null);
      setNote("");
      return;
    }
    void (async () => {
      const d = (await api(window.electronAPI.getPending(Number(id)))) as Pending;
      setItem(d);
      setNote(d.review_note || "");
      const houseList = (await api(
        window.electronAPI.listHouses({ active: "all" }),
      )) as typeof houses;
      setHouses(houseList);

      if (d.target_person_id && d.request_type.includes("person")) {
        const p = (await api(
          window.electronAPI.getPerson(d.target_person_id),
        )) as Record<string, unknown>;
        setCurrent(p);
      } else if (d.target_house_id && d.request_type.includes("house")) {
        const h = (await api(
          window.electronAPI.getHouse(d.target_house_id),
        )) as Record<string, unknown>;
        setCurrent(h);
      } else {
        setCurrent(null);
      }
    })();
  }, [id]);

  const payload = useMemo(() => {
    if (!item) return {} as Record<string, unknown>;
    try {
      return JSON.parse(item.payload_json) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [item]);

  const isPerson = item?.request_type.includes("person");
  const isUpdate = item?.request_type.startsWith("update");

  const houseName = (houseId: unknown) => {
    if (!houseId) return "—";
    const h = houses.find((x) => x.id === Number(houseId));
    if (!h) return `#${houseId}`;
    return displayName(h.name_si, h.name_en, locale);
  };

  const fields: FieldRow[] = useMemo(() => {
    if (!item) return [];
    if (isPerson) {
      const map: [string, string][] = [
        [t("nameSi"), "full_name_si"],
        [t("nameEn"), "full_name_en"],
        [t("gender"), "gender"],
        [t("birthday"), "birthday"],
        [t("nic"), "nic"],
        [t("phone"), "phone"],
        [`${t("occupation")} (SI)`, "occupation_si"],
        [`${t("occupation")} (EN)`, "occupation_en"],
        [t("relationship"), "relationship_in_family"],
        [t("addressSi"), "address_si"],
        [t("addressEn"), "address_en"],
        [t("notes"), "notes"],
        [t("currentHouse"), "current_house_id"],
        [t("active"), "is_active"],
        [`${t("customField")} 1`, "custom_field_1"],
        [`${t("customField")} 2`, "custom_field_2"],
        [`${t("customField")} 3`, "custom_field_3"],
        [`${t("customField")} 4`, "custom_field_4"],
        [`${t("customField")} 5`, "custom_field_5"],
      ];
      return map.map(([label, key]) => {
        const rawProposed = payload[key];
        const rawCurrent = current?.[key];
        const proposed =
          key === "current_house_id"
            ? houseName(rawProposed)
            : key === "is_active"
              ? Number(rawProposed) === 1
                ? t("yes")
                : t("no")
              : val(rawProposed);
        const cur =
          key === "current_house_id"
            ? houseName(rawCurrent)
            : key === "is_active"
              ? rawCurrent === undefined
                ? undefined
                : Number(rawCurrent) === 1
                  ? t("yes")
                  : t("no")
              : rawCurrent === undefined
                ? undefined
                : val(rawCurrent);
        return {
          label,
          proposed,
          current: cur,
          changed: isUpdate && cur !== undefined && proposed !== cur,
        };
      });
    }

    const map: [string, string][] = [
      [t("houseNumber"), "house_number"],
      [t("nameSi"), "name_si"],
      [t("nameEn"), "name_en"],
      [t("addressSi"), "address_si"],
      [t("addressEn"), "address_en"],
      [`${t("village")} (SI)`, "village_si"],
      [`${t("village")} (EN)`, "village_en"],
      [t("phone"), "telephone"],
      [t("notes"), "notes"],
      [t("active"), "is_active"],
      [`${t("customField")} 1`, "custom_field_1"],
      [`${t("customField")} 2`, "custom_field_2"],
      [`${t("customField")} 3`, "custom_field_3"],
      [`${t("customField")} 4`, "custom_field_4"],
      [`${t("customField")} 5`, "custom_field_5"],
    ];
    return map.map(([label, key]) => {
      const rawProposed = payload[key];
      const rawCurrent = current?.[key];
      const proposed =
        key === "is_active"
          ? Number(rawProposed) === 1
            ? t("yes")
            : t("no")
          : val(rawProposed);
      const cur =
        rawCurrent === undefined
          ? undefined
          : key === "is_active"
            ? Number(rawCurrent) === 1
              ? t("yes")
              : t("no")
            : val(rawCurrent);
      return {
        label,
        proposed,
        current: cur,
        changed: isUpdate && cur !== undefined && proposed !== cur,
      };
    });
  }, [item, payload, current, isPerson, isUpdate, t, houses, locale]);

  if (!id || !item) return null;

  const titleName = isPerson
    ? displayName(
        String(payload.full_name_si || ""),
        String(payload.full_name_en || ""),
        locale,
      )
    : displayName(
        String(payload.name_si || ""),
        String(payload.name_en || ""),
        locale,
      );

  return (
    <div className="modal-backdrop">
      <div className="modal review-modal">
        <div className="review-sheet">
          <header className="review-sheet-head">
            <div>
              <p className="review-kicker">
                #{item.id} · {TYPE_LABELS[item.request_type] || item.request_type}
              </p>
              <h3>{titleName || t("pending")}</h3>
              <p className="review-meta">
                {t("status")}:{" "}
                <span
                  className={`badge ${item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : ""}`}
                >
                  {item.status}
                </span>
                <span className="dot">·</span>
                {item.submitted_at.slice(0, 16).replace("T", " ")}
              </p>
            </div>
          </header>

          <div className="review-table-wrap">
            <table className="review-table">
              <thead>
                <tr>
                  <th>{t("type")}</th>
                  {isUpdate ? <th>Current</th> : null}
                  <th>{isUpdate ? "Requested change" : "Submitted details"}</th>
                </tr>
              </thead>
              <tbody>
                {fields
                  .filter((f) => f.proposed !== "—" || (f.current && f.current !== "—"))
                  .map((f) => (
                    <tr key={f.label} className={f.changed ? "changed" : ""}>
                      <th>{f.label}</th>
                      {isUpdate ? <td className="muted">{f.current ?? "—"}</td> : null}
                      <td className={f.changed ? "proposed" : ""}>{f.proposed}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {item.status !== "pending" && item.review_note ? (
            <p className="review-existing-note">
              <strong>{t("reviewNote")}:</strong> {item.review_note}
            </p>
          ) : null}

          {item.status === "pending" ? (
            <div className="field" style={{ marginTop: "1rem" }}>
              <label className="label">{t("reviewNote")}</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note…"
              />
            </div>
          ) : null}

          <div className="form-actions">
            <IconButton
              icon={Icons.arrowLeft()}
              variant="secondary"
              onClick={() => navigate("/admin/pending")}
            >
              {t("back")}
            </IconButton>
            {item.status === "pending" && (
              <>
                <IconButton
                  icon={Icons.x()}
                  variant="danger"
                  onClick={() => {
                    void api(window.electronAPI.rejectPending(item.id, note)).then(
                      () => {
                        refresh();
                        navigate("/admin/pending");
                      },
                    );
                  }}
                >
                  {t("reject")}
                </IconButton>
                <IconButton
                  icon={Icons.check()}
                  onClick={() => {
                    void api(window.electronAPI.approvePending(item.id, note)).then(
                      () => {
                        refresh();
                        navigate("/admin/pending");
                      },
                    );
                  }}
                >
                  {t("approve")}
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
