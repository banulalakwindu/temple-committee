import { useEffect, useState } from "react";
import { ActionLink } from "@/components/ActionLink";
import { Icons } from "@/components/Icons";
import { ListPageHeader } from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

export function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    houses: 0,
    people: 0,
    pending: 0,
    todayAttendance: 0,
  });

  useEffect(() => {
    void api(window.electronAPI.dashboardStats()).then(setStats);
  }, []);

  return (
    <div>
      <ListPageHeader title={t("dashboard")} />
      <div className="stats-row">
        <div className="panel stat">
          <strong>{stats.houses}</strong>
          <span>{t("totalHouses")}</span>
        </div>
        <div className="panel stat">
          <strong>{stats.people}</strong>
          <span>{t("totalPeople")}</span>
        </div>
        <div className="panel stat">
          <strong>{stats.pending}</strong>
          <span>{t("pendingRequests")}</span>
        </div>
        <div className="panel stat">
          <strong>{stats.todayAttendance}</strong>
          <span>{t("todayAttendance")}</span>
        </div>
      </div>
      <div className="action-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <ActionLink to="/admin/houses" icon={Icons.home()}>
          {t("houses")}
        </ActionLink>
        <ActionLink to="/admin/people" icon={Icons.users()}>
          {t("people")}
        </ActionLink>
        <ActionLink to="/admin/attendance" icon={Icons.calendar()} variant="accent">
          {t("attendance")}
        </ActionLink>
        <ActionLink to="/admin/pending" icon={Icons.inbox()} variant="secondary">
          {t("pending")}
        </ActionLink>
      </div>
    </div>
  );
}
