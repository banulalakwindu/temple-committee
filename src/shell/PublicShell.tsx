import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ActionLink, IconButton } from "@/components/ActionLink";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Icons } from "@/components/Icons";
import { LangToggle } from "@/components/LangToggle";
import { UnlockModal } from "@/components/UnlockModal";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import logoWide from "@/assets/logo-wide.png";

export function PublicShell() {
  const { t } = useI18n();
  const { adminUnlocked } = useApp();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome =
    location.pathname === "/public" || location.pathname === "/public/";

  return (
    <div className="public-shell app-root">
      <header className="public-header">
        <div className="brand-block">
          <img
            className="brand-logo-wide"
            src={logoWide}
            alt={t("appName")}
          />
        </div>
        <div className="header-actions">
          <GlobalSearch autoFocus={isHome} />
          <LangToggle />
          {adminUnlocked ? (
            <ActionLink to="/admin" icon={Icons.lock()} variant="primary">
              {t("admin")}
            </ActionLink>
          ) : (
            <IconButton
              icon={Icons.lock()}
              variant="secondary"
              onClick={() => setUnlockOpen(true)}
            >
              {t("admin")}
            </IconButton>
          )}
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
      <UnlockModal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onSuccess={() => {
          setUnlockOpen(false);
          navigate("/admin");
        }}
      />
    </div>
  );
}
