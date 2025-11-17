import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Put logs under server/logs to match server.js usage
const logsDir = path.resolve(__dirname, "..", "server", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const chatLogFile = path.join(logsDir, "chat.log");
const errorLogFile = path.join(logsDir, "error.log");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    // JSON for file transports
    winston.format.json()
  ),
  defaultMeta: { service: "tp-redes-chat" },
  transports: [
    new winston.transports.File({ filename: errorLogFile, level: "error" }),
    new winston.transports.File({ filename: chatLogFile }),
  ],
});

// Console logging with colors and readable output during development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        })
      ),
    })
  );
}

export function logEvent(type, user, ip, port, msg = "", messageHashOverride = null, ciphertext = null) {
  const levelMap = {
    CONNECT: "info",
    AUTH: "info",
    DISCONNECT: "warn",
    MESSAGE: "info",
    NICKCHANGE: "info",
    ERROR: "error",
  };

  const level = levelMap[type] || "info";

  const logMeta = {
    type,
    user: user || "anon",
    ip: ip || null,
    port: port || null,
  };

  // Add SHA-256 hash of message so systems can compare without exposing storage-only hashes
  const messageText = msg || type;
  if (messageHashOverride) {
    logMeta.messageHash = messageHashOverride;
  } else {
    try {
      const hash = crypto.createHash("sha256").update(messageText, "utf8").digest("hex");
      logMeta.messageHash = hash;
    } catch (e) {
      // If hashing fails, continue without a hash
    }
  }

  // Structured log: include cleartext message and metadata (including messageHash)
  if (ciphertext) logMeta.ciphertext = ciphertext;
  logger.log({ level, message: messageText, ...logMeta });
}

export default logger;
