import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icons } from "@/components/Icons";
import { ListPageHeader } from "@/components/ListPage";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

type DashboardStats = {
  date: string;
  houses: number;
  people: number;
  pending: number;
  todayAttendance: number;
  dahamSchoolChildren: number;
  villages: number;
  templeInfo: number;
  todayDanaHeel: number;
  todayDanaDawal: number;
  currentEvents: number;
  todayTasks: number;
  todayTasksInside: number;
  todayTasksOutside: number;
  paymentsThisMonth: number;
  paymentAmountThisMonth: number;
  documentsThisMonth: number;
  recentPending: Array<{
    id: number;
    request_type: string;
    submitted_at: string;
  }>;
};

const emptyStats = (): DashboardStats => ({
  date: "",
  houses: 0,
  people: 0,
  pending: 0,
  todayAttendance: 0,
  dahamSchoolChildren: 0,
  villages: 0,
  templeInfo: 0,
  todayDanaHeel: 0,
  todayDanaDawal: 0,
  currentEvents: 0,
  todayTasks: 0,
  todayTasksInside: 0,
  todayTasksOutside: 0,
  paymentsThisMonth: 0,
  paymentAmountThisMonth: 0,
  documentsThisMonth: 0,
  recentPending: [],
});

function StatCard({
  to,
  value,
  label,
  tone = "default",
}: {
  to: string;
  value: string | number;
  label: string;
  tone?: "default" | "accent" | "warn" | "soft";
}) {
  return (
    <Link to={to} className={`dash-stat dash-stat-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="dash-mini">
      <span className="dash-mini-label">{label}</span>
      <strong>{value}</strong>
      {hint ? <span className="dash-mini-hint">{hint}</span> : null}
    </div>
  );
}

export function Dashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<DashboardStats>(emptyStats());

  useEffect(() => {
    void api(window.electronAPI.dashboardStats())
      .then((data) => setStats({ ...emptyStats(), ...(data as DashboardStats) }))
      .catch(() => setStats(emptyStats()));
  }, []);

  const requestLabel = (type: string) => {
    if (type === "create_person") return t("newPerson");
    if (type === "update_person") return t("updatePerson");
    if (type === "create_house") return t("newHousehold");
    if (type === "update_house") return t("updateHouse");
    if (type === "create_household") return t("newHousehold");
    return type;
  };

  const formatAmount = (n: number) => {
    try {
      return n.toLocaleString(locale === "si" ? "si-LK" : "en-LK", {
        maximumFractionDigits: 0,
      });
    } catch {
      return String(n);
    }
  };

  const dateLabel = (() => {
    if (!stats.date) return "";
    try {
      return new Date(`${stats.date}T12:00:00`).toLocaleDateString(
        locale === "si" ? "si-LK" : "en-GB",
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      );
    } catch {
      return stats.date;
    }
  })();

  const shortcuts = [
    { to: "/admin/houses", label: t("houses"), icon: Icons.home({ size: 20 }), desc: t("dashLinkHouses") },
    { to: "/admin/people", label: t("people"), icon: Icons.users({ size: 20 }), desc: t("dashLinkPeople") },
    { to: "/admin/attendance", label: t("attendance"), icon: Icons.calendar({ size: 20 }), desc: t("dashLinkAttendance") },
    { to: "/admin/dana", label: t("dana"), icon: Icons.dana({ size: 20 }), desc: t("dashLinkDana") },
    { to: "/admin/events", label: t("events"), icon: Icons.flag({ size: 20 }), desc: t("dashLinkEvents") },
    { to: "/admin/tasks", label: t("tasks"), icon: Icons.checkSquare({ size: 20 }), desc: t("dashLinkTasks") },
    { to: "/admin/documents", label: t("documents"), icon: Icons.file({ size: 20 }), desc: t("dashLinkDocuments") },
    { to: "/admin/payments", label: t("payments"), icon: Icons.coin({ size: 20 }), desc: t("dashLinkPayments") },
    { to: "/admin/temple-info", label: t("templeInfo"), icon: Icons.info({ size: 20 }), desc: t("dashLinkTempleInfo") },
    { to: "/admin/pending", label: t("pending"), icon: Icons.inbox({ size: 20 }), desc: t("dashLinkPending") },
    { to: "/admin/settings", label: t("settings"), icon: Icons.settings({ size: 20 }), desc: t("dashLinkSettings") },
  ];

  return (
    <div className="dashboard">
      <ListPageHeader title={t("dashboard")} subtitle={dateLabel || undefined} />

      <div className="dash-stats-grid">
        <StatCard to="/admin/houses" value={stats.houses} label={t("totalHouses")} />
        <StatCard to="/admin/people" value={stats.people} label={t("totalPeople")} />
        <StatCard
          to="/admin/people"
          value={stats.dahamSchoolChildren}
          label={t("dashDahamChildren")}
          tone="soft"
        />
        <StatCard
          to="/admin/pending"
          value={stats.pending}
          label={t("pendingRequests")}
          tone={stats.pending > 0 ? "warn" : "default"}
        />
        <StatCard
          to="/admin/attendance"
          value={stats.todayAttendance}
          label={t("todayAttendance")}
          tone="accent"
        />
        <StatCard
          to="/admin/temple-info"
          value={stats.templeInfo}
          label={t("dashTempleInfoItems")}
        />
      </div>

      <div className="dash-columns">
        <section className="panel dash-panel">
          <div className="dash-panel-head">
            <h3>{t("dashToday")}</h3>
            <Link className="dash-panel-link" to="/admin/dana">
              {t("view")}
            </Link>
          </div>
          <div className="dash-mini-grid">
            <MiniMetric
              label={t("heelDana")}
              value={stats.todayDanaHeel}
              hint={t("dashTodayDanaHint")}
            />
            <MiniMetric label={t("dawalDana")} value={stats.todayDanaDawal} />
            <MiniMetric
              label={t("todaysTasks")}
              value={stats.todayTasks}
              hint={`${t("taskInside")}: ${stats.todayTasksInside} · ${t("taskOutside")}: ${stats.todayTasksOutside}`}
            />
            <MiniMetric label={t("currentEvents")} value={stats.currentEvents} />
          </div>
        </section>

        <section className="panel dash-panel">
          <div className="dash-panel-head">
            <h3>{t("dashRecords")}</h3>
            <Link className="dash-panel-link" to="/admin/payments">
              {t("view")}
            </Link>
          </div>
          <div className="dash-mini-grid">
            <MiniMetric label={t("settingsVillages")} value={stats.villages} />
            <MiniMetric
              label={t("dashPaymentsMonth")}
              value={stats.paymentsThisMonth}
              hint={
                stats.paymentAmountThisMonth
                  ? `${t("paymentAmount")}: ${formatAmount(stats.paymentAmountThisMonth)}`
                  : undefined
              }
            />
            <MiniMetric
              label={t("dashDocumentsMonth")}
              value={stats.documentsThisMonth}
            />
            <MiniMetric label={t("templeInfo")} value={stats.templeInfo} />
          </div>
        </section>
      </div>

      {stats.pending > 0 ? (
        <section className="panel dash-panel dash-pending-panel">
          <div className="dash-panel-head">
            <h3>
              {t("pendingRequests")}
              <span className="dash-count-pill">{stats.pending}</span>
            </h3>
            <Link className="dash-panel-link" to="/admin/pending">
              {t("view")}
            </Link>
          </div>
          {!stats.recentPending.length ? (
            <p className="muted">{t("empty")}</p>
          ) : (
            <ul className="dash-pending-list">
              {stats.recentPending.map((row) => (
                <li key={row.id}>
                  <Link to={`/admin/pending/${row.id}`}>
                    <strong>{requestLabel(row.request_type)}</strong>
                    <span>{row.submitted_at.slice(0, 16).replace("T", " ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="panel dash-panel">
        <div className="dash-panel-head">
          <h3>{t("dashQuickLinks")}</h3>
        </div>
        <div className="dash-link-grid">
          {shortcuts.map((item) => (
            <Link key={item.to} to={item.to} className="dash-link-card">
              <span className="dash-link-ico">{item.icon}</span>
              <strong>{item.label}</strong>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
