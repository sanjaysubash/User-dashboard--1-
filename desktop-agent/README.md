# RIAURA Attendance Agent

Background tray app that auto punches an employee in/out of the RIAURA attendance dashboard based on whether their laptop is connected to a registered office WiFi network. Talks to the existing `/api/auth/login` and `/api/attendance` endpoints over HTTPS — no changes needed to those beyond what's already in this branch.

## Setup

```
cd desktop-agent
npm install
set RIAURA_API_URL=https://your-dashboard-domain   # required before building for real use; defaults to http://localhost:3000
npm start
```

Log in with your normal dashboard credentials. The app then lives in the system tray — no window needs to stay open.

Before it will do anything, an HR/super admin needs to register the office's WiFi BSSID(s) under **Settings → Office Network** in the web dashboard (a router usually has separate BSSIDs for its 2.4GHz and 5GHz radios — register both).

## Building installers

```
npm run dist:win    # Windows NSIS installer — build on Windows
npm run dist:mac     # macOS dmg/zip — build on a real Mac, not cross-compiled
```

## Known risks / things to verify before expanding past the pilot

- **macOS BSSID reading is unverified on real hardware.** `src/main/wifi.ts` uses `system_profiler SPAirPortDataType -json`, since the classic `airport` CLI is being broken/removed by Apple across recent macOS versions. Confirm the JSON shape (`spairport_current_network_information.spairport_network_bssid`) still holds on the actual macOS version pilot users run; if it doesn't, the escalation path is a small native Swift/CoreWLAN helper binary.
- **macOS Location Services permission** is required to read WiFi info at all (since 10.15). First run on a Mac should trigger an OS permission prompt; if denied, `getCurrentBssid()` returns `null` (agent shows "off office network," not a crash) — worth adding a more explicit "permission needed" tray state once this is observed in practice.
- **Windows `netsh` output is localized** by OS display language — `wifi.ts` matches by MAC-address pattern near a `"bssid"`-containing line rather than the English label, but this hasn't been tested against a non-English Windows install.
- **No code signing yet.** Unsigned builds will trigger Gatekeeper ("can't be opened" on Mac) and SmartScreen (Windows) warnings on first launch — fine to walk pilot users through manually, but needs a real cert before a company-wide rollout.
- **No auto-update mechanism** — pilot installers are hand-distributed; revisit if this goes beyond a handful of people.
