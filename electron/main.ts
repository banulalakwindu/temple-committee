import { app, BrowserWindow, Menu } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAppDirs } from "./db/paths.js";
import { openDatabase, closeDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { maybeAutoBackup, backupDatabase } from "./services/backup.js";
import { registerIpc } from "./ipc/register.js";
import { loadWindowState, trackWindowState } from "./windowState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

/** One desk PC = one app window. Second launch focuses the existing window. */
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow();
  });
}

function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

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
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(typeof state.x === "number" && typeof state.y === "number"
      ? { x: state.x, y: state.y }
      : {}),
    minWidth: 960,
    minHeight: 640,
    title: "Temple Committee",
    backgroundColor: "#1B4D3E",
    show: false,
    icon: resolveAppIcon(),
    // WhatsApp-style chrome: content paints under a brand title bar;
    // Windows keeps native min/max/close via Window Controls Overlay.
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#1B4D3E",
      symbolColor: "#F4FAF7",
      height: 36,
    },
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);

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

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    // Kiosk-style desk app — no File/Edit/View menu bar
    Menu.setApplicationMenu(null);
    showSplash();
    initDatabase();
    registerIpc();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else focusMainWindow();
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
}
