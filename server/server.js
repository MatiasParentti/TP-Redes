import net from "net";
import chalk from "chalk";
import {
  addClient,
  removeClient,
  setUser,
  setRoom,
  getClients,
  getClientInfo,
  getClientsInRoom,
} from "../client/clients-connect.js";
import { logEvent } from "../util/logger.js";

const PORT = process.env.PORT_TCP || 7000;
const rooms = new Map();

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  const ip = socket.remoteAddress;
  const port = socket.remotePort;

  addClient(socket);
  logEvent("CONNECT", null, ip, port, "Nuevo cliente conectado");

  socket.write(
    JSON.stringify({
      type: "system",
      body: "Bienvenido! Usa /auth <usuario> para autenticarte.",
    }) + "\n"
  );

  socket.on("data", (raw) => {
    const lines = raw.toString().split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        const client = getClientInfo(socket);

        // Autenticacion
        if (msg.type === "auth") {
          setUser(socket, msg.user);
          socket.write(
            JSON.stringify({
              type: "system",
              body: `Autenticado como ${msg.user}`,
            }) + "\n"
          );
          logEvent("AUTH", msg.user, ip, port, "Autenticación exitosa");
          continue;
        }

        // Bloqueo si no está autenticado
        if (!client.user) {
          socket.write(
            JSON.stringify({
              type: "error",
              body: "Debes autenticarte primero con /auth <usuario>",
            }) + "\n"
          );
          logEvent("ERROR", null, ip, port, "Intento sin autenticación");
          continue;
        }

        // cambiar apodo
        if (msg.type === "command" && msg.command === "/nick") {
          const newNick = msg.args?.[0];
          if (newNick) {
            const oldNick = client.user || id;
            client.user = newNick;

            socket.write(
              JSON.stringify({
                type: "system",
                body: `Nick cambiado de ${oldNick} → ${newNick}`,
              }) + "\n"
            );

            // Log del cambio
            logEvent(
              "NICKCHANGE",
              oldNick,
              socket.remoteAddress,
              `-> ${newNick}`
            );
          } else {
            socket.write(
              JSON.stringify({
                type: "error",
                body: "Debes indicar un nuevo nick: /nick <nombre>",
              }) + "\n"
            );
          }
          continue;
        }

        // Salas
        if (msg.type === "command" && msg.command?.startsWith("/join")) {
          const roomName = msg.command.split(" ")[1];
          setRoom(socket, roomName);
          if (!rooms.has(roomName)) rooms.set(roomName, new Set());
          rooms.get(roomName).add(client.user);

          socket.write(
            JSON.stringify({
              type: "system",
              body: `Te uniste a la sala ${roomName}`,
            }) + "\n"
          );
          logEvent("JOIN", client.user, ip, port, `Sala: ${roomName}`);
          continue;
        }

        // Listar salas disponibles
        if (msg.type === "command" && msg.command === "/salas") {
          const roomList = Array.from(rooms.entries()).map(
            ([name, users]) =>
              `${name} (${users.size} usuario${users.size !== 1 ? "s" : ""})`
          );

          socket.write(
            JSON.stringify({
              type: "system",
              body:
                roomList.length > 0
                  ? "Salas disponibles:\n" + roomList.join("\n")
                  : "No hay salas disponibles actualmente.",
            }) + "\n"
          );
          continue;
        }

        // Salir de la sala actual
        if (msg.type === "command" && msg.command === "/leave") {
          const client = getClientInfo(socket);

          //chequear si hay sala
          if (!client.room) {
            socket.write(
              JSON.stringify({
                type: "system",
                body: "No estás en ninguna sala actualmente.",
              }) + "\n"
            );
            continue;
          }

          const roomName = client.room;

          //Quitar usuario de la sala
          rooms.get(roomName)?.delete(client.user);

          //elimina sala vacia
          if (rooms.get(roomName)?.size === 0) {
            rooms.delete(roomName);
          }

          //borrar sala del cliente
          client.room = null;
          setRoom(socket, null);

          //confirmacion
          socket.write(
            JSON.stringify({
              type: "system",
              body: `Has salido de la sala '${roomName}'.`,
            }) + "\n"
          );

          //Notificar a los demás usuarios
          if (rooms.has(roomName)) {
            for (const c of getClientsInRoom(roomName)) {
              c.socket.write(
                JSON.stringify({
                  type: "system",
                  body: `${client.user} ha salido de la sala.`,
                }) + "\n"
              );
            }
          }

          // Log del evento
          logEvent(
            "ROOMEXIT",
            client.user,
            socket.remoteAddress,
            `Salió de ${roomName}`
          );

          continue;
        }

        // Listar usuarios online
        if (msg.type === "command" && msg.command === "/lista") {
          const names = getClients()
            .map((s) => getClientInfo(s).user || "anon")
            .join(", ");
          socket.write(
            JSON.stringify({
              type: "system",
              body: `Usuarios conectados: ${names}`,
            }) + "\n"
          );
          logEvent("MESSAGE", client.user, ip, port, "/lista");
          continue;
        }

        // Mensaje privado
        if (msg.type === "private" && msg.to) {
          for (const s of getClients()) {
            const target = getClientInfo(s);
            if (target.user === msg.to) {
              s.write(
                JSON.stringify({
                  type: "private",
                  from: client.user,
                  body: msg.body,
                }) + "\n"
              );
              logEvent(
                "MESSAGE",
                client.user,
                ip,
                port,
                `Privado -> ${msg.to}: ${msg.body}`
              );
            }
          }
          continue;
        }

        // Broadcast dentro de la sala
        if (msg.type === "message") {
          const room = client.room;
          if (!room) {
            socket.write(
              JSON.stringify({
                type: "error",
                body: "No estás en ninguna sala. Usa /join <sala>",
              }) + "\n"
            );
            continue;
          }

          for (const c of getClientsInRoom(room)) {
            if (c.socket !== socket) {
              c.socket.write(
                JSON.stringify({
                  type: "message",
                  from: client.user,
                  body: msg.body,
                  room,
                }) + "\n"
              );
            }
          }

          logEvent("MESSAGE", client.user, ip, port, `(${room}) ${msg.body}`);
        }
      } catch (e) {
        socket.write(
          JSON.stringify({
            type: "error",
            body: "JSON inválido",
          }) + "\n"
        );
        logEvent("ERROR", null, ip, port, "JSON inválido recibido");
      }
    }
  });

  socket.on("end", () => {
    const client = getClientInfo(socket);
    if (client?.room && client?.user) {
      rooms.get(client.room)?.delete(client.user);
    }
    removeClient(socket);
    logEvent("DISCONNECT", client?.user, ip, port, "Cliente desconectado");
  });

  socket.on("error", (err) => {
    logEvent("ERROR", null, ip, port, err.message);
    removeClient(socket);
  });
});

server.listen(PORT, () =>
  console.log(chalk.green(`Servidor escuchando en puerto ${PORT}`))
);
