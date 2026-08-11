import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DeskCalendar } from "@/components/DeskCalendar";
import { TempleInfoView } from "@/components/TempleInfoView";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";
import { api, displayName } from "@/lib/api";
import logoMark from "@/assets/logo-mark.png";

type DanaOcc = {
  id: number;
  house_id: number;
  house_number?: string | null;
  house_name_si?: string;
  house_name_en?: string;
};

type DanaToday = {
  date: string;
  heel: DanaOcc[];
  dawal: DanaOcc[];
};

type TempleEvent = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_date: string;
  end_date: string;
  color_index: number;
};

type TempleTask = {
  id: number;
  name_si: string;
  name_en: string;
  description_si: string;
  description_en: string;
  start_at: string;
  end_at: string;
  location_type: "inside" | "outside";
  color_index: number;
};

function formatTaskRange(task: TempleTask): string {
  const start = task.start_at.replace("T", " ").slice(0, 16);
  const end = task.end_at.replace("T", " ").slice(0, 16);
  return `${start} → ${end}`;
}

function Rail({
  title,
  children,
  empty,
}: {
  title: string;
  children?: ReactNode;
  empty?: string;
}) {
  return (
    <div className="home-rail">
      <h3>{title}</h3>
      {children ?? (empty ? <p className="home-rail-empty">{empty}</p> : null)}
    </div>
  );
}

