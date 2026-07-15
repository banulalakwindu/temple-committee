import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyHouse, HouseForm, type HouseFormValue } from "@/components/HouseForm";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

export function HouseDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const [form, setForm] = useState<HouseFormValue>(emptyHouse());
  const [members, setMembers] = useState<
    { id: number; full_name_si: string; full_name_en: string; relationship_in_family: string }[]
  >([]);
  const [attendance, setAttendance] = useState<unknown[]>([]);
  const [docs, setDocs] = useState<unknown[]>([]);
  const [memberQ, setMemberQ] = useState("");

  const load = () => {
    void (async () => {
      const h = (await api(window.electronAPI.getHouse(Number(id)))) as HouseFormValue & {
        house_number: string | null;
      };
      setForm({ ...emptyHouse(), ...h, house_number: h.house_number || "" });
      setMembers(
        (await api(window.electronAPI.peopleByHouse(Number(id)))) as typeof members,
      );
      setAttendance(
        (await api(
          window.electronAPI.listAttendance({ houseId: Number(id) }),
        )) as unknown[],
      );
      setDocs(
        (await api(window.electronAPI.listDocuments({ q: "" }))) as {
          house_id?: number;
        }[],
      );
    })();
  };

  useEffect(() => {
    load();
  }, [id]);

  const filteredMembers = members.filter((m) => {
    if (!memberQ.trim()) return true;
    const q = memberQ.toLowerCase();
    return (
      m.full_name_si.toLowerCase().includes(q) ||
      m.full_name_en.toLowerCase().includes(q)
    );
  });

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <h2>{displayName(form.name_si, form.name_en, locale)}</h2>
          <ActionLink to="/admin/houses" icon={Icons.arrowLeft()} variant="secondary">
            {t("back")}
          </ActionLink>
        </div>
        <HouseForm value={form} onChange={setForm} />
        <div className="form-actions">
          <IconButton
            icon={Icons.check()}
            onClick={() => {
              void api(window.electronAPI.updateHouse(Number(id), form)).then(load);
            }}
          >
            {t("save")}
          </IconButton>
        </div>
      </div>
      <div className="panel">
        <h3>{t("members")}</h3>
        <input
          className="input"
          style={{ marginBottom: "0.75rem" }}
          placeholder={t("search")}
          value={memberQ}
          onChange={(e) => setMemberQ(e.target.value)}
        />
        <table className="data">
          <thead>
            <tr>
              <th>{t("nameSi")}</th>
              <th>{t("relationship")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link to={`/admin/people/${m.id}`}>
                    {displayName(m.full_name_si, m.full_name_en, locale)}
                  </Link>
                </td>
                <td>{m.relationship_in_family}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h3>{t("attendance")} — {t("history")}</h3>
        <p>{(attendance as unknown[]).length} {t("results")}</p>
      </div>
      <div className="panel">
        <h3>{t("documents")}</h3>
        <p>
          {
            (docs as { house_id?: number }[]).filter((d) => d.house_id === Number(id))
              .length
          }{" "}
          {t("results")}
        </p>
      </div>
    </div>
  );
}
