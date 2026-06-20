"use strict";

const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { AuthoritativeMatch, TICK_MS } = require("./authoritative-match");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const LEGACY_DATA_DIR = path.join(ROOT, "data");
const DATA_DIR = process.env.VOID_LIMIT_DATA_DIR
  ? path.resolve(process.env.VOID_LIMIT_DATA_DIR)
  : path.join(ROOT, "..", "void-limit-account-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const LEGACY_USERS_FILE = path.join(LEGACY_DATA_DIR, "users.json");
const LEGACY_SESSIONS_FILE = path.join(LEGACY_DATA_DIR, "sessions.json");
const DEFAULT_GOOGLE_CLIENT_ID = "985537852640-mj77hcjhvvpj0at4bmthoek3afbk88og.apps.googleusercontent.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
const SESSION_SECRET = process.env.SESSION_SECRET || "void-limit-local-session-secret";
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

function publicGoogleClientId() {
  const id = String(GOOGLE_CLIENT_ID || "").trim();
  return id && id !== "GOOGLE_CLIENT_ID_HERE" ? id : "";
}

function safeText(value, fallback = "", max = 120) {
  return String(value || fallback)
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max) || fallback;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
}

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE) && fs.existsSync(LEGACY_USERS_FILE)) fs.copyFileSync(LEGACY_USERS_FILE, USERS_FILE);
  if (!fs.existsSync(SESSIONS_FILE) && fs.existsSync(LEGACY_SESSIONS_FILE)) fs.copyFileSync(LEGACY_SESSIONS_FILE, SESSIONS_FILE);
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({ users: {} }, null, 2));
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: {} }, null, 2));
}

