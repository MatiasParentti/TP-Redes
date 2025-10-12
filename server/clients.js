const clients = new Set();

export function addClient(socket) {
  clients.add(socket);
}

export function removeClient(socket) {
  clients.delete(socket);
}

export function getClients() {
  return Array.from(clients);
}
