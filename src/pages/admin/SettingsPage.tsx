import { useEffect, useState } from "react";
import {
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

type Named = {
  id: number;
  name_si: string;
  name_en: string;
  is_active: number;
  sort_order: number;
};

type Backup = { name: string; path: string; mtime: string };

export function SettingsPage() {
  const { t } = useI18n();
  const { settings, refreshSettings } = useApp();
  const [templeSi, setTempleSi] = useState("");
  const [templeEn, setTempleEn] = useState("");
  const [autoBackup, setAutoBackup] = useState("1");
  const [intervalDays, setIntervalDays] = useState("1");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [events, setEvents] = useState<Named[]>([]);
  const [docTypes, setDocTypes] = useState<Named[]>([]);
  const [eventQ, setEventQ] = useState("");
  const [docQ, setDocQ] = useState("");
  const [activeOnlyEvents, setActiveOnlyEvents] = useState(false);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupQ, setBackupQ] = useState("");
  const [version, setVersion] = useState("");
  const [msg, setMsg] = useState("");
  const [newEventSi, setNewEventSi] = useState("");
  const [newEventEn, setNewEventEn] = useState("");
  const [newDocSi, setNewDocSi] = useState("");
  const [newDocEn, setNewDocEn] = useState("");

  const loadLists = () => {
    void api(window.electronAPI.listAttendanceEvents(false)).then((e) =>
      setEvents(e as Named[]),
    );
    void api(window.electronAPI.listDocumentTypes(false)).then((d) =>
      setDocTypes(d as Named[]),
    );
    void api(window.electronAPI.listBackups()).then((b) =>
      setBackups(b as Backup[]),
    );
  };

  useEffect(() => {
    setTempleSi(settings.temple_name_si || "");
    setTempleEn(settings.temple_name_en || "");
    setAutoBackup(settings.auto_backup_enabled || "1");
    setIntervalDays(settings.auto_backup_interval_days || "1");
  }, [settings]);

  useEffect(() => {
    loadLists();
    void api(window.electronAPI.getVersion()).then(setVersion);
  }, []);

  const filteredEvents = events.filter((e) => {
    if (activeOnlyEvents && !e.is_active) return false;
    if (!eventQ.trim()) return true;
    const q = eventQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredDocs = docTypes.filter((e) => {
    if (!docQ.trim()) return true;
    const q = docQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredBackups = backups.filter((b) =>
    !backupQ.trim()
      ? true
      : b.name.toLowerCase().includes(backupQ.toLowerCase()) ||
        b.mtime.includes(backupQ),
  );

  return (
    <div className="detail-grid">
      <ListPageHeader title={t("settings")} subtitle={`${t("version")}: ${version || "1.0.0"}`} />

      <div className="panel">
        <h3>{t("templeNameSi")}</h3>
        <div className="grid-2">
          <div className="field">
            <label className="label">{t("templeNameSi")}</label>
            <input className="input" value={templeSi} onChange={(e) => setTempleSi(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("templeNameEn")}</label>
            <input className="input" value={templeEn} onChange={(e) => setTempleEn(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("autoBackup")}</label>
            <select className="select" value={autoBackup} onChange={(e) => setAutoBackup(e.target.value)}>
              <option value="1">{t("yes")}</option>
              <option value="0">{t("no")}</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Interval (days)</label>
            <input className="input" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void api(
              window.electronAPI.setSettings({
                temple_name_si: templeSi,
                temple_name_en: templeEn,
                auto_backup_enabled: autoBackup,
                auto_backup_interval_days: intervalDays,
              }),
            ).then(() => {
              void refreshSettings();
              setMsg(t("saveSettings"));
            });
          }}
        >
          {t("saveSettings")}
        </button>
      </div>

      <div className="panel">
        <h3>{t("changePassword")}</h3>
        <div className="grid-2">
          <div className="field">
            <label className="label">Current</label>
            <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">New</label>
            <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            void window.electronAPI.changePassword(currentPw, newPw).then((res) => {
              setMsg(res.ok ? "Password updated" : res.error || "Error");
              setCurrentPw("");
              setNewPw("");
            });
          }}
        >
          {t("changePassword")}
        </button>
      </div>

      <div className="panel">
        <h3>{t("event")}</h3>
        <FilterBar clearLabel={t("clearFilters")} onClear={() => { setEventQ(""); setActiveOnlyEvents(false); }}>
          <div className="field search">
            <label className="label">{t("search")}</label>
            <input className="input" value={eventQ} onChange={(e) => setEventQ(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">{t("active")}</label>
            <select className="select" value={activeOnlyEvents ? "1" : "0"} onChange={(e) => setActiveOnlyEvents(e.target.value === "1")}>
              <option value="0">{t("all")}</option>
              <option value="1">{t("active")}</option>
            </select>
          </div>
        </FilterBar>
        <div className="grid-2">
          <input className="input" placeholder="SI" value={newEventSi} onChange={(e) => setNewEventSi(e.target.value)} />
          <input className="input" placeholder="EN" value={newEventEn} onChange={(e) => setNewEventEn(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn"
          style={{ margin: "0.6rem 0" }}
          onClick={() => {
            void api(
              window.electronAPI.upsertAttendanceEvent({
                name_si: newEventSi,
                name_en: newEventEn,
                is_active: 1,
                sort_order: events.length + 1,
              }),
            ).then(() => {
              setNewEventSi("");
              setNewEventEn("");
              loadLists();
            });
          }}
        >
          {t("create")}
        </button>
        <ResultMeta count={filteredEvents.length} label={t("results")} />
        <ul>
          {filteredEvents.map((e) => (
            <li key={e.id}>
              {e.name_si} / {e.name_en}{" "}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  void api(
                    window.electronAPI.upsertAttendanceEvent({
                      ...e,
                      is_active: e.is_active ? 0 : 1,
                    }),
                  ).then(loadLists);
                }}
              >
                {e.is_active ? t("inactive") : t("active")}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3>{t("documentType")}</h3>
        <FilterBar clearLabel={t("clearFilters")} onClear={() => setDocQ("")}>
          <div className="field search">
            <label className="label">{t("search")}</label>
            <input className="input" value={docQ} onChange={(e) => setDocQ(e.target.value)} />
          </div>
        </FilterBar>
        <div className="grid-2">
          <input className="input" placeholder="SI" value={newDocSi} onChange={(e) => setNewDocSi(e.target.value)} />
          <input className="input" placeholder="EN" value={newDocEn} onChange={(e) => setNewDocEn(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn"
          style={{ margin: "0.6rem 0" }}
          onClick={() => {
            void api(
              window.electronAPI.upsertDocumentType({
                name_si: newDocSi,
                name_en: newDocEn,
                is_active: 1,
                sort_order: docTypes.length + 1,
              }),
            ).then(() => {
              setNewDocSi("");
              setNewDocEn("");
              loadLists();
            });
          }}
        >
          {t("create")}
        </button>
        <ul>
          {filteredDocs.map((e) => (
            <li key={e.id}>
              {e.name_si} / {e.name_en}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3>{t("backup")}</h3>
        <div className="shortcut-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              void api(window.electronAPI.createBackup()).then((path) => {
                setMsg(path);
                loadLists();
              });
            }}
          >
            {t("createBackup")}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              void api(window.electronAPI.exportBackup()).then((path) => setMsg(String(path)));
            }}
          >
            {t("exportBackup")}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (confirm("Restore from file?")) {
                void api(window.electronAPI.restoreBackup()).then(() => {
                  setMsg("Restored — restart recommended");
                  loadLists();
                });
              }
            }}
          >
            {t("restore")}
          </button>
        </div>
        <FilterBar clearLabel={t("clearFilters")} onClear={() => setBackupQ("")}>
          <div className="field search">
            <label className="label">{t("search")}</label>
            <input className="input" value={backupQ} onChange={(e) => setBackupQ(e.target.value)} />
          </div>
        </FilterBar>
        <ResultMeta count={filteredBackups.length} label={t("results")} />
        <ul>
          {filteredBackups.map((b) => (
            <li key={b.path}>
              {b.name} — {b.mtime.slice(0, 19)}
            </li>
          ))}
        </ul>
      </div>

      {msg ? <p className="panel">{msg}</p> : null}
    </div>
  );
}
