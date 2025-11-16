import { getClientsInRoom, setRoom } from "../client/clients-connect.js";

export const rooms = new Map();

// Unir cliente a una sala
export function joinRoom(ws, client, roomName) {
  if (client.room && rooms.has(client.room)) {
    leaveRoom(ws, client, false);
  }

  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
    console.log(`✅ Sala creada: ${roomName}`);
  }

  rooms.get(roomName).add(client.user);
  setRoom(ws, roomName);

  console.log(`👤 ${client.user} se unió a ${roomName}`, [
    ...rooms.get(roomName),
  ]);
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
  console.log(`👤 ${client.user} saliendo de ${room}`);

  const users = rooms.get(room);
  if (users) {
    users.delete(client.user);
    console.log(`📊 Usuarios restantes en ${room}:`, [...users]);

    if (users.size === 0) {
      rooms.delete(room);
      console.log(`🗑️ Sala ${room} eliminada por estar vacía`);
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
  console.log(`🧹 Limpiando salas del usuario: ${user}`);

  for (const [roomName, users] of rooms.entries()) {
    if (users.delete(user)) {
      console.log(`👤 ${user} removido de ${roomName}`);
      if (users.size === 0) {
        rooms.delete(roomName);
        console.log(`🗑️ Sala ${roomName} eliminada por estar vacía`);
      }
    }
  }
}

// Devuelve lista de salas activas
export function getRoomList() {
  const roomList = [...rooms.entries()]
    .map(([name, users]) => `${name} (${users.size})`)
    .join("\n");

  console.log(`📋 Lista de salas actual:`, [...rooms.entries()]);
  return roomList || "No hay salas activas";
}

// Notifica a todos los usuarios de una sala
function notifyRoomUsers(room, message, excludeWs = null) {
  const clientsInRoom = getClientsInRoom(room);
  console.log(
    `📢 Notificando a ${clientsInRoom.length} usuarios en ${room}: ${message}`
  );

  for (const c of clientsInRoom) {
    if (c.socket !== excludeWs) {
      c.socket.send(JSON.stringify({ type: "system", body: message }));
    }
  }
}

export { getClientsInRoom };
