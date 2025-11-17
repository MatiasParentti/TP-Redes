import { getClientsInRoom, setRoom } from "../client/clients-connect.js";
import { logEvent } from "../util/logger.js";

export const rooms = new Map();

// Unir cliente a una sala
export function joinRoom(ws, client, roomName) {
  if (client.room && rooms.has(client.room)) {
    leaveRoom(ws, client, false);
  }

  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    logEvent("ROOM_CREATE", client.user, null, null, `Sala creada: ${roomName}`);
  }

  rooms.get(roomName).add(client.user);
  setRoom(ws, roomName);

  logEvent("ROOM_JOIN", client.user, null, null, `Se unió a sala ${roomName}`);
  ws.send(JSON.stringify({ type: "system", body: `Unido a sala ${roomName}` }));

  notifyRoomUsers(roomName, `${client.user} se unió a la sala`, ws);
}

// Salir de una sala
export function leaveRoom(ws, client, notifyOthers = true) {
  if (!client.room) {
    ws.send(
      JSON.stringify({ type: "error", body: "No estás en ninguna sala" })
    );
    return;
  }

  const room = client.room;
  logEvent("ROOM_LEAVE", client.user, null, null, `Saliendo de ${room}`);

  const users = rooms.get(room);
  if (users) {
    users.delete(client.user);
    logEvent("ROOM_STATE", client.user, null, null, `Usuarios en ${room}: ${[...users]}`);

    if (users.size === 0) {
      rooms.delete(room);
      logEvent("ROOM_DELETE", null, null, null, `Sala ${room} eliminada (vacía)`);
    }
  }

  setRoom(ws, null);
  ws.send(
    JSON.stringify({ type: "system", body: `Saliste de la sala ${room}` })
  );

  if (notifyOthers) {
    notifyRoomUsers(room, `${client.user} salió de la sala`, ws);
  }
}

// Limpia al usuario de todas las salas (desconexión)
export function cleanupUserRooms(user) {
  logEvent("ROOM_CLEANUP", user, null, null, `Limpiando salas de: ${user}`);

  for (const [roomName, users] of rooms.entries()) {
    if (users.delete(user)) {
      logEvent("ROOM_STATE", user, null, null, `Removido ${user} de ${roomName}`);
      if (users.size === 0) {
        rooms.delete(roomName);
        logEvent("ROOM_DELETE", null, null, null, `Sala ${roomName} eliminada por estar vacía`);
      }
    }
  }
}

// Devuelve lista de salas activas
export function getRoomList() {
  const roomList = [...rooms.entries()]
    .map(([name, users]) => `${name} (${users.size})`)
    .join("\n");

  logEvent("ROOM_LIST", null, null, null, `Lista de salas: ${[...rooms.entries()]}`);
  return roomList || "No hay salas activas";
}

// Notifica a todos los usuarios de una sala
function notifyRoomUsers(room, message, excludeWs = null) {
  const clientsInRoom = getClientsInRoom(room);
  logEvent("NOTIFY", null, null, null, `Notificando ${clientsInRoom.length} usuarios en ${room}: ${message}`);

  for (const c of clientsInRoom) {
    if (c.socket !== excludeWs) {
      c.socket.send(JSON.stringify({ type: "system", body: message }));
    }
  }
}

export { getClientsInRoom };
