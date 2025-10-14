const clients = new Map();

export function addClient(socket) {
  clients.set(socket, { user: null, room: null });
}

export function removeClient(socket) {
  clients.delete(socket);
}

export function setUser(socket, user) {
  const c = clients.get(socket);
  if (c) c.user = user;
}

export function setRoom(socket, room) {
  const c = clients.get(socket);
  if (c) c.room = room;
}

export function getClients() {
  return Array.from(clients.keys());
}

export function getClientInfo(socket) {
  return clients.get(socket);
}

export function getClientsInRoom(room) {
  return Array.from(clients.entries())
    .filter(([_, c]) => c.room === room)
    .map(([s, c]) => ({ socket: s, ...c }));
}
