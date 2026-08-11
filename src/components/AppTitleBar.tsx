import { useState } from "react";
import { AboutModal } from "@/components/AboutModal";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";
import logoMark from "@/assets/logo-mark.png";

/** Native-feeling top chrome (matches Electron titleBarOverlay). */
export function AppTitleBar() {
  const { t } = useI18n();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header className="app-titlebar no-print">
        <div className="app-titlebar-inner">
          <div className="app-titlebar-drag">
            <img className="app-titlebar-logo" src={logoMark} alt="" draggable={false} />
            <span className="app-titlebar-title">{t("appName")}</span>
          </div>
          <button
            type="button"
            className="app-titlebar-btn"
            aria-label={t("aboutApp")}
            title={t("aboutApp")}
            onClick={() => setAboutOpen(true)}
          >
            {Icons.info({ size: 16 })}
          </button>
        </div>
      </header>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
