import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAppDirs } from "./db/paths.js";
import { openDatabase, closeDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { maybeAutoBackup, backupDatabase } from "./services/backup.js";
import { registerIpc } from "./ipc/register.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

function resolvePreload(): string {
  const candidates = [
    path.join(__dirname, "preload.cjs"),
    path.join(__dirname, "preload.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

/** Resolve bundled/native assets in both dev and packaged builds */
function resolveResource(...parts: string[]): string | null {
  const candidates = [
    path.join(process.resourcesPath, ...parts),
    path.join(process.cwd(), "resources", ...parts),
    path.join(__dirname, "..", "resources", ...parts),
    path.join(app.getAppPath(), "resources", ...parts),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveAppIcon(): string | undefined {
  return (
    resolveResource("icon.ico") ??
    resolveResource("icon.png") ??
    undefined
  );
}

function showSplash(): void {
  const splashHtml = resolveResource("splash.html");
  if (!splashHtml) return;

  splashWindow = new BrowserWindow({
    width: 960,
    height: 640,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: true,
    backgroundColor: "#1B4D3E",
    icon: resolveAppIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void splashWindow.loadFile(splashHtml);
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Temple Community",
    backgroundColor: "#F4F1E8",
    show: false,
    icon: resolveAppIcon(),
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const showMain = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
    // Keep splash visible briefly so it feels intentional
    setTimeout(() => closeSplash(), 350);
  };

  mainWindow.once("ready-to-show", showMain);

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function initDatabase(): void {
  ensureAppDirs();
  let db = openDatabase();
  const hasSchema = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
    )
    .get();
  if (hasSchema) {
    try {
      // backup closes/reopens the connection — always refresh the handle after
      backupDatabase("pre-migration");
      db = openDatabase();
    } catch {
      db = openDatabase();
    }
  }
  runMigrations(db);
  maybeAutoBackup();
}

app.whenReady().then(() => {
  showSplash();
  initDatabase();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDatabase();
    app.quit();
  }
});

app.on("before-quit", () => {
  closeSplash();
  closeDatabase();
});
