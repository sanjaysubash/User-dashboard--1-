import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";

function tokenFilePath(): string {
  return join(app.getPath("userData"), "session.token");
}

let cachedToken: string | null = null;

export function getToken(): string | null {
  if (cachedToken) return cachedToken;
  const file = tokenFilePath();
  if (!existsSync(file)) return null;
  try {
    cachedToken = safeStorage.decryptString(readFileSync(file));
    return cachedToken;
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  cachedToken = token;
  writeFileSync(tokenFilePath(), safeStorage.encryptString(token));
}

export function clearToken(): void {
  cachedToken = null;
  const file = tokenFilePath();
  if (existsSync(file)) unlinkSync(file);
}
