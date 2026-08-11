import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchInput } from "@/components/SearchInput";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

type HitKind =
  | "person"
  | "house"
  | "pending"
  | "event"
  | "task"
  | "document"
  | "payment"
  | "temple_info"
  | "village"
  | "dana";

type Hit = {
  kind: HitKind;
  id: number;
  title: string;
  subtitle: string;
  person_id?: number | null;
  house_id?: number | null;
};

const GROUP_ORDER: HitKind[] = [
  "person",
  "house",
  "dana",
  "event",
  "task",
  "temple_info",
  "document",
  "payment",
  "pending",
  "village",
];

export function GlobalSearch({
  autoFocus = false,
  large = false,
}: {
  autoFocus?: boolean;
  large?: boolean;
}) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic =
    location.pathname.startsWith("/public") || location.pathname === "/";
  const scope = isPublic ? "public" : "admin";
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void api(window.electronAPI.globalSearch(q, locale, scope))
        .then((data) => {
          setHits(data as Hit[]);
          setOpen(true);
          setActive(0);
        })
        .catch(() => setHits([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q, locale, scope]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        const input = wrapRef.current?.querySelector("input");
        input?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groupLabel = (kind: HitKind) => {
    switch (kind) {
      case "person":
        return t("people");
      case "house":
        return t("houses");
      case "pending":
        return t("pending");
      case "event":
        return t("events");
      case "task":
        return t("tasks");
      case "document":
        return t("documents");
      case "payment":
        return t("payments");
      case "temple_info":
        return t("templeInfo");
      case "village":
        return t("settingsVillages");
      case "dana":
        return t("dana");
      default:
        return kind;
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<HitKind, Hit[]>();
    for (const kind of GROUP_ORDER) map.set(kind, []);
    for (const hit of hits) {
      const list = map.get(hit.kind);
      if (list) list.push(hit);
      else map.set(hit.kind, [hit]);
    }
    return GROUP_ORDER.map((kind) => ({
      kind,
      label: groupLabel(kind),
      items: map.get(kind) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [hits, t]);

  const flat = useMemo(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );

  const go = (hit: Hit) => {
    setOpen(false);
    setQ("");
    if (isPublic) {
      if (hit.kind === "person") {
        navigate(`/public/person/${hit.id}`);
        return;
      }
      if (hit.kind === "house" || hit.kind === "dana") {
        navigate(`/public/house/${hit.house_id ?? hit.id}`);
        return;
      }
      if (hit.kind === "document" && hit.person_id) {
        navigate(`/public/person/${hit.person_id}`);
        return;
      }
      if (hit.kind === "payment") {
        if (hit.person_id) navigate(`/public/person/${hit.person_id}`);
        else if (hit.house_id) navigate(`/public/house/${hit.house_id}`);
        else navigate("/public");
        return;
      }
      if (hit.kind === "temple_info") {
        navigate("/public?templeInfo=1");
        return;
      }
      if (hit.kind === "event" || hit.kind === "task") {
        navigate("/public?calendar=1");
        return;
      }
      navigate("/public");
      return;
    }

    switch (hit.kind) {
      case "person":
        navigate(`/admin/people/${hit.id}`);
        break;
      case "house":
        navigate(`/admin/houses/${hit.id}`);
        break;
      case "pending":
        navigate(`/admin/pending/${hit.id}`);
        break;
      case "document":
        navigate("/admin/documents");
        break;
      case "payment":
        navigate("/admin/payments");
        break;
      case "event":
        navigate("/admin/events");
        break;
      case "task":
        navigate("/admin/tasks");
        break;
      case "dana":
        navigate(
          hit.house_id
            ? `/admin/houses/${hit.house_id}`
            : "/admin/dana",
        );
        break;
      case "temple_info":
        navigate("/admin/temple-info");
        break;
      case "village":
        navigate("/admin/settings");
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`global-search-wrap ${large ? "search-large" : ""}`}
      ref={wrapRef}
    >
      <SearchInput
        value={q}
        autoFocus={autoFocus}
        placeholder={t(
          isPublic
            ? "globalSearchPlaceholderPublic"
            : "globalSearchPlaceholderAdmin",
        )}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, Math.max(flat.length - 1, 0)));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === "Enter" && flat[active]) {
            go(flat[active]!);
          }
        }}
      />
      {!large ? (
        <span className="search-shortcut-hint" aria-hidden>
          {t("searchShortcutHint")}
        </span>
      ) : null}
      {open && q.trim() ? (
        <div className="search-palette">
          {!flat.length ? <div className="empty">{t("noResults")}</div> : null}
          {grouped.map((group) => (
            <div className="search-group" key={group.kind}>
              <h4>{group.label}</h4>
              {group.items.map((hit) => {
                const idx = flat.indexOf(hit);
                return (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    className={`search-item ${idx === active ? "active" : ""}`}
                    onClick={() => go(hit)}
                  >
                    <strong>{hit.title}</strong>
                    <span>{hit.subtitle}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
