import { useEffect, type ReactNode } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Icons } from "@/components/Icons";
import { IconButton } from "@/components/ActionLink";
import { LangToggle } from "@/components/LangToggle";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n";
import logoMark from "@/assets/logo-mark.png";

export function AdminShell() {
  const { t } = useI18n();
  const { adminUnlocked, pendingCount, lock, settings, refreshPendingCount } =
    useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (adminUnlocked) {
      void refreshPendingCount();
    }
  }, [adminUnlocked, location.pathname, refreshPendingCount]);

  if (!adminUnlocked) {
    return <Navigate to="/public" replace />;
  }

  const link = (to: string, label: string, icon: ReactNode, badge?: number) => (
    <NavLink
      to={to}
      end={to === "/admin"}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
    >
      <span className="nav-link-left">
        {icon}
        <span>{label}</span>
      </span>
      {typeof badge === "number" && badge > 0 ? (
        <span className="badge pulse">{badge}</span>
      ) : null}
    </NavLink>
  );

  return (
    <div className="admin-shell app-root">
      <aside className="admin-sidebar no-print">
        <div className="side-brand">
          <img className="side-brand-logo" src={logoMark} alt="" />
          <div>
            <strong>{settings.temple_name_si || t("appName")}</strong>
            <span>{t("admin")}</span>
          </div>
        </div>
        {link("/admin", t("dashboard"), Icons.layout())}
        {link("/admin/houses", t("houses"), Icons.home())}
        {link("/admin/people", t("people"), Icons.users())}
        {link("/admin/attendance", t("attendance"), Icons.calendar())}
        {link("/admin/documents", t("documents"), Icons.file())}
        {link("/admin/pending", t("pending"), Icons.inbox(), pendingCount)}
        {link("/admin/reports", t("reports"), Icons.chart())}
        {link("/admin/settings", t("settings"), Icons.settings())}
        <NavLink to="/public" className="nav-link" style={{ marginTop: "auto" }}>
          <span className="nav-link-left">
            {Icons.arrowLeft()}
            <span>{t("publicHome")}</span>
          </span>
        </NavLink>
      </aside>
      <div className="admin-main">
        <header className="admin-top no-print">
          <GlobalSearch />
          <div className="header-actions">
            <LangToggle />
            <IconButton
              icon={Icons.lock()}
              variant="secondary"
              onClick={() => {
                void lock().then(() => navigate("/public"));
              }}
            >
              {t("lockAdmin")}
            </IconButton>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
