import { useEffect, useState } from "react";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

/** Simple About content for title-bar dialog and Settings → About. */
export function AboutContent() {
  const { t } = useI18n();
  const [version, setVersion] = useState("");

  useEffect(() => {
    void api(window.electronAPI.getVersion()).then(setVersion).catch(() => setVersion(""));
  }, []);

  return (
    <div className="about-content">
      <p className="about-app-line">
        <strong>{t("appName")}</strong>
      </p>
      <p className="about-muted">
        {t("version")}: {version || "1.0.0"}
      </p>
      <p className="about-developer">
        {t("developedBy")}: <strong>Banula Lakwindu</strong>
      </p>
    </div>
  );
}

export function AboutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

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
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 id="about-title">{t("aboutApp")}</h3>
        <AboutContent />
        <div className="form-actions">
          <IconButton icon={Icons.check()} onClick={onClose}>
            {t("welcomeGotIt")}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
