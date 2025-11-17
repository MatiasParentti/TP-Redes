import express from "express";
import http from "http";
import dotenv from "dotenv";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import os from 'os';
import {
  addClient,
  removeClient,
  getClientInfo,
} from "../client/clients-connect.js";
import { handleAuth } from "../modules/auth.js";
import { handleCommand } from "../modules/commands.js";
import {
  handlePrivateMessage,
  handleBroadcastMessage,
} from "../modules/messages.js";
import {
  rooms,
  joinRoom,
  leaveRoom,
  getRoomList,
  cleanupUserRooms,
  getClientsInRoom,
} from "../modules/rooms.js";
import { logEvent } from "../util/logger.js";
import logger from "../util/logger.js";
import fs from "fs";
import { encrypt, decrypt } from "../util/crypto.js";



// Ruta relativa a la carpeta actual
const logsPath = path.resolve("../server", "logs");

if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath, { recursive: true });
  logger.info(`Carpeta creada: ${logsPath}`);
} else {
  logger.info(`Carpeta existente: ${logsPath}`);
}


// === IP LOCAL DINÁMICA ===
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
};


const localIp = getLocalIp();
const apiPort = "4000";
logger.info(`IP local del servidor: ${localIp}`);

const baseURL = `http://${localIp}:${apiPort}/`;


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PORT = process.env.PORT_HTTP || apiPort;

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

//login
app.post("/login", (req, res) => {
  const { encryptedUser, encryptedPassword } = req.body;
  logger.info("Pasó por la etapa de encriptación", { encryptedUser, encryptedPassword });

if (!encryptedUser || !encryptedPassword)
  return res.status(400).json({ error: "Datos cifrados requeridos" });

const user = decrypt(encryptedUser);
const password = decrypt(encryptedPassword);

  if (!user || !password)
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });

  const token = handleAuth.authenticateUser(user, password);
  if (!token) return res.status(401).json({ error: "Credenciales inválidas" });

  res.json({ token });
});

// Token JWT
app.post("/token/verify", (req, res) => {
  const { token } = req.body;
  res.json(handleAuth.verifyToken(token));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

handleAuth.init(process.env.JWT_SECRET);

// salas x comando
const roomsManager = {
  rooms,
  joinRoom,
  leaveRoom,
  getRoomList,
  getClientsInRoom,
  cleanupUserRooms,
};

// Conexión WebSocket
wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  const port = req.socket.remotePort;

  addClient(ws);
  logEvent("CONNECT", null, ip, port, "Nuevo WS cliente conectado");

  ws.send(
    JSON.stringify({
      type: "system",
      body: "Bienvenido! Envía {type:'auth', token:'...'} para autenticarte.",
    })
  );

  ws.on("message", (raw) => {
    let msgObj;

    try {
      msgObj = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", body: "JSON inválido" }));
      return;
    }

    const client = getClientInfo(ws);

    if (msgObj.type === "auth") {
      handleAuth.processAuth(ws, msgObj);
      return;
    }

    if (!client?.user) {
      ws.send(
        JSON.stringify({ type: "error", body: "Debes autenticarte primero." })
      );
      return;
    }

    switch (msgObj.type) {
      case "command":
        handleCommand(ws, client, msgObj.command, roomsManager);
        break;
      case "private":
        handlePrivateMessage(ws, client, msgObj.to, msgObj.body, msgObj.messageHash);
        break;
      case "message":
        handleBroadcastMessage(ws, client, msgObj.body, msgObj.messageHash);
        break;
      default:
        ws.send(
          JSON.stringify({ type: "error", body: "Tipo de mensaje desconocido" })
        );
    }
  });

  ws.on("close", () => {
    const client = getClientInfo(ws);
    if (client) {
      logEvent("DISCONNECT", client.user, null, null, `Usuario desconectado: ${client.user}`);
      if (client.user) roomsManager.cleanupUserRooms(client.user);
      if (client.room) roomsManager.leaveRoom(ws, client, false);
    }
    removeClient(ws);
  });

  ws.on("error", () => {
    removeClient(ws);
  });
});

server.listen(APP_PORT, () => {
  logger.info(`Servidor listo → http://${localIp}:${APP_PORT}`);
});
