import { app, BrowserWindow, ipcMain, powerMonitor } from "electron";
import path from "path";
import { API_BASE_URL } from "./config";
import { ApiClient } from "./api";
import { getToken } from "./tokenStore";
import { PunchLoop } from "./punchLoop";
import { AgentTray } from "./tray";
import { setAutoLaunch, getAutoLaunch } from "./autoLaunch";
import log from "./logger";

const api = new ApiClient(API_BASE_URL);
let tray: AgentTray | null = null;
let punchLoop: PunchLoop | null = null;
let loginWindow: BrowserWindow | null = null;

function openLoginWindow(): void {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }
  loginWindow = new BrowserWindow({
    width: 360,
    height: 440,
    resizable: false,
    title: "RIAURA Attendance Agent — Log in",
    webPreferences: {
      preload: path.join(__dirname, "..", "renderer", "login", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loginWindow.setMenuBarVisibility(false);
  loginWindow.loadFile(path.join(__dirname, "..", "renderer", "login", "index.html"));
  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

async function startPunchLoop(): Promise<void> {
  if (punchLoop) return;
  punchLoop = new PunchLoop(api, (state, detail) => tray?.setState(state, detail));
  await punchLoop.start();
}

function stopPunchLoop(): void {
  punchLoop?.stop();
  punchLoop = null;
}

app.whenReady().then(() => {
  tray = new AgentTray({
    onLogout: () => {
      api.logout();
      stopPunchLoop();
      tray?.setState("logged-out");
      openLoginWindow();
    },
    onQuit: () => app.quit(),
    onToggleAutoLaunch: () => setAutoLaunch(!getAutoLaunch()),
    getAutoLaunch,
  });

  powerMonitor.on("suspend", () => {
    punchLoop?.handleSuspend().catch((err) => log.error("handleSuspend failed", err));
  });

  if (getToken()) {
    startPunchLoop().catch((err) => {
      log.error("Failed to start punch loop on launch", err);
      tray?.setState("error", "startup failed — try logging out and back in");
      openLoginWindow();
    });
  } else {
    openLoginWindow();
  }
});

ipcMain.handle("login", async (_event, { email, password }: { email: string; password: string }) => {
  try {
    const user = await api.login(email, password);
    loginWindow?.close();
    await startPunchLoop();
    return { ok: true, user };
  } catch (err: any) {
    log.error("Login failed", err);
    return { ok: false, error: err?.message || "Login failed." };
  }
});

// This is a tray-only app — no windows need to be open for it to keep
// running (unlike a typical Electron app, which quits when the last
// window closes).
app.on("window-all-closed", () => {});
