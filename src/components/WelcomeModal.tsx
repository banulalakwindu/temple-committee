import { useEffect, useState } from "react";
import { IconButton } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";

const STORAGE_KEY = "temple_welcome_seen";

export function WelcomeModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <div className="modal-backdrop welcome-backdrop" role="presentation">
      <div className="modal welcome-modal" role="dialog" aria-modal="true">
        <h3>{t("welcomeTitle")}</h3>
        <p>{t("welcomeBody")}</p>
        <ul className="welcome-list">
          <li>{t("welcomeTipSearch")}</li>
          <li>{t("welcomeTipPublic")}</li>
          <li>{t("welcomeTipAdmin")}</li>
        </ul>
        <div className="form-actions">
          <IconButton icon={Icons.check()} onClick={dismiss}>
            {t("welcomeGotIt")}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
