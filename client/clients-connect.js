import { logEvent } from "../util/logger.js";

// Mapa de clientes conectados
const clients = new Map();

// Agrega un nuevo cliente al mapa
export function addClient(ws) {
  clients.set(ws, { user: null, room: null });
  // registro estructurado: nuevo socket añadido (sin usuario todavía)
  logEvent("CONNECT", null, null, null, "Nuevo cliente añadido al mapa");
}

// Elimina un cliente del mapa
export function removeClient(ws) {
  const info = clients.get(ws);
  clients.delete(ws);
  if (info?.user) {
    logEvent("DISCONNECT", info.user, null, null, "Cliente eliminado del mapa");
  } else {
    logEvent("DISCONNECT", null, null, null, "Socket eliminado del mapa");
  }
}

// Asigna nombre de usuario al cliente
export function setUser(ws, user) {
  const c = clients.get(ws);
  if (c) c.user = user;
}

// Asigna sala actual al cliente
export function setRoom(ws, room) {
  const c = clients.get(ws);
  if (c) c.room = room;
}

// Devuelve todos los sockets conectados
export function getClients() {
  return [...clients.keys()];
}

// Devuelve la info del cliente asociado al socket
export function getClientInfo(ws) {
  return clients.get(ws);
}

// Devuelve los clientes que están en una sala específica
export function getClientsInRoom(room) {
  return [...clients.entries()]
    .filter(([, c]) => c.room === room)
    .map(([socket, c]) => ({ socket, ...c }));
}
