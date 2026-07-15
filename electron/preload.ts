import { contextBridge, ipcRenderer } from "electron";

export type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const invoke = <T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> =>
  ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => invoke<string>("app:getVersion"),
  authStatus: () => invoke<{ unlocked: boolean }>("auth:status"),
  unlock: (password: string) =>
    invoke<{ unlocked: boolean }>("auth:unlock", password),
  lock: () => invoke<{ unlocked: boolean }>("auth:lock"),
  changePassword: (current: string, next: string) =>
    invoke<boolean>("auth:changePassword", current, next),
  getSettings: () => invoke<Record<string, string>>("settings:get"),
  setSettings: (entries: Record<string, string>) =>
    invoke<Record<string, string>>("settings:set", entries),
  globalSearch: (query: string) => invoke("search:global", query),
  dashboardStats: () =>
    invoke<{
      houses: number;
      people: number;
      pending: number;
      todayAttendance: number;
    }>("dashboard:stats"),
  listHouses: (filters?: unknown) => invoke("houses:list", filters),
  getHouse: (id: number) => invoke("houses:get", id),
  createHouse: (input: unknown) => invoke("houses:create", input),
  updateHouse: (id: number, input: unknown) =>
    invoke("houses:update", id, input),
  listVillages: () => invoke<string[]>("houses:villages"),
  listPeople: (filters?: unknown) => invoke("people:list", filters),
  getPerson: (id: number) => invoke("people:get", id),
  createPerson: (input: unknown) => invoke("people:create", input),
  updatePerson: (id: number, input: unknown) =>
    invoke("people:update", id, input),
  movePerson: (
    personId: number,
    toHouseId: number,
    reason: string,
    movedAt?: string,
  ) => invoke("people:move", personId, toHouseId, reason, movedAt),
  peopleByHouse: (houseId: number) => invoke("people:byHouse", houseId),
  personHistory: (personId: number) => invoke("people:history", personId),
  listAttendanceEvents: (activeOnly?: boolean) =>
    invoke("attendance:events", activeOnly),
  upsertAttendanceEvent: (input: unknown) =>
    invoke("attendance:upsertEvent", input),
  listAttendance: (filters?: unknown) => invoke("attendance:list", filters),
  markAttendance: (payload: unknown) => invoke("attendance:mark", payload),
  listDocumentTypes: (activeOnly?: boolean) =>
    invoke("documents:types", activeOnly),
  upsertDocumentType: (input: unknown) =>
    invoke("documents:upsertType", input),
  listDocuments: (filters?: unknown) => invoke("documents:list", filters),
  issueDocument: (input: unknown) => invoke("documents:issue", input),
  listPending: (filters?: unknown) => invoke("pending:list", filters),
  getPending: (id: number) => invoke("pending:get", id),
  createPending: (input: unknown) => invoke("pending:create", input),
  approvePending: (id: number, note?: string) =>
    invoke("pending:approve", id, note),
  rejectPending: (id: number, note?: string) =>
    invoke("pending:reject", id, note),
  pendingCount: () => invoke<number>("pending:count"),
  onPendingCountChanged: (callback: (count: number) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, count: number) => {
      callback(Number(count) || 0);
    };
    ipcRenderer.on("pending:count-changed", listener);
    return () => {
      ipcRenderer.removeListener("pending:count-changed", listener);
    };
  },
  listBackups: () => invoke("backup:list"),
  createBackup: () => invoke<string>("backup:create"),
  restoreBackup: (filePath?: string) => invoke("backup:restore", filePath),
  exportBackup: () => invoke<string>("backup:exportPick"),
  openPath: (target: string) => invoke("shell:openPath", target),
});
