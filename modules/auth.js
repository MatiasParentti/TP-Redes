import jwt from "jsonwebtoken";
import { setUser } from "../client/clients-connect.js";
import { logEvent } from "../util/logger.js";

let JWT_SECRET = "river_plate";
const TOKEN_TTL = process.env.JWT_TTL || "2h";

const MOCK_USERS = [
  { username: "admin", password: "admin123", displayName: "Administrador" },
  { username: "usuario1", password: "pass123", displayName: "Usuario Uno" },
  { username: "usuario2", password: "pass123", displayName: "Usuario Dos" },
  { username: "test", password: "test", displayName: "Usuario Test" },
  { username: "matias", password: "123456", displayName: "Matías" },
  { username: "ana", password: "abcdef", displayName: "Ana" },
];

export const handleAuth = {
  init(secret) {
    JWT_SECRET = secret || "river_plate";
  },

  //auth de usuario
  authenticateUser(username, password) {
    const user = MOCK_USERS.find(
      (u) => u.username === username && u.password === password
    );
    return user ? this.generateToken(user.username) : null;
  },

  //token
  generateToken(user) {
    return jwt.sign({ user }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  },

  //verificar token
  verifyToken(token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return { valid: true, payload };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  },

  // Procesar autenticación WebSocket
  processAuth(ws, msgObj) {
    const { token, user } = msgObj;

    // Modo desarrollo: autenticación sin token
    if (!token) {
      if (user) {
        const userExists = MOCK_USERS.some((u) => u.username === user);
        if (userExists) {
          setUser(ws, user);
          ws.send(
            JSON.stringify({
              type: "system",
              body: `Autenticado como ${user} (DEV modo)`,
            })
          );
          logEvent("AUTH", user, null, null, "Autenticación DEV exitosa");
        } else {
          const disponibles = MOCK_USERS.map((u) => u.username).join(", ");
          ws.send(
            JSON.stringify({
              type: "error",
              body: `Usuario ${user} no existe. Usuarios disponibles: ${disponibles}`,
            })
          );
        }
      } else {
        ws.send(
          JSON.stringify({
            type: "error",
            body: "Se requiere token JWT",
          })
        );
      }
      return;
    }

    // Autenticación con token JWT
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      setUser(ws, payload.user);
      ws.send(
        JSON.stringify({
          type: "system",
          body: `Autenticado como ${payload.user}`,
        })
      );
      logEvent("AUTH", payload.user, null, null, "Autenticación JWT exitosa");
    } catch (err) {
      ws.send(
        JSON.stringify({
          type: "error",
          body: "JWT inválido: " + err.message,
        })
      );
      logEvent("ERROR", null, null, null, `JWT inválido: ${err.message}`);
    }
  },
};
