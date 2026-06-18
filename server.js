"use strict";

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { AuthoritativeMatch, TICK_MS } = require("./authoritative-match");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const rooms = new Map();
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function roomCode() {
  let code;
  do {
    code = Array.from({ length: 7 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function token() {
  return crypto.randomBytes(18).toString("base64url");
}

function safeName(value) {
  return String(value || "Gojo").replace(/[<>&]/g, "").trim().slice(0, 16) || "Gojo";
}

function roomView(room) {
  return {
    code: room.code,
    state: room.state,
    hostSlot: room.players.get(room.hostToken)?.slot || 1,
    map: room.map,
    settings: room.settings,
    chat: room.chat,
    players: [...room.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({
        slot: p.slot,
        name: p.name,
        ready: p.ready,
        character: p.character,
        variant: p.variant,
        locked: p.locked,
        connected: Boolean(p.client),
        ping: p.ping,
      })),
  };
}

function broadcast(room, message, exceptToken = "") {
  for (const player of room.players.values()) {
    if (player.client && player.token !== exceptToken) player.client.send(message);
  }
}

function syncRoom(room) {
  broadcast(room, { type: "roomState", room: roomView(room) });
}

function destroyRoom(room) {
  rooms.delete(room.code);
  for (const player of room.players.values()) {
    if (player.client) {
      player.client.room = null;
      player.client.send({ type: "roomClosed" });
    }
  }
}

function leavePlayer(client, permanent = false) {
  const room = client.room;
  if (!room || !client.player) return;
  const player = client.player;
  player.client = null;
  player.disconnectedAt = Date.now();
  if (room.state === "match" && room.match) room.match.disconnect(player.slot);
  client.room = null;
  client.player = null;
  if (permanent) {
    room.players.delete(player.token);
    if (!room.players.size) return destroyRoom(room);
    if (room.hostToken === player.token) {
      const next = [...room.players.values()].sort((a, b) => a.slot - b.slot)[0];
      room.hostToken = next.token;
      next.slot = 1;
    }
    if (room.state !== "lobby") {
      room.state = "lobby";
      room.result = null;
      room.match = null;
      room.votes.clear();
    }
  }
  syncRoom(room);
  broadcast(room, { type: "connection", slot: player.slot, connected: false });
}

function attachPlayer(client, room, player) {
  if (client.room && client.room !== room) leavePlayer(client, true);
  if (player.client && player.client !== client) player.client.close();
  player.client = client;
  player.disconnectedAt = 0;
  client.room = room;
  client.player = player;
  client.send({
    type: "joined",
    token: player.token,
    slot: player.slot,
    room: roomView(room),
  });
  syncRoom(room);
  broadcast(room, { type: "connection", slot: player.slot, connected: true });
}

function createRoom(client, msg) {
  const code = roomCode();
  const playerToken = token();
  const player = {
    token: playerToken,
    slot: 1,
    name: safeName(msg.name),
    ready: false,
    character: null,
    variant: "normal",
    locked: false,
    ping: 0,
    client,
    disconnectedAt: 0,
    stats: null,
  };
  const room = {
    code,
    state: "lobby",
    hostToken: playerToken,
    map: "shinjuku",
    settings: { time: 99, energy: 70 },
    players: new Map([[playerToken, player]]),
    chat: [],
    loaded: new Set(),
    votes: new Map(),
    result: null,
    match: null,
    createdAt: Date.now(),
    touchedAt: Date.now(),
  };
  rooms.set(code, room);
  client.room = room;
  client.player = player;
  client.send({ type: "joined", token: playerToken, slot: 1, room: roomView(room) });
}

function joinRoom(client, msg) {
  const code = String(msg.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const room = rooms.get(code);
  if (!room) return client.send({ type: "error", message: "ROOM NOT FOUND" });
  if (room.state !== "lobby") return client.send({ type: "error", message: "MATCH ALREADY STARTED" });
  if (room.players.size >= 2) return client.send({ type: "error", message: "ROOM IS FULL" });
  const playerToken = token();
  const used = new Set([...room.players.values()].map((p) => p.slot));
  const player = {
    token: playerToken,
    slot: used.has(1) ? 2 : 1,
    name: safeName(msg.name),
    ready: false,
    character: null,
    variant: "normal",
    locked: false,
    ping: 0,
    client,
    disconnectedAt: 0,
    stats: null,
  };
  room.players.set(playerToken, player);
  room.touchedAt = Date.now();
  attachPlayer(client, room, player);
}

function reconnect(client, msg) {
  const room = rooms.get(String(msg.code || "").toUpperCase());
  const player = room && room.players.get(String(msg.token || ""));
  if (!room || !player) return client.send({ type: "reconnectFailed" });
  attachPlayer(client, room, player);
  if (room.state === "match" && room.match) {
    client.send({
      type: "resumeMatch",
      room: roomView(room),
      startAt: room.match.startAt,
      snapshot: room.match.snapshot(),
    });
  }
}

function startAuthoritativeMatch(room, startAt, seed) {
  const players = [...room.players.values()].map((player) => ({
    slot: player.slot,
    character: player.character,
    variant: player.variant,
  }));
  room.match = new AuthoritativeMatch({
    players,
    settings: room.settings,
    startAt,
    seed,
    onSnapshot(snapshot) {
      broadcast(room, { type: "matchSnapshot", snapshot });
    },
    onResult(result) {
      if (room.result) return;
      room.result = result;
      room.state = "ended";
      broadcast(room, {
        type: "matchResult",
        winnerSlot: result.winnerSlot,
        stats: result.stats,
        authoritative: true,
      });
      syncRoom(room);
    },
  });
}

function handleRoomMessage(client, msg) {
  const room = client.room;
  const player = client.player;
  if (!room || !player) return client.send({ type: "error", message: "NOT IN A ROOM" });
  room.touchedAt = Date.now();
  const isHost = room.hostToken === player.token;

  if (msg.type === "ready" && room.state === "lobby") {
    player.ready = Boolean(msg.ready);
    syncRoom(room);
  } else if (msg.type === "map" && room.state === "lobby" && isHost) {
    if (["shinjuku", "shibuya", "jujutsuHigh", "kyoto"].includes(msg.map)) room.map = msg.map;
    syncRoom(room);
  } else if (msg.type === "settings" && room.state === "lobby" && isHost) {
    room.settings.time = [60, 99, 180].includes(Number(msg.time)) ? Number(msg.time) : room.settings.time;
    room.settings.energy = [50, 70, 100].includes(Number(msg.energy)) ? Number(msg.energy) : room.settings.energy;
    syncRoom(room);
  } else if (msg.type === "chat") {
    const text = String(msg.text || "").replace(/[<>&]/g, "").trim().slice(0, 120);
    if (!text) return;
    const entry = { name: player.name, slot: player.slot, text, at: Date.now() };
    room.chat.push(entry);
    room.chat = room.chat.slice(-30);
    broadcast(room, { type: "chat", entry });
  } else if (msg.type === "start" && room.state === "lobby" && isHost) {
    const players = [...room.players.values()];
    if (players.length !== 2 || players.some((p) => !p.ready || !p.client)) {
      return client.send({ type: "error", message: "BOTH PLAYERS MUST BE CONNECTED AND READY" });
    }
    room.state = "selecting";
    room.loaded.clear();
    room.votes.clear();
    room.result = null;
    room.match = null;
    for (const p of players) {
      p.stats = null;
      p.character = null;
      p.variant = "normal";
      p.locked = false;
    }
    broadcast(room, { type: "characterSelect", room: roomView(room) });
    syncRoom(room);
  } else if (msg.type === "character" && room.state === "selecting") {
    if (!["gojo", "sukuna", "hakari", "higuruma"].includes(msg.character)) {
      return client.send({ type: "error", message: "FIGHTER NOT ACCEPTED - RESTART start-online.bat" });
    }
    if (player.locked) return;
    player.character = msg.character;
    player.locked = Boolean(msg.locked);
    syncRoom(room);
    const players = [...room.players.values()];
    if (players.length === 2 && players.every((p) => p.locked && p.character && p.client)) {
      for (const p of players) p.variant = "normal";
      if (players[0].character === players[1].character) {
        players[crypto.randomInt(2)].variant = "inverted";
      }
      room.state = "loading";
      room.loaded.clear();
      room.seed = crypto.randomInt(1_000_000_000);
      broadcast(room, { type: "matchPrepare", room: roomView(room), seed: room.seed });
      syncRoom(room);
    }
  } else if (msg.type === "loaded" && room.state === "loading") {
    room.loaded.add(player.token);
    broadcast(room, { type: "loadProgress", loaded: room.loaded.size, total: 2 });
    if (room.loaded.size === 2) {
      room.state = "match";
      const startAt = Date.now() + 4200;
      startAuthoritativeMatch(room, startAt, room.seed);
      broadcast(room, {
        type: "countdown",
        startAt,
        startTick: 0,
        tickRate: 60,
        tickMs: TICK_MS,
        room: roomView(room),
      });
      syncRoom(room);
    }
  } else if (msg.type === "input" && room.state === "match" && room.match) {
    room.match.receiveInput(player.slot, msg);
  } else if ((msg.type === "relay" || msg.type === "matchOver") && room.state === "match") {
    client.send({ type: "error", message: "AUTHORITATIVE MATCH ACCEPTS INPUTS ONLY" });
  } else if (msg.type === "stats" && room.state === "ended") {
    player.stats = msg.stats || null;
    broadcast(room, { type: "opponentStats", slot: player.slot, stats: player.stats }, player.token);
  } else if ((msg.type === "rematch" || msg.type === "returnLobby") && room.state === "ended") {
    room.votes.set(player.token, msg.type);
    broadcast(room, { type: "vote", action: msg.type, slot: player.slot });
    if (room.votes.size === room.players.size) {
      const rematch = [...room.players.keys()].every((playerToken) => room.votes.get(playerToken) === "rematch");
      room.state = "lobby";
      room.result = null;
      room.match = null;
      room.votes.clear();
      room.loaded.clear();
      for (const p of room.players.values()) {
        p.ready = rematch;
        p.stats = null;
        p.character = null;
        p.variant = "normal";
        p.locked = false;
      }
      broadcast(room, { type: "backToLobby", rematch });
      syncRoom(room);
    }
  } else if (msg.type === "leave") {
    leavePlayer(client, true);
  } else if (msg.type === "latency") {
    player.ping = Math.max(0, Math.min(999, Number(msg.ping) || 0));
    syncRoom(room);
  }
}

function handleMessage(client, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return client.send({ type: "error", message: "INVALID MESSAGE" });
  }
  if (!msg || typeof msg.type !== "string") return;
  if (msg.type === "ping") return client.send({ type: "pong", sentAt: msg.sentAt, serverTime: Date.now() });
  if (msg.type === "create") return createRoom(client, msg);
  if (msg.type === "join") return joinRoom(client, msg);
  if (msg.type === "reconnect") return reconnect(client, msg);
  handleRoomMessage(client, msg);
}

function encodeFrame(data, opcode = 1) {
  const payload = Buffer.from(data);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x80 | opcode, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

function websocketClient(socket) {
  const client = {
    socket,
    buffer: Buffer.alloc(0),
    room: null,
    player: null,
    alive: true,
    send(value) {
      if (!socket.destroyed) socket.write(encodeFrame(JSON.stringify(value)));
    },
    close() {
      if (!socket.destroyed) socket.end(encodeFrame("", 8));
    },
  };

  socket.on("data", (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    while (client.buffer.length >= 2) {
      const first = client.buffer[0];
      const second = client.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (client.buffer.length < 4) return;
        length = client.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (client.buffer.length < 10) return;
        const big = client.buffer.readBigUInt64BE(2);
        if (big > BigInt(1_000_000)) return socket.destroy();
        length = Number(big);
        offset = 10;
      }
      const maskBytes = masked ? 4 : 0;
      if (client.buffer.length < offset + maskBytes + length) return;
      const mask = masked ? client.buffer.subarray(offset, offset + 4) : null;
      offset += maskBytes;
      const payload = Buffer.from(client.buffer.subarray(offset, offset + length));
      client.buffer = client.buffer.subarray(offset + length);
      if (masked) {
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      }
      if (opcode === 8) return socket.end();
      if (opcode === 9) {
        socket.write(encodeFrame(payload, 10));
        continue;
      }
      if (opcode === 1) handleMessage(client, payload.toString("utf8"));
    }
  });
  socket.on("close", () => leavePlayer(client, false));
  socket.on("error", () => socket.destroy());
  return client;
}

const server = http.createServer((req, res) => {
  const rawPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Not found");
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.on("upgrade", (req, socket) => {
  if ((req.url || "").split("?")[0] !== "/socket" || req.headers.upgrade?.toLowerCase() !== "websocket") {
    return socket.destroy();
  }
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const accept = crypto.createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n",
  ].join("\r\n"));
  websocketClient(socket);
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.state === "match" && room.match) room.match.advance(now);
  }
}, TICK_MS).unref();

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    for (const player of [...room.players.values()]) {
      if (!player.client && player.disconnectedAt && now - player.disconnectedAt > 20_000) {
        if (room.state === "match" && room.match && !room.result) room.match.forfeit(player.slot);
        room.players.delete(player.token);
      }
    }
    if (!room.players.size || now - room.touchedAt > 60 * 60 * 1000) destroyRoom(room);
    else syncRoom(room);
  }
}, 5000).unref();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Void Limit Online running at http://localhost:${PORT}`);
  console.log("Share this computer's local IP address and room code with Player 2.");
});
