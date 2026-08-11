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
  const { adminUnlocked, pendingCount, lock, refreshPendingCount } = useApp();
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
            <strong>{t("appName")}</strong>
            <span>{t("admin")}</span>
          </div>
        </div>
        <nav className="admin-nav">
          {link("/admin", t("dashboard"), Icons.layout())}
          {link("/admin/houses", t("houses"), Icons.home())}
          {link("/admin/people", t("people"), Icons.users())}
          {link("/admin/attendance", t("attendance"), Icons.calendar())}
          {link("/admin/dana", t("dana"), Icons.dana())}
          {link("/admin/events", t("events"), Icons.flag())}
          {link("/admin/tasks", t("tasks"), Icons.checkSquare())}
          {link("/admin/documents", t("documents"), Icons.file())}
          {link("/admin/payments", t("payments"), Icons.coin())}
          {link("/admin/temple-info", t("templeInfo"), Icons.info())}
          {link("/admin/pending", t("pending"), Icons.inbox(), pendingCount)}
          {link("/admin/settings", t("settings"), Icons.settings())}
        </nav>
        <NavLink to="/public" className="nav-link admin-nav-footer">
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
