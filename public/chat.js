let token = null;
let ws = null;
let myUser = null;
let currentRoom = null;

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const btnLogin = document.getElementById("btnLogin");
const loginUser = document.getElementById("loginUser");
const controls = document.getElementById("controls");
const inputMsg = document.getElementById("inputMsg");
const btnSend = document.getElementById("btnSend");
const btnLista = document.getElementById("btnLista");
const btnSalas = document.getElementById("btnSalas");

function log(s) {
  const p = document.createElement("div");
  p.textContent = s;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function appendMessage(message) {
  const p = document.createElement("div");
  p.textContent = message;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

btnLogin.addEventListener("click", async () => {
  const user = loginUser.value.trim();
  if (!user) return alert("Ingresa usuario");
  try {
    const r = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
    const data = await r.json();
    if (data.token) {
      token = data.token;
      myUser = user;
      statusEl.textContent = `JWT obtenido para ${user}`;
      connectWS();
    } else {
      alert("Error en login: " + JSON.stringify(data));
    }
  } catch (e) {
    alert("Error: " + e.message);
  }
});

function connectWS() {
  if (!token) return alert("Token requerido");
  
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}`; 
  ws = new WebSocket(url);

  ws.addEventListener("open", () => {
    log("[Sistema] Conectado al servidor WS");
    
    ws.send(JSON.stringify({ type: "auth", token }));
    controls.style.display = "flex";
  });

  ws.addEventListener("message", (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case "system":
          log(`[Sistema] ${msg.body}`);
          break;
        case "message":
          log(`[${msg.from}${msg.room? "@" + msg.room : ""}]: ${msg.body}`);
          break;
        case "private":
          log(`[Privado de ${msg.from}]: ${msg.body}`);
          break;
        case "error":
          log(`[Error] ${msg.body}`);
          break;
        default:
          log(`[Raw] ${ev.data}`);
      }
    } catch {
      log("[Raw] " + ev.data);
    }
  });

  ws.addEventListener("close", () => {
    log("[Sistema] Conexión cerrada");
    controls.style.display = "none";
    myUser = null;
    currentRoom = null;
  });

  ws.addEventListener("error", (e) => {
    log("[Sistema] Error en WS");
  });
}

btnSend.addEventListener("click", sendMessage);
inputMsg.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = inputMsg.value.trim();
  if (!text || !ws) return;

  
  if (text.startsWith("/nick ")) {
    const nick = text.split(" ")[1];
    ws.send(JSON.stringify({ type: "command", command: `/nick ${nick}` }));
    inputMsg.value = "";
    return;
  } 
  
  if (text.startsWith("/join ")) {
    const room = text.split(" ")[1];
    ws.send(JSON.stringify({ type: "command", command: `/join ${room}` }));
    inputMsg.value = "";
    return;
  } 
  
  if (text === "/leave") {
    ws.send(JSON.stringify({ type: "command", command: "/leave" }));
    inputMsg.value = "";
    return;
  } 
  
  if (text === "/salas") {
    ws.send(JSON.stringify({ type: "command", command: "/salas" }));
    inputMsg.value = "";
    return;
  } 
  
  if (text === "/lista") {
    ws.send(JSON.stringify({ type: "command", command: "/lista" }));
    inputMsg.value = "";
    return;
  } 
  
  if (text.startsWith("/msg ")) {
    const parts = text.split(" ");
    if (parts.length < 3) {
      appendMessage("[Error] Uso: /msg <usuario> <mensaje>");
      inputMsg.value = "";
      return;
    }
    const to = parts[1];
    const body = parts.slice(2).join(" ");
    ws.send(JSON.stringify({ type: "private", to, body }));
    inputMsg.value = "";
    return;
  }
  
  if (text === "/quit") {
    ws.send(JSON.stringify({ type: "command", command: "/quit" }));
    inputMsg.value = "";
    return;
  }

  
  if (currentRoom) {
    appendMessage(`[${myUser}@${currentRoom}]: ${text}`);
  } else {
    appendMessage(`[${myUser}]: ${text}`);
  }

  
  ws.send(JSON.stringify({ type: "message", body: text }));
  inputMsg.value = "";
}

btnLista.addEventListener("click", () => {
  if (ws) ws.send(JSON.stringify({ type: "command", command: "/lista" }));
});

btnSalas.addEventListener("click", () => {
  if (ws) ws.send(JSON.stringify({ type: "command", command: "/salas" }));
});


ws?.addEventListener("message", (ev) => {
  try {
    const msg = JSON.parse(ev.data);
    if (msg.type === "system") {
      if (msg.body.startsWith("Unido a sala")) {
        currentRoom = msg.body.split(" ")[3];
      } else if (msg.body.startsWith("Saliste de la sala")) {
        currentRoom = null;
      }
    }
  } catch (e) {
   
  }
});