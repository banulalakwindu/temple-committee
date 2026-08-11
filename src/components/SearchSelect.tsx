import { useEffect, useId, useRef, useState } from "react";
import { Icons } from "@/components/Icons";
import { useI18n } from "@/i18n";

type SearchSelectProps<T> = {
  value: number | null | "";
  onChange: (value: number | null) => void;
  getOptionLabel: (item: T) => string;
  getOptionValue: (item: T) => number;
  /** Static list — filtered locally by search text. */
  options?: T[];
  /** Async loader — preferred for large lists (houses, people). */
  loadOptions?: (query: string) => Promise<T[]>;
  /** Resolve selected label when the item is not in the current options. */
  resolveSelected?: (id: number) => Promise<T | null>;
  placeholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
  disabled?: boolean;
};

export function SearchSelect<T>({
  value,
  onChange,
  getOptionLabel,
  getOptionValue,
  options,
  loadOptions,
  resolveSelected,
  placeholder,
  emptyLabel,
  clearable = true,
  disabled = false,
}: SearchSelectProps<T>) {
  const { t } = useI18n();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [selected, setSelected] = useState<T | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const numericValue =
    value === "" || value === null || value === undefined ? null : Number(value);

  useEffect(() => {
    if (numericValue == null) {
      setSelected(null);
      return;
    }
    const fromOptions =
      options?.find((item) => getOptionValue(item) === numericValue) ??
      items.find((item) => getOptionValue(item) === numericValue);
    if (fromOptions) {
      setSelected(fromOptions);
      return;
    }
    if (selected && getOptionValue(selected) === numericValue) return;
    if (!resolveSelected) return;
    let cancelled = false;
    void resolveSelected(numericValue).then((item) => {
      if (!cancelled) setSelected(item);
    });
    return () => {
      cancelled = true;
    };
  }, [numericValue, options, items, resolveSelected, getOptionValue, selected]);

  useEffect(() => {
    if (!open) return;
    if (options) {
      const q = query.trim().toLowerCase();
      setItems(
        q
          ? options.filter((item) => getOptionLabel(item).toLowerCase().includes(q))
          : options,
      );
      setActive(0);
      return;
    }
    if (!loadOptions) {
      setItems([]);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void loadOptions(query)
        .then((rows) => {
          setItems(rows);
          setActive(0);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query, options, loadOptions, getOptionLabel]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: T) => {
    setSelected(item);
    onChange(getOptionValue(item));
    setOpen(false);
    setQuery("");
  };

  const clear = () => {
    setSelected(null);
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  const display =
    open
      ? query
      : selected
        ? getOptionLabel(selected)
        : "";

  const showClear = clearable && numericValue != null;

  return (
    <div className={`search-select ${open ? "open" : ""}`} ref={wrapRef}>
      <div
        className={`search-select-control input-with-icon has-trailing ${showClear ? "has-clear" : ""} ${open ? "open" : ""}`}
      >
        <span className="input-icon input-icon-left" aria-hidden>
          {Icons.search({ size: 16 })}
        </span>
        <input
          ref={inputRef}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={placeholder || t("search")}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              pick(items[active]);
            }
          }}
        />
        {showClear ? (
          <button
            type="button"
            className="search-select-clear"
            aria-label={t("clearFilters")}
            onClick={clear}
          >
            ×
          </button>
        ) : null}
        <span className="input-icon input-icon-right search-select-chevron" aria-hidden>
          {Icons.chevronDown({ size: 16 })}
        </span>
      </div>
      {open ? (
        <ul id={listId} className="search-select-menu" role="listbox">
          {clearable ? (
            <li>
              <button
                type="button"
                className="search-select-option"
                onClick={clear}
              >
                {emptyLabel || "—"}
              </button>
            </li>
          ) : null}
          {loading ? (
            <li className="search-select-empty">{t("search")}…</li>
          ) : null}
          {!loading && !items.length ? (
            <li className="search-select-empty">{t("noResults")}</li>
          ) : null}
          {items.map((item, index) => {
            const id = getOptionValue(item);
            const activeItem = index === active;
            const isSelected = numericValue === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`search-select-option ${activeItem ? "active" : ""} ${isSelected ? "selected" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(item)}
                >
                  {getOptionLabel(item)}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
