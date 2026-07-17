import { createServer, Server } from "http";
import { API_BASE_URL, STATUS_SERVER_PORT } from "./config";
import type { AgentState } from "./tray";
import log from "./logger";

function allowedOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

/**
 * Loopback-only HTTP server the dashboard's browser tab polls from the
 * Attendance page to answer "am I on office WiFi right now" — the browser
 * itself has no API for that, only this native process does (see wifi.ts).
 * Bound to 127.0.0.1 only and CORS-locked to the dashboard's own origin so
 * no other site or machine on the LAN can read it.
 */
export class StatusServer {
  private server: Server | null = null;
  private state: AgentState = "logged-out";
  private detail: string | undefined;

  setState(state: AgentState, detail?: string): void {
    this.state = state;
    this.detail = detail;
  }

  start(): void {
    if (this.server) return;
    const server = createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin());
      res.setHeader("Vary", "Origin");
      if (req.method !== "GET" || req.url !== "/status") {
        res.writeHead(404).end();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200).end(JSON.stringify({
        loggedIn: this.state !== "logged-out",
        state: this.state,
        detail: this.detail ?? null,
      }));
    });
    server.on("error", (err) => {
      // Most likely another agent instance already holds the port — non-fatal,
      // the punch loop itself keeps working regardless of this server.
      log.warn("Status server failed to start", err);
      this.server = null;
    });
    server.listen(STATUS_SERVER_PORT, "127.0.0.1");
    this.server = server;
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }
}
