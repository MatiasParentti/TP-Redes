#### TP entega parcial Redes - Chat multiusuario

## levantar servidor

npm run server

## levantar clientes

npm run client

## comandos

/auth <usuario> → Autenticarse
/nick <nombre> → Cambiar tu apodo
/join <sala> → Unirse o crear una sala
/salas → Ver salas disponibles
/leave → Salir de la sala actual
/msg <usuario> <mensaje> → Mensaje privado
/lista → Ver usuarios conectados
/quit → Salir del chat

## Logging (nuevo)

- El servidor ahora usa `winston` para logging estructurado.
- Archivos de log (JSON) se escriben en `server/logs/`:
	- `chat.log` (info y superiores)
	- `error.log` (errores)
- Además en modo desarrollo los logs se muestran en consola con formato legible.
- Para eventos importantes se usa `util/logEvent(type, user, ip, port, msg)`.
- Tipos de eventos usados: `CONNECT`, `AUTH`, `DISCONNECT`, `MESSAGE`, `ROOM_CREATE`, `ROOM_JOIN`, `ROOM_LEAVE`, `ROOM_DELETE`, `COMMAND`, `ERROR`, etc.

- Cada entrada de log JSON incluye ahora el campo adicional `messageHash` (SHA-256) calculado a partir del texto almacenado en `message`. Esto permite comparar mensajes por hash sin depender sólo del texto en claro.

## Cifrado de mensajes (nota)

- El servidor soporta mensajes cifrados AES si el cliente envía el body prefijado con `ENC:`. El backend mantiene utilidades `encrypt`/`decrypt` en `server/server.js` y por defecto usa la variable de entorno `AES_SECRET` o la clave `clave-secreta-256bits`.
- Si cambias la convención de cifrado (prefijo o clave) actualiza tanto frontend como backend para mantener compatibilidad.

