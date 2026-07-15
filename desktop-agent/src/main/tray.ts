import { Tray, Menu, nativeImage, NativeImage } from "electron";

export type AgentState = "logged-out" | "on-office" | "off-office" | "error";

// Small solid-color square icons, generated at runtime from raw RGBA pixel
// data — avoids needing bundled binary icon assets for the tray dot. Swap
// for real branded icons before shipping past the pilot (see README).
const COLORS: Record<AgentState, [number, number, number]> = {
  "logged-out": [148, 163, 184], // slate
  "on-office": [16, 185, 129], // emerald — punched in
  "off-office": [100, 116, 139], // slate, darker
  error: [239, 68, 68], // red
};

function createDotIcon(rgb: [number, number, number]): NativeImage {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  const [r, g, b] = rgb;
  for (let i = 0; i < size * size; i++) {
    buffer[i * 4] = r;
    buffer[i * 4 + 1] = g;
    buffer[i * 4 + 2] = b;
    buffer[i * 4 + 3] = 255;
  }
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export interface AgentTrayHandlers {
  onLogout: () => void;
  onQuit: () => void;
  onToggleAutoLaunch: () => void;
  getAutoLaunch: () => boolean;
}

export class AgentTray {
  private tray: Tray;
  private state: AgentState = "logged-out";
  private detail: string | undefined;

  constructor(private handlers: AgentTrayHandlers) {
    this.tray = new Tray(createDotIcon(COLORS["logged-out"]));
    this.render();
  }

  setState(state: AgentState, detail?: string): void {
    this.state = state;
    this.detail = detail;
    this.tray.setImage(createDotIcon(COLORS[state]));
    this.tray.setToolTip(this.statusText());
    this.render();
  }

  private statusText(): string {
    switch (this.state) {
      case "logged-out":
        return "RIAURA Attendance Agent — not logged in";
      case "on-office":
        return "RIAURA Attendance Agent — on office WiFi (punched in)";
      case "off-office":
        return "RIAURA Attendance Agent — not on office WiFi";
      case "error":
        return `RIAURA Attendance Agent — error${this.detail ? `: ${this.detail}` : ""}`;
    }
  }

  private render(): void {
    const menu = Menu.buildFromTemplate([
      { label: this.statusText(), enabled: false },
      { type: "separator" },
      {
        label: "Launch at login",
        type: "checkbox",
        checked: this.handlers.getAutoLaunch(),
        click: () => {
          this.handlers.onToggleAutoLaunch();
          this.render();
        },
      },
      { label: "Log out", click: this.handlers.onLogout, enabled: this.state !== "logged-out" },
      { type: "separator" },
      { label: "Quit", click: this.handlers.onQuit },
    ]);
    this.tray.setContextMenu(menu);
  }
}
