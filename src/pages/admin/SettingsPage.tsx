import { useEffect, useState } from "react";
import { AboutContent } from "@/components/AboutModal";
import { SearchInput } from "@/components/SearchInput";
import {
  FilterBar,
  ListPageHeader,
  ResultMeta,
} from "@/components/ListPage";
import { useApp } from "@/context/AppContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useTableDensity } from "@/hooks/useTableDensity";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type Named = {
  id: number;
  name_si: string;
  name_en: string;
  sort_order: number;
};

type PayType = Named & { amount: number };

type Backup = { name: string; path: string; mtime: string };
type SettingsTab =
  | "general"
  | "password"
  | "events"
  | "docTypes"
  | "paymentTypes"
  | "villages"
  | "backup"
  | "about";

export function SettingsPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const { density, setDensity } = useTableDensity();
  const { settings, refreshSettings } = useApp();
  const [tab, setTab] = useState<SettingsTab>("general");
  const [autoBackup, setAutoBackup] = useState("1");
  const [intervalDays, setIntervalDays] = useState("1");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [events, setEvents] = useState<Named[]>([]);
  const [docTypes, setDocTypes] = useState<Named[]>([]);
  const [payTypes, setPayTypes] = useState<PayType[]>([]);
  const [villages, setVillages] = useState<Named[]>([]);
  const [eventQ, setEventQ] = useState("");
  const [docQ, setDocQ] = useState("");
  const [payQ, setPayQ] = useState("");
  const [villageQ, setVillageQ] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupQ, setBackupQ] = useState("");
  const [version, setVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [newEventSi, setNewEventSi] = useState("");
  const [newEventEn, setNewEventEn] = useState("");
  const [newDocSi, setNewDocSi] = useState("");
  const [newDocEn, setNewDocEn] = useState("");
  const [newPaySi, setNewPaySi] = useState("");
  const [newPayEn, setNewPayEn] = useState("");
  const [newPayAmount, setNewPayAmount] = useState("500");
  const [newVillageSi, setNewVillageSi] = useState("");
  const [newVillageEn, setNewVillageEn] = useState("");

  const loadLists = () => {
    void api(window.electronAPI.listAttendanceEvents()).then((e) =>
      setEvents(e as Named[]),
    );
    void api(window.electronAPI.listDocumentTypes()).then((d) =>
      setDocTypes(d as Named[]),
    );
    void api(window.electronAPI.listPaymentTypes()).then((d) =>
      setPayTypes(d as PayType[]),
    );
    void api(window.electronAPI.listVillages()).then((d) =>
      setVillages(d as Named[]),
    );
    void api(window.electronAPI.listBackups()).then((b) =>
      setBackups(b as Backup[]),
    );
  };

  useEffect(() => {
    setAutoBackup(settings.auto_backup_enabled || "1");
    setIntervalDays(settings.auto_backup_interval_days || "1");
  }, [settings]);

  useEffect(() => {
    loadLists();
    void api(window.electronAPI.getVersion()).then(setVersion);
  }, []);

  const filteredEvents = events.filter((e) => {
    if (!eventQ.trim()) return true;
    const q = eventQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredDocs = docTypes.filter((e) => {
    if (!docQ.trim()) return true;
    const q = docQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredPayTypes = payTypes.filter((e) => {
    if (!payQ.trim()) return true;
    const q = payQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredVillages = villages.filter((e) => {
    if (!villageQ.trim()) return true;
    const q = villageQ.toLowerCase();
    return e.name_si.toLowerCase().includes(q) || e.name_en.toLowerCase().includes(q);
  });

  const filteredBackups = backups.filter((b) =>
    !backupQ.trim()
      ? true
      : b.name.toLowerCase().includes(backupQ.toLowerCase()) ||
        b.mtime.includes(backupQ),
  );

  const tabBtn = (key: SettingsTab, label: string) => (
    <button
      key={key}
      type="button"
      className={`detail-tab ${tab === key ? "active" : ""}`}
      onClick={() => setTab(key)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <ListPageHeader title={t("settings")} subtitle={`${t("version")}: ${version || "1.0.0"}`} />
      <div className="detail-tabs no-print">
        {tabBtn("general", t("settingsGeneral"))}
        {tabBtn("password", t("settingsPassword"))}
        {tabBtn("events", t("settingsPrograms"))}
        {tabBtn("docTypes", t("settingsDocTypes"))}
        {tabBtn("paymentTypes", t("settingsPaymentTypes"))}
        {tabBtn("villages", t("settingsVillages"))}
        {tabBtn("backup", t("settingsBackup"))}
        {tabBtn("about", t("settingsAbout"))}
      </div>

      {tab === "general" && (
        <div className="panel">
          <h3>{t("autoBackup")}</h3>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("autoBackup")}</label>
              <select className="select" value={autoBackup} onChange={(e) => setAutoBackup(e.target.value)}>
                <option value="1">{t("yes")}</option>
                <option value="0">{t("no")}</option>
              </select>
            </div>
            <div className="field">
              <label className="label">{t("intervalDays")}</label>
              <input className="input" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
            </div>
            <div className="field field-full">
              <label className="label">{t("tableDensity")}</label>
              <select
                className="select"
                value={density}
                onChange={(e) => setDensity(e.target.value as "comfortable" | "compact")}
              >
                <option value="comfortable">{t("densityComfortable")}</option>
                <option value="compact">{t("densityCompact")}</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void api(
                  window.electronAPI.setSettings({
                    auto_backup_enabled: autoBackup,
                    auto_backup_interval_days: intervalDays,
                  }),
                )
                  .then(() => {
                    void refreshSettings();
                    notify(t("saved"));
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? t("saving") : t("saveSettings")}
            </button>
          </div>
        </div>
      )}

      {tab === "password" && (
        <div className="panel">
          <h3>{t("changePassword")}</h3>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("currentPassword")}</label>
              <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t("newPassword")}</label>
              <input className="input" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void window.electronAPI.changePassword(currentPw, newPw).then((res) => {
                  if (res.ok) notify(t("passwordUpdated"));
                  else notify(res.error || t("saveFailed"), { tone: "error", scrollTop: true });
                  setCurrentPw("");
                  setNewPw("");
                });
              }}
            >
              {t("changePassword")}
            </button>
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className="panel">
          <h3>{t("settingsPrograms")}</h3>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setEventQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={eventQ} onChange={(e) => setEventQ(e.target.value)} placeholder={t("search")} />
            </div>
          </FilterBar>
          <div className="grid-2">
            <input
              className="input"
              placeholder="EN"
              value={newEventEn}
              onChange={(e) => {
                const next = e.target.value;
                setNewEventEn(next);
                if (!newEventSi.trim() || newEventSi === newEventEn) {
                  setNewEventSi(next);
                }
              }}
            />
            <input
              className="input"
              placeholder="SI"
              value={newEventSi}
              onChange={(e) => setNewEventSi(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(
                  window.electronAPI.upsertAttendanceEvent({
                    name_si: newEventSi,
                    name_en: newEventEn,
                    sort_order: events.length + 1,
                  }),
                ).then(() => {
                  setNewEventSi("");
                  setNewEventEn("");
                  loadLists();
                  notify(t("created"));
                });
              }}
            >
              {t("create")}
            </button>
          </div>
          <ResultMeta count={filteredEvents.length} label={t("results")} />
          <ul>
            {filteredEvents.map((e) => (
              <li key={e.id}>
                {displayName(e.name_si, e.name_en, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "docTypes" && (
        <div className="panel">
          <h3>{t("settingsDocTypes")}</h3>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setDocQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={docQ} onChange={(e) => setDocQ(e.target.value)} placeholder={t("search")} />
            </div>
          </FilterBar>
          <div className="grid-2">
            <input
              className="input"
              placeholder="EN"
              value={newDocEn}
              onChange={(e) => {
                const next = e.target.value;
                setNewDocEn(next);
                if (!newDocSi.trim() || newDocSi === newDocEn) {
                  setNewDocSi(next);
                }
              }}
            />
            <input
              className="input"
              placeholder="SI"
              value={newDocSi}
              onChange={(e) => setNewDocSi(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(
                  window.electronAPI.upsertDocumentType({
                    name_si: newDocSi,
                    name_en: newDocEn,
                    sort_order: docTypes.length + 1,
                  }),
                ).then(() => {
                  setNewDocSi("");
                  setNewDocEn("");
                  loadLists();
                  notify(t("created"));
                });
              }}
            >
              {t("create")}
            </button>
          </div>
          <ResultMeta count={filteredDocs.length} label={t("results")} />
          <ul>
            {filteredDocs.map((e) => (
              <li key={e.id}>
                {displayName(e.name_si, e.name_en, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "villages" && (
        <div className="panel">
          <h3>{t("settingsVillages")}</h3>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setVillageQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput
                value={villageQ}
                onChange={(e) => setVillageQ(e.target.value)}
                placeholder={t("search")}
              />
            </div>
          </FilterBar>
          <div className="grid-2">
            <input
              className="input"
              placeholder="EN"
              value={newVillageEn}
              onChange={(e) => {
                const next = e.target.value;
                setNewVillageEn(next);
                if (!newVillageSi.trim() || newVillageSi === newVillageEn) {
                  setNewVillageSi(next);
                }
              }}
            />
            <input
              className="input"
              placeholder="SI"
              value={newVillageSi}
              onChange={(e) => setNewVillageSi(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              disabled={!newVillageEn.trim() && !newVillageSi.trim()}
              onClick={() => {
                void api(
                  window.electronAPI.upsertVillage({
                    name_si: newVillageSi,
                    name_en: newVillageEn,
                    sort_order: villages.length + 1,
                  }),
                ).then(() => {
                  setNewVillageSi("");
                  setNewVillageEn("");
                  loadLists();
                  notify(t("created"));
                });
              }}
            >
              {t("create")}
            </button>
          </div>
          <ResultMeta count={filteredVillages.length} label={t("results")} />
          <ul>
            {filteredVillages.map((e) => (
              <li key={e.id}>
                {displayName(e.name_si, e.name_en, locale)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "paymentTypes" && (
        <div className="panel">
          <h3>{t("settingsPaymentTypes")}</h3>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setPayQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput
                value={payQ}
                onChange={(e) => setPayQ(e.target.value)}
                placeholder={t("search")}
              />
            </div>
          </FilterBar>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("nameEn")}</label>
              <input
                className="input"
                value={newPayEn}
                onChange={(e) => {
                  const next = e.target.value;
                  setNewPayEn(next);
                  if (!newPaySi.trim() || newPaySi === newPayEn) {
                    setNewPaySi(next);
                  }
                }}
              />
            </div>
            <div className="field">
              <label className="label">{t("nameSi")}</label>
              <input
                className="input"
                value={newPaySi}
                onChange={(e) => setNewPaySi(e.target.value)}
              />
            </div>
            <div className="field field-full">
              <label className="label">{t("paymentAmount")}</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={newPayAmount}
                onChange={(e) => setNewPayAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              disabled={!newPayEn.trim() && !newPaySi.trim()}
              onClick={() => {
                void api(
                  window.electronAPI.upsertPaymentType({
                    name_si: newPaySi,
                    name_en: newPayEn,
                    amount: Number(newPayAmount) || 0,
                    sort_order: payTypes.length + 1,
                  }),
                ).then(() => {
                  setNewPaySi("");
                  setNewPayEn("");
                  setNewPayAmount("500");
                  loadLists();
                  notify(t("created"));
                });
              }}
            >
              {t("create")}
            </button>
          </div>
          <ResultMeta count={filteredPayTypes.length} label={t("results")} />
          <ul>
            {filteredPayTypes.map((e) => (
              <li key={e.id}>
                {displayName(e.name_si, e.name_en, locale)} — {e.amount}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "backup" && (
        <div className="panel">
          <h3>{t("backup")}</h3>
          <div className="shortcut-row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                void api(window.electronAPI.createBackup()).then((path) => {
                  notify(String(path), { tone: "info" });
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
                void api(window.electronAPI.exportBackup()).then((path) =>
                  notify(String(path), { tone: "info" }),
                );
              }}
            >
              {t("exportBackup")}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busy}
              onClick={() => {
                void confirm({
                  message: t("confirmRestoreBackup"),
                  confirmLabel: t("restore"),
                  tone: "danger",
                }).then((ok) => {
                  if (!ok) return;
                  setBusy(true);
                  void api(window.electronAPI.restoreBackup())
                    .then(() => {
                      notify(t("restoredRestart"), { tone: "info" });
                      loadLists();
                    })
                    .catch((e: Error) =>
                      notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
                    )
                    .finally(() => setBusy(false));
                });
              }}
            >
              {busy ? t("saving") : t("restore")}
            </button>
          </div>
          <FilterBar clearLabel={t("clearFilters")} onClear={() => setBackupQ("")}>
            <div className="field search">
              <label className="label">{t("search")}</label>
              <SearchInput value={backupQ} onChange={(e) => setBackupQ(e.target.value)} placeholder={t("search")} />
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
      )}

      {tab === "about" && (
        <div className="panel">
          <h3>{t("aboutApp")}</h3>
          <AboutContent />
        </div>
      )}
    </div>
  );
}
