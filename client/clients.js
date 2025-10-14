import net from "net";
import readline from "readline";
import chalk from "chalk";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT_TCP || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.gray("> "),
});

let reconnectTimeout = null;
let socket = null;

function connectToServer() {
  socket = net.createConnection({ host: HOST, port: PORT }, () => {
    console.log(chalk.green(`Conectado al servidor ${HOST}:${PORT}`));
    console.log(
      chalk.gray("\nComandos disponibles:") +
        "\n" +
        chalk.gray(" - /auth <usuario> → Autenticarse") +
        "\n" +
        chalk.gray(" - /nick <nombre> → Cambiar tu apodo") +
        "\n" +
        chalk.gray(" - /join <sala> → Unirse o crear una sala") +
        "\n" +
        chalk.gray(" - /salas → Ver salas disponibles") +
        "\n" +
        chalk.gray(" - /leave → Salir de la sala actual") +
        "\n" +
        chalk.gray(" - /msg <usuario> <mensaje> → Mensaje privado") +
        "\n" +
        chalk.gray(" - /lista → Ver usuarios conectados") +
        "\n" +
        chalk.gray(" - /quit → Salir del chat") +
        "\n"
    );
    rl.prompt();
  });

  socket.setEncoding("utf8");

  // mensajes recibidos
  socket.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        switch (msg.type) {
          case "system":
            console.log(chalk.blueBright(`[Sistema]: ${msg.body}`));
            break;
          case "message":
            console.log(
              chalk.cyan(
                `[${msg.from || "Anon"}${msg.room ? "@" + msg.room : ""}]: ${
                  msg.body
                }`
              )
            );
            break;
          case "private":
            console.log(chalk.magenta(`[Privado de ${msg.from}]: ${msg.body}`));
            break;
          case "error":
            console.log(chalk.redBright(`[Error]: ${msg.body}`));
            break;
          default:
            console.log(chalk.gray(`[Srv raw]: ${line}`));
        }
      } catch {
        console.log(chalk.gray(`[Srv raw]: ${line}`));
      }
    }
    rl.prompt();
  });

  // cerrar conexion
  socket.on("end", () => {
    console.log(chalk.yellow("Conexión cerrada por el servidor"));
    scheduleReconnect();
  });

  // error de conexion
  socket.on("error", (err) => {
    console.error(chalk.red(`Error de conexión: ${err.message}`));
    socket.destroy();
    scheduleReconnect();
  });

  // entrada de usuario
  rl.on("line", (line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    //salir del chat general
    if (trimmed === "/quit") {
      console.log(chalk.blue("Saliendo del chat.."));
      socket.end();
      rl.close();
      process.exit(0);
    }

    // Autenticación
    if (trimmed.startsWith("/auth ")) {
      const user = trimmed.split(" ")[1];
      socket.write(JSON.stringify({ type: "auth", user }) + "\n");
    }

    // Cambiar nick
    else if (trimmed.startsWith("/nick ")) {
      const nick = trimmed.split(" ")[1];
      socket.write(
        JSON.stringify({ type: "command", command: "/nick", args: [nick] }) +
          "\n"
      );
    }

    // Listar salas
    else if (trimmed === "/salas") {
      socket.write(
        JSON.stringify({ type: "command", command: "/salas" }) + "\n"
      );
    }

    // Salir de la sala actual
    else if (trimmed === "/leave" || trimmed === "/salirdelaSala") {
      const payload = JSON.stringify({ type: "command", command: "/leave" });
      socket.write(payload + "\n"); // Solo un salto de línea
    }

    // Unirse a una sala
    else if (trimmed.startsWith("/join ")) {
      const room = trimmed.split(" ")[1];
      socket.write(
        JSON.stringify({ type: "command", command: `/join ${room}` }) + "\n"
      );
    }

    // Mensaje privado
    else if (trimmed.startsWith("/msg ")) {
      const [, to, ...rest] = trimmed.split(" ");
      const body = rest.join(" ");
      socket.write(JSON.stringify({ type: "private", to, body }) + "\n");
    }

    // Listar usuarios
    else if (trimmed === "/lista") {
      socket.write(
        JSON.stringify({ type: "command", command: "/lista" }) + "\n"
      );
    }

    // Mensaje público
    else {
      socket.write(JSON.stringify({ type: "message", body: trimmed }) + "\n");
    }

    rl.prompt();
  });
}

// reconexion cada 2 segundos automatica
function scheduleReconnect() {
  if (reconnectTimeout) return;
  console.log(chalk.yellow("🔄 Intentando reconectar en 2 segundos..."));
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToServer();
  }, 2000);
}

connectToServer();
