import fs from "fs";
import chalk from "chalk";

const logStream = fs.createWriteStream("./logs/chat.log", { flags: "a" });

export function logEvent(type, user, ip, port, msg = "") {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${type} usuario=${user || "anon"} ip=${ip} port=${port} msg=${msg}`;

  logStream.write(line + "\n");

  switch (type) {
    case "CONNECT":
      console.log(chalk.green(line));
      break;
    case "AUTH":
      console.log(chalk.green(line));
      break;
    case "DISCONNECT":
      console.log(chalk.yellow(line));
      break;
    case "MESSAGE":
      console.log(chalk.blue(line));
      break;
    case "NICKCHANGE":
      console.log(chalk.magenta(line));
      break;
    case "ERROR":
      console.log(chalk.red(line));
      break;
    default:
      console.log(chalk.white(line));
  }
}
