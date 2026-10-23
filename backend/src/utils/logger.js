const fs = require("fs");
const path = require("path");

/**
 * Minimal file logger.
 *
 * Plesk swallows a crashing Node process and lets nginx fall back to the static
 * site, which is why the live server looked "fine" while the API was actually
 * down. Writing to backend/logs/error.log means the real reason survives on
 * disk and can be read even when the process is restarted by the panel.
 */

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const ERROR_LOG = path.join(LOG_DIR, "error.log");

function writeLine(line) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        fs.appendFileSync(ERROR_LOG, line + "\n");
    } catch {
        // Never let logging itself take the server down.
    }
}

function timestamp() {
    return new Date().toISOString();
}

function logInfo(message) {
    const line = `[${timestamp()}] INFO  ${message}`;
    console.log(line);
    writeLine(line);
}

function logError(error, context) {
    const err = error instanceof Error ? error : new Error(String(error));
    const where = context ? ` (${context})` : "";
    const line = `[${timestamp()}] ERROR${where} ${err.message}\n${err.stack || ""}`;
    console.error(line);
    writeLine(line);
}

module.exports = { logInfo, logError, ERROR_LOG };
