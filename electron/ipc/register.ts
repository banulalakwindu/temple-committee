import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import { app } from "electron";
import {
  unlockAdmin,
  lockAdmin,
  isAdminUnlocked,
  changeAdminPassword,
  requireAdmin,
} from "../services/auth.js";
import {
  backupDatabase,
  listBackups,
  restoreDatabase,
} from "../services/backup.js";
import { globalSearch } from "../services/search.js";
import * as settingsRepo from "../db/repositories/settings.js";
import * as housesRepo from "../db/repositories/houses.js";
import * as peopleRepo from "../db/repositories/people.js";
import * as attendanceRepo from "../db/repositories/attendance.js";
import * as documentsRepo from "../db/repositories/documents.js";
import * as pendingRepo from "../db/repositories/pending.js";
import { getDb } from "../db/connection.js";
import type { IpcResult } from "../types.js";

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

function fail(error: unknown): IpcResult<never> {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

function withAdmin<T>(fn: () => T): IpcResult<T> {
  try {
    requireAdmin();
    return ok(fn());
  } catch (e) {
    return fail(e);
  }
}

function broadcastPendingCount(): void {
  const count = pendingRepo.pendingCount();
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send("pending:count-changed", count);
    }
  }
}

export function registerIpc(): void {
  ipcMain.handle("app:getVersion", () => ok(app.getVersion()));

  ipcMain.handle("auth:status", () => ok({ unlocked: isAdminUnlocked() }));
  ipcMain.handle("auth:unlock", (_e, password: string) => {
    try {
      return ok({ unlocked: unlockAdmin(password) });
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("auth:lock", () => {
    lockAdmin();
    return ok({ unlocked: false });
  });
  ipcMain.handle(
    "auth:changePassword",
    (_e, current: string, next: string) => {
      try {
        requireAdmin();
        return changeAdminPassword(current, next);
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("settings:get", () => {
    try {
      return ok(settingsRepo.getPublicSettings());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle(
    "settings:set",
    (_e, entries: Record<string, string>) =>
      withAdmin(() => {
        for (const [k, v] of Object.entries(entries)) {
          if (k === "admin_password_hash") continue;
          settingsRepo.setSetting(k, v);
        }
        return settingsRepo.getPublicSettings();
      }),
  );

  ipcMain.handle("search:global", (_e, query: string) => {
    try {
      return ok(
        globalSearch(query, { includePending: isAdminUnlocked() }),
      );
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("dashboard:stats", () => {
    try {
      const db = getDb();
      const houses = Number(
        (
          db.prepare("SELECT COUNT(*) AS c FROM houses WHERE is_active = 1").get() as {
            c: number | bigint;
          }
        ).c,
      );
      const people = Number(
        (
          db.prepare("SELECT COUNT(*) AS c FROM people WHERE is_active = 1").get() as {
            c: number | bigint;
          }
        ).c,
      );
      return ok({
        houses,
        people,
        pending: pendingRepo.pendingCount(),
        todayAttendance: attendanceRepo.todayCount(),
      });
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("houses:list", (_e, filters) => {
    try {
      return ok(housesRepo.listHouses(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("houses:get", (_e, id: number) => {
    try {
      return ok(housesRepo.getHouse(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("houses:create", (_e, input) =>
    withAdmin(() => housesRepo.createHouse(input)),
  );
  ipcMain.handle("houses:update", (_e, id: number, input) =>
    withAdmin(() => housesRepo.updateHouse(id, input)),
  );
  ipcMain.handle("houses:villages", () => {
    try {
      return ok(housesRepo.villages());
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("people:list", (_e, filters) => {
    try {
      return ok(peopleRepo.listPeople(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("people:get", (_e, id: number) => {
    try {
      return ok(peopleRepo.getPerson(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("people:create", (_e, input) =>
    withAdmin(() => peopleRepo.createPerson(input)),
  );
  ipcMain.handle("people:update", (_e, id: number, input) =>
    withAdmin(() => peopleRepo.updatePerson(id, input)),
  );
  ipcMain.handle(
    "people:move",
    (_e, personId: number, toHouseId: number, reason: string, movedAt?: string) =>
      withAdmin(() =>
        peopleRepo.movePerson(personId, toHouseId, reason, movedAt),
      ),
  );
  ipcMain.handle("people:byHouse", (_e, houseId: number) => {
    try {
      return ok(peopleRepo.peopleByHouse(houseId));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("people:history", (_e, personId: number) => {
    try {
      return ok(peopleRepo.houseHistory(personId));
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("attendance:events", (_e, activeOnly?: boolean) => {
    try {
      return ok(attendanceRepo.listEvents(!!activeOnly));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("attendance:upsertEvent", (_e, input) =>
    withAdmin(() => attendanceRepo.upsertEvent(input)),
  );
  ipcMain.handle("attendance:list", (_e, filters) => {
    try {
      return ok(attendanceRepo.listAttendance(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("attendance:mark", (_e, payload) =>
    withAdmin(() => attendanceRepo.markAttendance(payload)),
  );

  ipcMain.handle("documents:types", (_e, activeOnly?: boolean) => {
    try {
      return ok(documentsRepo.listDocTypes(!!activeOnly));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("documents:upsertType", (_e, input) =>
    withAdmin(() => documentsRepo.upsertDocType(input)),
  );
  ipcMain.handle("documents:list", (_e, filters) => {
    try {
      return ok(documentsRepo.listDocuments(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("documents:issue", (_e, input) =>
    withAdmin(() => documentsRepo.issueDocument(input)),
  );

  ipcMain.handle("pending:list", (_e, filters) => {
    try {
      return ok(pendingRepo.listPending(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("pending:get", (_e, id: number) => {
    try {
      return ok(pendingRepo.getPending(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("pending:create", (_e, input) => {
    try {
      const created = pendingRepo.createPending(input);
      broadcastPendingCount();
      return ok(created);
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("pending:approve", (_e, id: number, note?: string) => {
    const result = withAdmin(() => pendingRepo.approvePending(id, note));
    if (result.ok) broadcastPendingCount();
    return result;
  });
  ipcMain.handle("pending:reject", (_e, id: number, note?: string) => {
    const result = withAdmin(() =>
      pendingRepo.rejectPending(id, note || ""),
    );
    if (result.ok) broadcastPendingCount();
    return result;
  });
  ipcMain.handle("pending:count", () => {
    try {
      return ok(pendingRepo.pendingCount());
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("backup:list", () =>
    withAdmin(() => listBackups()),
  );
  ipcMain.handle("backup:create", () =>
    withAdmin(() => backupDatabase("manual")),
  );
  ipcMain.handle("backup:restore", async (_e, filePath?: string) => {
    try {
      requireAdmin();
      let target = filePath;
      if (!target) {
        const result = await dialog.showOpenDialog({
          properties: ["openFile"],
          filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
        });
        if (result.canceled || !result.filePaths[0]) {
          return fail("Cancelled");
        }
        target = result.filePaths[0];
      }
      restoreDatabase(target);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("backup:exportPick", async () => {
    try {
      requireAdmin();
      const dest = await dialog.showSaveDialog({
        defaultPath: `temple_backup_${Date.now()}.sqlite`,
        filters: [{ name: "SQLite", extensions: ["sqlite"] }],
      });
      if (dest.canceled || !dest.filePath) return fail("Cancelled");
      const created = backupDatabase("export");
      const fs = await import("node:fs");
      fs.copyFileSync(created, dest.filePath);
      return ok(dest.filePath);
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("shell:openPath", async (_e, target: string) => {
    try {
      await shell.openPath(target);
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  });
}
