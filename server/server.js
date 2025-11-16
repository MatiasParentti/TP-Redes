import express from "express";
import http from "http";
import dotenv from "dotenv";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_PORT = process.env.PORT_HTTP || 4000;

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
  const { user, password } = req.body;
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
        handlePrivateMessage(ws, client, msgObj.to, msgObj.body);
        break;
      case "message":
        handleBroadcastMessage(ws, client, msgObj.body);
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
      console.log(`🔌 Usuario desconectado: ${client.user}`);
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
  console.log(chalk.green(`Servidor listo → http://localhost:${APP_PORT}`));
});
