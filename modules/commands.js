import { getClients, getClientInfo, setUser, setRoom } from "../client/clients-connect.js";

export function handleCommand(ws, client, command, roomsManager) {
  const parts = command.split(" ");
  const baseCommand = parts[0];
  const args = parts.slice(1);

  switch (baseCommand) {
    case "/lista":
      handleListUsers(ws);
      break;

    case "/join":
      if (args.length < 1) {
        ws.send(JSON.stringify({ type: "error", body: "Uso: /join <sala>" }));
        return;
      }
      roomsManager.joinRoom(ws, client, args[0]);
      break;

    case "/salas":
      handleListRooms(ws, roomsManager);
      break;

    case "/nick":
      if (args.length < 1) {
        ws.send(JSON.stringify({ type: "error", body: "Uso: /nick <nuevo_apodo>" }));
        return;
      }
      handleNickChange(ws, client, args[0], roomsManager.rooms);
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

function handleListUsers(ws) {
  const names = getClients()
    .map(s => getClientInfo(s).user || "anon")
    .join(", ");
  ws.send(JSON.stringify({ type: "system", body: `Usuarios: ${names}` }));
}

function handleListRooms(ws, roomsManager) {
  const list = roomsManager.getRoomList();
  ws.send(JSON.stringify({ type: "system", body: list || "No hay salas activas" }));
}

function handleNickChange(ws, client, newNick, rooms) {
  // Verificar si el nick ya está en uso
  const nickInUse = getClients().some(s => {
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

  ws.send(JSON.stringify({ type: "system", body: `Apodo cambiado a: ${newNick}` }));
}