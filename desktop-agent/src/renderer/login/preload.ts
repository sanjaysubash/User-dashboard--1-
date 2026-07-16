import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agent", {
  login: (email: string, password: string) => ipcRenderer.invoke("login", { email, password }),
  closeLoginWindow: () => ipcRenderer.send("close-login-window"),
  onStatus: (cb: (message: string) => void) => ipcRenderer.on("login-status", (_event, message) => cb(message)),
});
