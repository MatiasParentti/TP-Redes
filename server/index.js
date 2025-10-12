import net from "net";
import chalk from "chalk";
import { addClient, removeClient, getClients } from "./clients.js";
import { logEvent } from "./logger.js";

const PORT = process.env.PORT_TCP || 7000;

const server = net.createServer((socket) => {
  socket.setEncoding("utf8");
  socket.id = `${socket.remoteAddress}:${socket.remotePort}`;
  socket.nick = socket.id;

  addClient(socket);

  //log
  logEvent("CONEXION", socket.nick, socket.id, "Se ha conectado al servidor");

  socket.write("Bienvenido! Usa /nick <tuNombre> para cambiar tu nombre\n");

  socket.on("data", (data) => {
    const msg = data.toString().trim();

    // comando /nick
    if (msg.startsWith("/nick ")) {
      const newNick = msg.split(" ")[1];
      if (newNick) {
        const oldNick = socket.nick;
        socket.nick = newNick;
        socket.write(`Tu nick ahora es ${socket.nick}\n`);
        logEvent(
          "MENSAJE",
          socket.nick,
          socket.id,
          `/nick: ${oldNick} -> ${socket.nick}`
        );
      }
      return;
    }

    // comando /lista
    if (msg === "/lista") {
      const names = getClients()
        .map((c) => c.nick)
        .join(", ");
      socket.write(`Usuarios conectados: ${names}\n`);
      return;
    }

    // broadcast a todos menos al emisor
    const line = `${new Date().toISOString()} ${socket.nick}: ${msg}`;
    for (const c of getClients()) {
      if (c !== socket) c.write(line + "\n");
    }

    // log de mensaje
    logEvent("MENSAJE", socket.nick, socket.id, msg);
  });

  socket.on("end", () => {
    removeClient(socket);
    logEvent(
      "DESCONEXION",
      socket.nick,
      socket.id,
      "Se ha desconectado del chat"
    );

    // informar a otros usuarios
    const leaveMsg = `${socket.nick} salió del chat\n`;
    for (const c of getClients()) c.write(leaveMsg);
  });

  socket.on("error", () => {
    removeClient(socket);
  });
});

server.listen(PORT, () =>
  console.log(chalk.green(`Servidor en puerto ${PORT}`))
);
