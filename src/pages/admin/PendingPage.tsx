import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { SearchInput } from "@/components/SearchInput";
import {
  DataRowLink,
  EmptyState,
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
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

function typeLabel(
  type: string,
  t: (key: "newPerson" | "updatePerson" | "newHouse" | "updateHouse" | "newHousehold") => string,
): string {
  const map: Record<string, string> = {
    create_person: t("newPerson"),
    update_person: t("updatePerson"),
    create_house: t("newHouse"),
    update_house: t("updateHouse"),
    create_household: t("newHousehold"),
  };
  return map[type] || type;
}

function summaryFor(row: Pending, locale: string): string {
  try {
    const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    if (row.request_type === "create_household") {
      const house = (payload.house || {}) as {
        name_si?: string;
        name_en?: string;
      };
      const people = Array.isArray(payload.people) ? payload.people : [];
      const name = displayName(house.name_si, house.name_en, locale);
      return `${name} · ${people.length}`;
    }
    if (row.request_type.includes("person")) {
      return displayName(
        String(payload.full_name_si || ""),
        String(payload.full_name_en || ""),
        locale,
      );
    }
    return displayName(
      String(payload.name_si || ""),
      String(payload.name_en || ""),
      locale,
    );
  } catch {
    return "—";
  }
}

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return String(v);
}

