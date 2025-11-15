import { getClientsInRoom, setRoom } from "../client/clients-connect.js";


export const rooms = new Map();

export function joinRoom(ws, client, roomName) {
  // Salir de la sala anterior si estaba en una
  if (client.room && rooms.has(client.room)) {
    leaveRoom(ws, client, false);
  }

  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(client.user);

  setRoom(ws, roomName);

  ws.send(JSON.stringify({ type: "system", body: `Unido a sala ${roomName}` }));
  
  // Notificar a otros en la sala
  notifyRoomUsers(roomName, `${client.user} se unió a la sala`, ws);
}

export function leaveRoom(ws, client, notifyOthers = true) {
  if (!client.room) {
    ws.send(JSON.stringify({ type: "error", body: "No estás en ninguna sala" }));
    return;
  }

  const room = client.room;
  
  // Remover de la sala
  if (rooms.has(room)) {
    rooms.get(room).delete(client.user);
    
    // Eliminar sala si está vacía
    if (rooms.get(room).size === 0) {
      rooms.delete(room);
    }
  }

  setRoom(ws, null);
  ws.send(JSON.stringify({ type: "system", body: `Saliste de la sala ${room}` }));
  
  // Notificar a otros en la sala
  if (notifyOthers) {
    notifyRoomUsers(room, `${client.user} salió de la sala`, ws);
  }
}

export function getRoomList() {
  return [...rooms.entries()]
    .map(([name, users]) => `${name} (${users.size})`)
    .join("\n");
}

function notifyRoomUsers(room, message, excludeWs = null) {
  for (const c of getClientsInRoom(room)) {
    if (c.socket !== excludeWs) {
      c.socket.send(JSON.stringify({
        type: "system",
        body: message
      }));
    }
  }
}


export { getClientsInRoom };