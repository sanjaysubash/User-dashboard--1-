import { app } from "electron";

export function setAutoLaunch(enabled: boolean): void {
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
}

export function getAutoLaunch(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
