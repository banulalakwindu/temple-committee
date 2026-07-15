/// <reference types="vite/client" />

type IpcResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type ElectronAPI = {
  getVersion: () => Promise<IpcResult<string>>;
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
  globalSearch: (query: string) => Promise<IpcResult<unknown>>;
  dashboardStats: () => Promise<
    IpcResult<{
      houses: number;
      people: number;
      pending: number;
      todayAttendance: number;
    }>
  >;
  listHouses: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getHouse: (id: number) => Promise<IpcResult<unknown>>;
  createHouse: (input: unknown) => Promise<IpcResult<unknown>>;
  updateHouse: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
  listVillages: () => Promise<IpcResult<string[]>>;
  listPeople: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getPerson: (id: number) => Promise<IpcResult<unknown>>;
  createPerson: (input: unknown) => Promise<IpcResult<unknown>>;
  updatePerson: (id: number, input: unknown) => Promise<IpcResult<unknown>>;
  movePerson: (
    personId: number,
    toHouseId: number,
    reason: string,
    movedAt?: string,
  ) => Promise<IpcResult<unknown>>;
  peopleByHouse: (houseId: number) => Promise<IpcResult<unknown>>;
  personHistory: (personId: number) => Promise<IpcResult<unknown>>;
  listAttendanceEvents: (activeOnly?: boolean) => Promise<IpcResult<unknown>>;
  upsertAttendanceEvent: (input: unknown) => Promise<IpcResult<unknown>>;
  listAttendance: (filters?: unknown) => Promise<IpcResult<unknown>>;
  markAttendance: (payload: unknown) => Promise<IpcResult<unknown>>;
  listDocumentTypes: (activeOnly?: boolean) => Promise<IpcResult<unknown>>;
  upsertDocumentType: (input: unknown) => Promise<IpcResult<unknown>>;
  listDocuments: (filters?: unknown) => Promise<IpcResult<unknown>>;
  issueDocument: (input: unknown) => Promise<IpcResult<unknown>>;
  listPending: (filters?: unknown) => Promise<IpcResult<unknown>>;
  getPending: (id: number) => Promise<IpcResult<unknown>>;
  createPending: (input: unknown) => Promise<IpcResult<unknown>>;
  approvePending: (id: number, note?: string) => Promise<IpcResult<unknown>>;
  rejectPending: (id: number, note?: string) => Promise<IpcResult<unknown>>;
  pendingCount: () => Promise<IpcResult<number>>;
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
