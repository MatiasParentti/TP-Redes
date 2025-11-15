const clients = new Map();

export function addClient(ws) {
  clients.set(ws, { user: null, room: null });
}

export function removeClient(ws) {
  clients.delete(ws);
}

export function setUser(ws, user) {
  const c = clients.get(ws);
  if (c) c.user = user;
}

export function setRoom(ws, room) {
  const c = clients.get(ws);
  if (c) c.room = room;
}

export function getClients() {
  return Array.from(clients.keys());
}

export function getClientInfo(ws) {
  return clients.get(ws);
}

export function getClientsInRoom(room) {
  return Array.from(clients.entries())
    .filter(([_, c]) => c.room === room)
    .map(([socket, c]) => ({ socket, ...c }));
}