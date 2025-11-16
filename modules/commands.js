import {
  getClients,
  getClientInfo,
  setUser,
} from "../client/clients-connect.js";

// Procesa comandos
export function handleCommand(ws, client, command, roomsManager) {
  const [baseCommand, ...args] = command.split(" ");

  switch (baseCommand) {
    case "/lista":
      handleListUsers(ws);
      break;

    case "/join":
      args[0]
        ? roomsManager.joinRoom(ws, client, args[0])
        : ws.send(JSON.stringify({ type: "error", body: "Uso: /join <sala>" }));
      break;

    case "/salas":
      handleListRooms(ws, roomsManager);
      break;

    case "/nick":
      args[0]
        ? handleNickChange(ws, client, args[0], roomsManager.rooms)
        : ws.send(
            JSON.stringify({ type: "error", body: "Uso: /nick <nuevo_apodo>" })
          );
      break;

    case "/leave":
      roomsManager.leaveRoom(ws, client, true);
      break;

    case "/quit":
      ws.send(JSON.stringify({ type: "system", body: "Desconectando..." }));
      ws.close();
      break;

    default:
      ws.send(JSON.stringify({ type: "error", body: "Comando desconocido" }));
  }
}

// Lista todos los usuarios conectados
function handleListUsers(ws) {
  const names = getClients()
    .map((s) => getClientInfo(s).user || "anon")
    .join(", ");
  ws.send(JSON.stringify({ type: "system", body: `Usuarios: ${names}` }));
}

// Lista todas las salas activas
function handleListRooms(ws, roomsManager) {
  const list = roomsManager.getRoomList();
  ws.send(JSON.stringify({ type: "system", body: list }));
}

// Cambia el apodo del usuario
function handleNickChange(ws, client, newNick, rooms) {
  const nickInUse = getClients().some((s) => {
    const info = getClientInfo(s);
    return info.user === newNick && s !== ws;
  });

  if (nickInUse) {
    ws.send(JSON.stringify({ type: "error", body: "El apodo ya está en uso" }));
    return;
  }

  const oldNick = client.user;
  setUser(ws, newNick);

  if (client.room) {
    const roomUsers = rooms.get(client.room);
    if (roomUsers) {
      roomUsers.delete(oldNick);
      roomUsers.add(newNick);
    }
  }

  ws.send(
    JSON.stringify({ type: "system", body: `Apodo cambiado a: ${newNick}` })
  );
}
