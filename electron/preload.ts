import { contextBridge, ipcRenderer } from "electron";

export type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const invoke = <T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> =>
  ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => invoke<string>("app:getVersion"),
  getPaths: () =>
    invoke<{
      appDataRoot: string;
      dataDir: string;
      backupDir: string;
      dbPath: string;
    }>("app:getPaths"),
  authStatus: () => invoke<{ unlocked: boolean }>("auth:status"),
  unlock: (password: string) =>
    invoke<{ unlocked: boolean }>("auth:unlock", password),
  lock: () => invoke<{ unlocked: boolean }>("auth:lock"),
  changePassword: (current: string, next: string) =>
    invoke<boolean>("auth:changePassword", current, next),
  getSettings: () => invoke<Record<string, string>>("settings:get"),
  setSettings: (entries: Record<string, string>) =>
    invoke<Record<string, string>>("settings:set", entries),
  globalSearch: (query: string, locale?: string, scope?: "admin" | "public") =>
    invoke("search:global", query, locale, scope),
  dashboardStats: () => invoke("dashboard:stats"),
  listHouses: (filters?: unknown) => invoke("houses:list", filters),
  getHouse: (id: number) => invoke("houses:get", id),
  createHouse: (input: unknown) => invoke("houses:create", input),
  updateHouse: (id: number, input: unknown) =>
    invoke("houses:update", id, input),
  setHouseArchived: (id: number, archived: boolean) =>
    invoke("houses:setArchived", id, archived),
  listVillages: () => invoke("villages:list"),
  upsertVillage: (input: unknown) => invoke("villages:upsert", input),
  deleteVillage: (id: number) => invoke("villages:delete", id),
  listPeople: (filters?: unknown) => invoke("people:list", filters),
  getPerson: (id: number) => invoke("people:get", id),
  createPerson: (input: unknown) => invoke("people:create", input),
  updatePerson: (id: number, input: unknown) =>
    invoke("people:update", id, input),
  setPersonArchived: (id: number, archived: boolean) =>
    invoke("people:setArchived", id, archived),
  peopleByHouse: (houseId: number) => invoke("people:byHouse", houseId),
  listAttendanceEvents: () => invoke("attendance:events"),
  upsertAttendanceEvent: (input: unknown) =>
    invoke("attendance:upsertEvent", input),
  listAttendance: (filters?: unknown) => invoke("attendance:list", filters),
  markAttendance: (payload: unknown) => invoke("attendance:mark", payload),
  deleteAttendance: (id: number) => invoke("attendance:delete", id),
  listDocumentTypes: () => invoke("documents:types"),
  upsertDocumentType: (input: unknown) =>
    invoke("documents:upsertType", input),
  listDocuments: (filters?: unknown) => invoke("documents:list", filters),
  issueDocument: (input: unknown) => invoke("documents:issue", input),
  deleteDocument: (id: number) => invoke("documents:delete", id),
  listPending: (filters?: unknown) => invoke("pending:list", filters),
  getPending: (id: number) => invoke("pending:get", id),
  createPending: (input: unknown) => invoke("pending:create", input),
  approvePending: (id: number, note?: string) =>
    invoke("pending:approve", id, note),
  rejectPending: (id: number, note?: string) =>
    invoke("pending:reject", id, note),
  pendingCount: () => invoke<number>("pending:count"),
  listDanaByMonth: (year: number, month: number) =>
    invoke("dana:listByMonth", year, month),
  listDanaByDate: (date: string) => invoke("dana:listByDate", date),
  listDanaToday: () => invoke("dana:listToday"),
  listDanaByHouse: (houseId: number) => invoke("dana:listByHouse", houseId),
  getDanaSchedule: (id: number) => invoke("dana:getSchedule", id),
  createDana: (input: unknown) => invoke("dana:create", input),
  updateDanaSchedule: (id: number, input: unknown) =>
    invoke("dana:updateSchedule", id, input),
  cancelDanaFuture: (scheduleId: number) =>
    invoke("dana:cancelFuture", scheduleId),
  cancelDanaOccurrence: (id: number) =>
    invoke("dana:cancelOccurrence", id),
  skipDanaDate: (scheduleId: number, date: string) =>
    invoke("dana:skipDate", scheduleId, date),
  updateDanaDay: (input: unknown) => invoke("dana:updateDay", input),
  deleteDanaDay: (occurrenceId: number) =>
    invoke("dana:deleteDay", occurrenceId),
  listEventsByMonth: (year: number, month: number) =>
    invoke("events:listByMonth", year, month),
  listEventsByDate: (date: string) => invoke("events:listByDate", date),
  listCurrentEvents: () => invoke("events:listCurrent"),
  getTempleEvent: (id: number) => invoke("events:get", id),
  createTempleEvent: (input: unknown) => invoke("events:create", input),
  updateTempleEvent: (id: number, input: unknown) =>
    invoke("events:update", id, input),
  deleteTempleEvent: (id: number) => invoke("events:delete", id),
  listTasksByMonth: (year: number, month: number) =>
    invoke("tasks:listByMonth", year, month),
  listTasksByDate: (date: string) => invoke("tasks:listByDate", date),
  listTodayTasks: () => invoke("tasks:listToday"),
  getTempleTask: (id: number) => invoke("tasks:get", id),
  createTempleTask: (input: unknown) => invoke("tasks:create", input),
  updateTempleTask: (id: number, input: unknown) =>
    invoke("tasks:update", id, input),
  deleteTempleTask: (id: number) => invoke("tasks:delete", id),
  listPaymentTypes: () => invoke("payments:types"),
  upsertPaymentType: (input: unknown) =>
    invoke("payments:upsertType", input),
  deletePaymentType: (id: number) => invoke("payments:deleteType", id),
  listPayments: (filters?: unknown) => invoke("payments:list", filters),
  listPaymentsPublic: (filters?: unknown) =>
    invoke("payments:listPublic", filters),
  createPayment: (input: unknown) => invoke("payments:create", input),
  deletePayment: (id: number) => invoke("payments:delete", id),
  listTempleInfo: () => invoke("templeInfo:list"),
  upsertTempleInfo: (input: unknown) => invoke("templeInfo:upsert", input),
  deleteTempleInfo: (id: number) => invoke("templeInfo:delete", id),
  reorderTempleInfo: (orderedIds: number[]) =>
    invoke("templeInfo:reorder", orderedIds),
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
