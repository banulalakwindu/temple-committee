/// <reference types="vite/client" />

type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type ElectronAPI = {
  getVersion: () => Promise<IpcResult<string>>;
  getPaths: () =>
    Promise<
      IpcResult<{
        appDataRoot: string;
        dataDir: string;
        backupDir: string;
        dbPath: string;
      }>
    >;
  authStatus: () => Promise<IpcResult<{ unlocked: boolean }>>;
  unlock: (password: string) => Promise<IpcResult<{ unlocked: boolean }>>;
  lock: () => Promise<IpcResult<{ unlocked: boolean }>>;
  changePassword: (
    current: string,
    next: string,
  ) => Promise<IpcResult<boolean>>;
  getSettings: () => Promise<IpcResult<Record<string, string>>>;
  setSettings: (
    entries: Record<string, string>,
  ) => Promise<IpcResult<Record<string, string>>>;
  globalSearch: (
    query: string,
    locale?: string,
    scope?: "admin" | "public",
  ) => Promise<IpcResult<unknown>>;
  dashboardStats: () => Promise<IpcResult<unknown>>;
  listHouses: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getHouse: (id: number) => Promise<IpcResult<unknown>>;
  createHouse: (input: unknown) => Promise<IpcResult<unknown>>;
  updateHouse: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
  setHouseArchived: (
    id: number,
    archived: boolean,
  ) => Promise<IpcResult<unknown>>;
  listVillages: () => Promise<IpcResult<unknown>>;
  upsertVillage: (input: unknown) => Promise<IpcResult<unknown>>;
  deleteVillage: (id: number) => Promise<IpcResult<unknown>>;
  listPeople: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getPerson: (id: number) => Promise<IpcResult<unknown>>;
  createPerson: (input: unknown) => Promise<IpcResult<unknown>>;
  updatePerson: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
  setPersonArchived: (
    id: number,
    archived: boolean,
  ) => Promise<IpcResult<unknown>>;
  peopleByHouse: (houseId: number) => Promise<IpcResult<unknown>>;
  listAttendanceEvents: () => Promise<IpcResult<unknown>>;
  upsertAttendanceEvent: (input: unknown) => Promise<IpcResult<unknown>>;
  listAttendance: (filters?: unknown) => Promise<IpcResult<unknown>>;
  markAttendance: (payload: unknown) => Promise<IpcResult<unknown>>;
  deleteAttendance: (id: number) => Promise<IpcResult<unknown>>;
  listDocumentTypes: () => Promise<IpcResult<unknown>>;
  upsertDocumentType: (input: unknown) => Promise<IpcResult<unknown>>;
  listDocuments: (filters?: unknown) => Promise<IpcResult<unknown>>;
  issueDocument: (input: unknown) => Promise<IpcResult<unknown>>;
  deleteDocument: (id: number) => Promise<IpcResult<unknown>>;
  listPending: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getPending: (id: number) => Promise<IpcResult<unknown>>;
  createPending: (input: unknown) => Promise<IpcResult<unknown>>;
  approvePending: (id: number, note?: string) => Promise<IpcResult<unknown>>;
  rejectPending: (id: number, note?: string) => Promise<IpcResult<unknown>>;
  pendingCount: () => Promise<IpcResult<number>>;
  listDanaByMonth: (
    year: number,
    month: number,
  ) => Promise<IpcResult<unknown>>;
  listDanaByDate: (date: string) => Promise<IpcResult<unknown>>;
  listDanaToday: () => Promise<IpcResult<unknown>>;
  listDanaByHouse: (houseId: number) => Promise<IpcResult<unknown>>;
  getDanaSchedule: (id: number) => Promise<IpcResult<unknown>>;
  createDana: (input: unknown) => Promise<IpcResult<unknown>>;
  updateDanaSchedule: (
    id: number,
    input: unknown,
  ) => Promise<IpcResult<unknown>>;
  cancelDanaFuture: (scheduleId: number) => Promise<IpcResult<unknown>>;
  cancelDanaOccurrence: (id: number) => Promise<IpcResult<unknown>>;
  skipDanaDate: (
    scheduleId: number,
    date: string,
  ) => Promise<IpcResult<unknown>>;
  updateDanaDay: (input: unknown) => Promise<IpcResult<unknown>>;
  deleteDanaDay: (occurrenceId: number) => Promise<IpcResult<unknown>>;
  listEventsByMonth: (
    year: number,
    month: number,
  ) => Promise<IpcResult<unknown>>;
  listEventsByDate: (date: string) => Promise<IpcResult<unknown>>;
  listCurrentEvents: () => Promise<IpcResult<unknown>>;
  getTempleEvent: (id: number) => Promise<IpcResult<unknown>>;
  createTempleEvent: (input: unknown) => Promise<IpcResult<unknown>>;
  updateTempleEvent: (
    id: number,
    input: unknown,
  ) => Promise<IpcResult<unknown>>;
  deleteTempleEvent: (id: number) => Promise<IpcResult<unknown>>;
  listTasksByMonth: (
    year: number,
    month: number,
  ) => Promise<IpcResult<unknown>>;
  listTasksByDate: (date: string) => Promise<IpcResult<unknown>>;
  listTodayTasks: () => Promise<IpcResult<unknown>>;
  getTempleTask: (id: number) => Promise<IpcResult<unknown>>;
  createTempleTask: (input: unknown) => Promise<IpcResult<unknown>>;
  updateTempleTask: (
    id: number,
    input: unknown,
  ) => Promise<IpcResult<unknown>>;
  deleteTempleTask: (id: number) => Promise<IpcResult<unknown>>;
  listPaymentTypes: () => Promise<IpcResult<unknown>>;
  upsertPaymentType: (input: unknown) => Promise<IpcResult<unknown>>;
  deletePaymentType: (id: number) => Promise<IpcResult<unknown>>;
  listPayments: (filters?: unknown) => Promise<IpcResult<unknown>>;
  listPaymentsPublic: (filters?: unknown) => Promise<IpcResult<unknown>>;
  createPayment: (input: unknown) => Promise<IpcResult<unknown>>;
  deletePayment: (id: number) => Promise<IpcResult<unknown>>;
  listTempleInfo: () => Promise<IpcResult<unknown>>;
  upsertTempleInfo: (input: unknown) => Promise<IpcResult<unknown>>;
  deleteTempleInfo: (id: number) => Promise<IpcResult<unknown>>;
  reorderTempleInfo: (orderedIds: number[]) => Promise<IpcResult<unknown>>;
  onPendingCountChanged: (callback: (count: number) => void) => () => void;
  listBackups: () => Promise<IpcResult<unknown>>;
  createBackup: () => Promise<IpcResult<string>>;
  restoreBackup: (filePath?: string) => Promise<IpcResult<unknown>>;
  exportBackup: () => Promise<IpcResult<string>>;
  openPath: (target: string) => Promise<IpcResult<unknown>>;
};

interface Window {
  electronAPI: ElectronAPI;
}
