import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import winston from "winston";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta de logs
const logsDir = path.resolve(__dirname, "..", "server", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const chatLogFile = path.join(logsDir, "chat.log");
const errorLogFile = path.join(logsDir, "error.log");

// Configuración del logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "tp-redes-chat" },
  transports: [
    new winston.transports.File({ filename: errorLogFile, level: "error" }),
    new winston.transports.File({ filename: chatLogFile }),
  ],
});

// salida por consola
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

//logs estructurados
export function logEvent(
  type,
  user,
  ip,
  port,
  msg = "",
  messageHashOverride = null,
  ciphertext = null
) {
  const levelMap = {
    CONNECT: "info",
    AUTH: "info",
    DISCONNECT: "warn",
    MESSAGE: "info",
    NICKCHANGE: "info",
    ERROR: "error",
  };

  const level = levelMap[type] || "info";
  const messageText = msg || type;

  const logMeta = {
    type,
    user: user || "anon",
    ip: ip || null,
    port: port || null,
    messageHash:
      messageHashOverride ||
      crypto.createHash("sha256").update(messageText, "utf8").digest("hex"),
    ...(ciphertext && { ciphertext }),
  };

  logger.log({ level, message: messageText, ...logMeta });
}

export default logger;
