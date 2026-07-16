import { app, BrowserWindow, ipcMain, powerMonitor, Notification } from "electron";
import path from "path";
import { API_BASE_URL } from "./config";
import { ApiClient } from "./api";
import { getToken } from "./tokenStore";
import { PunchLoop, PunchLoopState } from "./punchLoop";
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

function notifyState(state: PunchLoopState, detail?: string): void {
  if (!Notification.isSupported()) return;
  const messages: Record<PunchLoopState, { title: string; body: string }> = {
    "on-office": { title: "Punched in", body: "Office WiFi detected — you're punched in for today." },
    "off-office": { title: "Punched out", body: "Not on office WiFi — you're punched out." },
    error: { title: "Attendance sync failed", body: detail || "Could not reach the attendance server. Will retry automatically." },
  };
  const { title, body } = messages[state];
  new Notification({ title, body }).show();
}

async function startPunchLoop(): Promise<PunchLoopState> {
  if (punchLoop) return punchLoop.getState();
  punchLoop = new PunchLoop(api, (state, detail, isTransition) => {
    tray?.setState(state, detail);
    if (isTransition) notifyState(state, detail);
  });
  return punchLoop.start();
}

function stopPunchLoop(): void {
  punchLoop?.stop();
  punchLoop = null;
}

// Required on Windows for toast notifications to be attributed to this app
// (and show at all) instead of being grouped under generic "Electron".
if (process.platform === "win32") {
  app.setAppUserModelId("com.riaura.attendance-agent");
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
    // Keep the login window open through the WiFi check so the user actually
    // sees whether they got punched in, instead of closing immediately and
    // leaving the result to a barely-visible tray icon color.
    loginWindow?.webContents.send("login-status", "Checking office WiFi...");
    const wifiState = await startPunchLoop();
    return { ok: true, user, wifiState };
  } catch (err: any) {
    log.error("Login failed", err);
    return { ok: false, error: err?.message || "Login failed." };
  }
});

ipcMain.on("close-login-window", () => {
  loginWindow?.close();
});

// This is a tray-only app — no windows need to be open for it to keep
// running (unlike a typical Electron app, which quits when the last
// window closes).
app.on("window-all-closed", () => {});
