import {
  getClients,
  getClientInfo,
  getClientsInRoom,
} from "../client/clients-connect.js";
import { logEvent } from "../util/logger.js";
import { decrypt } from "../util/crypto.js";

// Enviar mensaje privado a un usuario
export function handlePrivateMessage(ws, client, targetUser, body, messageHash) {
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
      s.send(JSON.stringify({ type: "private", from: client.user, body, messageHash }));
    }
  }

  if (userFound) {
    // attempt to decrypt body to obtain plaintext for logging
    let plain = null;
    try {
      const candidate = body && typeof body === "string" && body.startsWith("ENC:") ? body.slice(4) : body;
      plain = decrypt(candidate) || null;
    } catch (e) {
      plain = null;
    }

    const messageForLog = plain || `[Privado] ${body}`;
    logEvent("MESSAGE", client.user, null, null, messageForLog, messageHash, body);
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
export function handleBroadcastMessage(ws, client, body, messageHash) {
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
  // Log the broadcast message (structured). Decrypt to log plaintext and record provided messageHash.
  let plain = null;
  try {
    const candidate = body && typeof body === "string" && body.startsWith("ENC:") ? body.slice(4) : body;
    plain = decrypt(candidate) || null;
  } catch (e) {
    plain = null;
  }

  const messageForLog = plain || `[Room:${room}] ${body}`;
  logEvent("MESSAGE", client.user, null, null, messageForLog, messageHash, body);

  for (const c of getClientsInRoom(room)) {
    if (c.socket !== ws) {
      c.socket.send(
        JSON.stringify({
          type: "message",
          from: client.user,
          room,
          body,
          messageHash,
        })
      );
    }
  }
}