export function PendingPage() {
  const { t, locale } = useI18n();
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
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} />
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
            <option value="create_household">{t("newHousehold")}</option>
            <option value="create_person">{t("newPerson")}</option>
            <option value="update_person">{t("updatePerson")}</option>
            <option value="create_house">{t("newHouse")}</option>
            <option value="update_house">{t("updateHouse")}</option>
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
          <EmptyState message={t("emptyPendingHint")} />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>{t("type")}</th>
                <th>{t("name")}</th>
                <th>{t("status")}</th>
                <th>{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <DataRowLink key={r.id} to={`/admin/pending/${r.id}`}>
                  <td>{r.id}</td>
                  <td>{typeLabel(r.request_type, t)}</td>
                  <td>{summaryFor(r, locale)}</td>
                  <td>
                    <span
                      className={`badge ${r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : ""}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>{r.submitted_at.slice(0, 16).replace("T", " ")}</td>
                </DataRowLink>
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
  const { notify } = useToast();
  const navigate = useNavigate();
  const [item, setItem] = useState<Pending | null>(null);
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
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
        window.electronAPI.listHouses({}),
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

  const isHousehold = item?.request_type === "create_household";
  const isPerson = Boolean(item?.request_type.includes("person") && !isHousehold);
  const isUpdate = Boolean(item?.request_type.startsWith("update"));

  const houseName = (houseId: unknown) => {
    if (!houseId) return "—";
    const h = houses.find((x) => x.id === Number(houseId));
    if (!h) return `#${houseId}`;
    return displayName(h.name_si, h.name_en, locale);
  };

  const personFieldMap = useMemo(
    (): [string, string][] => [
      [t("nameSi"), "full_name_si"],
      [t("nameEn"), "full_name_en"],
      [t("gender"), "gender"],
      [t("birthday"), "birthday"],
      [t("nic"), "nic"],
      [t("phone"), "phone"],
      [`${t("occupation")} (SI)`, "occupation_si"],
      [`${t("occupation")} (EN)`, "occupation_en"],
      [t("relationship"), "relationship_in_family"],
      [t("dahamSchoolChild"), "daham_school_child"],
      [t("addressSi"), "address_si"],
      [t("addressEn"), "address_en"],
      [t("notes"), "notes"],
      [t("currentHouse"), "current_house_id"],
      [`${t("customField")} 1`, "custom_field_1"],
      [`${t("customField")} 2`, "custom_field_2"],
      [`${t("customField")} 3`, "custom_field_3"],
      [`${t("customField")} 4`, "custom_field_4"],
      [`${t("customField")} 5`, "custom_field_5"],
    ],
    [t],
  );

  const houseFieldMap = useMemo(
    (): [string, string][] => [
      [t("houseNumber"), "house_number"],
      [t("nameSi"), "name_si"],
      [t("nameEn"), "name_en"],
      [t("addressSi"), "address_si"],
      [t("addressEn"), "address_en"],
      [`${t("village")} (SI)`, "village_si"],
      [`${t("village")} (EN)`, "village_en"],
      [t("phone"), "telephone"],
      [t("notes"), "notes"],
      [`${t("customField")} 1`, "custom_field_1"],
      [`${t("customField")} 2`, "custom_field_2"],
      [`${t("customField")} 3`, "custom_field_3"],
      [`${t("customField")} 4`, "custom_field_4"],
      [`${t("customField")} 5`, "custom_field_5"],
    ],
    [t],
  );

  const mapFields = (
    source: Record<string, unknown>,
    map: [string, string][],
    compare: Record<string, unknown> | null,
    resolveHouseId = false,
  ): FieldRow[] =>
    map.map(([label, key]) => {
      const rawProposed = source[key];
      const rawCurrent = compare?.[key];
      const proposed =
        resolveHouseId && key === "current_house_id"
          ? houseName(rawProposed)
          : key === "daham_school_child"
            ? rawProposed === 1 || rawProposed === true || rawProposed === "1"
              ? t("yes")
              : rawProposed === 0 || rawProposed === false || rawProposed === "0"
                ? t("no")
                : val(rawProposed)
            : val(rawProposed);
      const cur =
        resolveHouseId && key === "current_house_id"
          ? houseName(rawCurrent)
          : rawCurrent === undefined
            ? undefined
            : key === "daham_school_child"
              ? rawCurrent === 1 || rawCurrent === true || rawCurrent === "1"
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

  const fields: FieldRow[] = useMemo(() => {
    if (!item || isHousehold) return [];
    if (isPerson) {
      return mapFields(payload, personFieldMap, current, true);
    }
    return mapFields(payload, houseFieldMap, current);
  }, [
    item,
    isHousehold,
    isPerson,
    payload,
    current,
    isUpdate,
    personFieldMap,
    houseFieldMap,
    houses,
    locale,
  ]);

  const householdHouse = useMemo(() => {
    if (!isHousehold) return {} as Record<string, unknown>;
    return (payload.house || {}) as Record<string, unknown>;
  }, [isHousehold, payload]);

  const householdPeople = useMemo(() => {
    if (!isHousehold || !Array.isArray(payload.people)) return [];
    return payload.people as Record<string, unknown>[];
  }, [isHousehold, payload]);

  if (!id || !item) return null;

  const titleName = isHousehold
    ? displayName(
        String(householdHouse.name_si || ""),
        String(householdHouse.name_en || ""),
        locale,
      )
    : isPerson
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

  const renderFieldTable = (rows: FieldRow[], showCurrent: boolean) => (
    <div className="review-table-wrap">
      <table className="review-table">
        <thead>
          <tr>
            <th>{t("type")}</th>
            {showCurrent ? <th>Current</th> : null}
            <th>{showCurrent ? "Requested change" : "Submitted details"}</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((f) => f.proposed !== "—" || (f.current && f.current !== "—"))
            .map((f) => (
              <tr key={f.label} className={f.changed ? "changed" : ""}>
                <th>{f.label}</th>
                {showCurrent ? <td className="muted">{f.current ?? "—"}</td> : null}
                <td className={f.changed ? "proposed" : ""}>{f.proposed}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="modal-backdrop">
      <div className="modal review-modal">
        <div className="review-sheet">
          <header className="review-sheet-head">
            <div>
              <p className="review-kicker">
                #{item.id} · {typeLabel(item.request_type, t)}
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
                {isHousehold ? (
                  <>
                    <span className="dot">·</span>
                    {householdPeople.length} {t("members")}
                  </>
                ) : null}
              </p>
            </div>
          </header>

          {isHousehold ? (
            <>
              <h4 className="review-subhead">{t("houseDetails")}</h4>
              {renderFieldTable(mapFields(householdHouse, houseFieldMap, null), false)}
              <h4 className="review-subhead">{t("householdMembers")}</h4>
              {householdPeople.map((person, index) => (
                <div className="review-member-block" key={index}>
                  <strong>
                    {index === 0
                      ? t("headOfHousehold")
                      : `${t("member")} ${index + 1}`}
                    {": "}
                    {displayName(
                      String(person.full_name_si || ""),
                      String(person.full_name_en || ""),
                      locale,
                    )}
                  </strong>
                  {renderFieldTable(
                    mapFields(person, personFieldMap, null, true).filter(
                      (f) => f.label !== t("currentHouse"),
                    ),
                    false,
                  )}
                </div>
              ))}
            </>
          ) : (
            renderFieldTable(fields, isUpdate)
          )}

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
                  disabled={reviewing}
                  onClick={() => {
                    setReviewing(true);
                    void api(window.electronAPI.rejectPending(item.id, note))
                      .then(() => {
                        notify(t("requestRejected"));
                        refresh();
                        navigate("/admin/pending");
                      })
                      .catch((e: Error) =>
                        notify(e.message || t("saveFailed"), {
                          tone: "error",
                          scrollTop: true,
                        }),
                      )
                      .finally(() => setReviewing(false));
                  }}
                >
                  {reviewing ? t("saving") : t("reject")}
                </IconButton>
                <IconButton
                  icon={Icons.check()}
                  disabled={reviewing}
                  onClick={() => {
                    setReviewing(true);
                    void api(window.electronAPI.approvePending(item.id, note))
                      .then(() => {
                        notify(t("requestApproved"));
                        refresh();
                        navigate("/admin/pending");
                      })
                      .catch((e: Error) =>
                        notify(e.message || t("saveFailed"), {
                          tone: "error",
                          scrollTop: true,
                        }),
                      )
                      .finally(() => setReviewing(false));
                  }}
                >
                  {reviewing ? t("saving") : t("approve")}
                </IconButton>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
