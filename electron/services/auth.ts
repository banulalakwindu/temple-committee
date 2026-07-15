import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { getDb } from "../db/connection.js";

let adminUnlocked = false;

export function isAdminUnlocked(): boolean {
  return adminUnlocked;
}

export function lockAdmin(): void {
  adminUnlocked = false;
}

function getPasswordHash(): string {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get("admin_password_hash") as { value: string } | undefined;
  return row?.value ?? "";
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export function unlockAdmin(password: string): boolean {
  const stored = getPasswordHash();
  if (!stored || !verifyPassword(password, stored)) {
    adminUnlocked = false;
    return false;
  }
  adminUnlocked = true;
  return true;
}

export function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): { ok: boolean; error?: string } {
  if (!verifyPassword(currentPassword, getPasswordHash())) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, error: "New password is too short" };
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(newPassword, salt, 64).toString("hex");
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run("admin_password_hash", `${salt}:${hash}`);
  return { ok: true };
}

export function requireAdmin(): void {
  if (!adminUnlocked) {
    throw new Error("Admin unlock required");
  }
}
