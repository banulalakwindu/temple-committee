import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import {
  PublicDocumentsSection,
  type PublicDocument,
} from "@/components/PublicDocumentsSection";
import {
  PublicPaymentsSection,
  type PublicPayment,
} from "@/components/PublicPaymentsSection";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { useApp } from "@/context/AppContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type PersonTab = "details" | "documents" | "payments";

export function PublicPerson() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [person, setPerson] = useState<
    (PersonFormValue & {
      id: number;
      house_name_si?: string;
      house_name_en?: string;
      current_house_id?: number | null;
    }) | null
  >(null);
  const [docs, setDocs] = useState<PublicDocument[]>([]);
  const [payments, setPayments] = useState<PublicPayment[]>([]);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<PersonTab>("details");
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());

  useEffect(() => {
    void (async () => {
      const personId = Number(id);
      const p = (await api(window.electronAPI.getPerson(personId))) as PersonFormValue & {
        id: number;
        house_name_si?: string;
        house_name_en?: string;
        current_house_id?: number | null;
      };
      setPerson(p);
      setForm({ ...emptyPerson(), ...p, birthday: p.birthday || "" });
      setTab("details");
      setEditing(false);
      try {
        const rows = (await api(
          window.electronAPI.listDocuments({ personId }),
        )) as PublicDocument[];
        setDocs(rows);
      } catch {
        setDocs([]);
      }
      try {
        const pays = (await api(
          window.electronAPI.listPaymentsPublic({ personId }),
        )) as PublicPayment[];
        setPayments(pays);
      } catch {
        setPayments([]);
      }
    })();
  }, [id]);

  if (!person) return <div className="panel">{t("empty")}</div>;

  const tabBtn = (key: PersonTab, label: string, count?: number) => (
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
            <h2>{displayName(person.full_name_si, person.full_name_en, locale)}</h2>
            <p>
              {t("currentHouse")}:{" "}
              {person.current_house_id ? (
                <Link to={`/public/house/${person.current_house_id}`}>
                  {displayName(person.house_name_si, person.house_name_en, locale) ||
                    "—"}
                </Link>
              ) : (
                displayName(person.house_name_si, person.house_name_en, locale) ||
                "—"
              )}
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
            {tabBtn("documents", t("documents"), docs.length)}
            {tabBtn("payments", t("payments"), payments.length)}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="panel">
          <PersonForm value={form} onChange={setForm} />
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
                    requestType: "update_person",
                    payload: form,
                    targetPersonId: person.id,
                    targetHouseId: form.current_house_id,
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
              <strong>{t("phone")}:</strong> {person.phone || "—"}
            </div>
            <div>
              <strong>{t("nic")}:</strong> {person.nic || "—"}
            </div>
            <div>
              <strong>{t("birthday")}:</strong> {person.birthday || "—"}
            </div>
            <div>
              <strong>{t("relationship")}:</strong>{" "}
              {person.relationship_in_family || "—"}
            </div>
            <div>
              <strong>{t("dahamSchoolChild")}:</strong>{" "}
              {person.daham_school_child ? t("yes") : t("no")}
            </div>
          </div>
        </div>
      ) : null}

      {!editing && tab === "documents" ? (
        <div className="panel table-wrap">
          <PublicDocumentsSection docs={docs} hideTitle />
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
