import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api";

type Hit = {
  kind: "person" | "house" | "pending";
  id: number;
  title: string;
  subtitle: string;
};

export function GlobalSearch({
  autoFocus = false,
  large = false,
}: {
  autoFocus?: boolean;
  large?: boolean;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const isPublic = location.pathname.startsWith("/public") || location.pathname === "/";
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
      void api(window.electronAPI.globalSearch(q) as Promise<{ ok: true; data: Hit[] } | { ok: false; error: string }>)
        .then((data) => {
          setHits(data);
          setOpen(true);
          setActive(0);
        })
        .catch(() => setHits([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q]);

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

  const grouped = useMemo(() => {
    return {
      people: hits.filter((h) => h.kind === "person"),
      houses: hits.filter((h) => h.kind === "house"),
      pending: hits.filter((h) => h.kind === "pending"),
    };
  }, [hits]);

  const flat = useMemo(
    () => [...grouped.people, ...grouped.houses, ...grouped.pending],
    [grouped],
  );

  const go = (hit: Hit) => {
    setOpen(false);
    setQ("");
    if (hit.kind === "person") navigate(`/admin/people/${hit.id}`);
    else if (hit.kind === "house") navigate(`/admin/houses/${hit.id}`);
    else navigate(`/admin/pending/${hit.id}`);
  };

  const goPublic = (hit: Hit) => {
    setOpen(false);
    if (hit.kind === "person") navigate(`/public/person/${hit.id}`);
    else if (hit.kind === "house") navigate(`/public/house/${hit.id}`);
  };

  return (
    <div className={`global-search-wrap ${large ? "search-large" : ""}`} ref={wrapRef}>
      <input
        className="input"
        value={q}
        autoFocus={autoFocus}
        placeholder={t("globalSearchPlaceholder")}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === "Enter" && flat[active]) {
            if (isPublic) goPublic(flat[active]);
            else go(flat[active]);
          }
        }}
      />
      {open && q.trim() && (
        <div className="search-palette">
          {!flat.length && <div className="empty">{t("noResults")}</div>}
          {grouped.people.length > 0 && (
            <div className="search-group">
              <h4>{t("people")}</h4>
              {grouped.people.map((hit) => {
                const idx = flat.indexOf(hit);
                return (
                  <button
                    key={`p-${hit.id}`}
                    type="button"
                    className={`search-item ${idx === active ? "active" : ""}`}
                    onClick={() => (isPublic ? goPublic(hit) : go(hit))}
                  >
                    <strong>{hit.title}</strong>
                    <span>{hit.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}
          {grouped.houses.length > 0 && (
            <div className="search-group">
              <h4>{t("houses")}</h4>
              {grouped.houses.map((hit) => {
                const idx = flat.indexOf(hit);
                return (
                  <button
                    key={`h-${hit.id}`}
                    type="button"
                    className={`search-item ${idx === active ? "active" : ""}`}
                    onClick={() => (isPublic ? goPublic(hit) : go(hit))}
                  >
                    <strong>{hit.title}</strong>
                    <span>{hit.subtitle}</span>
                  </button>
                );
              })}
            </div>
          )}
          {grouped.pending.length > 0 && (
            <div className="search-group">
              <h4>{t("pending")}</h4>
              {grouped.pending.map((hit) => {
                const idx = flat.indexOf(hit);
                return (
                  <button
                    key={`pend-${hit.id}`}
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
          )}
        </div>
      )}
    </div>
  );
}
