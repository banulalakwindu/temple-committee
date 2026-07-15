import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "./en.json";
import si from "./si.json";

export type Locale = "si" | "en";
type Dict = typeof en;

const dictionaries: Record<Locale, Dict> = { en, si };

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof Dict) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("si");

  useEffect(() => {
    const stored = localStorage.getItem("temple_locale");
    if (stored === "en" || stored === "si") {
      setLocaleState(stored);
      return;
    }
    void window.electronAPI?.getSettings().then((res) => {
      if (res.ok && (res.data.app_locale === "en" || res.data.app_locale === "si")) {
        setLocaleState(res.data.app_locale);
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("temple_locale", next);
  }, []);

  const t = useCallback(
    (key: keyof Dict) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
