import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

export function PublicPerson() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [person, setPerson] = useState<PersonFormValue & { id: number; house_name_si?: string; house_name_en?: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());
  const [houses, setHouses] = useState<{ id: number; name_si: string; name_en: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const p = (await api(window.electronAPI.getPerson(Number(id)))) as PersonFormValue & {
        id: number;
        house_name_si?: string;
        house_name_en?: string;
      };
      setPerson(p);
      setForm({ ...emptyPerson(), ...p, birthday: p.birthday || "" });
      setHouses((await api(window.electronAPI.listHouses({ active: "active" }))) as typeof houses);
    })();
  }, [id]);

  if (!person) return <div className="panel">{t("empty")}</div>;

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <div>
            <h2>{displayName(person.full_name_si, person.full_name_en, locale)}</h2>
            <p>
              {t("currentHouse")}:{" "}
              {displayName(person.house_name_si, person.house_name_en, locale)}
            </p>
          </div>
          <div className="header-actions">
            <ActionLink to="/public" icon={Icons.arrowLeft()} variant="secondary">
              {t("back")}
            </ActionLink>
            <IconButton
              icon={Icons.edit()}
              onClick={() => setEditing((e) => !e)}
            >
              {t("requestCorrection")}
            </IconButton>
          </div>
        </div>
        {!editing && (
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
              <strong>{t("relationship")}:</strong> {person.relationship_in_family || "—"}
            </div>
          </div>
        )}
        {editing && (
          <>
            <PersonForm value={form} onChange={setForm} houses={houses} />
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setEditing(false)}>
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
                  ).then(async () => {
                    await refreshPendingCount();
                    navigate("/public/submitted");
                  });
                }}
              >
                {t("save")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
