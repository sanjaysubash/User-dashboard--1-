import { ApiClient } from "./api";
import { getCurrentBssid } from "./wifi";
import { POLL_INTERVAL_MS, NETWORK_LIST_REFRESH_MS, RESYNC_INTERVAL_MS } from "./config";
import log from "./logger";

export type PunchLoopState = "on-office" | "off-office" | "error";

export class PunchLoop {
  private officeBssids = new Set<string>();
  private lastNetworkRefresh = 0;
  private lastResync = 0;
  private isOnOffice = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api: ApiClient,
    // isTransition is true for startup / an actual on-office<->off-office
    // flip, false for the periodic no-op resync heartbeat — callers use it
    // to decide whether a state change is worth surfacing (e.g. a
    // notification) rather than reacting to every heartbeat.
    private onStateChange: (state: PunchLoopState, detail?: string, isTransition?: boolean) => void
  ) {}

  /** Current on/off-office state without waiting for another WiFi check. */
  getState(): PunchLoopState {
    return this.isOnOffice ? "on-office" : "off-office";
  }

  async start(): Promise<PunchLoopState> {
    await this.refreshNetworks();
    const state = await this.tick(true);
    this.timer = setInterval(() => {
      this.tick(false).catch((err) => log.error("Punch loop tick failed", err));
    }, POLL_INTERVAL_MS);
    return state;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Punch out immediately on sleep rather than waiting for the next poll after wake. */
  async handleSuspend(): Promise<void> {
    if (!this.isOnOffice) return;
    try {
      await this.api.punch("out");
      this.isOnOffice = false;
      this.onStateChange("off-office");
    } catch (err) {
      log.error("Punch-out on suspend failed", err);
    }
  }

  private async refreshNetworks(): Promise<void> {
    try {
      const networks = await this.api.getOfficeNetworks();
      this.officeBssids = new Set(networks.filter((n) => n.active).map((n) => n.bssid.toLowerCase()));
      this.lastNetworkRefresh = Date.now();
    } catch (err) {
      // Keep the last-known-good list — a transient fetch failure shouldn't
      // stall detection for everyone already inside the office.
      log.warn("Failed to refresh office network list, keeping last-known-good list", err);
    }
  }

  private async tick(isStartup: boolean): Promise<PunchLoopState> {
    if (Date.now() - this.lastNetworkRefresh > NETWORK_LIST_REFRESH_MS) {
      await this.refreshNetworks();
    }

    const bssid = await getCurrentBssid();
    const nowOnOffice = !!bssid && this.officeBssids.has(bssid);
    const stateChanged = nowOnOffice !== this.isOnOffice;
    const dueForResync = Date.now() - this.lastResync > RESYNC_INTERVAL_MS;
    const isTransition = stateChanged || isStartup;

    // Only call the punch API on a transition, at startup, or on a periodic
    // resync heartbeat — never on every tick. This is safe to call
    // redundantly because the backend treats source:"auto" punches as
    // idempotent no-ops when there's nothing to change.
    if (!stateChanged && !isStartup && !dueForResync) return this.getState();

    try {
      await this.api.punch(nowOnOffice ? "in" : "out");
      // Only commit the new state once the call actually succeeds — otherwise
      // a failed punch (e.g. no connectivity at the moment of leaving office
      // WiFi) would be forgotten and never retried, since the next tick would
      // see no state change against a value we'd already updated optimistically.
      this.isOnOffice = nowOnOffice;
      this.lastResync = Date.now();
      const state = nowOnOffice ? "on-office" : "off-office";
      this.onStateChange(state, undefined, isTransition);
      return state;
    } catch (err: any) {
      log.error("Punch call failed", err);
      this.onStateChange("error", err?.message, isTransition);
      return "error";
    }
  }
}