function readJson(file, fallback) {
  try {
    ensureDataFiles();
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function defaultStats() {
  return {
    totalWins: 0,
    totalLosses: 0,
    bestSurvivalWave: 0,
    bossRushClears: 0,
    maxCombo: 0,
    blackFlashes: 0,
    domainsUsed: 0,
    charactersPlayed: {},
  };
}

function defaultUnlocks() {
  return { costumes: ["uniform"], titles: [], badges: [] };
}

function defaultSettings() {
  return { lastCharacter: "gojo", lastStage: "shinjuku", lastCostume: "uniform", difficulty: "normal" };
}

function cleanNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function uniqueStrings(values, fallback = []) {
  const out = new Set(fallback);
  if (Array.isArray(values)) {
    for (const value of values) {
      const clean = safeText(value, "", 40);
      if (clean) out.add(clean);
    }
  }
  return [...out];
}

function ensureProgressShape(user) {
  user.stats = { ...defaultStats(), ...(user.stats || {}) };
  user.stats.charactersPlayed = { ...(user.stats.charactersPlayed || {}) };
  user.unlocks = { ...defaultUnlocks(), ...(user.unlocks || {}) };
  user.unlocks.costumes = uniqueStrings(user.unlocks.costumes, ["uniform"]);
  user.unlocks.titles = uniqueStrings(user.unlocks.titles);
  user.unlocks.badges = uniqueStrings(user.unlocks.badges);
  user.settings = { ...defaultSettings(), ...(user.settings || {}) };
  return user;
}

function mergeProgress(user, progress = {}) {
  ensureProgressShape(user);
  const stats = progress.stats || {};
  for (const key of ["totalWins", "totalLosses", "bossRushClears", "blackFlashes", "domainsUsed"]) {
    user.stats[key] = cleanNumber(user.stats[key]) + cleanNumber(stats[key]);
  }
  user.stats.bestSurvivalWave = Math.max(cleanNumber(user.stats.bestSurvivalWave), cleanNumber(stats.bestSurvivalWave));
  user.stats.maxCombo = Math.max(cleanNumber(user.stats.maxCombo), cleanNumber(stats.maxCombo));
  if (stats.charactersPlayed && typeof stats.charactersPlayed === "object") {
    for (const [character, count] of Object.entries(stats.charactersPlayed)) {
      const id = safeText(character, "", 32);
      if (id) user.stats.charactersPlayed[id] = cleanNumber(user.stats.charactersPlayed[id]) + cleanNumber(count);
    }
  }
  const unlocks = progress.unlocks || {};
  user.unlocks.costumes = uniqueStrings(unlocks.costumes, user.unlocks.costumes);
  user.unlocks.titles = uniqueStrings(unlocks.titles, user.unlocks.titles);
  user.unlocks.badges = uniqueStrings(unlocks.badges, user.unlocks.badges);
  const settings = progress.settings || {};
  for (const key of ["lastCharacter", "lastStage", "lastCostume", "difficulty"]) {
    const clean = safeText(settings[key], "", 48);
    if (clean) user.settings[key] = clean;
  }
  return user;
}

function publicProfile(user) {
  ensureProgressShape(user);
  return {
    isGuest: false,
    displayName: user.displayName,
    email: user.email,
    picture: user.picture,
    stats: user.stats,
    unlocks: user.unlocks,
    settings: user.settings,
  };
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}

function signSessionToken(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function sessionCookie(value, maxAge = 60 * 60 * 24 * 30) {
  return `vl_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function createSession(googleSub) {
  const sessions = readJson(SESSIONS_FILE, { sessions: {} });
  const id = token();
  const signed = `${id}.${signSessionToken(id)}`;
  sessions.sessions[id] = { googleSub, createdAt: Date.now(), lastSeen: Date.now() };
  writeJson(SESSIONS_FILE, sessions);
  return signed;
}

function currentUser(req) {
  const raw = parseCookies(req).vl_session || "";
  const [id, sig] = raw.split(".");
  if (!id || !sig || sig !== signSessionToken(id)) return null;
  const sessions = readJson(SESSIONS_FILE, { sessions: {} });
  const session = sessions.sessions[id];
  if (!session) return null;
  const users = readJson(USERS_FILE, { users: {} });
  const user = users.users[session.googleSub];
  if (!user) return null;
  session.lastSeen = Date.now();
  writeJson(SESSIONS_FILE, sessions);
  return { id, session, users, user };
}

function base64UrlJson(value) {
  return JSON.parse(Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

function base64UrlBuffer(value) {
  return Buffer.from(String(value).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

let googleKeysCache = { expiresAt: 0, keys: [] };

function fetchGoogleKeys() {
  if (Date.now() < googleKeysCache.expiresAt && googleKeysCache.keys.length) return Promise.resolve(googleKeysCache.keys);
  return new Promise((resolve, reject) => {
    const req = https.get("https://www.googleapis.com/oauth2/v3/certs", { timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const maxAge = /max-age=(\d+)/i.exec(String(res.headers["cache-control"] || ""))?.[1];
          googleKeysCache = {
            expiresAt: Date.now() + Math.max(60, Number(maxAge) || 300) * 1000,
            keys: parsed.keys || [],
          };
          resolve(googleKeysCache.keys);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("Google login unavailable")));
    req.on("error", reject);
  });
}

async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "GOOGLE_CLIENT_ID_HERE") {
    throw new Error("Google login unavailable");
  }
  const parts = String(credential || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid Google credential");
  const header = base64UrlJson(parts[0]);
  const payload = base64UrlJson(parts[1]);
  if (!["https://accounts.google.com", "accounts.google.com"].includes(payload.iss)) throw new Error("Invalid Google issuer");
  if (payload.aud !== GOOGLE_CLIENT_ID) throw new Error("Invalid Google audience");
  if (!payload.sub) throw new Error("Missing Google subject");
  if (Number(payload.exp || 0) * 1000 < Date.now()) throw new Error("Expired Google credential");
  const key = (await fetchGoogleKeys()).find((candidate) => candidate.kid === header.kid);
  if (!key) throw new Error("Google login unavailable");
  const publicKey = crypto.createPublicKey({ key, format: "jwk" });
  const valid = crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, base64UrlBuffer(parts[2]));
  if (!valid) throw new Error("Invalid Google signature");
  return payload;
}

async function handleApi(req, res) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET" && pathname === "/api/config") {
    return sendJson(res, 200, { googleClientId: publicGoogleClientId() });
  }
  if (req.method === "GET" && pathname === "/api/me") {
    const auth = currentUser(req);
    return sendJson(res, 200, auth ? { ok: true, isGuest: false, user: publicProfile(auth.user) } : { ok: true, isGuest: true, user: null });
  }
  if (req.method === "GET" && pathname === "/api/progress") {
    const auth = currentUser(req);
    return sendJson(res, 200, auth ? { ok: true, isGuest: false, progress: publicProfile(auth.user) } : { ok: true, isGuest: true, progress: null });
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    const auth = currentUser(req);
    if (auth) {
      const sessions = readJson(SESSIONS_FILE, { sessions: {} });
      delete sessions.sessions[auth.id];
      writeJson(SESSIONS_FILE, sessions);
    }
    return sendJson(res, 200, { ok: true, isGuest: true }, { "Set-Cookie": sessionCookie("", 0) });
  }
  if (req.method === "POST" && pathname === "/api/save-progress") {
    const auth = currentUser(req);
    if (!auth) return sendJson(res, 401, { ok: false, error: "Login required" });
    try {
      const body = await readBody(req);
      mergeProgress(auth.user, body.progress || {});
      auth.users.users[auth.user.googleSub] = auth.user;
      writeJson(USERS_FILE, auth.users);
      return sendJson(res, 200, { ok: true, user: publicProfile(auth.user), message: "Progress saved" });
    } catch {
      return sendJson(res, 400, { ok: false, error: "Cloud save failed, local save kept" });
    }
  }
  if (req.method === "POST" && pathname === "/api/auth/google") {
    try {
      const body = await readBody(req);
      const payload = await verifyGoogleCredential(body.credential);
      const users = readJson(USERS_FILE, { users: {} });
      const now = new Date().toISOString();
      const googleSub = safeText(payload.sub, "", 160);
      const user = ensureProgressShape(users.users[googleSub] || {
        googleSub,
        createdAt: now,
        stats: defaultStats(),
        unlocks: defaultUnlocks(),
        settings: defaultSettings(),
      });
      user.displayName = safeText(payload.name || payload.given_name, "Void Fighter", 80);
      user.email = safeText(payload.email, "", 160);
      user.picture = safeUrl(payload.picture);
      user.lastLogin = now;
      users.users[googleSub] = user;
      writeJson(USERS_FILE, users);
      const session = createSession(googleSub);
      return sendJson(res, 200, { ok: true, user: publicProfile(user) }, { "Set-Cookie": sessionCookie(session) });
    } catch (error) {
      return sendJson(res, error.message === "Google login unavailable" ? 503 : 401, {
        ok: false,
        error: error.message === "Google login unavailable" ? "Google login unavailable" : "Login failed, continue as guest",
      });
    }
  }
  return sendJson(res, 404, { ok: false, error: "Not found" });
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
    room.settings.time = [0, 60, 99, 180].includes(Number(msg.time)) ? Number(msg.time) : room.settings.time;
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
  if ((req.url || "/").split("?")[0].startsWith("/api/")) {
    handleApi(req, res).catch(() => sendJson(res, 500, { ok: false, error: "Server error" }));
    return;
  }
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
