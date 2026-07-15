import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { emptyPerson, PersonForm, type PersonFormValue } from "@/components/PersonForm";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

export function PersonDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const [form, setForm] = useState<PersonFormValue>(emptyPerson());
  const [houses, setHouses] = useState<{ id: number; name_si: string; name_en: string }[]>([]);
  const [history, setHistory] = useState<
    {
      id: number;
      moved_at: string;
      reason: string;
      from_name_si?: string;
      to_name_si?: string;
    }[]
  >([]);
  const [attendance, setAttendance] = useState<{ id: number; attendance_date: string; event_name_si?: string; event_other?: string }[]>([]);
  const [docs, setDocs] = useState<{ id: number; issue_date: string; type_name_si?: string; document_other?: string }[]>([]);
  const [moveTo, setMoveTo] = useState<number | "">("");
  const [moveReason, setMoveReason] = useState("");
  const [histQ, setHistQ] = useState("");

  const load = () => {
    void (async () => {
      const p = (await api(window.electronAPI.getPerson(Number(id)))) as PersonFormValue & {
        birthday: string | null;
      };
      setForm({ ...emptyPerson(), ...p, birthday: p.birthday || "" });
      setHouses(
        (await api(window.electronAPI.listHouses({ active: "all" }))) as typeof houses,
      );
      setHistory(
        (await api(window.electronAPI.personHistory(Number(id)))) as typeof history,
      );
      const att = (await api(window.electronAPI.listAttendance({ q: "" }))) as {
        id: number;
        person_id: number;
        attendance_date: string;
        event_name_si?: string;
        event_other?: string;
      }[];
      setAttendance(att.filter((a) => a.person_id === Number(id)));
      const allDocs = (await api(
        window.electronAPI.listDocuments({ q: "" }),
      )) as (typeof docs[number] & { person_id: number })[];
      setDocs(allDocs.filter((d) => d.person_id === Number(id)));
    })();
  };

  useEffect(() => {
    load();
  }, [id]);

  const histFiltered = history.filter((h) => {
    if (!histQ.trim()) return true;
    const q = histQ.toLowerCase();
    return (
      (h.from_name_si || "").toLowerCase().includes(q) ||
      (h.to_name_si || "").toLowerCase().includes(q) ||
      (h.reason || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="detail-grid">
      <div className="panel">
        <div className="list-page-header">
          <h2>{displayName(form.full_name_si, form.full_name_en, locale)}</h2>
          <ActionLink to="/admin/people" icon={Icons.arrowLeft()} variant="secondary">
            {t("back")}
          </ActionLink>
        </div>
        <PersonForm value={form} onChange={setForm} houses={houses} />
        <div className="form-actions">
          <IconButton
            icon={Icons.check()}
            onClick={() => {
              void api(window.electronAPI.updatePerson(Number(id), form)).then(load);
            }}
          >
            {t("save")}
          </IconButton>
        </div>
      </div>

      <div className="panel">
        <h3>{t("moveHouse")}</h3>
        <div className="grid-2">
          <div className="field">
            <label className="label">{t("selectHouse")}</label>
            <select
              className="select"
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">—</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {displayName(h.name_si, h.name_en, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">{t("reason")}</label>
            <input className="input" value={moveReason} onChange={(e) => setMoveReason(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="btn accent"
          disabled={!moveTo}
          onClick={() => {
            if (!moveTo) return;
            void api(
              window.electronAPI.movePerson(Number(id), Number(moveTo), moveReason),
            ).then(() => {
              setMoveReason("");
              setMoveTo("");
              load();
            });
          }}
        >
          {t("moveHouse")}
        </button>
      </div>

      <div className="panel">
        <h3>{t("previousHouses")}</h3>
        <input
          className="input"
          style={{ marginBottom: "0.75rem" }}
          placeholder={t("search")}
          value={histQ}
          onChange={(e) => setHistQ(e.target.value)}
        />
        <table className="data">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>From</th>
              <th>To</th>
              <th>{t("reason")}</th>
            </tr>
          </thead>
          <tbody>
            {histFiltered.map((h) => (
              <tr key={h.id}>
                <td>{h.moved_at.slice(0, 10)}</td>
                <td>{h.from_name_si || "—"}</td>
                <td>{h.to_name_si || "—"}</td>
                <td>{h.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>{t("attendance")}</h3>
        <table className="data">
          <thead>
            <tr>
              <th>{t("date")}</th>
              <th>{t("event")}</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id}>
                <td>{a.attendance_date}</td>
                <td>{a.event_name_si || a.event_other || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>{t("documents")}</h3>
        <table className="data">
          <thead>
            <tr>
              <th>{t("issueDate")}</th>
              <th>{t("documentType")}</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>{d.issue_date}</td>
                <td>{d.type_name_si || d.document_other || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
