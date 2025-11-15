import jwt from "jsonwebtoken";
import { setUser } from "../client/clients-connect.js";

let JWT_SECRET = "changeme";
const TOKEN_TTL = process.env.JWT_TTL || "2h";

export const handleAuth = {
  init(secret) {
    JWT_SECRET = secret || "changeme";
  },

  generateToken(user) {
    return jwt.sign({ user }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  },

  verifyToken(token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return { valid: true, payload };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  },

  processAuth(ws, msgObj) {
    const token = msgObj.token;

    if (!token) {
      if (msgObj.user) {
        
        setUser(ws, msgObj.user);
        ws.send(JSON.stringify({ type: "system", body: `Autenticado como ${msgObj.user} (DEV modo)` }));
        return;
      }
      ws.send(JSON.stringify({ type: "error", body: "Se requiere token JWT" }));
      return;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      setUser(ws, payload.user);
      ws.send(JSON.stringify({
        type: "system",
        body: `Autenticado como ${payload.user}`
      }));
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", body: "JWT inválido: " + err.message }));
    }
  }
};