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
import * as danaRepo from "../db/repositories/dana.js";
import * as eventsRepo from "../db/repositories/events.js";
import * as tasksRepo from "../db/repositories/tasks.js";
import * as paymentsRepo from "../db/repositories/payments.js";
import * as villagesRepo from "../db/repositories/villages.js";
import * as templeInfoRepo from "../db/repositories/templeInfo.js";
import { getDashboardStats } from "../db/repositories/dashboard.js";
import {
  getAppDataRoot,
  getBackupDir,
  getDataDir,
  getDbPath,
} from "../db/paths.js";
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
  ipcMain.handle("app:getPaths", () =>
    ok({
      appDataRoot: getAppDataRoot(),
      dataDir: getDataDir(),
      backupDir: getBackupDir(),
      dbPath: getDbPath(),
    }),
  );

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

  ipcMain.handle(
    "search:global",
    (_e, query: string, locale?: string, scope?: string) => {
      try {
        const includeAdmin =
          scope === "admin" && isAdminUnlocked();
        return ok(
          globalSearch(query, {
            includeAdmin,
            locale,
          }),
        );
      } catch (e) {
        return fail(e);
      }
    },
  );

  ipcMain.handle("dashboard:stats", () => {
    try {
      return ok(getDashboardStats());
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
  ipcMain.handle("houses:setArchived", (_e, id: number, archived: boolean) =>
    withAdmin(() => housesRepo.setHouseArchived(id, archived)),
  );
  ipcMain.handle("houses:villages", () => {
    try {
      return ok(villagesRepo.listVillages());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("villages:list", () => {
    try {
      return ok(villagesRepo.listVillages());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("villages:upsert", (_e, input) =>
    withAdmin(() => villagesRepo.upsertVillage(input)),
  );
  ipcMain.handle("villages:delete", (_e, id: number) =>
    withAdmin(() => {
      villagesRepo.deleteVillage(id);
      return true;
    }),
  );

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
  ipcMain.handle("people:setArchived", (_e, id: number, archived: boolean) =>
    withAdmin(() => peopleRepo.setPersonArchived(id, archived)),
  );
  ipcMain.handle("people:byHouse", (_e, houseId: number) => {
    try {
      return ok(peopleRepo.peopleByHouse(houseId));
    } catch (e) {
      return fail(e);
    }
  });

  ipcMain.handle("attendance:events", () => {
    try {
      return ok(attendanceRepo.listEvents());
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
  ipcMain.handle("attendance:delete", (_e, id: number) =>
    withAdmin(() => {
      attendanceRepo.deleteAttendance(id);
      return true;
    }),
  );

  ipcMain.handle("documents:types", () => {
    try {
      return ok(documentsRepo.listDocTypes());
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
  ipcMain.handle("documents:delete", (_e, id: number) =>
    withAdmin(() => {
      documentsRepo.deleteDocument(id);
      return true;
    }),
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

  ipcMain.handle("dana:listByMonth", (_e, year: number, month: number) => {
    try {
      return ok(danaRepo.listByMonth(year, month));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("dana:listByDate", (_e, date: string) => {
    try {
      return ok(danaRepo.listByDate(date));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("dana:listToday", () => {
    try {
      return ok(danaRepo.listToday());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("dana:listByHouse", (_e, houseId: number) => {
    try {
      return ok(danaRepo.listByHouse(houseId));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("dana:getSchedule", (_e, id: number) => {
    try {
      return ok(danaRepo.getSchedule(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("dana:create", (_e, input) =>
    withAdmin(() => danaRepo.createDana(input)),
  );
  ipcMain.handle("dana:updateSchedule", (_e, id: number, input) =>
    withAdmin(() => danaRepo.updateSchedule(id, input)),
  );
  ipcMain.handle("dana:cancelFuture", (_e, scheduleId: number) =>
    withAdmin(() => danaRepo.cancelFuture(scheduleId)),
  );
  ipcMain.handle("dana:cancelOccurrence", (_e, id: number) =>
    withAdmin(() => danaRepo.cancelOccurrence(id)),
  );
  ipcMain.handle(
    "dana:skipDate",
    (_e, scheduleId: number, date: string) =>
      withAdmin(() => danaRepo.skipDate(scheduleId, date)),
  );
  ipcMain.handle("dana:updateDay", (_e, input) =>
    withAdmin(() => danaRepo.updateDanaDay(input)),
  );
  ipcMain.handle("dana:deleteDay", (_e, occurrenceId: number) =>
    withAdmin(() => {
      danaRepo.deleteDanaDay(occurrenceId);
      return true;
    }),
  );

  ipcMain.handle("events:listByMonth", (_e, year: number, month: number) => {
    try {
      return ok(eventsRepo.listEventsByMonth(year, month));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("events:listByDate", (_e, date: string) => {
    try {
      return ok(eventsRepo.listEventsByDate(date));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("events:listCurrent", () => {
    try {
      return ok(eventsRepo.listCurrentEvents());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("events:get", (_e, id: number) => {
    try {
      return ok(eventsRepo.getTempleEvent(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("events:create", (_e, input) =>
    withAdmin(() => eventsRepo.createTempleEvent(input)),
  );
  ipcMain.handle("events:update", (_e, id: number, input) =>
    withAdmin(() => eventsRepo.updateTempleEvent(id, input)),
  );
  ipcMain.handle("events:delete", (_e, id: number) =>
    withAdmin(() => {
      eventsRepo.deleteTempleEvent(id);
      return true;
    }),
  );

  ipcMain.handle("tasks:listByMonth", (_e, year: number, month: number) => {
    try {
      return ok(tasksRepo.listTasksByMonth(year, month));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("tasks:listByDate", (_e, date: string) => {
    try {
      return ok(tasksRepo.listTasksByDate(date));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("tasks:listToday", () => {
    try {
      return ok(tasksRepo.listTodayTasks());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("tasks:get", (_e, id: number) => {
    try {
      return ok(tasksRepo.getTempleTask(id));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("tasks:create", (_e, input) =>
    withAdmin(() => tasksRepo.createTempleTask(input)),
  );
  ipcMain.handle("tasks:update", (_e, id: number, input) =>
    withAdmin(() => tasksRepo.updateTempleTask(id, input)),
  );
  ipcMain.handle("tasks:delete", (_e, id: number) =>
    withAdmin(() => {
      tasksRepo.deleteTempleTask(id);
      return true;
    }),
  );

  ipcMain.handle("payments:types", () => {
    try {
      return ok(paymentsRepo.listPaymentTypes());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("payments:upsertType", (_e, input) =>
    withAdmin(() => paymentsRepo.upsertPaymentType(input)),
  );
  ipcMain.handle("payments:deleteType", (_e, id: number) =>
    withAdmin(() => {
      paymentsRepo.deletePaymentType(id);
      return true;
    }),
  );
  ipcMain.handle("payments:list", (_e, filters) => {
    try {
      return ok(paymentsRepo.listPayments(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("payments:listPublic", (_e, filters) => {
    try {
      return ok(paymentsRepo.listPaymentsPublic(filters ?? {}));
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("payments:create", (_e, input) =>
    withAdmin(() => paymentsRepo.createPayment(input)),
  );
  ipcMain.handle("payments:delete", (_e, id: number) =>
    withAdmin(() => {
      paymentsRepo.deletePayment(id);
      return true;
    }),
  );

  ipcMain.handle("templeInfo:list", () => {
    try {
      return ok(templeInfoRepo.listTempleInfo());
    } catch (e) {
      return fail(e);
    }
  });
  ipcMain.handle("templeInfo:upsert", (_e, input) =>
    withAdmin(() => templeInfoRepo.upsertTempleInfo(input)),
  );
  ipcMain.handle("templeInfo:delete", (_e, id: number) =>
    withAdmin(() => {
      templeInfoRepo.deleteTempleInfo(id);
      return true;
    }),
  );
  ipcMain.handle("templeInfo:reorder", (_e, orderedIds: number[]) =>
    withAdmin(() => templeInfoRepo.reorderTempleInfo(orderedIds)),
  );

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
