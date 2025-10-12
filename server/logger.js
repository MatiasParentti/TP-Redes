import fs from "fs";
import chalk from "chalk";

const logStream = fs.createWriteStream("./logs/chat.log", { flags: "a" });

export function logEvent(type, user, ip, detail = "") {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} | ${type} | Usuario: ${user} | IP: ${ip}${detail ? " | Detalle: " + detail : ""}\n`;

  logStream.write(line);

  switch (type) {
    case "CONEXION":
      console.log(chalk.green(line.trim()));
      break;
    case "DESCONEXION":
      console.log(chalk.yellow(line.trim()));
      break;
    case "MENSAJE":
      console.log(chalk.blue(line.trim()));
      break;
    default:
      console.log(line.trim());
  }
}

export function logMessage(line) {
  logStream.write(line + "\n");
  console.log(chalk.cyan(line.trim()));
}
