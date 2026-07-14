import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import log from "./logger";

const execAsync = promisify(exec);
const MAC_REGEX = /([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i;

/**
 * Returns the BSSID (AP hardware MAC) of the currently connected WiFi
 * network, or null if not connected / undetectable. Platform-specific and
 * unverified on real hardware — see README "Known risks" before shipping.
 */
export async function getCurrentBssid(): Promise<string | null> {
  const platform = os.platform();
  try {
    if (platform === "win32") return await getBssidWindows();
    if (platform === "darwin") return await getBssidMac();
    log.warn(`Unsupported platform "${platform}" — WiFi detection not implemented.`);
    return null;
  } catch (err) {
    log.error("Failed to read current WiFi BSSID", err);
    return null;
  }
}

async function getBssidWindows(): Promise<string | null> {
  const { stdout } = await execAsync("netsh wlan show interfaces");
  // `netsh` output is localized by the OS display language, so the "BSSID"
  // label itself is not a safe match target on non-English Windows installs.
  // The SSID line also contains no MAC, and the "Physical address" of the
  // adapter (its own MAC, not the AP's) can appear too — restrict the scan
  // to lines that look like they're describing the connected AP by matching
  // a line containing "BSSID" case-insensitively when possible, falling back
  // to the first MAC-shaped token in the whole output otherwise.
  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    if (/bssid/i.test(line)) {
      const match = line.match(MAC_REGEX);
      if (match) return match[1].toLowerCase();
    }
  }
  const fallback = stdout.match(MAC_REGEX);
  return fallback ? fallback[1].toLowerCase() : null;
}

async function getBssidMac(): Promise<string | null> {
  // Deliberately NOT using the classic `airport` CLI utility
  // (Apple80211.framework) — Apple has been breaking/removing it since
  // macOS Sonoma/Sequoia. `system_profiler` is the current stable path.
  // Requires the app to hold Location Services authorization (macOS
  // 10.15+); if permission is denied this call returns no network info
  // rather than throwing, so callers see `null` (treated as "off office
  // network") — the UI layer is responsible for surfacing the permission
  // problem distinctly (see tray "error" state wiring in index.ts).
  const { stdout } = await execAsync("system_profiler SPAirPortDataType -json");
  const data = JSON.parse(stdout);
  const airportEntries = data?.SPAirPortDataType ?? [];
  for (const entry of airportEntries) {
    const interfaces = entry?.spairport_airport_interfaces ?? [];
    for (const iface of interfaces) {
      const bssid = iface?.spairport_current_network_information?.spairport_network_bssid;
      if (typeof bssid === "string" && MAC_REGEX.test(bssid)) {
        return bssid.toLowerCase();
      }
    }
  }
  return null;
}