export function PublicHome() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [todayDana, setTodayDana] = useState<DanaToday | null>(null);
  const [currentEvents, setCurrentEvents] = useState<TempleEvent[]>([]);
  const [todayTasks, setTodayTasks] = useState<TempleTask[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [templeInfoOpen, setTempleInfoOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("calendar") === "1") {
      setCalendarOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("calendar");
      setSearchParams(next, { replace: true });
    }
    if (searchParams.get("templeInfo") === "1") {
      setTempleInfoOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("templeInfo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    void api(window.electronAPI.listDanaToday())
      .then((d) => setTodayDana(d as DanaToday))
      .catch(() => setTodayDana({ date: "", heel: [], dawal: [] }));
    void api(window.electronAPI.listCurrentEvents())
      .then((rows) => setCurrentEvents(rows as TempleEvent[]))
      .catch(() => setCurrentEvents([]));
    void api(window.electronAPI.listTodayTasks())
      .then((rows) => setTodayTasks(rows as TempleTask[]))
      .catch(() => setTodayTasks([]));
  }, []);

  const houseLabel = (o: DanaOcc) => {
    const name = displayName(o.house_name_si, o.house_name_en, locale);
    return o.house_number ? `${name} (#${o.house_number})` : name;
  };

  const insideTasks = todayTasks.filter((x) => x.location_type === "inside");
  const outsideTasks = todayTasks.filter((x) => x.location_type === "outside");

  return (
    <div className="public-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <img className="home-hero-mark" src={logoMark} alt="" aria-hidden />
          <div>
            <p className="home-kicker">{t("appName")}</p>
            <h1>{t("publicTagline")}</h1>
            <p className="home-lede">{t("publicHint")}</p>
          </div>
        </div>

        <div className="home-actions">
          <Link className="home-action home-action-find" to="/public/search">
            <span className="home-action-ico">{Icons.search({ size: 20 })}</span>
            <span className="home-action-text">
              <strong>{t("findMe")}</strong>
              <span>{t("findMeHint")}</span>
            </span>
          </Link>
          <Link className="home-action" to="/public/new-person">
            <span className="home-action-ico">{Icons.userPlus({ size: 20 })}</span>
            <span className="home-action-text">
              <strong>{t("newPerson")}</strong>
              <span>{t("newPersonHint")}</span>
            </span>
          </Link>
          <Link className="home-action" to="/public/new-household">
            <span className="home-action-ico">{Icons.homePlus({ size: 20 })}</span>
            <span className="home-action-text">
              <strong>{t("newHousehold")}</strong>
              <span>{t("newHouseholdHint")}</span>
            </span>
          </Link>
          <button
            type="button"
            className="home-tool"
            onClick={() => setCalendarOpen(true)}
          >
            <span className="home-tool-ico">{Icons.calendar({ size: 22 })}</span>
            <span>{t("deskCalendarShort")}</span>
          </button>
          <button
            type="button"
            className="home-tool"
            onClick={() => setTempleInfoOpen(true)}
          >
            <span className="home-tool-ico">{Icons.info({ size: 22 })}</span>
            <span>{t("templeInfoShort")}</span>
          </button>
        </div>
      </section>

      <section className="home-today">
        <div className="home-section-head">
          <div>
            <p className="home-kicker">{t("dashToday")}</p>
            <h2>{t("homeTodayTitle")}</h2>
          </div>
          <button
            type="button"
            className="home-section-link"
            onClick={() => setCalendarOpen(true)}
          >
            {Icons.calendar({ size: 16 })}
            <span>{t("deskCalendar")}</span>
          </button>
        </div>

        <div className="home-today-board">
          <Rail title={t("currentEvents")} empty={t("noCurrentEvents")}>
            {currentEvents.length ? (
              <ul className="home-feed">
                {currentEvents.map((ev) => (
                  <li key={ev.id}>
                    <strong>
                      {displayName(ev.name_si, ev.name_en, locale)}
                    </strong>
                    <span className="home-feed-meta">
                      {ev.start_date}
                      {ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ""}
                    </span>
                    {(ev.description_si || ev.description_en) && (
                      <p>
                        {displayName(
                          ev.description_si,
                          ev.description_en,
                          locale,
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </Rail>

          <Rail title={t("todaysTasks")} empty={t("noTodaysTasks")}>
            {todayTasks.length ? (
              <div className="home-task-cols">
                <div>
                  <h4>{t("taskInside")}</h4>
                  {!insideTasks.length ? (
                    <p className="home-rail-empty">{t("noInsideTasksToday")}</p>
                  ) : (
                    <ul className="home-feed">
                      {insideTasks.map((task) => (
                        <li key={task.id}>
                          <span className="home-feed-meta">
                            {formatTaskRange(task)}
                          </span>
                          <strong>
                            {displayName(task.name_si, task.name_en, locale)}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>{t("taskOutside")}</h4>
                  {!outsideTasks.length ? (
                    <p className="home-rail-empty">{t("noOutsideTasksToday")}</p>
                  ) : (
                    <ul className="home-feed">
                      {outsideTasks.map((task) => (
                        <li key={task.id}>
                          <span className="home-feed-meta">
                            {formatTaskRange(task)}
                          </span>
                          <strong>
                            {displayName(task.name_si, task.name_en, locale)}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </Rail>

          <Rail title={t("todaysDana")}>
            <div className="home-dana-cols">
              <div>
                <h4>{t("heelDana")}</h4>
                {!todayDana?.heel.length ? (
                  <p className="home-rail-empty">{t("noHeelDanaToday")}</p>
                ) : (
                  <ul className="home-feed home-feed-links">
                    {todayDana.heel.map((o) => (
                      <li key={o.id}>
                        <Link to={`/public/house/${o.house_id}`}>
                          {houseLabel(o)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4>{t("dawalDana")}</h4>
                {!todayDana?.dawal.length ? (
                  <p className="home-rail-empty">{t("noDawalDanaToday")}</p>
                ) : (
                  <ul className="home-feed home-feed-links">
                    {todayDana.dawal.map((o) => (
                      <li key={o.id}>
                        <Link to={`/public/house/${o.house_id}`}>
                          {houseLabel(o)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Rail>
        </div>
      </section>

      <DeskCalendar open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <TempleInfoView
        open={templeInfoOpen}
        onClose={() => setTempleInfoOpen(false)}
      />
    </div>
  );
}
