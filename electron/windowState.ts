import { BrowserWindow, screen } from "electron";
import fs from "node:fs";
import path from "node:path";
import { getAppDataRoot } from "./db/paths.js";

export type WindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
};

const DEFAULTS: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false,
};

function statePath(): string {
  return path.join(getAppDataRoot(), "window-state.json");
}

function isVisibleOnAnyDisplay(state: WindowState): boolean {
  if (state.x == null || state.y == null) return true;
  const bounds = {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
  };
  return screen.getAllDisplays().some((display) => {
    const a = display.workArea;
    const overlapX = Math.max(
      0,
      Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(bounds.y + bounds.height, a.y + a.height) -
        Math.max(bounds.y, a.y),
    );
    return overlapX > 80 && overlapY > 80;
  });
}

export function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<WindowState>;
    const state: WindowState = {
      width: Math.max(960, Number(parsed.width) || DEFAULTS.width),
      height: Math.max(640, Number(parsed.height) || DEFAULTS.height),
      x: typeof parsed.x === "number" ? parsed.x : undefined,
      y: typeof parsed.y === "number" ? parsed.y : undefined,
      isMaximized: Boolean(parsed.isMaximized),
    };
    if (!isVisibleOnAnyDisplay(state)) {
      return { ...DEFAULTS };
    }
    return state;
  } catch {
    return { ...DEFAULTS };
  }
}

export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null;

  const persist = (): void => {
    if (win.isDestroyed()) return;
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    const next: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };
    try {
      fs.mkdirSync(getAppDataRoot(), { recursive: true });
      fs.writeFileSync(statePath(), JSON.stringify(next, null, 2), "utf8");
    } catch {
      // ignore disk errors — desk PCs can have locked AppData briefly
    }
  };

  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, 250);
  };

  win.on("resize", schedule);
  win.on("move", schedule);
  win.on("maximize", schedule);
  win.on("unmaximize", schedule);
  win.on("close", persist);
}
