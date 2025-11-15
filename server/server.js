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
  setUser,
  setRoom,
  getClients,
  getClientInfo,
  getClientsInRoom,
} from "../client/clients-connect.js";

import { handleAuth } from "../modules/auth.js";
import { handleCommand } from "../modules/commands.js";
import {
  handlePrivateMessage,
  handleBroadcastMessage,
} from "../modules/messages.js";
import { rooms, joinRoom, leaveRoom, getRoomList } from "../modules/rooms.js";
import { logEvent } from "../util/logger.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PORT = process.env.PORT_HTTP || 4000;

const app = express();
app.use(express.json());

app.use("/public", express.static(path.join(__dirname, "..", "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

//login
app.post("/login", (req, res) => {
  const { user } = req.body;
  if (!user) return res.status(400).json({ error: "user required" });

  const token = handleAuth.generateToken(user);
  res.json({ token });
});

app.post("/token/verify", (req, res) => {
  const { token } = req.body;
  const result = handleAuth.verifyToken(token);
  res.json(result);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

handleAuth.init(process.env.JWT_SECRET);

const roomsManager = {
  rooms, // Map de rooms
  joinRoom, // función joinRoom
  leaveRoom, // función leaveRoom
  getRoomList, // función getRoomList
  getClientsInRoom, // función para obtener clientes en sala
};

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
    } catch (err) {
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

    if (msgObj.type === "command") {
      handleCommand(ws, client, msgObj.command, roomsManager);
      return;
    }

    if (msgObj.type === "private") {
      handlePrivateMessage(ws, client, msgObj.to, msgObj.body);
      return;
    }

    if (msgObj.type === "message") {
      handleBroadcastMessage(ws, client, msgObj.body);
      return;
    }

    ws.send(
      JSON.stringify({ type: "error", body: "Tipo de mensaje desconocido" })
    );
  });

  ws.on("close", () => {
    const client = getClientInfo(ws);
    if (client?.room) {
      roomsManager.leaveRoom(ws, client, false);
    }
    removeClient(ws);
  });

  ws.on("error", () => {
    removeClient(ws);
  });
});

server.listen(APP_PORT, () => {
  console.log(chalk.green(`Servidor listo → http://localhost:${APP_PORT}`));
  console.log(chalk.gray(`Archivos estáticos: /public`));
});
