import { logEvent } from "../util/logger.js";

// Mapa de clientes conectados
const clients = new Map();

//Agrega un nuevo cliente al mapa con estado inicial sin usuario ni sala.
export function addClient(ws) {
  clients.set(ws, { user: null, room: null });
  logEvent("CONNECT", null, null, null, "Nuevo cliente añadido al mapa");
}

//Elimina un cliente del mapa y registra el evento.
export function removeClient(ws) {
  const info = clients.get(ws);
  clients.delete(ws);

  const mensaje = info?.user
    ? "Cliente eliminado del mapa"
    : "Socket eliminado del mapa";

  logEvent("DISCONNECT", info?.user || null, null, null, mensaje);
}

//nombre de usuario a un cliente
export function setUser(ws, user) {
  const c = clients.get(ws);
  if (c) c.user = user;
}

//asignar sala
export function setRoom(ws, room) {
  const c = clients.get(ws);
  if (c) c.room = room;
}

//todos los sockets guardados
export function getClients() {
  return [...clients.keys()];
}

//info de un cliente asociado a un socket
export function getClientInfo(ws) {
  return clients.get(ws);
}

//todos los clientes de una sala
export function getClientsInRoom(room) {
  return [...clients.entries()]
    .filter(([, c]) => c.room === room)
    .map(([socket, c]) => ({ socket, ...c }));
}
