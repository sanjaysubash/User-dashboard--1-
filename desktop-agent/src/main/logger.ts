import log from "electron-log";

// A background process with no telemetry pipeline is very hard to debug
// remotely during the pilot — write to disk from day one.
log.transports.file.level = "info";
log.transports.console.level = "debug";

export default log;
