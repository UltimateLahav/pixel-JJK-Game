(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const ui = {
    menu: $("#menu"),
    panel: $("#onlineMenu"),
    home: $("#onlineHome"),
    lobby: $("#onlineLobby"),
    intro: $("#onlineIntro"),
    name: $("#onlineName"),
    error: $("#onlineError"),
    status: $("#serverStatus"),
    joinBox: $("#joinBox"),
    codeInput: $("#roomCodeInput"),
    code: $("#roomCode"),
    connection: $("#lobbyConnection"),
    waiting: $("#waitingText"),
    ready: $("#readyButton"),
    start: $("#startOnlineMatch"),
    maps: $("#onlineMaps"),
    time: $("#onlineTime"),
    energy: $("#onlineEnergy"),
    chatLog: $("#chatLog"),
    chatInput: $("#chatInput"),
    hostOnly: $("#hostOnly"),
    countdown: $("#fightCountdown"),
    loading: $("#loadingStatus"),
    introP1: $("#introP1"),
    introP2: $("#introP2"),
  };

  const state = {
    socket: null,
    room: null,
    token: "",
    slot: 0,
    ready: false,
    intentionalClose: false,
    reconnectTimer: 0,
    reconnectDelay: 800,
    pingSentAt: 0,
    ping: 0,
    jitter: 0,
    lastPing: 0,
    clockOffset: 0,
    clockSamples: 0,
    matchActive: false,
    matchStartAt: 0,
    tickMs: 1000 / 60,
    lastInputFrame: -1,
    reconnectDeadline: 0,
  };

  const socketUrl = location.protocol === "file:"
    ? "ws://localhost:4173/socket"
    : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/socket`;
  const INPUT_LEAD_FRAMES = 3;

  const serverNow = () => Date.now() + state.clockOffset;
  const localTime = (serverTimestamp) => Number(serverTimestamp) - state.clockOffset;

  function updateNetworkIndicator(reconnecting = false) {
    const bad = state.ping > 140 || state.jitter > 45;
    const seconds = reconnecting ? Math.max(0, (state.reconnectDeadline - Date.now()) / 1000) : 0;
    window.VoidLimitOnline?.network?.({ bad, reconnecting, ping: state.ping, seconds });
  }

  function setStatus(text, online = false) {
    ui.status.textContent = text;
    ui.status.classList.toggle("online", online);
    ui.connection.textContent = text;
    ui.connection.classList.toggle("reconnecting", !online);
  }

  function showError(message = "") {
    ui.error.textContent = message;
  }

  function openOnline() {
    ui.menu.classList.add("hidden");
    ui.panel.classList.remove("hidden");
    if (state.room) showLobby();
    else showHome();
    connect();
  }

  function closeOnline() {
    ui.panel.classList.add("hidden");
    ui.intro.classList.add("hidden");
    ui.menu.classList.remove("hidden");
    showError("");
  }

  function showHome() {
    ui.panel.classList.remove("hidden");
    ui.home.classList.remove("hidden");
    ui.lobby.classList.add("hidden");
  }

  function showLobby() {
    ui.panel.classList.remove("hidden");
    ui.home.classList.add("hidden");
    ui.lobby.classList.remove("hidden");
  }

  function connect() {
    if (state.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.socket.readyState)) return;
    state.intentionalClose = false;
    setStatus("CONNECTING");
    const socket = new WebSocket(socketUrl);
    state.socket = socket;
    socket.addEventListener("open", () => {
      state.reconnectDelay = 800;
      setStatus("CONNECTED", true);
      state.reconnectDeadline = 0;
      updateNetworkIndicator(false);
      showError("");
      state.pingSentAt = Date.now();
      send({ type: "ping", sentAt: state.pingSentAt });
      const saved = loadSession();
      if (saved?.code && saved?.token) {
        send({ type: "reconnect", code: saved.code, token: saved.token });
      }
    });
    socket.addEventListener("message", (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      handleMessage(message);
    });
    socket.addEventListener("close", () => {
      setStatus("RECONNECTING");
      state.reconnectDeadline = Date.now() + 20_000;
      updateNetworkIndicator(true);
      if (!state.intentionalClose) scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      showError("ONLINE SERVER OFFLINE - RUN start-online.bat");
    });
  }

  function scheduleReconnect() {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connect, state.reconnectDelay);
    state.reconnectDelay = Math.min(5000, state.reconnectDelay * 1.5);
  }

  function send(message) {
    if (state.socket?.readyState === WebSocket.OPEN) {
      state.socket.send(JSON.stringify(message));
      return true;
    }
    connect();
    showError("CONNECTING TO ONLINE SERVER...");
    return false;
  }

  function saveSession() {
    try {
      sessionStorage.setItem("voidLimitOnline", JSON.stringify({
        code: state.room?.code,
        token: state.token,
        name: ui.name.value,
      }));
    } catch {}
  }

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem("voidLimitOnline") || "null");
    } catch {
      return null;
    }
  }

  function clearSession() {
    try { sessionStorage.removeItem("voidLimitOnline"); } catch {}
  }

  function handleMessage(message) {
    if (message.type === "error") {
      showError(message.message);
    } else if (message.type === "joined") {
      state.token = message.token;
      state.slot = message.slot;
      state.room = message.room;
      state.ready = false;
      saveSession();
      showLobby();
      renderRoom();
      if (state.room.state === "selecting") openNetworkCharacterSelect();
    } else if (message.type === "roomState") {
      state.room = message.room;
      const self = state.room.players.find((player) => player.slot === state.slot);
      if (self) {
        state.slot = self.slot;
        state.ready = self.ready;
      }
      renderRoom();
      if (state.room.state === "selecting") {
        if ($("#characterSelect").classList.contains("hidden")) openNetworkCharacterSelect();
        window.VoidLimitOnline?.selectionState?.(state.room, state.slot);
      } else if (state.room.state === "lobby" && !$("#characterSelect").classList.contains("hidden")) {
        window.VoidLimitOnline?.hideSelection?.();
        showLobby();
      }
    } else if (message.type === "chat") {
      appendChat(message.entry);
    } else if (message.type === "pong") {
      const receivedAt = Date.now();
      const roundTrip = Math.max(1, receivedAt - Number(message.sentAt || receivedAt));
      state.lastPing = state.ping || roundTrip;
      state.ping = roundTrip;
      state.jitter = state.jitter * .75 + Math.abs(state.ping - state.lastPing) * .25;
      const sampleOffset = Number(message.serverTime || receivedAt) + roundTrip / 2 - receivedAt;
      state.clockOffset = state.clockSamples
        ? state.clockOffset * .8 + sampleOffset * .2
        : sampleOffset;
      state.clockSamples++;
      send({ type: "latency", ping: state.ping });
      updateNetworkIndicator(false);
    } else if (message.type === "characterSelect") {
      state.room = message.room;
      openNetworkCharacterSelect();
    } else if (message.type === "matchPrepare") {
      state.room = message.room;
      window.VoidLimitOnline?.hideSelection?.();
      prepareMatch();
    } else if (message.type === "loadProgress") {
      ui.loading.textContent = `LOADING ${message.loaded} / ${message.total}`;
    } else if (message.type === "countdown") {
      state.room = message.room;
      state.tickMs = Number(message.tickMs) || 1000 / 60;
      beginCountdown(message.startAt);
    } else if (message.type === "matchSnapshot") {
      window.VoidLimitOnline?.authoritative?.(message.snapshot);
    } else if (message.type === "matchResult") {
      state.matchActive = false;
      const remoteSlot = state.slot === 1 ? 2 : 1;
      const opponentStats = message.stats?.[remoteSlot] || message.stats || null;
      window.VoidLimitOnline?.finish?.(message.winnerSlot === state.slot, opponentStats);
      send({ type: "stats", stats: window.VoidLimitOnline?.stats?.() || {} });
    } else if (message.type === "opponentStats") {
      window.VoidLimitOnline?.opponentStats?.(message.stats);
    } else if (message.type === "backToLobby") {
      state.matchActive = false;
      state.matchStartAt = 0;
      state.lastInputFrame = -1;
      updateNetworkIndicator(false);
      ui.intro.classList.add("hidden");
      showLobby();
      window.VoidLimitOnline?.returnToLobby?.();
      renderRoom();
      if (message.rematch && isHost()) setTimeout(() => send({ type: "start" }), 250);
    } else if (message.type === "reconnectFailed" || message.type === "roomClosed") {
      state.room = null;
      state.token = "";
      state.slot = 0;
      clearSession();
      showHome();
      if (message.type === "roomClosed") showError("ROOM CLOSED");
    } else if (message.type === "resumeMatch") {
      state.room = message.room;
      state.matchStartAt = Number(message.startAt) || serverNow();
      const wasActive = state.matchActive;
      state.matchActive = true;
      showError("");
      updateNetworkIndicator(false);
      if (!wasActive) {
        window.VoidLimitOnline?.start?.({
          slot: state.slot,
          map: state.room.map,
          time: state.room.settings.time,
          energy: state.room.settings.energy,
          startAt: localTime(state.matchStartAt),
          localName: state.room.players.find((p) => p.slot === state.slot)?.name || "Gojo",
          remoteName: state.room.players.find((p) => p.slot !== state.slot)?.name || "Gojo",
          localCharacter: state.room.players.find((p) => p.slot === state.slot)?.character || "gojo",
          remoteCharacter: state.room.players.find((p) => p.slot !== state.slot)?.character || "gojo",
          localVariant: state.room.players.find((p) => p.slot === state.slot)?.variant || "normal",
          remoteVariant: state.room.players.find((p) => p.slot !== state.slot)?.variant || "normal",
        });
        ui.panel.classList.add("hidden");
      }
      if (message.snapshot) window.VoidLimitOnline?.authoritative?.(message.snapshot);
    } else if (message.type === "connection") {
      if (!message.connected && state.matchActive) {
        state.reconnectDeadline = Date.now() + 20_000;
        updateNetworkIndicator(true);
      } else if (message.connected) {
        state.reconnectDeadline = 0;
        updateNetworkIndicator(false);
      }
    }
  }

  function isHost() {
    return Boolean(state.room && state.room.hostSlot === state.slot);
  }

  function renderRoom() {
    if (!state.room) return;
    ui.code.textContent = state.room.code;
    ui.waiting.textContent = state.room.players.length < 2
      ? "WAITING FOR PLAYER..."
      : state.room.players.some((player) => !player.connected) ? "PLAYER RECONNECTING..." : "BOTH FIGHTERS CONNECTED";
    ui.waiting.style.color = state.room.players.length === 2 ? "#65f6b1" : "#ffbd55";

    for (let slot = 1; slot <= 2; slot++) {
      const card = $(`#slot${slot}`);
      const player = state.room.players.find((item) => item.slot === slot);
      card.querySelector(".slot-name").textContent = player?.name || "OPEN SLOT";
      card.querySelector(".slot-ping").textContent = player ? `${player.connected ? player.ping || "--" : "OFFLINE"} ms` : "-- ms";
      card.querySelector(".slot-ready").textContent = player?.ready ? "READY" : "NOT READY";
      card.classList.toggle("ready", Boolean(player?.ready));
      card.classList.toggle("offline", Boolean(player && !player.connected));
      card.classList.toggle("inverted", player?.variant === "inverted");
      card.querySelector(".mini-gojo").classList.toggle("inverted", player?.variant === "inverted");
    }

    const host = isHost();
    ui.hostOnly.textContent = host ? "HOST CONTROL" : "HOST LOCKED";
    ui.maps.classList.toggle("readonly", !host);
    ui.maps.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.map === state.room.map);
      button.disabled = !host;
    });
    ui.time.value = String(state.room.settings.time);
    ui.energy.value = String(state.room.settings.energy);
    ui.time.disabled = !host;
    ui.energy.disabled = !host;
    ui.ready.textContent = state.ready ? "NOT READY" : "READY";
    ui.ready.disabled = state.room.state !== "lobby";
    const everybodyReady = state.room.players.length === 2 &&
      state.room.players.every((player) => player.ready && player.connected);
    ui.start.classList.toggle("hidden", !host);
    ui.start.disabled = !host || !everybodyReady || state.room.state !== "lobby";
  }

  function appendChat(entry) {
    const line = document.createElement("p");
    const name = document.createElement("b");
    name.className = entry.slot === 2 ? "p2" : "";
    name.textContent = `${entry.name}: `;
    line.append(name, document.createTextNode(entry.text));
    ui.chatLog.append(line);
    ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
  }

  function openNetworkCharacterSelect() {
    const local = state.room?.players.find((p) => p.slot === state.slot);
    const remote = state.room?.players.find((p) => p.slot !== state.slot);
    ui.panel.classList.add("hidden");
    window.VoidLimitOnline?.select?.({
      online: true,
      character: local?.character || "gojo",
      localName: local?.name || "PLAYER",
      remoteName: remote?.name || "OPPONENT",
      localVariant: local?.variant || "normal",
      remoteVariant: remote?.variant || "normal",
    });
    window.VoidLimitOnline?.selectionState?.(state.room, state.slot);
  }

  function prepareMatch() {
    ui.intro.classList.remove("hidden");
    ui.loading.textContent = "LOADING BATTLE MAP";
    ui.countdown.textContent = "...";
    const local = state.room.players.find((p) => p.slot === state.slot);
    const remote = state.room.players.find((p) => p.slot !== state.slot);
    window.VoidLimitOnline?.versus?.({
      slot: state.slot,
      localCharacter: local?.character || "gojo",
      remoteCharacter: remote?.character || "gojo",
      localName: local?.name || "PLAYER",
      remoteName: remote?.name || "OPPONENT",
    });
    const mapAssets = {
      shinjuku: "assets/stage-shinjuku.png",
      shibuya: "assets/stage-shibuya.png",
      jujutsuHigh: "assets/stage-jujutsu-high.png",
      kyoto: "assets/stage-kyoto.png",
    };
    const image = new Image();
    const done = () => send({ type: "loaded" });
    image.onload = done;
    image.onerror = done;
    image.src = mapAssets[state.room.map];
  }

  function beginCountdown(startAt) {
    state.matchActive = true;
    state.matchStartAt = Number(startAt);
    state.lastInputFrame = -1;
    ui.panel.classList.add("hidden");
    ui.intro.classList.remove("hidden");
    const p1 = state.room.players.find((p) => p.slot === 1);
    const p2 = state.room.players.find((p) => p.slot === 2);
    ui.introP1.textContent = p1?.name || "PLAYER 1";
    ui.introP2.textContent = p2?.name || "PLAYER 2";
    ui.loading.textContent = "CONNECTION LOCKED - FIGHTERS SYNCHRONIZED";
    const local = state.room.players.find((p) => p.slot === state.slot);
    const remote = state.room.players.find((p) => p.slot !== state.slot);
    window.VoidLimitOnline?.versus?.({
      slot: state.slot,
      localCharacter: local?.character || "gojo",
      remoteCharacter: remote?.character || "gojo",
      localName: local?.name || "Gojo",
      remoteName: remote?.name || "Gojo",
      localVariant: local?.variant || "normal",
      remoteVariant: remote?.variant || "normal",
    });
    window.VoidLimitOnline?.start?.({
      slot: state.slot,
      map: state.room.map,
      time: state.room.settings.time,
      energy: state.room.settings.energy,
      startAt: localTime(startAt),
      localName: state.room.players.find((p) => p.slot === state.slot)?.name || "Gojo",
      remoteName: state.room.players.find((p) => p.slot !== state.slot)?.name || "Gojo",
      localCharacter: local?.character || "gojo",
      remoteCharacter: remote?.character || "gojo",
      localVariant: local?.variant || "normal",
      remoteVariant: remote?.variant || "normal",
    });

    const timer = setInterval(() => {
      const remaining = startAt - serverNow();
      ui.countdown.textContent = remaining > 3000 ? "3" : remaining > 2000 ? "2" : remaining > 1000 ? "1" : remaining > 0 ? "FIGHT!" : "";
      if (remaining <= -350) {
        clearInterval(timer);
        ui.intro.classList.add("hidden");
      }
    }, 50);
  }

  function leaveRoom() {
    if (state.room) send({ type: "leave" });
    state.room = null;
    state.token = "";
    state.slot = 0;
    state.ready = false;
    state.matchActive = false;
    state.matchStartAt = 0;
    state.lastInputFrame = -1;
    state.reconnectDeadline = 0;
    updateNetworkIndicator(false);
    clearSession();
    window.VoidLimitOnline?.leave?.();
    showHome();
  }

  $("#onlineBattle").addEventListener("click", openOnline);
  $("#onlineBack").addEventListener("click", () => {
    if (state.room) leaveRoom();
    closeOnline();
  });
  $("#showJoin").addEventListener("click", () => {
    ui.joinBox.classList.toggle("hidden");
    ui.codeInput.focus();
  });
  $("#createRoom").addEventListener("click", () => {
    showError("");
    send({ type: "create", name: ui.name.value });
  });
  $("#joinRoom").addEventListener("click", () => {
    const code = ui.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 6) return showError("ENTER A VALID ROOM CODE");
    showError("");
    send({ type: "join", code, name: ui.name.value });
  });
  ui.codeInput.addEventListener("input", () => {
    ui.codeInput.value = ui.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  });
  ui.codeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("#joinRoom").click();
  });
  $("#copyCode").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.room?.code || "");
      $("#copyCode").textContent = "COPIED";
      setTimeout(() => { $("#copyCode").textContent = "COPY"; }, 900);
    } catch {
      showError(`ROOM CODE: ${state.room?.code || ""}`);
    }
  });
  ui.ready.addEventListener("click", () => send({ type: "ready", ready: !state.ready }));
  ui.start.addEventListener("click", () => send({ type: "start" }));
  $("#leaveRoom").addEventListener("click", leaveRoom);
  ui.maps.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (isHost()) send({ type: "map", map: button.dataset.map });
    });
  });
  [ui.time, ui.energy].forEach((control) => control.addEventListener("change", () => {
    if (isHost()) send({ type: "settings", time: Number(ui.time.value), energy: Number(ui.energy.value) });
  }));
  $("#chatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = ui.chatInput.value.trim();
    if (!text) return;
    send({ type: "chat", text });
    ui.chatInput.value = "";
  });

  window.addEventListener("voidlimit:rematch", () => send({ type: "rematch" }));
  window.addEventListener("voidlimit:returnLobby", () => send({ type: "returnLobby" }));
  window.addEventListener("voidlimit:leaveOnline", () => {
    leaveRoom();
    closeOnline();
  });
  window.addEventListener("voidlimit:characterLocked", (event) => {
    send({ type: "character", character: event.detail?.character || "gojo", locked: true });
  });
  window.addEventListener("voidlimit:characterPreview", (event) => {
    send({ type: "character", character: event.detail?.character || "gojo", locked: false });
  });

  setInterval(() => {
    if (!state.matchActive || !state.matchStartAt) return;
    const timeFromStart = serverNow() - state.matchStartAt;
    if (timeFromStart < -INPUT_LEAD_FRAMES * state.tickMs) return;
    const targetFrame = Math.max(0, Math.floor(timeFromStart / state.tickMs) + INPUT_LEAD_FRAMES);
    let budget = 12;
    while (state.lastInputFrame < targetFrame && budget-- > 0) {
      const frame = ++state.lastInputFrame;
      const input = window.VoidLimitOnline?.input?.(frame);
      if (input) send({ type: "input", frame, clientTime: serverNow(), input });
    }
  }, 1000 / 60);

  setInterval(() => {
    if (state.reconnectDeadline > 0 && Date.now() < state.reconnectDeadline) updateNetworkIndicator(true);
  }, 100);

  setInterval(() => {
    if (state.socket?.readyState === WebSocket.OPEN) {
      state.pingSentAt = Date.now();
      send({ type: "ping", sentAt: state.pingSentAt });
    }
  }, 2000);

  window.addEventListener("beforeunload", () => {
    state.intentionalClose = true;
  });

  window.VoidLimitNetwork = {
    send(channel, payload) {
      if (channel === "stats") return send({ type: "stats", stats: payload });
      if (channel === "input") return send({ type: "input", ...payload });
      return false;
    },
    room: () => state.room,
    slot: () => state.slot,
  };

  const saved = loadSession();
  if (saved?.name) ui.name.value = saved.name;
  connect();
})();
