import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";

type AppContextValue = {
  adminUnlocked: boolean;
  settings: Record<string, string>;
  pendingCount: number;
  refreshAuth: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pendingCount, setPendingCount] = useState(0);

  const refreshAuth = useCallback(async () => {
    if (!window.electronAPI) return;
    const res = await api(window.electronAPI.authStatus());
    setAdminUnlocked(res.unlocked);
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!window.electronAPI) return;
    const res = await api(window.electronAPI.getSettings());
    setSettings(res);
  }, []);

  const refreshPendingCount = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const res = await api(window.electronAPI.pendingCount());
      setPendingCount(res);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      const res = await api(window.electronAPI.unlock(password));
      setAdminUnlocked(res.unlocked);
      if (res.unlocked) {
        await refreshPendingCount();
        await refreshSettings();
      }
      return res.unlocked;
    },
    [refreshPendingCount, refreshSettings],
  );

  const lock = useCallback(async () => {
    await api(window.electronAPI.lock());
    setAdminUnlocked(false);
  }, []);

  useEffect(() => {
    void refreshAuth();
    void refreshSettings();
    void refreshPendingCount();
  }, [refreshAuth, refreshSettings, refreshPendingCount]);

  // Keep badge in sync after public submissions / approve-reject
  useEffect(() => {
    const onFocus = () => {
      void refreshPendingCount();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = window.electronAPI?.onPendingCountChanged?.((count) => {
      setPendingCount(Number(count) || 0);
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe?.();
    };
  }, [refreshPendingCount]);

  const value = useMemo(
    () => ({
      adminUnlocked,
      settings,
      pendingCount,
      refreshAuth,
      refreshSettings,
      refreshPendingCount,
      unlock,
      lock,
    }),
    [
      adminUnlocked,
      settings,
      pendingCount,
      refreshAuth,
      refreshSettings,
      refreshPendingCount,
      unlock,
      lock,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
