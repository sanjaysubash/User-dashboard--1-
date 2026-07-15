import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agent", {
  login: (email: string, password: string) => ipcRenderer.invoke("login", { email, password }),
});
