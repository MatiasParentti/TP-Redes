import net from "net";
import readline from "readline";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT_TCP || 7000;
const HOST = process.env.HOST || "127.0.0.1";
const rl = readline.createInterface(process.stdin, process.stdout);

let myNick = "";

function startClient() {
  const socket = net.createConnection({ port: PORT, host: HOST }, () => {
    console.log(chalk.green(`✅ Conectado al servidor en ${HOST}:${PORT}`));
    console.log(
      chalk.gray("Comandos disponibles:") +
        "\n" +
        chalk.gray(" - /nick <nombre> → Cambiar tu apodo") +
        "\n" +
        chalk.gray(" - /lista → Ver usuarios conectados") +
        "\n" +
        chalk.gray(" - /quit → Salir del chat")
    );
  });

  socket.setEncoding("utf8");

  // mensajes recibidos desde servidor
  socket.on("data", (d) => {
    const msg = d.trim();

    // detectar mensaje de cambio de nick del servidor
    if (msg.startsWith("Tu nick ahora es ")) {
      myNick = msg.split("Tu nick ahora es ")[1].trim();
      console.log(chalk.magenta(`Tu nick ha sido actualizado a: ${myNick}`));
      return;
    }

    console.log(chalk.cyan(msg));
  });

  socket.on("end", () => {
    console.log(chalk.yellow("Conexión cerrada por servidor"));
    rl.close();
  });

  socket.on("error", (err) => {
    console.error(chalk.red(`Error de conexión: ${err.message}`));
    rl.close();
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();

    if (trimmed === "/quit") {
      console.log(chalk.blue("Saliendo del chat..."));
      socket.end();
      rl.close();
      return;
    }

    socket.write(trimmed + "\n");
  });
}

startClient();
