import {
  getClients,
  getClientInfo,
  getClientsInRoom,
} from "../client/clients-connect.js";

// Enviar mensaje privado a un usuario
export function handlePrivateMessage(ws, client, targetUser, body) {
  if (!targetUser || !body) {
    ws.send(
      JSON.stringify({ type: "error", body: "Uso: /msg <usuario> <mensaje>" })
    );
    return;
  }

  let userFound = false;
  for (const s of getClients()) {
    const inf = getClientInfo(s);
    if (inf.user === targetUser) {
      userFound = true;
      s.send(JSON.stringify({ type: "private", from: client.user, body }));
    }
  }

  if (!userFound) {
    ws.send(
      JSON.stringify({
        type: "error",
        body: `Usuario ${targetUser} no encontrado`,
      })
    );
  }
}

// Enviar mensaje público a la sala
export function handleBroadcastMessage(ws, client, body) {
  const room = client.room;

  if (!room) {
    ws.send(
      JSON.stringify({
        type: "error",
        body: "No estás en ninguna sala. Usa /join <sala>",
      })
    );
    return;
  }

  if (!body) {
    ws.send(JSON.stringify({ type: "error", body: "Mensaje vacío" }));
    return;
  }

  for (const c of getClientsInRoom(room)) {
    if (c.socket !== ws) {
      c.socket.send(
        JSON.stringify({
          type: "message",
          from: client.user,
          room,
          body,
        })
      );
    }
  }
}
