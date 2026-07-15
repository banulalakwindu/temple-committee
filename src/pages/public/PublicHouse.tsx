import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

export function PublicHouse() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { refreshPendingCount } = useApp();
  const navigate = useNavigate();
  const [house, setHouse] = useState<(HouseFormValue & { id: number; member_count?: number }) | null>(null);
  const [members, setMembers] = useState<{ id: number; full_name_si: string; full_name_en: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());

  useEffect(() => {
    void (async () => {
      const h = (await api(window.electronAPI.getHouse(Number(id)))) as HouseFormValue & {
        id: number;
        member_count?: number;
      };
      setHouse(h);
      setForm({ ...emptyHouse(), ...h, house_number: h.house_number || "" });
      setMembers((await api(window.electronAPI.peopleByHouse(Number(id)))) as typeof members);
    })();
  }, [id]);

  if (!house) return <div className="panel">{t("empty")}</div>;

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <div>
            <h2>{displayName(house.name_si, house.name_en, locale)}</h2>
            <p>
              {t("village")}: {house.village_si || house.village_en || "—"} · {t("members")}:{" "}
              {house.member_count ?? members.length}
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
          <>
            <p>
              {t("phone")}: {house.telephone || "—"}
            </p>
            <p>
              {t("addressSi")}: {house.address_si || "—"}
            </p>
            <h3>{t("members")}</h3>
            <ul>
              {members.map((m) => (
                <li key={m.id}>
                  <Link to={`/public/person/${m.id}`}>
                    {displayName(m.full_name_si, m.full_name_en, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {editing && (
          <>
            <HouseForm value={form} onChange={setForm} />
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
                      requestType: "update_house",
                      payload: form,
                      targetHouseId: house.id,
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
