import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";

type TempleInfoItem = {
  id: number;
  label_si: string;
  label_en: string;
  value_si: string;
  value_en: string;
};

export function TempleInfoView({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<TempleInfoItem[]>([]);

  useEffect(() => {
    if (!open) return;
    void api(window.electronAPI.listTempleInfo())
      .then((data) => setRows(data as TempleInfoItem[]))
      .catch(() => setRows([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="desk-cal-overlay temple-info-overlay" role="dialog" aria-modal="true">
      <div className="desk-cal-shell temple-info-shell">
        <header className="desk-cal-header">
          <div>
            <h2>{t("templeInfo")}</h2>
            <p className="muted">{t("templeInfoPublicHint")}</p>
          </div>
          <button type="button" className="btn secondary" onClick={onClose}>
            {t("close")}
          </button>
        </header>
        <div className="desk-cal-body temple-info-body">
          {!rows.length ? (
            <p className="muted">{t("emptyTempleInfoPublic")}</p>
          ) : (
            <dl className="temple-info-list">
              {rows.map((row) => (
                <div className="temple-info-item" key={row.id}>
                  <dt>{displayName(row.label_si, row.label_en, locale)}</dt>
                  <dd>
                    {displayName(row.value_si, row.value_en, locale) || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
