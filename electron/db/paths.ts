import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export function getAppDataRoot(): string {
  return path.join(app.getPath("userData"), "TempleCommunity");
}

export function getDataDir(): string {
  return path.join(getAppDataRoot(), "data");
}

export function getBackupDir(): string {
  return path.join(getAppDataRoot(), "backups");
}

export function getDbPath(): string {
  return path.join(getDataDir(), "temple.sqlite");
}

export function ensureAppDirs(): void {
  fs.mkdirSync(getDataDir(), { recursive: true });
  fs.mkdirSync(getBackupDir(), { recursive: true });
}
