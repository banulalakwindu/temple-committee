import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { EmptyState } from "@/components/ListPage";
import {
  PublicDocumentsSection,
  type PublicDocument,
} from "@/components/PublicDocumentsSection";
import {
  PublicPaymentsSection,
  type PublicPayment,
} from "@/components/PublicPaymentsSection";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type DanaOccurrence = {
  id?: number;
  schedule_id?: number | null;
  dana_date: string;
  dana_type: "heel" | "dawal";
};

type HouseTab = "details" | "members" | "dana" | "documents" | "payments";

export function PublicHouse() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [house, setHouse] = useState<
    (HouseFormValue & { id: number; member_count?: number }) | null
  >(null);
  const [members, setMembers] = useState<
    { id: number; full_name_si: string; full_name_en: string }[]
  >([]);
  const [danaPast, setDanaPast] = useState<DanaOccurrence[]>([]);
  const [danaUpcoming, setDanaUpcoming] = useState<DanaOccurrence[]>([]);
  const [docs, setDocs] = useState<PublicDocument[]>([]);
  const [payments, setPayments] = useState<PublicPayment[]>([]);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<HouseTab>("details");
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());

  useEffect(() => {
    void (async () => {
      const houseId = Number(id);
      const h = (await api(window.electronAPI.getHouse(houseId))) as HouseFormValue & {
        id: number;
        member_count?: number;
      };
      setHouse(h);
      setForm({ ...emptyHouse(), ...h, house_number: h.house_number || "" });
      setTab("details");
      setEditing(false);
      setMembers(
        (await api(window.electronAPI.peopleByHouse(houseId))) as typeof members,
      );
      try {
        const history = (await api(
          window.electronAPI.listDanaByHouse(houseId),
        )) as {
          past: DanaOccurrence[];
          upcoming: DanaOccurrence[];
        };
        setDanaPast(history.past || []);
        setDanaUpcoming(history.upcoming || []);
      } catch {
        setDanaPast([]);
        setDanaUpcoming([]);
      }
      try {
        const rows = (await api(
          window.electronAPI.listDocuments({ houseId }),
        )) as PublicDocument[];
        setDocs(rows);
      } catch {
        setDocs([]);
      }
      try {
        const pays = (await api(
          window.electronAPI.listPaymentsPublic({ houseId }),
        )) as PublicPayment[];
        setPayments(pays);
      } catch {
        setPayments([]);
      }
    })();
  }, [id]);

  if (!house) return <div className="panel">{t("empty")}</div>;

  const danaTypeLabel = (type: "heel" | "dawal") =>
    type === "heel" ? t("heelDana") : t("dawalDana");

  const danaCount = danaPast.length + danaUpcoming.length;

  const tabBtn = (key: HouseTab, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      className={`detail-tab ${tab === key ? "active" : ""}`}
      onClick={() => setTab(key)}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="detail-tab-count">{count}</span>
      ) : null}
    </button>
  );

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <div>
            <h2>{displayName(house.name_si, house.name_en, locale)}</h2>
            <p>
              {t("village")}:{" "}
              {displayName(house.village_si, house.village_en, locale)}
              {house.house_number ? ` · #${house.house_number}` : ""}
            </p>
          </div>
          <div className="header-actions">
            <ActionLink to="/public" icon={Icons.arrowLeft()} variant="secondary">
              {t("back")}
            </ActionLink>
            {!editing ? (
              <IconButton
                icon={Icons.edit()}
                onClick={() => setEditing(true)}
              >
                {t("requestCorrection")}
              </IconButton>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <div className="detail-tabs">
            {tabBtn("details", t("details"))}
            {tabBtn("members", t("members"), members.length)}
            {tabBtn("dana", t("dana"), danaCount)}
            {tabBtn("documents", t("documents"), docs.length)}
            {tabBtn("payments", t("payments"), payments.length)}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="panel">
          <HouseForm value={form} onChange={setForm} />
          <div className="form-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(
                  window.electronAPI.createPending({
                    requestType: "update_house",
                    payload: form,
                    targetHouseId: house.id,
                  }),
                )
                  .then(async () => {
                    notify(t("submitted"));
                    await refreshPendingCount();
                    navigate("/public/submitted");
                  })
                  .catch((e: Error) =>
                    notify(e.message || t("saveFailed"), {
                      tone: "error",
                      scrollTop: true,
                    }),
                  );
              }}
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}

      {!editing && tab === "details" ? (
        <div className="panel">
          <div className="grid-2">
            <div>
              <strong>{t("phone")}:</strong> {house.telephone || "—"}
            </div>
            <div>
              <strong>{t("members")}:</strong>{" "}
              {house.member_count ?? members.length}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <strong>{t("address")}:</strong>{" "}
              {displayName(house.address_si, house.address_en, locale) || "—"}
            </div>
          </div>
        </div>
      ) : null}

      {!editing && tab === "members" ? (
        <div className="panel">
          {!members.length ? (
            <EmptyState message={t("empty")} />
          ) : (
            <ul className="public-member-list">
              {members.map((m) => (
                <li key={m.id}>
                  <Link to={`/public/person/${m.id}`}>
                    {displayName(m.full_name_si, m.full_name_en, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!editing && tab === "dana" ? (
        <div className="panel">
          {!danaPast.length && !danaUpcoming.length ? (
            <EmptyState message={t("noDana")} />
          ) : (
            <div className="dana-today-grid">
              <div>
                <h4>{t("upcoming")}</h4>
                {!danaUpcoming.length ? (
                  <p className="muted">{t("noDana")}</p>
                ) : (
                  <ul className="public-dana-list">
                    {danaUpcoming.map((d) => (
                      <li
                        key={`u-${d.schedule_id}-${d.dana_date}-${d.dana_type}`}
                      >
                        <strong>{danaTypeLabel(d.dana_type)}</strong>
                        <span>{d.dana_date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4>{t("past")}</h4>
                {!danaPast.length ? (
                  <p className="muted">{t("noDana")}</p>
                ) : (
                  <ul className="public-dana-list">
                    {danaPast.slice(0, 20).map((d) => (
                      <li
                        key={`p-${d.id ?? `${d.dana_date}-${d.dana_type}`}`}
                      >
                        <strong>{danaTypeLabel(d.dana_type)}</strong>
                        <span>{d.dana_date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!editing && tab === "documents" ? (
        <div className="panel table-wrap">
          <PublicDocumentsSection docs={docs} showPerson hideTitle />
        </div>
      ) : null}

      {!editing && tab === "payments" ? (
        <div className="panel table-wrap">
          <PublicPaymentsSection payments={payments} hideTitle />
        </div>
      ) : null}
    </div>
  );
}
