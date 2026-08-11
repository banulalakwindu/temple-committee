import { useEffect, useState, type DragEvent } from "react";
import { EmptyState, ListPageHeader } from "@/components/ListPage";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/i18n";
import { api, displayName, withMirroredSi } from "@/lib/api";

type TempleInfoItem = {
  id: number;
  label_si: string;
  label_en: string;
  value_si: string;
  value_en: string;
  sort_order: number;
};

type FormState = {
  label_si: string;
  label_en: string;
  value_si: string;
  value_en: string;
};

const emptyForm = (): FormState => ({
  label_si: "",
  label_en: "",
  value_si: "",
  value_en: "",
});

export function TempleInfoPage() {
  const { t, locale } = useI18n();
  const { notify } = useToast();
  const { confirm } = useConfirm();
  const [rows, setRows] = useState<TempleInfoItem[]>([]);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const load = () => {
    void api(window.electronAPI.listTempleInfo())
      .then((data) => setRows(data as TempleInfoItem[]))
      .catch(() => setRows([]));
  };

  useEffect(() => {
    load();
  }, []);

  const closeForm = () => {
    setMode("list");
    setEditId(null);
    setForm(emptyForm());
  };

  const startCreate = () => {
    setMode("create");
    setEditId(null);
    setForm(emptyForm());
  };

  const startEdit = (row: TempleInfoItem) => {
    setMode("edit");
    setEditId(row.id);
    setForm({
      label_si: row.label_si,
      label_en: row.label_en,
      value_si: row.value_si,
      value_en: row.value_en,
    });
  };

  const save = () => {
    if (!form.label_en.trim() && !form.label_si.trim()) {
      notify(t("templeInfoLabelRequired"), { tone: "error", scrollTop: true });
      return;
    }
    setSaving(true);
    void api(
      window.electronAPI.upsertTempleInfo({
        id: editId ?? undefined,
        ...form,
      }),
    )
      .then(() => {
        notify(editId ? t("saved") : t("created"));
        closeForm();
        load();
      })
      .catch((e: Error) =>
        notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
      )
      .finally(() => setSaving(false));
  };

  const remove = (row: TempleInfoItem) => {
    void confirm({
      message: t("confirmDeleteTempleInfo"),
      confirmLabel: t("delete"),
      tone: "danger",
    }).then((ok) => {
      if (!ok) return;
      void api(window.electronAPI.deleteTempleInfo(row.id))
        .then(() => {
          notify(t("deletedOk"));
          if (editId === row.id) closeForm();
          load();
        })
        .catch((e: Error) =>
          notify(e.message || t("saveFailed"), { tone: "error", scrollTop: true }),
        );
    });
  };

  const onDragStart = (id: number) => (e: DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };

  const onDragOver = (id: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  };

  const onDrop = (targetId: number) => (e: DragEvent) => {
    e.preventDefault();
    const sourceId = Number(e.dataTransfer.getData("text/plain") || dragId);
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;

    const next = [...rows];
    const from = next.findIndex((r) => r.id === sourceId);
    const to = next.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setRows(next);

    void api(window.electronAPI.reorderTempleInfo(next.map((r) => r.id)))
      .then((data) => setRows(data as TempleInfoItem[]))
      .catch((err: Error) => {
        notify(err.message || t("saveFailed"), { tone: "error", scrollTop: true });
        load();
      });
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverId(null);
  };

  return (
    <div>
      <ListPageHeader
        title={t("templeInfo")}
        subtitle={t("templeInfoAdminHint")}
        actions={
          mode === "list" ? (
            <button type="button" className="btn btn-icon" onClick={startCreate}>
              <span className="btn-ico">+</span>
              <span>{t("create")}</span>
            </button>
          ) : null
        }
      />

      {mode !== "list" ? (
        <div className="panel">
          <h3>{mode === "edit" ? t("edit") : t("create")}</h3>
          <div className="grid-2">
            <div className="field">
              <label className="label">{t("templeInfoLabel")} (EN)</label>
              <input
                className="input"
                value={form.label_en}
                onChange={(e) =>
                  setForm((f) =>
                    withMirroredSi(f, "label_en", "label_si", e.target.value),
                  )
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("templeInfoLabel")} (SI)</label>
              <input
                className="input"
                value={form.label_si}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label_si: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("templeInfoValue")} (EN)</label>
              <textarea
                className="textarea"
                value={form.value_en}
                onChange={(e) =>
                  setForm((f) =>
                    withMirroredSi(f, "value_en", "value_si", e.target.value),
                  )
                }
              />
            </div>
            <div className="field">
              <label className="label">{t("templeInfoValue")} (SI)</label>
              <textarea
                className="textarea"
                value={form.value_si}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value_si: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={closeForm}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn"
              disabled={saving}
              onClick={save}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted temple-info-drag-hint">{t("templeInfoDragHint")}</p>
          {!rows.length ? (
            <EmptyState
              message={t("emptyTempleInfoHint")}
              actionLabel={t("create")}
              onAction={startCreate}
            />
          ) : (
            <ul className="temple-info-admin-list">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={`temple-info-admin-row${dragId === row.id ? " dragging" : ""}${overId === row.id ? " drag-over" : ""}`}
                  draggable
                  onDragStart={onDragStart(row.id)}
                  onDragOver={onDragOver(row.id)}
                  onDrop={onDrop(row.id)}
                  onDragEnd={onDragEnd}
                >
                  <span className="temple-info-drag-handle" title={t("templeInfoDragHint")} aria-hidden>
                    ⋮⋮
                  </span>
                  <div className="temple-info-admin-copy">
                    <strong>
                      {displayName(row.label_si, row.label_en, locale)}
                    </strong>
                    <span>
                      {displayName(row.value_si, row.value_en, locale) || "—"}
                    </span>
                  </div>
                  <div className="temple-info-admin-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => startEdit(row)}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => remove(row)}
                    >
                      {t("delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
