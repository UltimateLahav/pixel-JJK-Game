(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const ui = {
    menu: $("#menu"),
    hud: $("#hud"),
    pause: $("#pause"),
    result: $("#result"),
    clash: $("#clash"),
    playerHealth: $("#playerHealth"),
    playerLag: $("#playerLag"),
    playerEnergy: $("#playerEnergy"),
    enemyHealth: $("#enemyHealth"),
    enemyLag: $("#enemyLag"),
    enemyEnergy: $("#enemyEnergy"),
    enemyName: $("#enemyName"),
    enemyState: $("#enemyState"),
    playerName: $("#playerName"),
    playerPortrait: $("#playerPortrait"),
    enemyPortrait: $("#enemyPortrait"),
    playerState: $("#playerState"),
    timer: $("#timer"),
    wave: $("#waveLabel"),
    mode: $("#modeLabel"),
    combo: $("#combo"),
    combatPrompt: $("#combatPrompt"),
    networkWarning: $("#networkWarning"),
    stageLabel: $("#stageLabel"),
    purpleStatus: $("#purpleStatus"),
    purpleTimer: $("#purpleTimer"),
    heatStatus: $("#heatStatus"),
    heatMeter: $("#heatMeter"),
    heatValue: $("#heatValue"),
    heatHint: $("#heatHint"),
    fControl: $("#fControl"),
    announcement: $("#announcement"),
    training: $("#trainingData"),
    resultTitle: $("#resultTitle"),
    resultSub: $("#resultSub"),
    score: $("#scoreStat"),
    maxCombo: $("#comboStat"),
    parries: $("#parryStat"),
    blackFlashes: $("#blackFlashStat"),
    clashPlayer: $("#clashPlayer"),
    clashEnemy: $("#clashEnemy"),
    clashType: $("#clashType"),
    characterSelect: $("#characterSelect"),
    selectModeLabel: $("#selectModeLabel"),
    selectCharacterName: $("#selectCharacterName"),
    selectDifficulty: $("#selectDifficulty"),
    selectDescription: $("#selectDescription"),
    selectAbilities: $("#selectAbilities"),
    selectionP1: $("#selectionP1"),
    selectionP2: $("#selectionP2"),
    selectionStatus: $("#selectionStatus"),
    confirmCharacter: $("#confirmCharacter"),
    characterBack: $("#characterBack"),
    intro: $("#onlineIntro"),
    introP1: $("#introP1"),
    introP2: $("#introP2"),
    introCharacterP1: $("#introCharacterP1"),
    introCharacterP2: $("#introCharacterP2"),
    introPortraitP1: $("#introPortraitP1"),
    introPortraitP2: $("#introPortraitP2"),
    introDialogue: $("#introDialogue"),
    fightCountdown: $("#fightCountdown"),
    loadingStatus: $("#loadingStatus"),
  };

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 596;
  const GRAVITY = 2150;
  const keys = new Set();
  const pressed = new Set();
  const bg = new Image();

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const chance = (n) => Math.random() < n;
  const rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  let selectedMode = "story";
  let difficulty = "normal";
  let selectedCostume = "uniform";
  let selectedStage = "shinjuku";
  let selectedCharacter = "gojo";
  let pendingOfflineSelection = false;
  let onlineSelection = false;
  let selectionLocked = false;
  let audioCtx = null;
  let master = null;
  let lastTime = performance.now();
  let onlineAccumulator = 0;

  const game = {
    state: "menu",
    player: null,
    enemy: null,
    particles: [],
    projectiles: [],
    afterimages: [],
    props: [],
    shake: 0,
    flash: 0,
    hitstop: 0,
    slow: 0,
    time: 99,
    wave: 1,
    score: 0,
    maxCombo: 0,
    parries: 0,
    mode: "story",
    domain: 0,
    domainIntro: 0,
    domainOwnerSlot: 0,
    domainStartup: 0,
    domainClashPending: false,
    cinematic: 0,
    clash: null,
    transition: 0,
    bgOffset: 0,
    outcomePending: false,
    cameraZoom: 1,
    cameraTarget: 1,
    cameraFocusX: W / 2,
    cameraFocusY: H / 2,
    glitch: 0,
    blackFlash: 0,
    windPaused: false,
    windTimer: 0,
    unstablePurple: null,
    remoteUnstablePurple: null,
    purpleExplosion: 0,
    realityCrack: 0,
    domainCharacter: "gojo",
    domainTick: .5,
    hakariDomain: null,
    jackpotFlash: 0,
    online: {
      active: false,
      slot: 0,
      remoteTarget: null,
      remoteName: "SATORU GOJO",
      localCharacter: "gojo",
      remoteCharacter: "gojo",
      localName: "SATORU GOJO",
      startAt: 0,
      startedAt: 0,
      resultReported: false,
      opponentStats: null,
      localDomainWindow: 0,
      remoteDomainWindow: 0,
      authoritative: true,
      serverFrame: 0,
      lastEventTick: -1,
      interpolationTicks: 6,
      snapshotBuffer: [],
      predictionHistory: new Map(),
      correctionX: 0,
      correctionY: 0,
      inputEdges: {
        jump: false, dash: false, light: false, heavy: false,
        special: "", domain: false, awaken: false,
      },
      stats: { damage: 0, parries: 0, blackFlashes: 0, domains: 0 },
    },
  };

  const characters = {
    gojo: {
      id: "gojo",
      name: "SATORU GOJO",
      title: "THE STRONGEST",
      difficulty: "HARD",
      description: "Technical space control with explosive cursed techniques and precise defensive timing.",
      abilities: [
        ["E", "REVERSAL: RED"],
        ["R", "LAPSE: BLUE"],
        ["Q", "HOLLOW PURPLE"],
        ["T", "UNLIMITED VOID"],
      ],
      labels: { red: "RED", blue: "BLUE", purple: "PURPLE", domain: "DOMAIN" },
      costs: { blue: 18, red: 26, purple: 82, domain: 100 },
      cooldowns: { blue: 4.5, red: 6.2, purple: 13, domain: 24 },
    },
    sukuna: {
      id: "sukuna",
      name: "RYOMEN SUKUNA",
      title: "KING OF CURSES",
      difficulty: "MEDIUM",
      description: "Aggressive rushdown fighter with savage pressure, adaptive slashes, and devastating counter-offense.",
      abilities: [
        ["E", "DISMANTLE"],
        ["R", "CLEAVE"],
        ["Q", "WORLD SLASH"],
        ["T", "MALEVOLENT SHRINE"],
      ],
      labels: { red: "DISMANTLE", blue: "CLEAVE", purple: "WORLD SLASH", domain: "SHRINE" },
      costs: { blue: 22, red: 16, purple: 95, domain: 100 },
      cooldowns: { blue: 5.2, red: 3.4, purple: 15, domain: 24 },
    },
    hakari: {
      id: "hakari",
      name: "KINJI HAKARI",
      title: "FEVER FIGHTER",
      difficulty: "MEDIUM",
      description: "High-pressure gambling brawler who builds Heat, risks everything in Idle Death Gamble, and explodes after jackpot.",
      abilities: [
        ["E", "ROUGH CURSED PUNCH"],
        ["R", "SHUTTER DOORS"],
        ["Q", "RESERVE BALLS"],
        ["F", "CONSECUTIVE EFFECT"],
        ["T", "IDLE DEATH GAMBLE"],
      ],
      labels: { red: "ROUGH PUNCH", blue: "SHUTTER", purple: "RESERVE BALLS", domain: "GAMBLE" },
      costs: { blue: 20, red: 16, purple: 14, domain: 100 },
      cooldowns: { blue: 5.5, red: 3.8, purple: 2.8, domain: 25 },
    },
  };

  const enemyTypes = [
    { name: "DREAD WRAITH", rank: "GRADE 1", color: "#ae3867", accent: "#ff6b9a", hp: 115, speed: 155, power: 1 },
    { name: "RIFT STALKER", rank: "SPECIAL GRADE", color: "#5a36a5", accent: "#b07cff", hp: 145, speed: 185, power: 1.16 },
    { name: "ABYSS SOVEREIGN", rank: "DOMAIN USER", color: "#8e2445", accent: "#ff455f", hp: 190, speed: 170, power: 1.34, boss: true },
  ];
  const stages = {
    shinjuku: {
      name: "SHINJUKU", subtitle: "FALLEN CITY",
      src: "assets/stage-shinjuku.png",
      overlay: "#05081738", floor: "#11182a5c", edge: "#63dff866",
    },
    jujutsuHigh: {
      name: "JUJUTSU HIGH", subtitle: "MOUNTAIN CAMPUS",
      src: "assets/stage-jujutsu-high.png",
      overlay: "#13233a18", floor: "#20304024", edge: "#b4e8ff66",
    },
    shibuya: {
      name: "SHIBUYA", subtitle: "INCIDENT NIGHT",
      src: "assets/stage-shibuya.png",
      overlay: "#15030c2e", floor: "#180c1938", edge: "#ff668866",
    },
    kyoto: {
      name: "KYOTO EVENT", subtitle: "FOREST GROUNDS",
      src: "assets/stage-kyoto.png",
      overlay: "#24311212", floor: "#3a32191f", edge: "#ffe08a66",
    },
  };
  bg.src = stages[selectedStage].src;

  const groundChain = [
    { name: "Fast Jab", duration: .22, start: .045, end: .105, cancel: .12, range: 50, h: 42, y: -69, damage: 4.2, kbX: 62, reaction: "body" },
    { name: "Cross Punch", duration: .25, start: .055, end: .125, cancel: .14, range: 58, h: 45, y: -74, damage: 5.1, kbX: 78, reaction: "head", dashCancel: true },
    { name: "Knee Strike", duration: .29, start: .075, end: .155, cancel: .17, range: 55, h: 48, y: -56, damage: 5.8, kbX: 82, kbY: 35, reaction: "body", dashCancel: true, flashEligible: true },
    { name: "Roundhouse Kick", duration: .34, start: .105, end: .205, cancel: .22, range: 72, h: 54, y: -76, damage: 7.2, kbX: 125, reaction: "head" },
    { name: "Limit Knuckle", duration: .48, start: .17, end: .285, cancel: .31, range: 78, h: 58, y: -74, damage: 11, kbX: 390, kbY: 90, reaction: "body", strong: true, flashEligible: true, finisher: true },
  ];
  const airChain = [
    { name: "Aerial Palm", duration: .27, start: .055, end: .14, cancel: .15, range: 55, h: 48, y: -70, damage: 5.5, kbX: 70, kbY: 45, reaction: "air" },
    { name: "Sky Cross", duration: .3, start: .07, end: .16, cancel: .18, range: 62, h: 52, y: -72, damage: 6.4, kbX: 95, kbY: 65, reaction: "air", flashEligible: true },
    { name: "Meteor Axe", duration: .44, start: .14, end: .27, cancel: .29, range: 68, h: 68, y: -55, damage: 10, kbX: 125, kbY: -480, reaction: "slam", strong: true, finisher: true },
  ];
  const sukunaGroundChain = [
    { name: "Savage Right", duration: .2, start: .04, end: .1, cancel: .115, range: 52, h: 44, y: -70, damage: 4.8, kbX: 68, reaction: "body" },
    { name: "Left Hook", duration: .23, start: .05, end: .12, cancel: .135, range: 60, h: 48, y: -76, damage: 5.6, kbX: 82, reaction: "head", dashCancel: true },
    { name: "Ruthless Elbow", duration: .26, start: .065, end: .145, cancel: .16, range: 57, h: 49, y: -65, damage: 6.4, kbX: 92, reaction: "body", dashCancel: true, flashEligible: true },
    { name: "Front Kick", duration: .3, start: .09, end: .18, cancel: .2, range: 73, h: 55, y: -61, damage: 7.6, kbX: 135, reaction: "body" },
    { name: "Dismantle Ripper", duration: .43, start: .14, end: .265, cancel: .29, range: 92, h: 72, y: -79, damage: 13, kbX: 450, kbY: 100, reaction: "slash", strong: true, flashEligible: true, finisher: true, slash: true },
  ];
  const sukunaAirChain = [
    { name: "Aerial Fist", duration: .23, start: .045, end: .12, cancel: .135, range: 56, h: 47, y: -70, damage: 5.2, kbX: 72, kbY: 35, reaction: "air" },
    { name: "Sky Kick", duration: .25, start: .055, end: .135, cancel: .15, range: 63, h: 52, y: -62, damage: 5.9, kbX: 88, kbY: 48, reaction: "air" },
    { name: "Air Dismantle", duration: .28, start: .07, end: .16, cancel: .18, range: 78, h: 62, y: -78, damage: 7, kbX: 105, kbY: 58, reaction: "slash", slash: true, flashEligible: true },
    { name: "Twin Heel", duration: .31, start: .09, end: .19, cancel: .21, range: 70, h: 61, y: -60, damage: 8.2, kbX: 125, kbY: 70, reaction: "air" },
    { name: "King's Downfall", duration: .46, start: .13, end: .28, cancel: .3, range: 76, h: 76, y: -52, damage: 13.5, kbX: 95, kbY: -760, reaction: "slam", downslam: true, strong: true, finisher: true },
  ];
  const hakariGroundChain = [
    { name: "Body Jab", duration: .19, start: .035, end: .095, cancel: .11, range: 52, h: 44, y: -66, damage: 4.6, kbX: 65, reaction: "body", rough: true },
    { name: "Heavy Hook", duration: .23, start: .05, end: .12, cancel: .14, range: 62, h: 49, y: -76, damage: 5.8, kbX: 84, reaction: "head", dashCancel: true, rough: true },
    { name: "Gut Knee", duration: .25, start: .06, end: .14, cancel: .16, range: 58, h: 49, y: -57, damage: 6.3, kbX: 90, reaction: "body", dashCancel: true, rough: true },
    { name: "Spinning Elbow", duration: .29, start: .08, end: .18, cancel: .2, range: 72, h: 57, y: -73, damage: 7.4, kbX: 132, reaction: "head", rough: true },
    { name: "Fever Breaker", duration: .42, start: .135, end: .26, cancel: .285, range: 84, h: 66, y: -73, damage: 12.5, kbX: 420, kbY: 95, reaction: "body", strong: true, finisher: true, rough: true },
  ];
  const hakariAirChain = [
    { name: "Air Jab", duration: .21, start: .04, end: .105, cancel: .12, range: 54, h: 45, y: -68, damage: 5, kbX: 68, kbY: 30, reaction: "air", rough: true },
    { name: "Side Kick", duration: .24, start: .05, end: .13, cancel: .145, range: 66, h: 51, y: -61, damage: 5.9, kbX: 88, kbY: 42, reaction: "air", rough: true },
    { name: "Drop Elbow", duration: .27, start: .065, end: .15, cancel: .17, range: 60, h: 58, y: -54, damage: 6.8, kbX: 90, kbY: -220, reaction: "air", rough: true },
    { name: "Double Fist", duration: .3, start: .08, end: .19, cancel: .21, range: 70, h: 58, y: -69, damage: 8, kbX: 118, kbY: 62, reaction: "air", rough: true },
    { name: "Fever Axe", duration: .44, start: .13, end: .275, cancel: .3, range: 72, h: 73, y: -50, damage: 13, kbX: 85, kbY: -780, reaction: "slam", downslam: true, strong: true, finisher: true, rough: true },
  ];
  const hakariJackpotGroundChain = [
    { ...hakariGroundChain[0], name: "Afterimage Fist", duration: .15, damage: 5.8, range: 58 },
    { ...hakariGroundChain[1], name: "Double Body Blow", duration: .18, damage: 7.2, range: 68 },
    { ...hakariGroundChain[2], name: "Knee into Elbow", duration: .2, damage: 8.1, range: 65 },
    { ...hakariGroundChain[3], name: "Dash-Through Punch", duration: .22, damage: 9.5, range: 92, kbX: 65 },
    { ...hakariGroundChain[4], name: "Jackpot Uppercut", duration: .32, damage: 16, kbX: 110, kbY: 720, reaction: "launcher", launcher: true, jumpCancel: true },
  ];

  function characterProfile(entity = game.player) {
    return characters[entity?.character || selectedCharacter] || characters.gojo;
  }

  function characterChains(entity = game.player) {
    if (entity?.character === "sukuna") return { ground: sukunaGroundChain, air: sukunaAirChain };
    if (entity?.character === "hakari") return { ground: entity.jackpot > 0 ? hakariJackpotGroundChain : hakariGroundChain, air: hakariAirChain };
    return { ground: groundChain, air: airChain };
  }

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0.16;
    master.connect(audioCtx.destination);
  }

  function tone(freq, duration = 0.08, type = "square", volume = 0.3, slide = 0) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration);
  }

  function noise(duration = 0.1, volume = 0.2) {
    if (!audioCtx) return;
    const length = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function makePlayer() {
    return {
      kind: "player",
      character: selectedCharacter,
      x: 300, y: GROUND, w: 44, h: 92,
      vx: 0, vy: 0, facing: 1,
      health: 600, maxHealth: 600, lagHealth: 600, energy: 70,
      grounded: true, wall: 0, airDash: true, jumps: 1,
      state: "idle", stateTime: 0, attack: null,
      comboStep: -1, airComboStep: -1, comboWindow: 0, comboHits: 0, comboTimer: 0,
      attackBuffer: 0, bufferedAttack: "", cancelWindow: 0, launcherCancel: 0,
      blackFlashWindow: 0, blackFlashTarget: null, blackFlashes: 0,
      stun: 0, invuln: 0, blocking: false, guardStart: 0,
      parryStreak: 0, parryTimer: 0,
      cooldowns: { blue: 0, red: 0, purple: 0, domain: 0, consecutive: 0 },
      awakening: 0, canAwaken: false, trailTimer: 0,
      lastHit: "READY", damageScale: 1, flash: 0,
      regenBoost: 0, damageRegen: 0, dashCooldown: 0, recoveryUsed: false,
      fastFalling: false, momentum: 0,
      burnout: 0, burnoutSmoke: 0,
      damageDealt: 0, pressure: 0, voiceCooldown: 0,
      heat: 0, jackpot: 0, parryHot: 0,
      nextM1Fast: false,
      rewindWindow: 0, rewindX: 0, rewindY: 0, rewindHealth: 600,
      jackpotFinisher: false,
      dismantleUses: 0, cleaveUses: 0, sukunaDomainUses: 0, worldSlashUnlocked: false,
      charging: false, chargeRecovery: 0, chargeCooldown: 0, chargePulse: 0,
    };
  }

  function makeEnemy(index = 0) {
    const type = enemyTypes[index % enemyTypes.length];
    const diff = difficulty === "easy" ? 0.82 : difficulty === "hard" ? 1.24 : 1;
    return {
      kind: "enemy",
      type,
      x: 950, y: GROUND, w: type.boss ? 58 : 50, h: type.boss ? 108 : 95,
      vx: 0, vy: 0, facing: -1,
      health: type.hp * diff, maxHealth: type.hp * diff, lagHealth: type.hp * diff,
      energy: type.boss ? 100 : 45,
      grounded: true, state: "idle", stateTime: 0, attack: null,
      stun: 0, invuln: 0, aiTimer: .45, decision: "approach",
      power: type.power * diff, flash: 0, domainUsed: false,
      reaction: "idle", wallSplat: 0, emergencyDodges: type.boss ? 3 : 1,
      adaptation: { light: 0, heavy: 0, special: 0, parryBaits: 0 },
      baiting: 0, lastPlayerStrategy: "",
    };
  }

  function makeRemotePlayer(slot = 2, name = "SATORU GOJO", character = "gojo") {
    return {
      kind: "remote",
      character,
      type: { name, rank: characters[character]?.title || "THE STRONGEST", speed: 295, boss: false },
      onlineVariant: slot === 2 && character === "gojo" ? "inverted" : "normal",
      x: slot === 1 ? 300 : 950, y: GROUND, w: 44, h: 92,
      vx: 0, vy: 0, facing: slot === 1 ? 1 : -1,
      health: 600, maxHealth: 600, lagHealth: 600, energy: 70,
      grounded: true, state: "idle", stateTime: 0, attack: null,
      stun: 0, invuln: 0, flash: 0, blocking: false,
      reaction: "idle", wallSplat: 0, awakening: 0, burnout: 0,
      heat: 0, jackpot: 0,
      charging: false,
      comboStep: -1, airComboStep: -1,
      adaptation: { light: 0, heavy: 0, special: 0, parryBaits: 0 },
      lastPlayerStrategy: "",
    };
  }

  function resetProps() {
    const props = {
      shinjuku: [
        { x: 92, y: 543, w: 76, h: 53, hp: 20, max: 20, type: "barrier" },
        { x: 1092, y: 557, w: 64, h: 39, hp: 16, max: 16, type: "debris" },
        { x: 1173, y: 532, w: 36, h: 64, hp: 12, max: 12, type: "sign" },
      ],
      jujutsuHigh: [
        { x: 88, y: 520, w: 38, h: 76, hp: 18, max: 18, type: "training" },
        { x: 1116, y: 536, w: 34, h: 60, hp: 12, max: 12, type: "lantern" },
        { x: 1180, y: 548, w: 52, h: 48, hp: 16, max: 16, type: "shrine" },
      ],
      shibuya: [
        { x: 64, y: 547, w: 88, h: 49, hp: 18, max: 18, type: "barrier" },
        { x: 1090, y: 548, w: 75, h: 48, hp: 16, max: 16, type: "debris" },
        { x: 1190, y: 526, w: 35, h: 70, hp: 12, max: 12, type: "sign" },
      ],
      kyoto: [
        { x: 82, y: 518, w: 42, h: 78, hp: 18, max: 18, type: "training" },
        { x: 1104, y: 536, w: 34, h: 60, hp: 12, max: 12, type: "lantern" },
        { x: 1170, y: 555, w: 58, h: 41, hp: 15, max: 15, type: "stump" },
      ],
    };
    game.props = props[selectedStage].map((prop) => ({ ...prop }));
  }

  function renderCharacterSelection() {
    const profile = characters[selectedCharacter];
    $$(".character-card").forEach((card) => card.classList.toggle("active", card.dataset.character === selectedCharacter));
    ui.selectCharacterName.textContent = profile.name;
    ui.selectDifficulty.textContent = `DIFFICULTY: ${profile.difficulty}`;
    ui.selectDescription.textContent = profile.description;
    ui.selectAbilities.innerHTML = profile.abilities
      .map(([key, name]) => `<span><kbd>${key}</kbd> ${name}</span>`)
      .join("");
  }

  function openCharacterSelect(options = {}) {
    onlineSelection = Boolean(options.online);
    pendingOfflineSelection = !onlineSelection;
    selectionLocked = false;
    selectedCharacter = options.character && characters[options.character] ? options.character : selectedCharacter;
    ui.characterSelect.classList.remove("hidden");
    ui.menu.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.confirmCharacter.disabled = false;
    ui.confirmCharacter.textContent = "LOCK IN";
    ui.characterBack.disabled = false;
    ui.characterBack.textContent = onlineSelection ? "LEAVE ROOM" : "BACK";
    ui.selectModeLabel.textContent = onlineSelection ? "ONLINE BATTLE / BOTH PLAYERS MUST LOCK IN" : `${selectedMode.toUpperCase()} / SELECT YOUR FIGHTER`;
    ui.selectionStatus.textContent = onlineSelection ? "YOUR OPPONENT CAN SEE YOUR SELECTION" : "SELECT A FIGHTER";
    ui.selectionP1.querySelector("strong").textContent = options.localName || "PLAYER 1";
    ui.selectionP1.querySelector("small").textContent = "NOT LOCKED";
    ui.selectionP1.dataset.character = selectedCharacter;
    ui.selectionP1.classList.remove("locked");
    ui.selectionP2.querySelector("strong").textContent = options.remoteName || (onlineSelection ? "OPPONENT" : "CURSED SPIRIT");
    ui.selectionP2.querySelector("small").textContent = onlineSelection ? "SELECTING" : "CPU";
    ui.selectionP2.dataset.character = "";
    ui.selectionP2.classList.toggle("locked", !onlineSelection);
    $$(".character-card").forEach((card) => card.classList.remove("locked"));
    renderCharacterSelection();
  }

  function updateOnlineSelection(room, localSlot) {
    if (!room || !onlineSelection) return;
    for (let slot = 1; slot <= 2; slot++) {
      const player = room.players.find((entry) => entry.slot === slot);
      const panel = slot === 1 ? ui.selectionP1 : ui.selectionP2;
      if (!player) continue;
      const profile = characters[player.character] || null;
      panel.dataset.character = player.character || "";
      panel.querySelector("strong").textContent = `${player.name}${profile ? ` / ${profile.name}` : ""}`;
      panel.querySelector("small").textContent = player.locked ? "LOCKED" : "SELECTING";
      panel.classList.toggle("locked", Boolean(player.locked));
    }
    const local = room.players.find((entry) => entry.slot === localSlot);
    const remote = room.players.find((entry) => entry.slot !== localSlot);
    if (local?.locked) {
      selectionLocked = true;
      ui.confirmCharacter.disabled = true;
      ui.confirmCharacter.textContent = "LOCKED";
      ui.selectionStatus.textContent = remote?.locked ? "BOTH FIGHTERS LOCKED" : "WAITING FOR OPPONENT...";
    }
  }

  function matchupDialogue(localCharacter, remoteCharacter) {
    if (localCharacter === "sukuna" && remoteCharacter === "gojo") return "SUKUNA: COME ON, STRONGEST. ENTERTAIN ME.";
    if (localCharacter === "gojo" && remoteCharacter === "sukuna") return "GOJO: LET'S SETTLE WHO STANDS AT THE TOP.";
    if (localCharacter === "hakari" && remoteCharacter === "gojo") return "HAKARI: LET'S SEE IF THE STRONGEST CAN BEAT LUCK.";
    if (localCharacter === "hakari" && remoteCharacter === "sukuna") return "HAKARI: EVEN A KING CAN LOSE A BAD BET.";
    if (localCharacter === "sukuna") return "SUKUNA: YOU NEVER STOOD A CHANCE.";
    if (localCharacter === "hakari") return "HAKARI: FEELING LUCKY?";
    return "GOJO: THIS SHOULD BE INTERESTING.";
  }

  function configureVersus(options) {
    const localSlot = options.slot || 1;
    const p1Character = localSlot === 1 ? options.localCharacter : options.remoteCharacter;
    const p2Character = localSlot === 1 ? options.remoteCharacter : options.localCharacter;
    const p1Name = localSlot === 1 ? options.localName : options.remoteName;
    const p2Name = localSlot === 1 ? options.remoteName : options.localName;
    ui.introP1.textContent = p1Name || "PLAYER 1";
    ui.introP2.textContent = p2Name || "PLAYER 2";
    ui.introCharacterP1.textContent = characters[p1Character]?.name || "CURSED SPIRIT";
    ui.introCharacterP2.textContent = characters[p2Character]?.name || "CURSED SPIRIT";
    ui.introPortraitP1.className = `intro-silhouette ${p1Character || "curse"}`;
    ui.introPortraitP2.className = `intro-silhouette ${p2Character || "curse"}${p2Character === "gojo" ? " inverted" : ""}`;
    ui.introDialogue.textContent = matchupDialogue(options.localCharacter, options.remoteCharacter);
  }

  function startOfflineSelection() {
    openCharacterSelect({ online: false, localName: "PLAYER 1", remoteName: "CURSED SPIRIT" });
  }

  function confirmCharacterSelection() {
    if (selectionLocked) return;
    selectionLocked = true;
    ui.confirmCharacter.disabled = true;
    ui.confirmCharacter.textContent = "LOCKED";
    const activeCard = document.querySelector(`.character-card[data-character="${selectedCharacter}"]`);
    activeCard?.classList.add("locked");
    ui.selectionP1.classList.add("locked");
    ui.selectionP1.querySelector("small").textContent = "LOCKED";
    if (onlineSelection) {
      ui.selectionStatus.textContent = "WAITING FOR OPPONENT...";
      window.dispatchEvent(new CustomEvent("voidlimit:characterLocked", { detail: { character: selectedCharacter } }));
      return;
    }
    ui.selectionStatus.textContent = "FIGHTER LOCKED";
    ui.characterSelect.classList.add("hidden");
    configureVersus({
      slot: 1,
      localCharacter: selectedCharacter,
      remoteCharacter: "curse",
      localName: characters[selectedCharacter].name,
      remoteName: "CURSED SPIRIT",
    });
    ui.intro.classList.remove("hidden");
    ui.fightCountdown.textContent = "VS";
    ui.loadingStatus.textContent = "CURTAIN OPENING";
    setTimeout(() => {
      ui.intro.classList.add("hidden");
      pendingOfflineSelection = false;
      startGame();
    }, 1800);
  }

  function startGame() {
    initAudio();
    game.mode = selectedMode;
    if (selectedMode !== "online") {
      game.online.active = false;
      game.online.slot = 0;
      game.online.remoteTarget = null;
    }
    bg.src = stages[selectedStage].src;
    game.state = "playing";
    game.player = makePlayer();
    game.wave = 1;
    game.enemy = makeEnemy(selectedMode === "boss" ? 2 : 0);
    game.particles.length = 0;
    game.projectiles.length = 0;
    game.afterimages.length = 0;
    game.shake = 0;
    game.flash = 0;
    game.hitstop = 0;
    game.slow = 0;
    game.time = selectedMode === "training" ? 999 : selectedMode === "survival" ? 120 : 99;
    game.score = 0;
    game.maxCombo = 0;
    game.parries = 0;
    game.domain = 0;
    game.domainCharacter = selectedCharacter;
    game.domainIntro = 0;
    game.domainOwnerSlot = 0;
    game.domainStartup = 0;
    game.cinematic = 0;
    game.clash = null;
    game.transition = 0;
    game.outcomePending = false;
    game.cameraZoom = 1;
    game.cameraTarget = 1;
    game.cameraFocusX = W / 2;
    game.cameraFocusY = H / 2;
    game.glitch = 0;
    game.blackFlash = 0;
    game.windPaused = false;
    game.windTimer = 0;
    game.unstablePurple = null;
    game.remoteUnstablePurple = null;
    game.purpleExplosion = 0;
    game.realityCrack = 0;
    game.hakariDomain = null;
    game.domainTick = .5;
    game.jackpotFlash = 0;
    resetProps();
    ui.menu.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.clash.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    announce(selectedMode === "training" ? "TRAINING START"
      : selectedCharacter === "sukuna" ? "THE KING ENTERS"
        : selectedCharacter === "hakari" ? "FEVER START" : "CURTAIN OPEN");
    updateHud();
    tone(110, .35, "sawtooth", .25, 330);
  }

  function startOnlineMatch(options) {
    selectedMode = "online";
    selectedStage = stages[options.map] ? options.map : "shinjuku";
    selectedCharacter = characters[options.localCharacter] ? options.localCharacter : "gojo";
    startGame();
    game.online.active = true;
    game.online.slot = options.slot;
    game.online.localName = options.localName || "SATORU GOJO";
    game.online.remoteName = options.remoteName || "SATORU GOJO";
    game.online.localCharacter = selectedCharacter;
    game.online.remoteCharacter = characters[options.remoteCharacter] ? options.remoteCharacter : "gojo";
    game.online.startAt = Number(options.startAt) || Date.now();
    game.online.startedAt = game.online.startAt;
    game.online.resultReported = false;
    game.online.remoteTarget = null;
    game.online.opponentStats = null;
    game.online.localDomainWindow = 0;
    game.online.remoteDomainWindow = 0;
    game.online.serverFrame = 0;
    game.online.lastEventTick = -1;
    game.online.snapshotBuffer.length = 0;
    game.online.predictionHistory.clear();
    game.online.correctionX = 0;
    game.online.correctionY = 0;
    game.domainOwnerSlot = 0;
    game.domainStartup = 0;
    game.online.inputEdges = {
      jump: false, dash: false, light: false, heavy: false,
      special: "", domain: false, awaken: false,
    };
    game.online.stats = { damage: 0, parries: 0, blackFlashes: 0, domains: 0 };
    game.time = Number(options.time) || 99;
    game.player.energy = Number(options.energy) || 70;
    game.player.character = selectedCharacter;
    game.player.onlineVariant = options.slot === 2 && selectedCharacter === "gojo" ? "inverted" : "normal";
    game.player.x = options.slot === 1 ? 300 : 950;
    game.player.facing = options.slot === 1 ? 1 : -1;
    game.enemy = makeRemotePlayer(options.slot === 1 ? 2 : 1, game.online.remoteName, game.online.remoteCharacter);
    game.enemy.energy = Number(options.energy) || 70;
    ui.menu.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    announce("ONLINE BARRIER LINKED");
    updateHud();
  }

  function sendOnline(channel, payload) {
    if (!game.online.active) return;
    if (game.online.authoritative && ["state", "hit", "event", "clash", "matchOver"].includes(channel)) return;
    window.VoidLimitNetwork?.send?.(channel, payload);
  }

  function queueOnlineEdge(name, value = true) {
    if (!game.online.active || !game.online.authoritative) return;
    game.online.inputEdges[name] = value;
  }

  function quitToMenu() {
    game.state = "menu";
    ui.hud.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.clash.classList.add("hidden");
    ui.menu.classList.remove("hidden");
  }

  function announce(text) {
    ui.announcement.textContent = text;
    ui.announcement.classList.remove("show");
    void ui.announcement.offsetWidth;
    ui.announcement.classList.add("show");
  }

  function spawnParticles(x, y, color, count = 12, speed = 280, size = 5, life = .45) {
    for (let i = 0; i < count; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(speed * .25, speed);
      game.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rnd(2, size), color, life: rnd(life * .5, life), maxLife: life,
        gravity: chance(.4) ? 600 : 0,
      });
    }
  }

  function addAfterimage(entity, color = "#55e7ff") {
    game.afterimages.push({
      x: entity.x, y: entity.y, facing: entity.facing,
      character: entity.character,
      onlineVariant: entity.onlineVariant,
      state: entity.state, attack: entity.attack ? { ...entity.attack } : null,
      life: .26, maxLife: .26, color,
    });
  }

  function stopEnergyCharge(interrupted = false) {
    const p = game.player;
    if (!p?.charging) return;
    p.charging = false;
    p.chargeRecovery = .2;
    p.chargeCooldown = 1;
    p.state = interrupted ? "hit" : "chargeRecover";
    p.vx = 0;
    tone(interrupted ? 80 : 260, .1, "sine", .12, interrupted ? -40 : 120);
  }

  function playerAttack(type) {
    const p = game.player;
    if (!p || p.stun > 0 || p.charging || p.chargeRecovery > 0 || game.cinematic > 0 || game.clash || (game.online.active && Date.now() < game.online.startAt)) return;
    if (type === "heavy" && attemptBlackFlash()) return;
    if (p.attack) {
      if (type === "light" && p.attack.chain) {
        p.bufferedAttack = "light";
        p.attackBuffer = .24;
      }
      return;
    }
    p.blocking = false;
    const aerial = !p.grounded;
    if (type === "light") {
      startM1(aerial);
      return;
    } else {
      const attack = p.character === "hakari"
        ? aerial
          ? { name: "Fever Dropkick", duration: .45, start: .14, end: .28, range: 74, h: 68, y: -50, damage: 15.5, kbX: 180, kbY: -480, color: "#54f082", strong: true, rough: true }
          : { name: "Roughhouse Haymaker", duration: .44, start: .16, end: .29, range: 80, h: 64, y: -72, damage: 16, kbX: 330, kbY: 260, color: "#54f082", strong: true, rough: true }
        : p.character === "sukuna"
        ? aerial
          ? { name: "Cruel Heel", duration: .48, start: .16, end: .3, range: 72, h: 70, y: -52, damage: 16, kbX: 185, kbY: -500, color: "#ff3158", strong: true, slash: true }
          : { name: "King's Backhand", duration: .46, start: .17, end: .3, range: 82, h: 66, y: -74, damage: 16.5, kbX: 340, kbY: 280, color: "#ff3158", strong: true }
        : aerial
          ? { name: "Meteor Heel", duration: .56, start: .19, end: .34, range: 64, h: 67, y: -50, damage: 15, kbX: 155, kbY: -430, color: "#7c65ff", strong: true }
          : { name: "Limit Breaker", duration: .53, start: .21, end: .34, range: 75, h: 60, y: -76, damage: 14, kbX: 280, kbY: 330, color: "#6fdcff", strong: true };
      p.attack = { ...attack, elapsed: 0, hit: new Set(), active: false, type, specialCancel: true };
      p.state = aerial ? "airAttack" : type;
      p.stateTime = 0;
    }
    tone(type === "light" ? 220 : 120, .09, "square", .18, type === "light" ? -80 : -50);
  }

  function startM1(aerial, forcedStep = null) {
    const p = game.player;
    const chains = characterChains(p);
    const chain = aerial ? chains.air : chains.ground;
    const stepKey = aerial ? "airComboStep" : "comboStep";
    const previous = p[stepKey];
    let step = forcedStep ?? (p.comboWindow > 0 ? previous + 1 : 0);
    if (step >= chain.length) step = 0;
    p[stepKey] = step;
    if (!aerial) p.airComboStep = -1;
    const directionForward = p.facing > 0 ? keys.has("d") : keys.has("a");
    const directionDown = keys.has("s");
    let attack = { ...chain[step] };
    if (p.character === "hakari" && p.nextM1Fast) {
      attack.duration *= .72;
      attack.start *= .68;
      attack.end *= .78;
      p.nextM1Fast = false;
    }
    if (!aerial && step === 4 && directionForward) {
      attack = p.character === "hakari"
        ? { ...attack, name: "Fever Headbutt", range: 70, damage: 13, kbX: 75, kbY: 660, reaction: "launcher", launcher: true, jumpCancel: true, grab: true }
        : p.character === "sukuna"
        ? { ...attack, name: "Savage Ascent", range: 68, damage: 12, kbX: 70, kbY: 680, reaction: "launcher", launcher: true, jumpCancel: true, grab: true }
        : { ...attack, name: "Rising Limit", kbX: 95, kbY: 610, reaction: "launcher", launcher: true, jumpCancel: true };
    } else if (!aerial && step === 4 && directionDown) {
      attack = p.character === "hakari"
        ? { ...attack, name: "Lucky Floor Slam", y: -53, h: 67, damage: 14, kbX: 38, kbY: -610, reaction: "slam", downslam: true, groundFollow: true, bounce: true }
        : p.character === "sukuna"
        ? { ...attack, name: "Shrine Breaker", y: -54, h: 66, damage: 14, kbX: 45, kbY: -820, reaction: "slam", downslam: true, groundFollow: true }
        : { ...attack, name: "Void Downslam", y: -54, h: 62, kbX: 75, kbY: -720, reaction: "slam", downslam: true };
    }
    p.attack = {
      ...attack,
      elapsed: 0,
      hit: new Set(),
      active: false,
      type: "light",
      chain: true,
      chainStep: step,
      aerial,
      specialCancel: true,
      hitConfirmed: false,
      color: p.character === "hakari" ? "#55f087" : p.character === "sukuna" ? (attack.slash ? "#ff244f" : "#ff7892") : attack.flashEligible ? "#9cefff" : "#78eaff",
    };
    p.bufferedAttack = "";
    p.attackBuffer = 0;
    p.comboWindow = aerial ? .38 : .42;
    p.state = aerial ? "airAttack" : `m1-${step + 1}`;
    p.stateTime = 0;
    if (p.character === "sukuna" && step === 0 && p.voiceCooldown <= 0) {
      speakLine(chance(.5) ? "Come on." : "Pathetic.");
      p.voiceCooldown = 3.5;
    }
    tone(235 + step * 22, .055, "square", .13, -70);
  }

  function shortDash() {
    const p = game.player;
    if (!p || p.stun > 0 || p.charging || p.chargeRecovery > 0 || p.dashCooldown > 0 || game.cinematic > 0 || (game.online.active && Date.now() < game.online.startAt)) return;
    const canCancel = p.attack?.hitConfirmed && p.attack.dashCancel && p.attack.elapsed >= p.attack.start;
    if (p.attack && !canCancel) return;
    if (!p.grounded && !p.airDash) return;
    if (canCancel) {
      p.attack = null;
      p.comboWindow = .5;
      announce("DASH CANCEL");
    }
    if (!p.grounded) p.airDash = false;
    const direction = keys.has("a") ? -1 : keys.has("d") ? 1 : p.facing;
    addAfterimage(p, "#c9f8ff");
    p.vx = direction * (p.grounded ? 510 : 450);
    p.vy = p.grounded ? 0 : Math.min(p.vy, 20);
    p.invuln = .1;
    p.dashCooldown = .24;
    p.state = "dash";
    p.stateTime = .14;
    spawnParticles(p.x - direction * 12, p.y - 34, "#9cefff", 9, 180, 4, .28);
    tone(300, .07, "square", .13, 180);
  }

  function attemptBlackFlash() {
    const p = game.player;
    const e = game.enemy;
    if (!p || p.blackFlashWindow <= 0 || !p.blackFlashTarget || p.blackFlashTarget !== e || e.health <= 0) return false;
    p.blackFlashWindow = 0;
    p.blackFlashTarget = null;
    p.blackFlashes++;
    const damage = 15 + p.comboHits * .75;
    e.health -= damage;
    e.stun = 1.05;
    e.vx = p.facing * 510;
    e.vy = -220;
    e.grounded = false;
    e.reaction = "blackFlash";
    p.energy = Math.min(100, p.energy + 18);
    p.regenBoost = Math.max(p.regenBoost, 4);
    p.comboHits++;
    p.comboTimer = 1.6;
    p.lastHit = `BLACK FLASH  ${damage.toFixed(1)} DMG`;
    game.blackFlash = .5;
    game.slow = .62;
    game.hitstop = .16;
    game.shake = 20;
    game.cameraTarget = 1.28;
    game.cameraFocusX = (p.x + e.x) / 2;
    game.cameraFocusY = (p.y + e.y) / 2 - 70;
    game.score += 3000;
    if (game.online.active && e.kind === "remote") {
      game.online.stats.damage += damage;
      game.online.stats.blackFlashes++;
      sendOnline("hit", {
        damage, kbX: 510, kbY: 220, stun: 1.05, strong: true,
        reaction: "blackFlash", sourceFacing: p.facing, blackFlash: true,
      });
    }
    announce("BLACK FLASH");
    spawnBlackFlash(e.x, e.y - e.h * .58);
    tone(48, .42, "sawtooth", .42, 380);
    noise(.26, .32);
    return true;
  }

  function spawnBlackFlash(x, y) {
    spawnParticles(x, y, "#050208", 28, 560, 10, .8);
    spawnParticles(x, y, "#ff173e", 34, 650, 8, .75);
    for (let i = 0; i < 8; i++) {
      game.particles.push({
        x, y, vx: rnd(-430, 430), vy: rnd(-430, 430),
        size: rnd(12, 28), color: i % 2 ? "#ff2048" : "#080109",
        life: .35, maxLife: .35, gravity: 0, slash: true,
      });
    }
  }

  function updateWorldSlashUnlock(p) {
    if (!p || p.character !== "sukuna") return false;
    const unlocked = p.dismantleUses >= 10 && p.cleaveUses >= 5 && p.sukunaDomainUses >= 1;
    if (unlocked && !p.worldSlashUnlocked) {
      p.worldSlashUnlocked = true;
      announce("WORLD-CUTTING SLASH UNLOCKED");
      game.realityCrack = .35;
      tone(52, .65, "sawtooth", .3, 220);
    }
    return p.worldSlashUnlocked;
  }

  function abilityTuning(p, name) {
    const profile = characterProfile(p);
    if (p?.character === "hakari" && p.jackpot > 0 && name === "blue") {
      return { cost: 10, cooldown: 11, label: "GAMBLER'S LUCK" };
    }
    if (p?.character === "hakari" && p.jackpot > 0 && name === "purple") {
      return { cost: 8, cooldown: 9, label: "FEVER BREAKER" };
    }
    return { cost: profile.costs[name], cooldown: profile.cooldowns[name], label: profile.labels[name] };
  }

  function useAbility(name) {
    const p = game.player;
    const profile = characterProfile(p);
    const domainResponse = game.online.active && name === "domain" && game.online.remoteDomainWindow > 0;
    if (!p || p.stun > 0 || p.charging || p.chargeRecovery > 0 || (game.cinematic > 0 && !domainResponse) || game.clash || (game.online.active && Date.now() < game.online.startAt)) return;
    if (p.character === "gojo" && name === "purple") {
      if (!game.unstablePurple || game.unstablePurple.state !== "unstable") return;
      stabilizeHollowPurple();
      return;
    }
    if (p.character === "gojo" && p.burnout > 0 && (name === "blue" || name === "red" || name === "domain")) return;
    if (p.character === "sukuna" && name === "purple" && !updateWorldSlashUnlock(p)) {
      announce(`WORLD SLASH LOCKED ${p.dismantleUses}/10 D  ${p.cleaveUses}/5 C  ${p.sukunaDomainUses}/1 DOMAIN`);
      tone(70, .08, "square", .14, -30);
      return;
    }
    const canSpecialCancel = p.attack?.hitConfirmed && p.attack.specialCancel && p.attack.elapsed >= p.attack.start;
    if (p.attack && !canSpecialCancel) return;
    const tuning = abilityTuning(p, name);
    const jackpotFinisherMove = p.character === "hakari" && p.jackpot > 0 && (name === "blue" || name === "purple");
    if (p.cooldowns[name] > 0 || ((!p.jackpot || jackpotFinisherMove) && p.energy < tuning.cost)) {
      tone(70, .06, "square", .12, -20);
      return;
    }
    if (canSpecialCancel) {
      p.attack = null;
      game.score += 150;
    }
    const cooldownScale = p.awakening > 0 ? .52 : 1;
    if (p.jackpot <= 0 || jackpotFinisherMove) p.energy -= tuning.cost;
    p.cooldowns[name] = jackpotFinisherMove
      ? tuning.cooldown
      : tuning.cooldown * cooldownScale * (p.jackpot > 0 ? .28 : 1);
    p.blocking = false;

    if (p.character === "hakari") {
      useHakariTechnique(name);
    } else if (p.character === "sukuna") {
      useSukunaTechnique(name);
    } else if (name === "blue") {
      p.attack = { name: "Lapse: Blue", elapsed: 0, duration: .58, start: .22, end: .36, active: false, hit: new Set(), type: "blue" };
      p.state = "cast";
      setTimeout(() => {
        if (game.state !== "playing") return;
        game.projectiles.push({
          owner: "player", type: "blue", x: p.x + p.facing * 175, y: p.y - 105,
          vx: p.facing * 55, vy: 0, w: 38, h: 38, life: 2.8,
          damage: 2.3, tick: 0, strong: false,
        });
        sendOnline("event", {
          kind: "projectile", projectile: {
            type: "blue", x: p.x + p.facing * 175, y: p.y - 105,
            vx: p.facing * 55, vy: 0, w: 38, h: 38, life: 2.8,
            damage: 2.3, tick: 0, strong: false,
          },
        });
        tone(85, .6, "sine", .25, 420);
      }, 220);
    } else if (name === "red") {
      p.attack = { name: "Reversal: Red", elapsed: 0, duration: .66, start: .28, end: .43, active: false, hit: new Set(), type: "red" };
      p.state = "cast";
      setTimeout(() => {
        if (game.state !== "playing") return;
        game.projectiles.push({
          owner: "player", type: "red", x: p.x + p.facing * 55, y: p.y - 80,
          vx: p.facing * 510, vy: 0, w: 48, h: 48, life: 1.5,
          damage: 18, kbX: 620, kbY: 240, strong: true,
        });
        sendOnline("event", {
          kind: "projectile", projectile: {
            type: "red", x: p.x + p.facing * 55, y: p.y - 80,
            vx: p.facing * 510, vy: 0, w: 48, h: 48, life: 1.5,
            damage: 18, kbX: 620, kbY: 240, strong: true,
          },
        });
        tone(150, .35, "sawtooth", .3, -100);
      }, 285);
    } else if (name === "domain") {
      activateDomain();
    }
  }

  function useSukunaTechnique(name) {
    const p = game.player;
    const e = game.enemy;
    if (name === "red") {
      p.dismantleUses++;
      updateWorldSlashUnlock(p);
      p.attack = {
        name: "Dismantle", elapsed: 0, duration: .42, start: .12, end: .24,
        active: false, hit: new Set(), type: "dismantle", specialCancel: true,
      };
      p.state = "slash";
      setTimeout(() => {
        if (game.state !== "playing") return;
        const projectile = {
          owner: "player", type: "dismantle", x: p.x + p.facing * 62, y: p.y - 72,
          vx: p.facing * 760, vy: 0, w: 115, h: 38, life: .72,
          damage: 15, kbX: 330, kbY: 110, strong: false,
        };
        game.projectiles.push(projectile);
        sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
        tone(240, .12, "sawtooth", .24, -170);
      }, 120);
    } else if (name === "blue") {
      p.cleaveUses++;
      updateWorldSlashUnlock(p);
      const weakened = 1 - clamp(e.health / e.maxHealth, 0, 1);
      p.attack = {
        name: "Cleave", elapsed: 0, duration: .48, start: .16, end: .31,
        active: false, hit: new Set(), type: "cleave", specialCancel: true,
        range: 104, h: 82, y: -88, damage: 15 + weakened * 13,
        kbX: 310, kbY: 170, reaction: "slash", color: "#ff244f", strong: weakened > .45, slash: true,
      };
      p.state = "slash";
      tone(105, .2, "sawtooth", .25, 220);
    } else if (name === "purple") {
      p.attack = {
        name: "World Slash", elapsed: 0, duration: .82, start: .34, end: .52,
        active: false, hit: new Set(), type: "worldSlash", specialCancel: false,
      };
      p.state = "worldSlash";
      game.cinematic = .36;
      game.cameraTarget = 1.22;
      announce("WORLD-CUTTING DISMANTLE");
      setTimeout(() => {
        if (game.state !== "playing") return;
        const projectile = {
          owner: "player", type: "worldSlash", x: p.x + p.facing * 120, y: p.y - 84,
          vx: p.facing * 920, vy: 0, w: 285, h: 112, life: .9,
          damage: p.awakening > 0 ? 144 : 117, kbX: 760, kbY: 240, strong: true, erasing: true,
        };
        game.projectiles.push(projectile);
        sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
        game.realityCrack = .55;
        game.shake = 17;
        tone(44, .7, "sawtooth", .4, 260);
      }, 340);
    } else if (name === "domain") {
      activateDomain();
    }
  }

  function rollHakariRarity(p) {
    const roll = Math.random() * 100;
    const goldThreshold = 4 + p.heat * .05 + p.parryHot * .8;
    const redThreshold = goldThreshold + 24 + p.heat * .04;
    return roll < goldThreshold ? "gold" : roll < redThreshold ? "red" : "green";
  }

  function registerHakariRollInput(technique, rarity) {
    const p = game.player;
    const domain = game.hakariDomain;
    if (!domain) return;
    domain.rollInputs.push({ technique, rarity });
    domain.lastRarity = rarity;
    domain.result = "charging";
    announce(`${rarity.toUpperCase()} ${technique.toUpperCase()}  ${domain.rollInputs.length}/2`);
    if (domain.rollInputs.length >= 2) resolveHakariRoll();
    p.heat = Math.min(100, p.heat + (rarity === "gold" ? 10 : rarity === "red" ? 6 : 3));
  }

  function useHakariTechnique(name) {
    const p = game.player;
    if (name === "red") {
      p.attack = {
        name: "Rough Cursed Punch", elapsed: 0, duration: p.jackpot > 0 ? .3 : .44,
        start: p.jackpot > 0 ? .08 : .14, end: p.jackpot > 0 ? .2 : .3,
        active: false, hit: new Set(), type: "roughPunch", specialCancel: true,
        range: 96, h: 65, y: -72, damage: p.jackpot > 0 ? 18 : 14.5,
        kbX: 270, kbY: 120, reaction: "body", color: "#55f087",
        strong: true, rough: true, armor: true,
      };
      p.vx = p.facing * (p.jackpot > 0 ? 620 : 490);
      p.invuln = Math.max(p.invuln, .08);
      p.heat = Math.min(100, p.heat + 7);
      p.state = "roughPunch";
      tone(125, .16, "square", .26, 160);
    } else if (name === "blue") {
      if (p.jackpot > 0) {
        p.attack = {
          name: "Gambler's Luck", elapsed: 0, duration: .95, start: .15, end: .72,
          active: false, hit: new Set(), type: "gamblersLuck", specialCancel: false,
          range: 112, h: 76, y: -76, damage: 28, kbX: 650, kbY: 120,
          reaction: "slam", color: "#ffe95a", strong: true, rough: true, grab: true,
        };
        p.state = "gamblersLuck";
        p.vx = p.facing * 285;
        game.shake = 7;
        announce("GAMBLER'S LUCK");
        spawnParticles(p.x + p.facing * 40, GROUND - 8, "#58ff8c", 22, 360, 8, .75);
        tone(115, .32, "square", .28, 310);
        return;
      }
      const rarity = rollHakariRarity(p);
      p.attack = { name: `${rarity.toUpperCase()} Shutter Doors`, elapsed: 0, duration: .48, start: .14, end: .3, active: false, hit: new Set(), type: "doors" };
      p.state = "doors";
      for (let i = 0; i < 1; i++) {
        const projectile = {
          owner: "player", type: "door", rarity,
          x: p.x + p.facing * (105 + i * 78), y: GROUND - 64,
          vx: 0, vy: 0, w: 44, h: 128, life: .72 + i * .1,
          damage: rarity === "gold" ? 20 : rarity === "red" ? 15 : 11,
          kbX: rarity === "gold" ? 420 : 270, kbY: 110, strong: rarity !== "green",
        };
        game.projectiles.push(projectile);
        sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
      }
      registerHakariRollInput("shutter", rarity);
      p.heat = Math.min(100, p.heat + (rarity === "gold" ? 12 : 5));
      announce(`${rarity.toUpperCase()} SHUTTER DOORS`);
      tone(rarity === "gold" ? 720 : rarity === "red" ? 430 : 260, .2, "square", .2, -120);
    } else if (name === "purple") {
      if (p.jackpot > 0) {
        p.attack = {
          name: "Fever Breaker", elapsed: 0, duration: .78, start: .12, end: .48,
          active: false, hit: new Set(), type: "feverBreaker", specialCancel: false,
          range: 98, h: 92, y: -92, damage: 26, kbX: 95, kbY: -820,
          reaction: "slam", color: "#fff35d", strong: true, rough: true, downslam: true,
        };
        p.state = "feverBreaker";
        p.vx = p.facing * 220;
        game.cinematic = .18;
        game.cameraTarget = 1.18;
        announce("FEVER BREAKER");
        spawnParticles(p.x + p.facing * 48, p.y - 62, "#fff35d", 24, 420, 8, .7);
        tone(165, .28, "square", .3, 380);
        return;
      }
      const rarity = rollHakariRarity(p);
      p.attack = { name: "Reserve Balls", elapsed: 0, duration: .34, start: .08, end: .2, active: false, hit: new Set(), type: "reserveBall" };
      p.state = "cast";
      for (let i = 0; i < 1; i++) {
        const projectile = {
          owner: "player", type: "reserveBall", rarity,
          x: p.x + p.facing * 44, y: p.y - 72 - i * 8,
          vx: p.facing * (520 + i * 45), vy: -140 + i * 55,
          w: 20, h: 20, life: 2.4, damage: 7.2, kbX: 130, kbY: 45,
          bounces: 2, strong: false,
        };
        game.projectiles.push(projectile);
        sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
      }
      registerHakariRollInput("reserve", rarity);
      p.heat = Math.min(100, p.heat + 4);
      announce(`${rarity.toUpperCase()} RESERVE BALL`);
      tone(510, .12, "square", .16, 100);
    } else if (name === "domain") {
      activateDomain();
    }
  }

  function consecutiveEffect() {
    const p = game.player;
    if (!p || p.character !== "hakari" || p.stun > 0 || p.rewindWindow > 0) return;
    if (p.cooldowns.consecutive > 0) return;
    p.rewindX = p.x;
    p.rewindY = p.y;
    p.rewindHealth = p.health;
    p.rewindWindow = p.jackpot > 0 || game.hakariDomain ? .72 : .44;
    p.cooldowns.consecutive = p.jackpot > 0 ? 1.4 : game.hakariDomain ? 2.4 : 8.5;
    p.heat = Math.min(100, p.heat + 6);
    announce("CONSECUTIVE EFFECT");
    spawnParticles(p.x, p.y - 55, "#5cff91", 18, 240, 5, .5);
    tone(620, .18, "sine", .2, -250);
  }

  function createUnstablePurple(blue, red) {
    const p = game.player;
    const x = (blue.x + red.x) / 2;
    const y = (blue.y + red.y) / 2;
    game.unstablePurple = {
      x, y, facing: p.facing, timer: 3.8, maxTimer: 3.8,
      state: "unstable", pulse: 0, lightning: 0, hum: 0,
      fireTimer: 0,
    };
    p.cooldowns.purple = 0;
    game.shake = 7;
    game.cameraTarget = 1.12;
    game.cameraFocusX = x;
    game.cameraFocusY = y;
    game.glitch = .18;
    announce("UNSTABLE HOLLOW PURPLE");
    spawnParticles(x, y, "#814dff", 45, 390, 9, 1);
    spawnParticles(x, y, "#ff315d", 18, 320, 6, .7);
    spawnParticles(x, y, "#438cff", 18, 320, 6, .7);
    tone(48, 1.2, "sawtooth", .28, 105);
    noise(.18, .16);
    sendOnline("event", {
      kind: "purpleFusion", x, y, facing: p.facing, timer: 3.8,
      consumedEnemyRed: red.owner === "enemy",
    });
  }

  function stabilizeHollowPurple() {
    const p = game.player;
    const purple = game.unstablePurple;
    if (!purple || purple.state !== "unstable" || p.energy < 82) {
      if (purple?.state === "unstable" && p.energy < 82) announce("HOLLOW PURPLE NEEDS 82 CE");
      return;
    }
    purple.state = "firing";
    purple.fireTimer = .58;
    purple.timer = Math.max(purple.timer, .58);
    p.attack = {
      name: "Hollow Purple", elapsed: 0, duration: .92, start: .44, end: .72,
      active: false, hit: new Set(), type: "purple", strong: true,
    };
    p.state = "purple";
    p.invuln = .8;
    p.cooldowns.purple = characters.gojo.cooldowns.purple;
    game.cinematic = .58;
    game.cameraTarget = 1.3;
    game.cameraFocusX = (p.x + purple.x) / 2;
    game.cameraFocusY = purple.y;
    announce("HOLLOW PURPLE");
    speakLine("Hollow Purple.");
    tone(72, .7, "sine", .34, 360);
  }

  function launchHollowPurple(purple) {
    const p = game.player;
    game.projectiles.push({
      owner: "player", type: "purple", x: purple.x, y: purple.y,
      vx: purple.facing * 760, vy: 0, w: 300, h: 126, life: 1.65,
      damage: p.awakening > 0 ? 100 : 88, kbX: 980, kbY: 220,
      strong: true, erasing: true,
    });
    game.unstablePurple = null;
    p.energy = Math.min(p.energy, 4);
    p.regenBoost = 0;
    game.flash = .3;
    game.realityCrack = .85;
    game.shake = 24;
    game.cameraTarget = 1.34;
    game.score += 5000;
    sendOnline("event", {
      kind: "projectile", projectile: {
        type: "purple", x: purple.x, y: purple.y,
        vx: purple.facing * 760, vy: 0, w: 300, h: 126, life: 1.65,
        damage: p.awakening > 0 ? 100 : 88, kbX: 980, kbY: 220,
        strong: true, erasing: true,
      },
    });
    spawnShockwave(purple.x, purple.y, "#e9d6ff");
    spawnParticles(purple.x, purple.y, "#b06cff", 60, 690, 11, 1.1);
    damageProps(p, { strong: true, damage: 100, range: 900, y: -180, h: 240 });
    game.props.forEach((prop) => { prop.hp = 0; });
    tone(42, 1.2, "sawtooth", .46, 330);
    noise(.65, .32);
  }

  function collapseUnstablePurple() {
    const purple = game.unstablePurple;
    const p = game.player;
    const e = game.enemy;
    if (!purple) return;
    const enemyDistance = Math.hypot(e.x - purple.x, (e.y - e.h / 2) - purple.y);
    const playerDistance = Math.hypot(p.x - purple.x, (p.y - p.h / 2) - purple.y);
    if (playerDistance < 430) {
      p.health -= 30;
      p.vx = Math.sign(p.x - purple.x || -purple.facing) * 620;
      p.vy = -360;
      p.stun = 1.15;
      p.burnout = 9;
      p.attack = null;
    }
    if (enemyDistance < 470) {
      e.health -= 38;
      e.vx = Math.sign(e.x - purple.x || purple.facing) * 780;
      e.vy = -440;
      e.stun = 1.35;
      e.reaction = "purpleBlast";
    }
    game.unstablePurple = null;
    game.purpleExplosion = .85;
    game.glitch = .65;
    game.flash = .45;
    game.shake = 28;
    game.cameraTarget = 1.38;
    game.props.forEach((prop) => {
      if (Math.abs(prop.x + prop.w / 2 - purple.x) < 500) prop.hp = 0;
    });
    spawnParticles(purple.x, purple.y, "#08020f", 55, 720, 14, 1.2);
    spawnParticles(purple.x, purple.y, "#a15cff", 80, 820, 12, 1.25);
    spawnShockwave(purple.x, purple.y, "#c694ff");
    announce("PURPLE COLLAPSE");
    sendOnline("event", { kind: "purpleCollapse", x: purple.x, y: purple.y });
    tone(35, 1.1, "sawtooth", .48, 240);
    noise(.8, .38);
  }

  function activateDomain() {
    const p = game.player;
    const profile = characterProfile(p);
    if (p.character === "sukuna") {
      p.sukunaDomainUses++;
      updateWorldSlashUnlock(p);
    }
    p.cooldowns.domain = profile.cooldowns.domain;
    p.attack = null;
    p.state = "domain";
    p.invuln = 2.4;
    game.domainIntro = 2.35;
    game.cinematic = 2.35;
    game.glitch = 1.15;
    game.windPaused = true;
    game.cameraTarget = 1.22;
    game.cameraFocusX = p.x;
    game.cameraFocusY = p.y - 62;
    game.shake = 7;
    game.domainCharacter = p.character;
    game.domainOwnerSlot = game.online.active ? game.online.slot : 1;
    game.domainStartup = 2.35;
    if (game.online.active) {
      game.online.stats.domains++;
      game.online.localDomainWindow = 1.6;
      sendOnline("event", { kind: "domain", character: p.character });
      if (game.online.remoteDomainWindow > 0) {
        game.domainClashPending = true;
        beginClash("DOMAIN COLLISION", true);
      }
    }
    announce(p.character === "sukuna" ? "MALEVOLENT SHRINE" : p.character === "hakari" ? "IDLE DEATH GAMBLE" : "DOMAIN EXPANSION");
    tone(55, 1.5, "sine", .3, 220);
    tone(82, 1.8, "sine", .16, -18);
    speakLine(p.character === "sukuna" ? "Open your eyes." : p.character === "hakari" ? "Let's gamble." : "Domain Expansion. Unlimited Void.");
    setTimeout(() => {
      if (game.state !== "playing") return;
      if (game.online.active && game.online.authoritative) {
        p.state = "idle";
        return;
      }
      if (game.online.active && game.domainClashPending) {
        game.domainClashPending = false;
        return;
      }
      if (!game.online.active && game.enemy.type.boss && !game.enemy.domainUsed && game.enemy.energy >= 80) {
        game.enemy.domainUsed = true;
        game.enemy.energy -= 80;
        beginClash("DOMAIN COLLISION", true);
      } else if (p.character === "hakari") {
        startHakariDomain();
      } else {
        game.domain = p.character === "sukuna" ? 15 : 12;
        game.domainTick = .5;
        p.state = "idle";
        spawnParticles(W / 2, H / 2, p.character === "sukuna" ? "#ff254c" : "#9f8cff", 80, 520, 7, 1.2);
        announce(p.character === "sukuna" ? "MALEVOLENT SHRINE" : "UNLIMITED VOID");
      }
    }, 2200);
  }

  function startHakariDomain() {
    const p = game.player;
    game.domain = 14;
    game.domainCharacter = "hakari";
    game.hakariDomain = {
      timer: 14,
      rollIndex: 0,
      slots: [1, 3, 7],
      displaySlots: [1, 3, 7],
      rollInputs: [],
      lastRarity: "",
      nearBonus: 0,
      damageTaken: 0,
      result: "waiting",
      flash: 0,
    };
    p.parryHot = 0;
    p.state = "idle";
    announce("PACHINKO FEVER");
    spawnParticles(W / 2, H / 2, "#58ff8c", 70, 500, 7, 1);
    tone(330, .8, "square", .25, 420);
  }

  function resolveHakariRoll(forced = "") {
    const p = game.player;
    const domain = game.hakariDomain;
    if (!domain || domain.rollInputs.length < 2) return;
    const rarityValue = { green: 0, red: 1, gold: 2 };
    const rarityScore = clamp(domain.rollInputs.reduce((total, input) => total + rarityValue[input.rarity], 0), 0, 4);
    const jackpotChance = clamp([.02, .04, .07, .11, .17][rarityScore] + p.heat * .0003 + domain.nearBonus, .02, .22);
    const nearChance = clamp(jackpotChance + .28, .3, .5);
    const roll = Math.random();
    const result = forced || (roll < jackpotChance ? "jackpot" : roll < nearChance ? "near" : "fail");
    const number = 1 + Math.floor(Math.random() * 7);
    if (result === "jackpot") {
      domain.slots = [number, number, number];
      domain.displaySlots = [...domain.slots];
      domain.result = "jackpot";
      startJackpot();
    } else if (result === "near") {
      const miss = number === 7 ? 6 : number + 1;
      domain.slots = [number, number, miss];
      domain.displaySlots = [...domain.slots];
      domain.result = "near";
      domain.nearBonus = Math.min(.06, domain.nearBonus + .02);
      p.awakening = Math.max(p.awakening, 3.5);
      p.heat = Math.min(100, p.heat + 12);
      announce("REACH! NEAR JACKPOT");
      tone(580, .35, "square", .23, 260);
    } else {
      domain.slots = [1 + Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 7)];
      domain.displaySlots = [...domain.slots];
      domain.result = "fail";
      p.energy = Math.min(100, p.energy + 10);
      p.stun = Math.max(p.stun, .28);
      announce("ROLL MISSED");
      tone(90, .25, "square", .18, -40);
    }
    domain.flash = .7;
    domain.rollIndex++;
    domain.rollInputs = [];
  }

  function startJackpot(fromClash = false) {
    const p = game.player;
    p.jackpot = 38;
    p.energy = 100;
    p.health = Math.min(p.maxHealth, p.health + 18);
    p.awakening = 38;
    p.damageScale = 1.28;
    p.heat = 100;
    p.stun = 0;
    p.jackpotFinisher = false;
    game.domain = 0;
    game.domainIntro = 0;
    game.hakariDomain = null;
    game.jackpotFlash = 1.3;
    game.cinematic = .75;
    game.flash = .4;
    game.shake = 18;
    game.cameraTarget = 1.28;
    announce(fromClash ? "JACKPOT CLASH WIN" : "JACKPOT");
    spawnParticles(p.x, p.y - 60, "#62ff91", 90, 720, 10, 1.2);
    spawnParticles(p.x, p.y - 60, "#fff35d", 45, 560, 8, 1);
    tone(220, 1.1, "square", .35, 660);
    noise(.35, .2);
    if (game.online.active) sendOnline("event", { kind: "jackpot", duration: 38 });
  }

  function shatterHakariDomain(forced = false) {
    const p = game.player;
    if (!game.hakariDomain && !forced) return;
    game.hakariDomain = null;
    game.domain = 0;
    p.energy = Math.max(0, p.energy - 28);
    p.stun = Math.max(p.stun, 1.15);
    game.shake = 17;
    game.glitch = .45;
    announce("GAMBLE SHATTERED");
    spawnParticles(p.x, p.y - 55, "#53f085", 38, 520, 8, .9);
  }

  function updateHakariState(dt) {
    const p = game.player;
    if (!p || p.character !== "hakari") return;
    if (p.jackpot > 0) {
      p.jackpot = Math.max(0, p.jackpot - dt);
      p.energy = 100;
      p.health = Math.min(p.maxHealth, p.health + dt * 7.2);
      p.heat = 100;
      if (chance(dt * 8)) {
        spawnParticles(p.x + rnd(-24, 24), p.y - rnd(25, 105), chance(.3) ? "#fff35d" : "#4dff87", 1, 150, 5, .45);
      }
      p.cheerTimer = (p.cheerTimer || 0) - dt;
      if (p.cheerTimer <= 0) {
        p.cheerTimer = 1.25;
        tone(chance(.5) ? 660 : 880, .08, "square", .055, 60);
      }
      if (p.jackpot <= 0) {
        p.awakening = 0;
        p.damageScale = 1;
        p.energy = 55;
        p.heat = 62;
        announce("JACKPOT ENDED");
      }
    }
    const domain = game.hakariDomain;
    if (!domain) return;
    domain.timer -= dt;
    domain.flash = Math.max(0, domain.flash - dt);
    if (domain.timer <= 0) shatterHakariDomain();
  }

  function speakLine(text) {
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const line = new SpeechSynthesisUtterance(text);
      line.rate = .78;
      line.pitch = .7;
      line.volume = .5;
      speechSynthesis.speak(line);
    } catch {}
  }

  function awaken() {
    const p = game.player;
    if (p?.charging || p?.chargeRecovery > 0) return;
    if (p?.character === "hakari") {
      consecutiveEffect();
      return;
    }
    const sukunaReady = p?.character === "sukuna" && p.damageDealt >= 55 && p.energy >= 40;
    const gojoReady = p?.character !== "sukuna" && p.energy >= 50 && p.health <= p.maxHealth * .6;
    if (!p || p.awakening > 0 || (!sukunaReady && !gojoReady)) return;
    p.energy -= p.character === "sukuna" ? 40 : 50;
    p.awakening = 12;
    p.damageScale = p.character === "sukuna" ? 1.35 : 1.25;
    if (p.character !== "sukuna") p.health = Math.min(p.maxHealth, p.health + 12);
    p.invuln = 1.2;
    game.cinematic = .9;
    game.flash = .25;
    game.shake = 12;
    announce(p.character === "sukuna" ? "KING OF CURSES" : "THE HONORED ONE");
    spawnParticles(p.x, p.y - 55, p.character === "sukuna" ? "#ff244f" : "#d8fbff", 45, 440, 7, .9);
    tone(140, .7, "sine", .35, 540);
  }

  function enemyStartAttack(type = "light") {
    const e = game.enemy;
    if (!e || e.stun > 0 || e.attack) return;
    const boss = e.type.boss;
    const defs = {
      light: { name: "Rend", duration: .48, start: .18, end: .29, range: 64, h: 62, y: -76, damage: 10, kbX: 210, kbY: 100 },
      heavy: { name: "Calamity Crush", duration: .78, start: .38, end: .53, range: boss ? 105 : 83, h: 80, y: -87, damage: boss ? 22 : 17, kbX: 390, kbY: 290, strong: true },
      sweep: { name: "Night Sweep", duration: .62, start: .29, end: .43, range: 92, h: 42, y: -42, damage: 14, kbX: 260, kbY: 210 },
    };
    e.attack = { ...defs[type], elapsed: 0, hit: new Set(), active: false, type };
    e.state = type;
    e.stateTime = 0;
  }

  function attackBox(entity, attack) {
    const range = attack.range || 0;
    return {
      x: entity.facing > 0 ? entity.x + entity.w * .15 : entity.x - range - entity.w * .15,
      y: entity.y + (attack.y || -70),
      w: range,
      h: attack.h || 50,
    };
  }

  function bodyBox(entity) {
    return { x: entity.x - entity.w / 2, y: entity.y - entity.h, w: entity.w, h: entity.h };
  }

  function ruthlessCounter(target, transmit = true) {
    const p = game.player;
    if (!p || p.character !== "sukuna" || !target) return;
    const damage = 18 * p.damageScale;
    p.x = clamp(target.x - target.facing * 44, 30, W - 30);
    p.y = target.y;
    p.facing = target.facing;
    p.energy = Math.min(100, p.energy + 18);
    p.damageDealt += damage;
    p.pressure = Math.min(4, p.pressure + 1.5);
    target.health -= damage;
    target.stun = 1.15;
    target.vx = p.facing * 160;
    target.vy = 720;
    target.grounded = false;
    target.reaction = "slam";
    target.attack = null;
    game.cinematic = .42;
    game.slow = .48;
    game.hitstop = .14;
    game.shake = 15;
    game.cameraTarget = 1.24;
    announce("RUTHLESS COUNTER");
    speakLine("Too slow.");
    spawnParticles(target.x, target.y - 60, "#ff244f", 34, 520, 8, .75);
    spawnShockwave(target.x, target.y - 40, "#ff5475");
    if (game.online.active && target.kind === "remote" && transmit) {
      game.online.stats.damage += damage;
      sendOnline("hit", {
        damage, kbX: 160, kbY: -720, stun: 1.15, strong: true,
        reaction: "slam", downslam: true, sourceFacing: p.facing, ruthlessCounter: true,
      });
    }
  }

  function applyHit(attacker, defender, attack) {
    if (defender.invuln > 0) return false;
    const isPlayerDefending = defender.kind === "player";
    const p = game.player;
    const now = performance.now();
    if (isPlayerDefending && p.charging) stopEnergyCharge(true);

    if (isPlayerDefending && p.blocking && p.grounded) {
      const perfect = now - p.guardStart <= 105;
      if (perfect) {
        defender.invuln = .42;
        p.parryStreak++;
        p.parryTimer = 3;
        const parryMultiplier = 1 + Math.min(3, p.parryStreak - 1) * .18;
        attacker.stun = 1.05 * parryMultiplier;
        attacker.attack = null;
        if (attacker.adaptation) attacker.adaptation.parryBaits++;
        p.energy = Math.min(100, p.energy + 12 * parryMultiplier);
        if (p.character === "hakari") {
          p.energy = Math.min(100, p.energy + 8);
          p.heat = Math.min(100, p.heat + 18);
          p.parryHot = Math.min(4, p.parryHot + .8);
          p.nextM1Fast = true;
          announce("GETTING HOT");
          tone(430, .2, "square", .22, 210);
        }
        game.parries++;
        if (game.online.active) game.online.stats.parries++;
        game.slow = .55;
        game.hitstop = .13;
        game.shake = 9 + p.parryStreak;
        game.flash = .12;
        game.cameraTarget = 1.16;
        game.cameraFocusX = (p.x + attacker.x) / 2;
        game.cameraFocusY = p.y - 60;
        announce(p.parryStreak > 1 ? `PARRY CHAIN x${p.parryStreak}` : "PERFECT PARRY");
        spawnParticles(p.x + p.facing * 25, p.y - 63, "#dfffff", 28, 470, 7, .65);
        spawnShockwave(p.x + p.facing * 20, p.y - 63, "#dfffff");
        tone(760, .18, "square", .3, 480);
        if (p.character === "sukuna") ruthlessCounter(attacker);
        return true;
      }
      const chip = attack.damage * .25;
      defender.health -= chip;
      defender.energy = Math.max(0, defender.energy - (attack.strong ? 7 : 3));
      defender.vx = attacker.facing * (attack.kbX || 100) * .18;
      game.hitstop = .035;
      spawnParticles(p.x + p.facing * 20, p.y - 60, "#5beaff", 9, 180, 4, .3);
      tone(180, .07, "square", .14, -80);
      return true;
    }

    if (isPlayerDefending && p.character === "hakari" && p.rewindWindow > 0) {
      p.rewindWindow = 0;
      p.x = p.rewindX;
      p.y = p.rewindY;
      p.health = Math.max(p.health, p.rewindHealth - attack.damage * .2);
      p.stun = .08;
      p.invuln = .24;
      p.heat = Math.min(100, p.heat + 12);
      game.glitch = .18;
      game.slow = .26;
      announce("DAMAGE REWOUND");
      spawnParticles(p.x, p.y - 55, "#65ff97", 28, 330, 6, .6);
      return true;
    }

    const scale = attack.fixedDamage ? 1 : attacker.kind === "player" ? p.damageScale : attacker.power;
    const armored = isPlayerDefending && p.character === "hakari" && p.attack?.armor && !attack.strong;
    const damage = attack.damage * scale * (armored ? .42 : 1);
    defender.health -= damage;
    defender.vx = attacker.facing * (attack.kbX || 130);
    if (attack.kbY) {
      defender.vy = attack.downslam || attack.reaction === "slam" ? Math.abs(attack.kbY) : -Math.abs(attack.kbY);
      defender.grounded = false;
    }
    defender.stun = armored ? .08 : clamp(.12 + damage * .012, .16, .62);
    defender.flash = .12;
    if (!armored) defender.attack = null;
    defender.reaction = attack.reaction || (!defender.grounded ? "air" : attack.strong ? "body" : "stumble");
    game.hitstop = attack.strong ? .095 : .045;
    game.shake = attack.strong ? 12 : 5;
    if (defender.kind === "enemy" && defender.health <= 0 && attack.strong) {
      game.cameraTarget = defender.type?.boss ? 1.42 : 1.28;
      game.cameraFocusX = (attacker.x + defender.x) / 2;
      game.cameraFocusY = defender.y - 64;
      game.cinematic = defender.type?.boss ? 1.05 : .62;
      if (defender.type?.boss) {
        game.glitch = .55;
        announce("LIMITLESS FINISH");
      }
    }
    spawnParticles(
      defender.x - attacker.facing * 14,
      defender.y - defender.h * .6,
      attack.color || (attacker.kind === "player" ? "#64eaff" : "#ff4772"),
      attack.strong ? 26 : 13,
      attack.strong ? 470 : 310,
      attack.strong ? 8 : 5,
      attack.strong ? .7 : .4
    );
    noise(attack.strong ? .16 : .07, attack.strong ? .22 : .12);
    tone(attack.strong ? 95 : 145, attack.strong ? .14 : .07, "square", .2, -50);

    if (attacker.kind === "player") {
      p.comboHits++;
      p.comboTimer = 1.25;
      const aggressionGain = p.character === "hakari"
        ? (attack.strong ? 6.4 : 4.4) + Math.min(5, p.comboHits * .45)
        : p.character === "sukuna"
        ? (attack.strong ? 7.5 : 4.1) + Math.min(4, p.comboHits * .35) + (p.awakening > 0 ? 2 : 0)
        : attack.strong ? 5.2 : 2.8;
      p.energy = Math.min(100, p.energy + aggressionGain);
      p.damageDealt += damage;
      if (p.character === "sukuna") p.pressure = Math.min(4, p.pressure + .48 + p.comboHits * .035);
      if (p.character === "hakari") {
        p.heat = Math.min(100, p.heat + (attack.strong ? 8 : 4.5) + Math.min(5, p.comboHits * .4));
        if (attack.rough) {
          spawnParticles(defender.x, defender.y - defender.h * .55, "#55f087", attack.strong ? 24 : 12, 390, 7, .55);
          game.shake = Math.max(game.shake, attack.strong ? 13 : 7);
        }
      }
      p.regenBoost = Math.max(p.regenBoost, 2.2);
      game.score += Math.round(damage * 125 * Math.max(1, p.comboHits * .08));
      game.maxCombo = Math.max(game.maxCombo, p.comboHits);
      p.lastHit = `${attack.name.toUpperCase()}  ${damage.toFixed(1)} DMG`;
      if (p.attack) p.attack.hitConfirmed = true;
      if (attack.flashEligible) {
        p.blackFlashWindow = .09;
        p.blackFlashTarget = defender;
      }
      const strategy = attack.type === "light" ? "light" : attack.type === "heavy" ? "heavy" : "special";
      if (defender.adaptation) defender.adaptation[strategy] = (defender.adaptation[strategy] || 0) + 1;
      defender.lastPlayerStrategy = strategy;
      damageProps(attacker, attack);
      if (attack.groundFollow || (attack.downslam && p.character === "sukuna")) {
        spawnShockwave(defender.x, GROUND - 2, "#ff365e");
        spawnParticles(defender.x, GROUND - 8, "#6d3540", 30, 390, 9, .8);
        game.shake = 15;
        p.comboWindow = Math.max(p.comboWindow, .72);
      }
      if (game.online.active && defender.kind === "remote") {
        game.online.stats.damage += damage;
        sendOnline("hit", {
          damage,
          kbX: attack.kbX || 130,
          kbY: attack.kbY || 0,
          stun: clamp(.12 + damage * .012, .16, .62),
          strong: Boolean(attack.strong),
          reaction: attack.reaction || "stumble",
          downslam: Boolean(attack.downslam),
          sourceFacing: attacker.facing,
          name: attack.name,
        });
      }
    } else {
      p.damageRegen = 4;
      if (p.character === "hakari" && p.health > 0) {
        p.heat = Math.min(100, p.heat + damage * .55);
        if (game.hakariDomain) {
          game.hakariDomain.damageTaken += damage;
          if (game.hakariDomain.damageTaken >= 38) shatterHakariDomain();
        }
      }
      p.parryStreak = 0;
      p.parryTimer = 0;
    }
    return true;
  }

  function spawnShockwave(x, y, color) {
    game.particles.push({
      x, y, vx: 0, vy: 0, size: 10, color,
      life: .38, maxLife: .38, gravity: 0, ring: true,
    });
  }

  function damageProps(attacker, attack) {
    if (!attack.strong) return;
    const box = attackBox(attacker, { ...attack, range: (attack.range || 100) + 100 });
    game.props.forEach((prop) => {
      if (prop.hp > 0 && rectsOverlap(box, prop)) {
        prop.hp -= attack.damage;
        if (prop.hp <= 0) {
          spawnParticles(prop.x + prop.w / 2, prop.y + 10, "#9e9db0", 28, 390, 8, 1);
          game.shake = 10;
          game.score += 500;
        }
      }
    });
  }

  function updateAttack(entity, target, dt) {
    const attack = entity.attack;
    if (!attack) return;
    attack.elapsed += dt;
    attack.active = attack.elapsed >= attack.start && attack.elapsed <= attack.end;
    if (attack.active && attack.range) {
      const box = attackBox(entity, attack);
      if (!attack.hit.has(target) && rectsOverlap(box, bodyBox(target))) {
        attack.hit.add(target);
        const predictedOnlineHit = game.online.active && game.online.authoritative
          && entity.kind === "player" && target.kind === "remote";
        if (predictedOnlineHit) {
          attack.hitConfirmed = true;
          spawnParticles(
            target.x - entity.facing * 12,
            target.y - target.h * .58,
            attack.color || "#64eaff",
            attack.strong ? 16 : 8,
            attack.strong ? 360 : 240,
            attack.strong ? 7 : 4,
            attack.strong ? .5 : .28
          );
          game.hitstop = attack.strong ? .055 : .025;
          game.shake = Math.max(game.shake, attack.strong ? 7 : 3);
        } else if (applyHit(entity, target, attack)) {
          attack.hitConfirmed = true;
        }
      }
    }
    if (attack.elapsed >= attack.duration) {
      const buffered = entity.kind === "player" && entity.attackBuffer > 0 && entity.bufferedAttack === "light" && attack.chain;
      const nextStep = attack.chainStep + 1;
      entity.attack = null;
      entity.state = entity.grounded ? "idle" : "jump";
      const chains = characterChains(entity);
      if (buffered && nextStep < (attack.aerial ? chains.air.length : chains.ground.length)) {
        startM1(attack.aerial, nextStep);
      } else if (entity.kind === "player" && attack.finisher) {
        entity.comboWindow = attack.groundFollow ? .72 : 0;
        if (attack.groundFollow) entity.comboStep = -1;
      }
    }
  }

  function localFrozenByUnlimitedVoid() {
    return Boolean(
      game.online.active
      && game.online.authoritative
      && game.domain > 0
      && game.domainCharacter === "gojo"
      && game.domainOwnerSlot > 0
      && game.domainOwnerSlot !== game.online.slot
    );
  }

  function updatePlayer(dt) {
    const p = game.player;
    const e = game.enemy;
    if (game.online.active && game.online.authoritative) {
      p.x += game.online.correctionX * .24;
      p.y += game.online.correctionY * .24;
      game.online.correctionX *= .76;
      game.online.correctionY *= .76;
      if (Math.abs(game.online.correctionX) < .05) game.online.correctionX = 0;
      if (Math.abs(game.online.correctionY) < .05) game.online.correctionY = 0;
    }
    if (localFrozenByUnlimitedVoid()) {
      p.vx = 0;
      p.vy = 0;
      p.attack = null;
      p.blocking = false;
      p.charging = false;
      p.state = "voidFrozen";
      return;
    }
    updateHakariState(dt);
    p.stateTime += dt;
    p.stun = Math.max(0, p.stun - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    p.attackBuffer = Math.max(0, p.attackBuffer - dt);
    p.blackFlashWindow = Math.max(0, p.blackFlashWindow - dt);
    if (p.blackFlashWindow <= 0) p.blackFlashTarget = null;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.regenBoost = Math.max(0, p.regenBoost - dt);
    p.damageRegen = Math.max(0, p.damageRegen - dt);
    p.burnout = Math.max(0, p.burnout - dt);
    p.burnoutSmoke = Math.max(0, p.burnoutSmoke - dt);
    p.voiceCooldown = Math.max(0, p.voiceCooldown - dt);
    p.rewindWindow = Math.max(0, p.rewindWindow - dt);
    p.chargeCooldown = Math.max(0, p.chargeCooldown - dt);
    p.chargeRecovery = Math.max(0, p.chargeRecovery - dt);
    p.chargePulse = Math.max(0, p.chargePulse - dt);
    if (p.charging && !keys.has("c")) stopEnergyCharge();
    const canStartCharge = pressed.has("c") && p.chargeCooldown <= 0 && p.chargeRecovery <= 0
      && p.stun <= 0 && !p.attack && !p.blocking && game.cinematic <= 0;
    if (!p.charging && canStartCharge) {
      p.charging = true;
      p.state = "charge";
      p.vx = 0;
      p.chargePulse = 0;
      announce("CURSED ENERGY CHARGE");
      tone(95, .25, "sine", .13, 180);
    }
    if (p.charging) {
      p.vx = 0;
      p.blocking = false;
      p.state = "charge";
      p.energy = Math.min(100, p.energy + dt * 24);
      if (p.chargePulse <= 0) {
        p.chargePulse = .06;
        const chargeColor = p.character === "sukuna" ? "#ff3158" : p.character === "hakari" ? "#58ff8c" : "#65eaff";
        spawnParticles(p.x + rnd(-28, 28), p.y - rnd(20, 105), chargeColor, 2, 130, 5, .45);
      }
    }
    p.pressure = Math.max(0, p.pressure - dt * .35);
    if (p.character === "hakari" && p.jackpot <= 0) p.heat = Math.max(0, p.heat - dt * .42);
    p.parryTimer = Math.max(0, p.parryTimer - dt);
    if (p.parryTimer <= 0) p.parryStreak = 0;
    if (p.comboTimer <= 0) p.comboHits = 0;
    p.awakening = Math.max(0, p.awakening - dt);
    if (p.awakening <= 0) p.damageScale = 1;
    p.canAwaken = p.character !== "hakari" && p.awakening <= 0 && (p.character === "sukuna"
      ? p.damageDealt >= 55 && p.energy >= 40
      : p.health <= p.maxHealth * .6 && p.energy >= 50);
    for (const name of Object.keys(p.cooldowns)) p.cooldowns[name] = Math.max(0, p.cooldowns[name] - dt);
    const aggressionRegen = p.character === "sukuna" ? p.pressure * (p.awakening > 0 ? 1.7 : 1.05) : 0;
    const regenRate = (1.05 + (p.regenBoost > 0 ? 2.1 : 0) + (p.damageRegen > 0 ? 1.6 : 0) + (game.domain > 0 ? 1.7 : 0) + aggressionRegen)
      * (p.burnout > 0 ? .28 : 1);
    p.energy = Math.min(100, p.energy + dt * regenRate);
    if (p.burnout > 0 && p.burnoutSmoke <= 0) {
      p.burnoutSmoke = .09;
      game.particles.push({
        x: p.x + rnd(-12, 12), y: p.y - rnd(45, 92),
        vx: rnd(-18, 18), vy: rnd(-85, -45), size: rnd(5, 10),
        color: chance(.25) ? "#ff6238" : "#34313c",
        life: .8, maxLife: .8, gravity: -20, smoke: true,
      });
    }

    if (p.stun <= 0 && !p.attack && !p.charging && p.chargeRecovery <= 0 && game.cinematic <= 0) {
      const move = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const speed = (p.jackpot > 0 ? 402 : p.awakening > 0 ? (p.character === "sukuna" ? 385 : 360) : p.character === "sukuna" ? 312 : p.character === "hakari" ? 318 : 295) * (p.burnout > 0 ? .58 : 1);
      if (move) {
        const acceleration = p.grounded ? 9.5 : 4.2;
        p.vx = lerp(p.vx, move * speed, clamp(dt * acceleration, 0, 1));
        p.momentum = clamp(p.momentum + dt * 1.8, 0, 1);
        p.facing = move;
        if (p.grounded) p.state = "run";
        p.trailTimer -= dt;
        if (p.awakening > 0 && p.trailTimer <= 0) {
          addAfterimage(p, p.character === "sukuna" ? "#ff3158" : p.character === "hakari" ? "#5cff91" : "#a7efff");
          p.trailTimer = .09;
        }
      } else {
        p.vx = lerp(p.vx, 0, clamp(dt * (p.grounded ? 8 : 1.2), 0, 1));
        p.momentum = Math.max(0, p.momentum - dt * 2);
        if (p.grounded && !p.blocking) p.state = "idle";
      }
      p.blocking = keys.has("s") && p.grounded;
      if (p.blocking) {
        p.state = "block";
        p.vx *= .7;
      }
    } else if (p.stun > 0) {
      if (p.charging) stopEnergyCharge(true);
      p.state = "hit";
      p.blocking = false;
      const recoveryDirection = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      if (!p.grounded && !p.recoveryUsed && recoveryDirection && pressed.has("shift")) {
        p.vx = recoveryDirection * 330;
        p.vy *= .45;
        p.stun *= .45;
        p.recoveryUsed = true;
        p.invuln = .12;
        addAfterimage(p, "#d7fbff");
        announce("DIRECTIONAL RECOVERY");
      }
    }

    p.wall = 0;
    if (!p.grounded && p.x <= 31 && p.vx < 0) p.wall = -1;
    if (!p.grounded && p.x >= W - 31 && p.vx > 0) p.wall = 1;
    if (p.wall) {
      p.vy = Math.min(p.vy, 105);
      p.state = "wall";
    }

    p.fastFalling = !p.grounded && keys.has("s") && p.vy > -120;
    if (p.fastFalling) {
      p.vy = Math.max(p.vy, 430);
      p.state = "fastFall";
    }
    p.vy += GRAVITY * dt * (p.fastFalling ? 1.35 : 1);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = clamp(p.x, 26, W - 26);
    if (p.y >= GROUND) {
      if (!p.grounded && p.vy > 420) spawnParticles(p.x, GROUND, "#9aa9b8", 8, 130, 4, .35);
      p.y = GROUND;
      p.vy = 0;
      p.grounded = true;
      p.airDash = true;
      p.jumps = 1;
      p.recoveryUsed = false;
      p.fastFalling = false;
    } else {
      p.grounded = false;
      if (!p.attack && !p.wall) p.state = "jump";
    }

    if (!p.attack && Math.abs(e.x - p.x) > 18) p.facing = e.x > p.x ? 1 : -1;
    updateAttack(p, e, dt * (p.jackpot > 0 ? 1.3 : p.awakening > 0 ? (p.character === "sukuna" ? 1.2 : 1.13) : 1));
  }

  function updateEnemy(dt) {
    const e = game.enemy;
    const p = game.player;
    if (!e) return;
    if (game.online.active && e.kind === "remote") {
      updateRemotePlayer(dt);
      return;
    }
    if (game.domain > 0 && game.domainCharacter === "sukuna") {
      game.domainTick -= dt;
      if (game.domainTick <= 0) {
        game.domainTick += .5;
        e.health = Math.max(0, e.health - 15);
        e.stun = Math.max(e.stun, .1);
        e.reaction = "slash";
        p.damageDealt += 15;
        game.shake = Math.max(game.shake, 8);
        for (let i = 0; i < 7; i++) {
          game.particles.push({
            x: e.x + rnd(-35, 35), y: e.y - rnd(18, e.h),
            vx: rnd(-360, 360), vy: rnd(-280, 180), size: rnd(8, 18),
            color: i % 2 ? "#ff244f" : "#fff1f3",
            life: .24, maxLife: .24, gravity: 0, slash: true,
          });
        }
      }
    }
    if (game.domain > 0 && game.domainCharacter === "gojo") {
      e.vx = 0;
      e.vy = 0;
      e.attack = null;
      e.state = "voidFrozen";
      return;
    }
    e.stateTime += dt;
    e.stun = Math.max(0, e.stun - dt);
    e.invuln = Math.max(0, e.invuln - dt);
    e.flash = Math.max(0, e.flash - dt);
    e.wallSplat = Math.max(0, e.wallSplat - dt);
    e.baiting = Math.max(0, e.baiting - dt);
    e.energy = Math.min(100, e.energy + dt * 1.3);
    e.facing = p.x > e.x ? 1 : -1;

    if (e.stun > 0) {
      e.state = e.wallSplat > 0 ? "wallSplat" : `hit-${e.reaction}`;
    } else if (!e.attack && game.cinematic <= 0) {
      e.aiTimer -= dt;
      const dist = Math.abs(p.x - e.x);
      if (e.aiTimer <= 0) {
        const aggression = difficulty === "easy" ? .72 : difficulty === "hard" ? 1.18 : 1;
        e.aiTimer = rnd(.18, .48) / aggression;
        if (e.type.boss && e.energy >= 80 && !e.domainUsed && e.health < e.maxHealth * .48) {
          e.domainUsed = true;
          e.energy -= 80;
          beginClash("DOMAIN COLLISION", true);
          return;
        }
        const repeated = Math.max(e.adaptation.light, e.adaptation.heavy, e.adaptation.special);
        if (e.type.boss && repeated >= 4 && p.attack && e.emergencyDodges > 0 && chance(.55)) {
          e.vx = -e.facing * 480;
          e.invuln = .24;
          e.emergencyDodges--;
          e.state = "emergencyDodge";
          e.aiTimer = .35;
        } else if (e.adaptation.parryBaits >= 2 && dist < 125 && chance(.32)) {
          e.baiting = .34;
          e.state = "feint";
          e.aiTimer = .38;
        } else if (dist < 105 && e.baiting <= 0) {
          const roll = Math.random();
          enemyStartAttack(roll > .7 ? "heavy" : roll > .38 ? "sweep" : "light");
        } else if (dist < 270 && chance(.2 * aggression)) {
          enemyProjectile();
        } else {
          e.decision = "approach";
        }
      }
      if (e.decision === "approach" && !e.attack) {
        const desired = dist > 90 ? e.facing : dist < 58 ? -e.facing : 0;
        e.vx = lerp(e.vx, desired * e.type.speed, clamp(dt * 7, 0, 1));
        if (e.baiting <= 0) e.state = desired ? "run" : "idle";
      }
      const dodgeBias = e.type.boss ? .16 : .08;
      if (p.attack && p.attack.strong && p.attack.active && dist < 130 && e.emergencyDodges > 0 && chance(dodgeBias)) {
        e.vx = -e.facing * 330;
        e.invuln = .16;
        e.state = "dash";
        e.emergencyDodges--;
      }
    }

    e.vy += GRAVITY * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx = lerp(e.vx, 0, clamp(dt * 4, 0, 1));
    if ((e.x <= 35 || e.x >= W - 35) && Math.abs(e.vx) > 230 && e.stun > 0) {
      e.wallSplat = .72;
      e.stun = Math.max(e.stun, .72);
      e.reaction = "wall";
      e.vx = -Math.sign(e.vx) * 42;
      e.vy = -80;
      game.shake = 9;
      spawnParticles(e.x, e.y - 42, "#a7a9b7", 22, 310, 7, .7);
      announce("WALL SPLAT");
    }
    e.x = clamp(e.x, 35, W - 35);
    if (e.y >= GROUND) {
      e.y = GROUND;
      e.vy = 0;
      e.grounded = true;
      if (e.reaction === "slam" && e.stun > 0) {
        game.shake = 12;
        spawnParticles(e.x, GROUND, "#8d8c99", 24, 360, 8, .75);
        e.stun = Math.max(e.stun, .65);
      }
    } else e.grounded = false;
    updateAttack(e, p, dt);
    checkAttackClash();
  }

  function updateRemotePlayer(dt) {
    const e = game.enemy;
    let target = game.online.remoteTarget;
    let renderTick = game.online.serverFrame - game.online.interpolationTicks;
    e.stateTime += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.lagHealth = lerp(e.lagHealth, e.health, clamp(dt * 2, 0, 1));
    if (game.online.authoritative && game.online.snapshotBuffer.length) {
      const snapshots = game.online.snapshotBuffer;
      let before = snapshots[0];
      let after = snapshots[snapshots.length - 1];
      for (let i = 0; i < snapshots.length - 1; i++) {
        if (snapshots[i].snapshotTick <= renderTick && snapshots[i + 1].snapshotTick >= renderTick) {
          before = snapshots[i];
          after = snapshots[i + 1];
          break;
        }
      }
      const span = Math.max(1, after.snapshotTick - before.snapshotTick);
      const ratio = clamp((renderTick - before.snapshotTick) / span, 0, 1);
      target = {
        ...after,
        x: lerp(before.x, after.x, ratio),
        y: lerp(before.y, after.y, ratio),
        vx: lerp(before.vx, after.vx, ratio),
        vy: lerp(before.vy, after.vy, ratio),
      };
    }
    if (!target) return;
    const distance = Math.hypot(target.x - e.x, target.y - e.y);
    const blend = distance > 220 ? 1 : clamp(dt * (game.online.interpolationTicks > 6 ? 8 : 14), 0, 1);
    e.x = lerp(e.x, target.x, blend);
    e.y = lerp(e.y, target.y, blend);
    e.vx = target.vx;
    e.vy = target.vy;
    e.facing = target.facing;
    e.health = target.health;
    e.energy = target.energy;
    e.grounded = target.grounded;
    e.state = target.state;
    e.blocking = target.blocking;
    e.awakening = target.awakening;
    e.burnout = target.burnout;
    e.heat = target.heat || 0;
    e.jackpot = target.jackpot || 0;
    e.charging = Boolean(target.charging);
    e.comboStep = target.comboStep;
    e.airComboStep = target.airComboStep;
    if (target.attack) {
      const authoritativeElapsed = clamp((renderTick - target.attack.startTick) / 60, 0, target.attack.duration);
      const continuedElapsed = e.attack?.startTick === target.attack.startTick
        ? Math.min(target.attack.duration, e.attack.elapsed + dt)
        : authoritativeElapsed;
      const elapsed = Math.max(authoritativeElapsed, continuedElapsed);
      const attackTick = target.attack.startTick + elapsed * 60;
      e.attack = {
        ...target.attack,
        elapsed,
        active: attackTick >= target.attack.activeTick && attackTick <= target.attack.endActiveTick,
        hit: new Set(),
      };
    } else {
      e.attack = null;
    }
    if (target.character && characters[target.character]) e.character = target.character;
    const remoteFrozenByMyUnlimitedVoid = game.domain > 0
      && game.domainCharacter === "gojo"
      && game.domainOwnerSlot === game.online.slot;
    if (remoteFrozenByMyUnlimitedVoid) {
      e.vx = 0;
      e.vy = 0;
      e.attack = null;
      e.blocking = false;
      e.charging = false;
      e.state = "voidFrozen";
    }
  }

  function enemyProjectile() {
    const e = game.enemy;
    const technique = e.type.boss
      ? (chance(.34) ? "red" : chance(.5) ? "blue" : "maw")
      : "shard";
    e.state = "cast";
    e.stateTime = .4;
    e.energy = Math.max(0, e.energy - 16);
    game.projectiles.push({
      owner: "enemy", type: technique,
      x: e.x + e.facing * 42, y: e.y - 70,
      vx: technique === "blue" ? e.facing * 55 : e.facing * (e.type.boss ? 390 : 330),
      vy: rnd(-30, 20),
      w: technique === "red" ? 48 : technique === "blue" ? 38 : e.type.boss ? 60 : 34,
      h: technique === "red" ? 48 : technique === "blue" ? 38 : e.type.boss ? 46 : 28,
      life: technique === "blue" ? 2.8 : 2.5,
      damage: technique === "red" ? 18 : technique === "blue" ? 2.3 : e.type.boss ? 18 : 11,
      kbX: technique === "red" ? 540 : 260, kbY: 150, strong: e.type.boss && technique !== "blue",
    });
    tone(105, .23, "sawtooth", .18, 90);
  }

  function checkAttackClash() {
    const p = game.player;
    const e = game.enemy;
    if (!p.attack?.active || !e.attack?.active || !p.attack.strong || !e.attack.strong || game.clash) return;
    if (rectsOverlap(attackBox(p, p.attack), attackBox(e, e.attack))) {
      p.attack = null;
      e.attack = null;
      beginClash("CURSED TECHNIQUE COLLISION", false);
    }
  }

  function beginClash(type, domain, kind = "power", remoteStart = false) {
    if (game.clash) return;
    const hakari = domain && game.player.character === "hakari";
    game.clash = { timer: domain ? 4 : 3.2, maxTimer: domain ? 4 : 3.2, power: 50, lastKey: "", domain, kind, pulse: 0, hakari };
    game.cinematic = 0;
    game.player.attack = null;
    game.enemy.attack = null;
    game.player.vx = 0;
    game.enemy.vx = 0;
    ui.clashType.textContent = type;
    ui.clash.classList.remove("hidden");
    game.shake = 10;
    game.cameraTarget = 1.24;
    game.cameraFocusX = (game.player.x + game.enemy.x) / 2;
    game.cameraFocusY = GROUND - 80;
    if (domain && hakari) {
      speakLine("One jackpot is all I need.");
      announce("JACKPOT RACE");
    } else if (domain && game.online.active && game.online.localCharacter !== game.online.remoteCharacter) {
      speakLine(game.player.character === "sukuna" ? "Open your eyes." : "Your domain ends here.");
      announce(game.player.character === "sukuna" ? "SHRINE VS VOID" : "VOID VS SHRINE");
    }
    if (game.online.active && !remoteStart) sendOnline("clash", { kind: "start", type, domain, clashKind: kind });
    tone(85, .5, "sawtooth", .25, 120);
  }

  function updateClash(dt) {
    const c = game.clash;
    if (!c) return;
    c.timer -= dt;
    c.pulse -= dt;
    const enemyPressure = game.online.active ? 0 : difficulty === "easy" ? 4.6 : difficulty === "hard" ? 8.2 : 6.2;
    c.power -= dt * enemyPressure * (c.domain ? 1.2 : 1);
    c.power = clamp(c.power, 0, 100);
    ui.clashPlayer.style.width = `${c.power}%`;
    ui.clashEnemy.style.width = `${100 - c.power}%`;
    game.shake = Math.max(game.shake, 5 + (1 - c.timer / c.maxTimer) * 11);
    game.cameraTarget = 1.24 + (1 - c.timer / c.maxTimer) * .12;
    if (c.pulse <= 0) {
      c.pulse = .3;
      spawnShockwave(W / 2, GROUND - 95, c.kind === "red" ? "#ff365e" : c.kind === "blue" ? "#5ccfff" : "#a263ff");
      game.props.forEach((prop) => {
        if (prop.hp > 0) prop.hp -= c.domain ? 2.2 : 1.2;
      });
    }
    if (c.timer <= 0 || c.power <= 0 || c.power >= 100) resolveClash(c.power >= 50);
  }

  function clashInput(key) {
    const c = game.clash;
    if (!c || (key !== "a" && key !== "d") || c.lastKey === key) return;
    c.lastKey = key;
    c.power = clamp(c.power + 4.6, 0, 100);
    if (game.online.active) sendOnline("clash", { kind: "input" });
    game.shake = 5;
    spawnParticles(W / 2 + rnd(-60, 60), H / 2 + rnd(-40, 40), key === "a" ? "#62eaff" : "#8a6bff", 5, 260, 5, .35);
    tone(key === "a" ? 310 : 390, .045, "square", .12, 40);
  }

  function resolveClash(won) {
    const wasDomain = game.clash.domain;
    const hakariClash = game.clash.hakari;
    game.clash = null;
    ui.clash.classList.add("hidden");
    game.flash = .24;
    game.shake = 18;
    game.cameraTarget = 1;
    if (won) {
      announce(hakariClash ? "JACKPOT CLASH WON" : "CLASH WON");
      game.enemy.health -= wasDomain ? (hakariClash ? 12 : 24) : 18;
      game.enemy.stun = 1.5;
      game.enemy.vx = game.player.facing * 680;
      game.score += wasDomain ? 3500 : 1800;
      if (hakariClash) startJackpot(true);
      else if (wasDomain) game.domain = 8;
      spawnParticles(game.enemy.x, game.enemy.y - 55, "#65e9ff", 42, 560, 8, 1);
    } else {
      announce(hakariClash ? "GAMBLE OVERWHELMED" : "LIMIT BROKEN");
      game.player.health -= wasDomain ? (hakariClash ? 12 : 22) : 15;
      game.player.stun = hakariClash ? 1.65 : 1.25;
      game.player.vx = -game.player.facing * 520;
      if (hakariClash) shatterHakariDomain(true);
      else if (wasDomain) game.domain = 0;
      spawnParticles(game.player.x, game.player.y - 55, "#ff4d7a", 40, 520, 8, 1);
    }
    tone(won ? 520 : 75, .45, "sawtooth", .3, won ? 360 : -30);
  }

  function updateProjectiles(dt) {
    const p = game.player;
    const e = game.enemy;
    updateUnstablePurple(dt);
    if (checkHollowPurpleFusion()) return;
    checkProjectileClashes();
    if (game.clash) return;
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const o = game.projectiles[i];
      o.life -= dt;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.type === "reserveBall") {
        o.vy += 520 * dt;
        const hitWall = o.x <= 12 || o.x >= W - 12;
        const hitFloor = o.y >= GROUND - 10;
        if ((hitWall || hitFloor) && o.bounces > 0) {
          if (hitWall) {
            o.x = clamp(o.x, 12, W - 12);
            o.vx *= -.82;
          }
          if (hitFloor) {
            o.y = GROUND - 10;
            o.vy = -Math.abs(o.vy) * .72;
          }
          o.bounces--;
          spawnParticles(o.x, o.y, "#65ff97", 7, 180, 4, .3);
        }
      }
      const incomingBox = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
      if (o.owner === "enemy" && rectsOverlap(incomingBox, bodyBox(p))) reflectProjectile(o);
      if (o.type === "blue") {
        const blueTarget = o.owner === "player" ? e : p;
        const blueAttacker = o.owner === "player" ? p : e;
        const dx = o.x - blueTarget.x;
        const dy = o.y - (blueTarget.y - blueTarget.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < 340) {
          const predictedRemote = game.online.active && game.online.authoritative && blueTarget.kind === "remote";
          if (!predictedRemote) {
            blueTarget.vx += (dx / Math.max(1, dist)) * 940 * dt;
            blueTarget.vy += (dy / Math.max(1, dist)) * 470 * dt;
          }
          o.tick = Number.isFinite(o.tick) ? o.tick - dt : 0;
          if (!predictedRemote && !o.visualOnly && o.tick <= 0 && dist < 85) {
            applyHit(blueAttacker, blueTarget, { name: "Blue", type: "special", damage: o.damage, kbX: 20, kbY: 0, color: "#3d8dff", fixedDamage: o.reflected });
            o.tick = .38;
          }
        }
        if (chance(.35)) spawnParticles(o.x, o.y, "#4e7fff", 1, 80, 3, .3);
      }
      if (o.visualOnly) {
        if (o.life <= 0 || o.x < -300 || o.x > W + 300) game.projectiles.splice(i, 1);
        continue;
      }

      const target = o.owner === "player" ? e : p;
      const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
      if (o.type !== "blue" && !o.hitTarget && rectsOverlap(box, bodyBox(target))) {
        const attacker = o.owner === "player" ? p : e;
        const predictedRemote = game.online.active && game.online.authoritative
          && attacker.kind === "player" && target.kind === "remote";
        const projectileNames = {
          purple: "Hollow Purple",
          red: "Reversal: Red",
          dismantle: "Dismantle",
          worldSlash: "World Slash",
          door: "Shutter Doors",
          reserveBall: "Reserve Ball",
        };
        if (predictedRemote) {
          spawnParticles(
            target.x, target.y - target.h * .55,
            o.type === "door" || o.type === "reserveBall" ? "#55f087"
              : o.type === "dismantle" || o.type === "worldSlash" ? "#ff244f"
              : o.type === "red" ? "#ff315f" : "#8d55ff",
            o.strong ? 22 : 12, o.strong ? 430 : 290, o.strong ? 8 : 5, o.strong ? .65 : .38
          );
          game.shake = Math.max(game.shake, o.strong ? 10 : 4);
        } else {
          applyHit(attacker, target, {
            name: projectileNames[o.type] || "Cursed Shot",
            type: "special", damage: o.damage, kbX: o.kbX, kbY: o.kbY, strong: o.strong,
            fixedDamage: o.reflected,
            reaction: o.type === "dismantle" || o.type === "worldSlash" ? "slash" : o.type === "door" ? "body" : undefined,
            color: o.type === "door" || o.type === "reserveBall" ? "#55f087"
              : o.type === "dismantle" || o.type === "worldSlash" ? "#ff244f"
              : o.owner === "player" ? (o.type === "red" ? "#ff315f" : "#8d55ff") : "#ff4c73",
          });
        }
        if (o.type === "purple") {
          damageProps(p, { strong: true, damage: 50, range: 400, y: -150, h: 180 });
        }
        o.hitTarget = true;
        if (!o.erasing) o.life = 0;
      }

      if (o.life <= 0 || o.x < -300 || o.x > W + 300) {
        if (["red", "purple", "dismantle", "worldSlash"].includes(o.type)) {
          const color = o.type === "purple" ? "#8c5fff" : "#ff3d62";
          spawnParticles(o.x, o.y, color, o.type === "purple" || o.type === "worldSlash" ? 34 : 20, 450, 8, .75);
        }
        game.projectiles.splice(i, 1);
      }
    }
    checkHollowPurpleFusion();
  }

  function checkHollowPurpleFusion() {
    if (game.unstablePurple) return false;
    for (let i = 0; i < game.projectiles.length; i++) {
      const a = game.projectiles[i];
      if (a.type !== "blue" && a.type !== "red") continue;
      for (let j = i + 1; j < game.projectiles.length; j++) {
        const b = game.projectiles[j];
        if (a.type === b.type || (b.type !== "blue" && b.type !== "red")) continue;
        const blue = a.type === "blue" ? a : b;
        const red = a.type === "red" ? a : b;
        if (blue.owner !== "player") continue;
        const aBox = { x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h };
        const bBox = { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h };
        if (!rectsOverlap(aBox, bBox)) continue;
        game.projectiles.splice(j, 1);
        game.projectiles.splice(i, 1);
        createUnstablePurple(blue, red);
        return true;
      }
    }
    return false;
  }

  function updateUnstablePurple(dt) {
    const purple = game.unstablePurple;
    if (!purple) return;
    const e = game.enemy;
    if (purple.state === "firing") {
      purple.fireTimer -= dt;
      purple.timer = purple.fireTimer;
      game.shake = Math.max(game.shake, 5 + (1 - purple.fireTimer / .58) * 8);
      if (purple.fireTimer <= 0) launchHollowPurple(purple);
      return;
    }
    purple.timer -= dt;
    purple.pulse -= dt;
    purple.lightning -= dt;
    purple.hum -= dt;
    game.shake = Math.max(game.shake, 2.8);
    game.cameraFocusX = lerp(game.cameraFocusX, purple.x, clamp(dt * 3, 0, 1));
    game.cameraFocusY = lerp(game.cameraFocusY, purple.y, clamp(dt * 3, 0, 1));
    const dx = purple.x - e.x;
    const dy = purple.y - (e.y - e.h / 2);
    const distance = Math.hypot(dx, dy);
    const predictedRemote = game.online.active && game.online.authoritative && e.kind === "remote";
    if (distance < 330 && !predictedRemote) {
      const chaos = Math.sin(performance.now() * .02) > 0 ? 1 : -1;
      e.vx += (dx / Math.max(1, distance)) * 660 * dt * chaos;
      e.vy += (dy / Math.max(1, distance)) * 320 * dt * chaos;
    }
    if (purple.pulse <= 0) {
      purple.pulse = .08;
      const color = chance(.5) ? "#ff2858" : "#4f8dff";
      spawnParticles(purple.x + rnd(-32, 32), purple.y + rnd(-32, 32), color, 2, 180, 5, .38);
    }
    if (purple.lightning <= 0) {
      purple.lightning = .13;
      game.glitch = Math.max(game.glitch, .05);
      game.particles.push({
        x: purple.x + rnd(-48, 48), y: purple.y + rnd(-48, 48),
        vx: rnd(-260, 260), vy: rnd(-260, 260), size: rnd(10, 22),
        color: chance(.25) ? "#0a020d" : "#b76cff",
        life: .16, maxLife: .16, gravity: 0, slash: true,
      });
    }
    if (purple.hum <= 0) {
      purple.hum = .42;
      tone(52, .38, "sawtooth", .13, 18);
    }
    if (purple.timer <= 0) collapseUnstablePurple();
  }

  function checkProjectileClashes() {
    for (let i = 0; i < game.projectiles.length; i++) {
      const a = game.projectiles[i];
      for (let j = i + 1; j < game.projectiles.length; j++) {
        const b = game.projectiles[j];
        if (a.owner === b.owner) continue;
        const aBox = { x: a.x - a.w / 2, y: a.y - a.h / 2, w: a.w, h: a.h };
        const bBox = { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h };
        if (!rectsOverlap(aBox, bBox)) continue;
        const sameTechnique = a.type === b.type && (a.type === "red" || a.type === "blue");
        const purplePower = (a.type === "purple" && b.strong) || (b.type === "purple" && a.strong);
        if (!sameTechnique && !purplePower) continue;
        const kind = sameTechnique ? a.type : "purple";
        game.projectiles.splice(j, 1);
        game.projectiles.splice(i, 1);
        beginClash(
          kind === "red" ? "REVERSAL: RED COLLISION" : kind === "blue" ? "LAPSE: BLUE COLLISION" : "HOLLOW PURPLE STRUGGLE",
          false,
          kind
        );
        return;
      }
    }
  }

  function reflectProjectile(projectile) {
    const p = game.player;
    const e = game.enemy;
    if (!p || !e || projectile.owner !== "enemy" || projectile.reflected || !p.blocking || !p.grounded) return false;
    if (performance.now() - p.guardStart > 105) return false;
    const speed = Math.max(360, Math.hypot(projectile.vx || 0, projectile.vy || 0));
    const targetX = e.x;
    const targetY = e.y - e.h * .55;
    const dx = targetX - projectile.x;
    const dy = targetY - projectile.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    projectile.owner = "player";
    projectile.visualOnly = false;
    projectile.reflected = true;
    projectile.hitTarget = false;
    projectile.life = Math.max(projectile.life, 1.2);
    projectile.vx = dx / distance * speed;
    projectile.vy = dy / distance * speed;
    p.invuln = .35;
    p.parryStreak++;
    p.parryTimer = 3;
    p.energy = Math.min(100, p.energy + 12);
    if (p.character === "hakari") {
      p.energy = Math.min(100, p.energy + 8);
      p.heat = Math.min(100, p.heat + 18);
      p.parryHot = Math.min(4, p.parryHot + .8);
      p.nextM1Fast = true;
    }
    game.parries++;
    if (game.online.active) game.online.stats.parries++;
    game.slow = .45;
    game.hitstop = .1;
    game.shake = 10;
    game.flash = .1;
    announce("PROJECTILE REFLECT");
    spawnShockwave(p.x + p.facing * 20, p.y - 62, "#dfffff");
    spawnParticles(projectile.x, projectile.y, "#dfffff", 24, 430, 7, .55);
    tone(810, .16, "square", .28, 420);
    if (game.online.active) {
      sendOnline("event", {
        kind: "projectileReflect",
        x: projectile.x,
        y: projectile.y,
        projectile: {
          type: projectile.type, rarity: projectile.rarity,
          x: projectile.x, y: projectile.y,
          vx: projectile.vx, vy: projectile.vy,
          w: projectile.w, h: projectile.h, life: projectile.life,
          damage: projectile.damage, kbX: projectile.kbX, kbY: projectile.kbY,
          strong: projectile.strong, erasing: projectile.erasing,
          bounces: projectile.bounces, reflected: true,
        },
      });
    }
    return true;
  }

  function updateEffects(dt) {
    game.windTimer -= dt;
    if (!game.windPaused && game.windTimer <= 0 && game.state === "playing") {
      game.windTimer = .06;
      game.particles.push({
        x: -20, y: rnd(120, GROUND - 30), vx: rnd(180, 330), vy: rnd(-8, 8),
        size: rnd(8, 22), color: "#8fcaff55", life: 4, maxLife: 4,
        gravity: 0, wind: true,
      });
    }
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      p.vy += p.gravity * dt;
      if (!game.windPaused || !p.wind) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      p.vx *= Math.pow(.03, dt);
      if (p.life <= 0) game.particles.splice(i, 1);
    }
    for (let i = game.afterimages.length - 1; i >= 0; i--) {
      game.afterimages[i].life -= dt;
      if (game.afterimages[i].life <= 0) game.afterimages.splice(i, 1);
    }
    game.shake = Math.max(0, game.shake - dt * 28);
    game.flash = Math.max(0, game.flash - dt);
    game.slow = Math.max(0, game.slow - dt);
    game.blackFlash = Math.max(0, game.blackFlash - dt);
    game.glitch = Math.max(0, game.glitch - dt);
    game.purpleExplosion = Math.max(0, game.purpleExplosion - dt);
    game.realityCrack = Math.max(0, game.realityCrack - dt);
    game.jackpotFlash = Math.max(0, game.jackpotFlash - dt);
    if (game.remoteUnstablePurple) {
      game.remoteUnstablePurple.timer -= dt;
      if (game.remoteUnstablePurple.timer <= 0) game.remoteUnstablePurple = null;
    }
    game.online.localDomainWindow = Math.max(0, game.online.localDomainWindow - dt);
    game.online.remoteDomainWindow = Math.max(0, game.online.remoteDomainWindow - dt);
    game.domain = Math.max(0, game.domain - dt);
    game.domainStartup = Math.max(0, game.domainStartup - dt);
    game.domainIntro = Math.max(0, game.domainIntro - dt);
    game.cinematic = Math.max(0, game.cinematic - dt);
    if (game.domain <= 0 && game.domainIntro <= 0) game.windPaused = false;
    if (game.domain <= 0 && game.domainStartup <= 0 && game.domainIntro <= 0) game.domainOwnerSlot = 0;
    if (!game.clash && game.blackFlash <= 0 && game.cinematic <= 0) game.cameraTarget = lerp(game.cameraTarget, 1, clamp(dt * 4.5, 0, 1));
    game.cameraZoom = lerp(game.cameraZoom, game.cameraTarget, clamp(dt * 7, 0, 1));
    if (!game.clash && game.player && game.enemy && game.cinematic <= 0) {
      game.cameraFocusX = lerp(game.cameraFocusX, (game.player.x + game.enemy.x) / 2, clamp(dt * 3, 0, 1));
      game.cameraFocusY = lerp(game.cameraFocusY, GROUND / 2 + 85, clamp(dt * 3, 0, 1));
    }
  }

  function checkRound(dt) {
    if (game.mode !== "training") game.time = Math.max(0, game.time - dt);
    const p = game.player;
    const e = game.enemy;
    p.lagHealth = lerp(p.lagHealth, p.health, clamp(dt * 2, 0, 1));
    e.lagHealth = lerp(e.lagHealth, e.health, clamp(dt * 2, 0, 1));

    if (game.online.active) {
      if (game.online.authoritative) return;
      const roundOver = p.health <= 0 || e.health <= 0 || game.time <= 0;
      if (roundOver && !game.online.resultReported) {
        game.online.resultReported = true;
        const otherSlot = game.online.slot === 1 ? 2 : 1;
        const winnerSlot = p.health <= 0
          ? otherSlot
          : e.health <= 0 ? game.online.slot
            : p.health === e.health ? 1 : p.health > e.health ? game.online.slot : otherSlot;
        sendOnline("matchOver", { winnerSlot, stats: getOnlineStats() });
      }
      return;
    }

    if (game.mode === "training" && e.health <= 15) {
      e.health = e.maxHealth;
      e.lagHealth = e.maxHealth;
      e.x = 940;
      e.stun = .4;
      announce("DUMMY RESET");
    }

    if (e.health <= 0 && !game.outcomePending) {
      game.outcomePending = true;
      e.health = 0;
      e.stun = 3;
      const jackpotFinish = p.character === "hakari" && p.jackpot > 0;
      game.transition = jackpotFinish ? 2.25 : 1.5;
      game.score += Math.round(game.time * 35 + p.health * 20);
      if (jackpotFinish) {
        p.jackpotFinisher = true;
        p.state = "jackpotFinish";
        p.vx = p.facing * 620;
        game.cinematic = 1.85;
        game.cameraTarget = 1.36;
        game.cameraFocusX = (p.x + e.x) / 2;
        game.cameraFocusY = GROUND - 70;
        game.shake = 19;
        spawnParticles(e.x, e.y - 55, "#55ff89", 70, 720, 10, 1.1);
        announce("JACKPOT FINISH");
        tone(130, .65, "square", .34, 520);
      } else {
        announce("CURSE EXORCISED");
      }
    }

    if ((p.health <= 0 || game.time <= 0) && !game.outcomePending) {
      game.outcomePending = true;
      p.health = Math.max(0, p.health);
      game.transition = 1.5;
      announce(p.health <= 0 ? "LIMIT REACHED" : "TIME");
    }

    if (game.outcomePending) {
      game.transition -= dt;
      if (game.transition <= 0) {
        if (e.health <= 0 && continueMode()) return;
        finishGame(p.health > 0 && e.health <= 0);
      }
    }
  }

  function continueMode() {
    if (game.mode === "story" && game.wave < 3) {
      game.wave++;
      game.enemy = makeEnemy(game.wave - 1);
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 18);
      game.player.energy = Math.min(100, game.player.energy + 25);
      game.unstablePurple = null;
      game.time = 99;
      game.outcomePending = false;
      game.projectiles.length = 0;
      resetProps();
      announce(`ENCOUNTER ${game.wave}`);
      return true;
    }
    if (game.mode === "survival") {
      game.wave++;
      game.enemy = makeEnemy(Math.min(2, Math.floor((game.wave - 1) / 2)));
      game.enemy.maxHealth *= 1 + game.wave * .045;
      game.enemy.health = game.enemy.maxHealth;
      game.enemy.lagHealth = game.enemy.maxHealth;
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 8);
      game.player.energy = Math.min(100, game.player.energy + 15);
      game.unstablePurple = null;
      game.time += 22;
      game.outcomePending = false;
      game.projectiles.length = 0;
      announce(`WAVE ${game.wave}`);
      return true;
    }
    if (game.mode === "boss" && game.wave < 3) {
      game.wave++;
      game.enemy = makeEnemy(2);
      game.enemy.maxHealth *= 1 + game.wave * .18;
      game.enemy.health = game.enemy.maxHealth;
      game.enemy.lagHealth = game.enemy.maxHealth;
      game.enemy.power *= 1 + game.wave * .08;
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 12);
      game.player.energy = Math.min(100, game.player.energy + 22);
      game.unstablePurple = null;
      game.time = 99;
      game.outcomePending = false;
      game.projectiles.length = 0;
      resetProps();
      announce(`BOSS ${game.wave} / 3`);
      return true;
    }
    return false;
  }

  function finishGame(won) {
    game.state = "result";
    ui.hud.classList.add("hidden");
    ui.result.classList.remove("hidden");
    ui.resultTitle.textContent = won ? "VICTORY" : "DEFEAT";
    ui.resultSub.textContent = game.mode === "online"
      ? `${Math.floor((Date.now() - game.online.startedAt) / 1000)} seconds survived | ${game.online.remoteName}`
      : won
        ? game.mode === "story" ? "The curtain falls. The strongest remains." : "Another impossible record."
        : "Power means nothing without timing.";
    const labels = [...ui.result.querySelectorAll(".stats span")];
    if (game.mode === "online") {
      const stats = getOnlineStats();
      labels[0].textContent = "DAMAGE DEALT";
      labels[1].textContent = "PARRIES LANDED";
      labels[2].textContent = "BLACK FLASHES";
      labels[3].textContent = "DOMAINS USED";
      ui.score.textContent = stats.damage.toFixed(0);
      ui.maxCombo.textContent = String(stats.parries);
      ui.parries.textContent = String(stats.blackFlashes);
      ui.blackFlashes.textContent = String(stats.domains);
      $("#again").textContent = "REMATCH";
      $("#resultQuit").textContent = "RETURN TO LOBBY";
      $("#leaveOnlineResult").classList.remove("hidden");
    } else {
      labels[0].textContent = "SCORE";
      labels[1].textContent = "MAX COMBO";
      labels[2].textContent = "PERFECT PARRIES";
      labels[3].textContent = "BLACK FLASH";
      ui.score.textContent = String(game.score).padStart(6, "0");
      ui.maxCombo.textContent = String(game.maxCombo).padStart(2, "0");
      ui.parries.textContent = String(game.parries).padStart(2, "0");
      ui.blackFlashes.textContent = String(game.player.blackFlashes).padStart(2, "0");
      $("#again").textContent = "FIGHT AGAIN";
      $("#resultQuit").textContent = "MODE SELECT";
      $("#leaveOnlineResult").classList.add("hidden");
    }
    if (won && game.mode === "story") unlockCostume("snowfall");
    if (won && game.mode === "boss") unlockCostume("eclipse");
    if (won && game.player.character === "sukuna") speakLine("You never stood a chance.");
    tone(won ? 330 : 90, .8, won ? "sine" : "sawtooth", .25, won ? 550 : -40);
  }

  function getOnlineStats() {
    return {
      damage: game.online.stats.damage,
      parries: game.online.stats.parries,
      blackFlashes: game.online.stats.blackFlashes,
      domains: game.online.stats.domains,
      timeSurvived: Math.max(0, Math.floor((Date.now() - game.online.startedAt) / 1000)),
    };
  }

  function finishOnlineMatch(won, opponentStats) {
    if (!game.online.active) return;
    game.online.opponentStats = opponentStats;
    game.player.health = Math.max(0, game.player.health);
    game.enemy.health = Math.max(0, game.enemy.health);
    finishGame(won);
  }

  function unlockedCostumes() {
    try {
      return JSON.parse(localStorage.getItem("voidLimitCostumes") || '["uniform"]');
    } catch {
      return ["uniform"];
    }
  }

  function unlockCostume(name) {
    const unlocked = new Set(unlockedCostumes());
    unlocked.add(name);
    try { localStorage.setItem("voidLimitCostumes", JSON.stringify([...unlocked])); } catch {}
    refreshCostumes();
  }

  function refreshCostumes() {
    const unlocked = new Set(unlockedCostumes());
    $$(".costumes button").forEach((button) => {
      const available = unlocked.has(button.dataset.costume);
      button.classList.toggle("locked", !available);
      button.classList.toggle("unlocked", available);
    });
  }

  function updateHud() {
    const p = game.player;
    const e = game.enemy;
    if (!p || !e) return;
    const profile = characterProfile(p);
    const enemyProfile = game.online.active ? characterProfile(e) : null;
    ui.playerHealth.style.transform = `scaleX(${clamp(p.health / p.maxHealth, 0, 1)})`;
    ui.playerLag.style.transform = `scaleX(${clamp(p.lagHealth / p.maxHealth, 0, 1)})`;
    ui.playerEnergy.style.transform = `scaleX(${p.energy / 100})`;
    ui.enemyHealth.style.transform = `scaleX(${clamp(e.health / e.maxHealth, 0, 1)})`;
    ui.enemyLag.style.transform = `scaleX(${clamp(e.lagHealth / e.maxHealth, 0, 1)})`;
    ui.enemyEnergy.style.transform = `scaleX(${e.energy / 100})`;
    ui.playerName.textContent = `${profile.name}  ${Math.ceil(p.health)} HP`;
    const playerPortrait = p.character === "sukuna" ? "sukuna-portrait" : p.character === "hakari" ? "hakari-portrait" : "gojo-portrait";
    const playerMark = p.character === "sukuna" ? "SK" : p.character === "hakari" ? "HK" : "VI";
    ui.playerPortrait.className = `portrait ${playerPortrait}`;
    ui.playerPortrait.querySelector("span").textContent = playerMark;
    ui.enemyName.textContent = `${game.online.active ? enemyProfile.name : e.type.name}  ${Math.ceil(e.health)} HP`;
    ui.enemyState.textContent = game.online.active ? `${e.type.rank}${e.onlineVariant === "inverted" ? " / INVERTED" : ""}` : e.type.rank;
    const enemyPortrait = e.character === "sukuna" ? "sukuna-portrait" : e.character === "hakari" ? "hakari-portrait" : "gojo-portrait";
    const enemyMark = e.character === "sukuna" ? "SK" : e.character === "hakari" ? "HK" : "VI";
    ui.enemyPortrait.className = `portrait ${game.online.active ? enemyPortrait : "curse-portrait"}`;
    ui.enemyPortrait.querySelector("span").textContent = game.online.active ? enemyMark : "CR";
    const normalPlayerState = game.online.active
      ? `PLAYER ${game.online.slot}${p.onlineVariant === "inverted" ? " / INVERTED" : ""}${p.jackpot > 0 ? ` / JACKPOT ${p.jackpot.toFixed(1)}s` : ""}`
      : p.awakening > 0
        ? `${p.character === "sukuna" ? "KING OF CURSES" : p.character === "hakari" ? "JACKPOT MODE" : "AWAKENED"} ${p.awakening.toFixed(1)}s`
        : p.burnout > 0 ? `BURNT OUT ${p.burnout.toFixed(1)}s`
          : p.canAwaken ? "AWAKENING READY" : profile.title;
    ui.playerState.textContent = p.charging
      ? `CHARGING CE ${p.energy.toFixed(0)}%`
      : p.chargeRecovery > 0
        ? `CHARGE RECOVERY ${p.chargeRecovery.toFixed(1)}s`
        : p.chargeCooldown > 0 ? `CHARGE COOLDOWN ${p.chargeCooldown.toFixed(1)}s` : normalPlayerState;
    if (ui.fControl) ui.fControl.innerHTML = `<kbd>F</kbd> ${p.character === "hakari" ? "CONSECUTIVE EFFECT" : "AWAKEN"}`;
    ui.timer.textContent = game.mode === "training" ? "INF" : String(Math.ceil(game.time)).padStart(2, "0");
    ui.mode.textContent = game.mode.toUpperCase();
    ui.wave.textContent = game.online.active ? `P${game.online.slot} / ${Math.max(0, Math.round(game.online.startAt - Date.now())) > 0 ? "SYNC" : "LIVE"}`
      : game.mode === "survival" ? `WAVE ${game.wave}` : game.mode === "training" ? "FRAME LAB" : `ENCOUNTER ${game.wave}`;
    ui.stageLabel.textContent = `${stages[selectedStage].name} / ${stages[selectedStage].subtitle}`;
    ui.combo.querySelector("strong").textContent = p.comboHits;
    ui.combo.classList.toggle("visible", p.comboHits >= 2 && p.comboTimer > 0);
    let prompt = "";
    let blackFlashPrompt = false;
    if (p.blackFlashWindow > 0) {
      prompt = "M2 NOW | BLACK FLASH";
      blackFlashPrompt = true;
    } else if (p.charging) {
      prompt = "HOLD C | CURSED ENERGY CHARGE";
    } else if (p.attack?.hitConfirmed && p.attack.dashCancel) {
      prompt = "SHIFT | DASH CANCEL";
    } else if (p.attack?.hitConfirmed && p.attack.launcher) {
      prompt = "W | JUMP CANCEL";
    } else if (p.parryStreak > 1) {
      prompt = `PARRY FLOW x${p.parryStreak}`;
    }
    ui.combatPrompt.textContent = prompt;
    ui.combatPrompt.classList.toggle("visible", !!prompt);
    ui.combatPrompt.classList.toggle("black-flash", blackFlashPrompt);

    for (const [name] of Object.entries(profile.costs)) {
      const el = document.querySelector(`[data-ability="${name}"]`);
      const tuning = abilityTuning(p, name);
      const cost = tuning.cost;
      const cd = p.cooldowns[name];
      const ratio = cd > 0 ? 1 - cd / tuning.cooldown : 1;
      el.querySelector("i").style.transform = `scaleX(${ratio})`;
      el.querySelector("span").textContent = tuning.label;
      const burntOutLock = p.character === "gojo" && p.burnout > 0 && (name === "blue" || name === "red" || name === "domain");
      const purpleReady = p.character !== "gojo" || name !== "purple" || (game.unstablePurple?.state === "unstable");
      const worldSlashReady = p.character !== "sukuna" || name !== "purple" || p.worldSlashUnlocked;
      el.classList.toggle("locked", p.energy < cost || cd > 0 || burntOutLock || !purpleReady || !worldSlashReady);
      const hint = el.querySelector("b");
      if (hint && name === "purple") {
        hint.textContent = p.character === "sukuna" && !p.worldSlashUnlocked
          ? `${p.dismantleUses}/10 D  ${p.cleaveUses}/5 C  ${p.sukunaDomainUses}/1 T`
          : p.character !== "gojo"
            ? `${cost} CE`
          : game.unstablePurple?.state === "unstable" ? "READY" : game.unstablePurple?.state === "firing" ? "FIRING" : "FUSE B+R";
      }
    }

    if (game.unstablePurple) {
      const purple = game.unstablePurple;
      ui.purpleStatus.classList.remove("hidden");
      ui.purpleStatus.classList.toggle("firing", purple.state === "firing");
      ui.purpleTimer.style.transform = `scaleX(${clamp(purple.timer / purple.maxTimer, 0, 1)})`;
      ui.purpleStatus.querySelector("small").textContent = purple.state === "firing" ? "COMPRESSING TECHNIQUE" : "PRESS Q TO STABILIZE";
    } else {
      ui.purpleStatus.classList.add("hidden");
    }

    if (p.character === "hakari") {
      ui.heatStatus.classList.remove("hidden");
      ui.heatStatus.classList.toggle("jackpot", p.jackpot > 0);
      ui.heatMeter.style.transform = `scaleX(${clamp(p.heat / 100, 0, 1)})`;
      ui.heatValue.textContent = p.jackpot > 0 ? `${p.jackpot.toFixed(1)}s` : `${Math.round(p.heat)}%`;
      ui.heatHint.textContent = p.jackpot > 0
        ? "R: GAMBLER'S LUCK / Q: FEVER BREAKER"
        : game.hakariDomain
          ? `${game.hakariDomain.displaySlots.join(" - ")} / SETUP ${game.hakariDomain.rollInputs.length}/2${game.hakariDomain.lastRarity ? ` / ${game.hakariDomain.lastRarity.toUpperCase()}` : ""}`
          : p.rewindWindow > 0
            ? "CONSECUTIVE EFFECT ARMED"
            : "DOMAIN ROLL REQUIRES 2 SHUTTERS / RESERVES";
    } else {
      ui.heatStatus.classList.add("hidden");
      ui.heatStatus.classList.remove("jackpot");
    }

    ui.training.textContent = game.mode === "training"
      ? `${p.lastHit}\nM1 ${Math.max(0, p.comboStep + 1)}/5  COMBO ${p.comboHits}\nENERGY ${p.energy.toFixed(1)}${p.character === "hakari" ? `  HEAT ${p.heat.toFixed(0)}%` : p.burnout > 0 ? `  BURNOUT ${p.burnout.toFixed(1)}s` : ""}\nPARRY 6F  STREAK x${p.parryStreak}\n${p.jackpot > 0 ? `JACKPOT ${p.jackpot.toFixed(2)}s` : game.hakariDomain ? `ROLL ${game.hakariDomain.displaySlots.join("-")}` : game.unstablePurple ? `PURPLE ${game.unstablePurple.timer.toFixed(2)}s` : p.blackFlashWindow > 0 ? `BLACK FLASH ${(p.blackFlashWindow * 60).toFixed(1)}F` : p.attack?.hitConfirmed ? "HIT CONFIRMED" : "NEUTRAL"}\n${p.grounded ? `MOMENTUM ${(p.momentum * 100).toFixed(0)}%` : `AIRBORNE  VY ${p.vy.toFixed(0)}`}`
      : "";
  }

  function jump() {
    const p = game.player;
    if (!p || p.stun > 0 || p.blocking || p.charging || p.chargeRecovery > 0 || (game.online.active && Date.now() < game.online.startAt)) return;
    const jumpCancel = p.attack?.launcher && p.attack.hitConfirmed && p.attack.elapsed >= p.attack.start;
    if (p.attack && !jumpCancel) return;
    if (jumpCancel) {
      p.attack = null;
      p.comboWindow = .6;
      p.airComboStep = -1;
      announce("JUMP CANCEL");
    }
    if (p.wall) {
      p.vx = -p.wall * 440;
      p.vy = -700;
      p.facing = -p.wall;
      p.wall = 0;
      p.grounded = false;
      addAfterimage(p);
      spawnParticles(p.x, p.y - 40, "#88eaff", 10, 210, 5, .35);
      tone(260, .08, "square", .15, 140);
    } else if (p.grounded || p.jumps > 0) {
      if (!p.grounded) p.jumps--;
      p.vy = -680;
      p.grounded = false;
      p.state = "jump";
      tone(180, .08, "square", .12, 80);
    }
  }

  function update(dt) {
    if (game.state !== "playing") return;
    if (game.online.active && Date.now() < game.online.startAt) {
      updateEffects(dt);
      updateHud();
      return;
    }
    if (game.clash) {
      updateClash(dt);
      updateEffects(dt);
      updateHud();
      return;
    }
    if (game.hitstop > 0) {
      game.hitstop -= dt;
      updateEffects(dt * .2);
      return;
    }
    const scaledDt = dt * (game.slow > 0 ? .22 : 1);
    updatePlayer(scaledDt);
    updateEnemy(scaledDt);
    updateProjectiles(scaledDt);
    updateEffects(dt);
    checkRound(scaledDt);
    updateHud();
  }

  function drawBackground() {
    const stage = stages[selectedStage];
    if (bg.complete && bg.naturalWidth) {
      const scale = Math.max(W / bg.width, H / bg.height);
      const sw = W / scale;
      const sh = H / scale;
      const sx = (bg.width - sw) / 2 + game.bgOffset;
      const sy = (bg.height - sh) / 2;
      ctx.drawImage(bg, sx, sy, sw, sh, 0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0c1738");
      grad.addColorStop(1, "#070710");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = stage.overlay;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = stage.floor;
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = stage.edge;
    ctx.fillRect(0, GROUND, W, 2);
    ctx.fillStyle = "#172138";
    for (let x = 0; x < W; x += 64) ctx.fillRect(x, GROUND + 22 + (x % 128 ? 2 : 0), 42, 3);
    if (game.domainIntro > 0) {
      const distortion = clamp(1 - game.domainIntro / 2.35, 0, 1);
      ctx.fillStyle = `rgba(95,70,255,${distortion * .12})`;
      for (let y = 70; y < H; y += 46) {
        ctx.fillRect(Math.sin(y + performance.now() * .01) * 18, y, W, 2 + distortion * 5);
      }
    }
  }

  function drawProps() {
    for (const prop of game.props) {
      const floatY = game.domain > 0 || game.domainIntro > 0
        ? -Math.min(46, (game.domain > 0 ? 25 : (2.35 - game.domainIntro) * 14)) - Math.sin(performance.now() * .003 + prop.x) * 7
        : 0;
      ctx.save();
      ctx.translate(0, floatY);
      if (prop.hp <= 0) {
        ctx.fillStyle = "#252a37";
        ctx.fillRect(prop.x, GROUND - 7, prop.w, 7);
        ctx.restore();
        continue;
      }
      const ratio = prop.hp / prop.max;
      if (prop.type === "barrier") {
        ctx.fillStyle = "#20283a";
        ctx.fillRect(prop.x, prop.y + 9, prop.w, prop.h - 9);
        ctx.fillStyle = "#465069";
        ctx.fillRect(prop.x + 7, prop.y, 9, prop.h);
        ctx.fillRect(prop.x + 55, prop.y, 9, prop.h);
        ctx.fillStyle = "#ffb447";
        for (let y = prop.y + 8; y < prop.y + 36; y += 11) ctx.fillRect(prop.x + 16, y, 39 * ratio, 5);
      } else if (prop.type === "sign") {
        ctx.fillStyle = "#34394b";
        ctx.fillRect(prop.x + 15, prop.y + 24, 5, 40);
        ctx.fillStyle = "#702c55";
        ctx.fillRect(prop.x, prop.y, prop.w, 29);
        ctx.fillStyle = "#ff5b9a";
        ctx.fillRect(prop.x + 5, prop.y + 5, 25 * ratio, 4);
      } else if (prop.type === "training") {
        ctx.fillStyle = "#2e241d";
        ctx.fillRect(prop.x + 13, prop.y, 16, prop.h);
        ctx.fillStyle = "#7c5d3c";
        for (let y = prop.y + 5; y < prop.y + prop.h - 8; y += 13) ctx.fillRect(prop.x + 5, y, 32 * ratio, 6);
        ctx.fillStyle = "#b99358";
        ctx.fillRect(prop.x + 17, prop.y + 5, 4, prop.h - 14);
      } else if (prop.type === "lantern") {
        ctx.fillStyle = "#4b4d52";
        ctx.fillRect(prop.x + 14, prop.y + 22, 7, 38);
        ctx.fillRect(prop.x + 4, prop.y + 15, 27, 8);
        ctx.fillStyle = "#ffd782";
        ctx.fillRect(prop.x + 8, prop.y, 19 * ratio, 16);
        ctx.fillStyle = "#a06d38";
        ctx.fillRect(prop.x + 6, prop.y - 3, 23, 4);
      } else if (prop.type === "shrine") {
        ctx.fillStyle = "#353b48";
        ctx.fillRect(prop.x, prop.y + 26, prop.w, 22);
        ctx.fillStyle = "#79404c";
        ctx.fillRect(prop.x + 7, prop.y + 8, prop.w - 14, 21);
        ctx.fillStyle = "#c46b65";
        ctx.fillRect(prop.x + 2, prop.y + 4, (prop.w - 4) * ratio, 6);
      } else if (prop.type === "stump") {
        ctx.fillStyle = "#4b321f";
        ctx.beginPath();
        ctx.moveTo(prop.x, prop.y + prop.h);
        ctx.lineTo(prop.x + 8, prop.y + 6);
        ctx.lineTo(prop.x + prop.w - 9, prop.y);
        ctx.lineTo(prop.x + prop.w, prop.y + prop.h);
        ctx.fill();
        ctx.fillStyle = "#9a6c3e";
        ctx.fillRect(prop.x + 9, prop.y + 3, (prop.w - 18) * ratio, 7);
      } else {
        ctx.fillStyle = "#414555";
        ctx.beginPath();
        ctx.moveTo(prop.x, prop.y + prop.h);
        ctx.lineTo(prop.x + 13, prop.y + 11);
        ctx.lineTo(prop.x + 43, prop.y);
        ctx.lineTo(prop.x + prop.w, prop.y + prop.h);
        ctx.fill();
      }
      if (ratio < .65) {
        ctx.strokeStyle = "#0a0b10";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(prop.x + prop.w * .45, prop.y + 5);
        ctx.lineTo(prop.x + prop.w * .35, prop.y + prop.h * .55);
        ctx.lineTo(prop.x + prop.w * .58, prop.y + prop.h);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function pixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawGojo(entity, alpha = 1, tint = null) {
    const bob = entity.grounded && entity.state === "idle" ? Math.sin(performance.now() * .006) * 2 : 0;
    const run = entity.state === "run" ? Math.sin(entity.stateTime * 22) : 0;
    const attackT = entity.attack ? clamp(entity.attack.elapsed / entity.attack.duration, 0, 1) : 0;
    const flow = clamp(entity.vx / 360, -1, 1);
    const energyFlow = entity.awakening > 0 ? Math.sin(performance.now() * .015) * 2 : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(entity.x), Math.round(entity.y + bob));
    ctx.scale(entity.facing, 1);
    if (tint) ctx.globalCompositeOperation = "source-over";

    if (entity.awakening > 0 && !tint) {
      ctx.fillStyle = "#67eaff22";
      ctx.beginPath();
      ctx.ellipse(0, -48, 43 + Math.sin(performance.now() * .01) * 5, 64, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const palette = entity.burnout > 0 && !tint
      ? ["#171419", "#2b242b", "#6d413a"]
      : entity.onlineVariant === "inverted"
        ? ["#edf7ff", "#b5d9e8", "#ff4f9c"]
        : selectedCostume === "snowfall"
        ? ["#c8d8e8", "#eef8ff", "#6aa9ca"]
        : selectedCostume === "eclipse"
          ? ["#24122f", "#412052", "#ba4d9d"]
          : ["#10182d", "#1c2c4c", "#355d83"];
    const dark = tint || palette[0];
    const mid = tint || palette[1];
    const edge = tint || palette[2];
    const skin = tint || (entity.burnout > 0 ? "#6d4a45" : entity.onlineVariant === "inverted" ? "#dcaeb5" : "#f0c9bd");
    const hair = tint || (entity.burnout > 0 ? "#625b61" : entity.onlineVariant === "inverted" ? "#17213a" : "#edfaff");
    const hairShade = tint || (entity.burnout > 0 ? "#332d33" : entity.onlineVariant === "inverted" ? "#ff65ad" : "#9fd8ec");
    const blind = tint || (entity.awakening > 0 ? "#baf7ff" : entity.onlineVariant === "inverted" ? "#f4fbff" : "#11162a");

    let legA = run * 9;
    let legB = -run * 9;
    if (!entity.grounded) { legA = 8; legB = -7; }
    if (entity.state === "heavy") { legA = -8; legB = 11; }
    if (entity.comboStep === 2 && entity.attack?.chain) { legA = -5; legB = -20; }
    if (entity.comboStep === 3 && entity.attack?.chain) { legA = 4; legB = -33; }

    pixelRect(-17 + legA, -38, 13, 31, dark);
    pixelRect(4 + legB, -38, 13, 31, dark);
    pixelRect(-19 + legA, -9, 18, 9, tint || "#080d19");
    pixelRect(1 + legB, -9, 20, 9, tint || "#080d19");
    pixelRect(-18 + legA, -35, 4, 25, edge);
    pixelRect(4 + legB, -35, 4, 25, edge);

    pixelRect(-21, -77, 42, 42, dark);
    pixelRect(-17, -74, 34, 38, mid);
    pixelRect(-21, -75, 5, 34, edge);
    pixelRect(-24 - flow * 7, -69, 7 + Math.abs(flow) * 7, 31, dark);
    pixelRect(-17, -43, 34, 7, tint || "#0a1020");
    pixelRect(-8, -70, 5, 28, tint || "#273e61");

    let frontArmX = 15, frontArmY = -69, frontRot = 0;
    let backArmX = -22, backArmY = -69;
    if (entity.attack) {
      const reach = Math.sin(attackT * Math.PI);
      if (entity.attack.type === "light") {
        frontArmX = 14 + reach * 37;
        frontArmY = -72 + (entity.comboStep === 2 ? reach * 20 : 0);
      } else if (entity.attack.type === "heavy") {
        frontArmX = 13 + reach * 48;
        frontArmY = -52 - reach * 30;
      } else if (entity.attack.type === "blue" || entity.attack.type === "red") {
        frontArmX = 23 + reach * 17;
        frontArmY = -76;
      } else if (entity.attack.type === "purple") {
        frontArmX = 28;
        frontArmY = -73;
        backArmX = 16;
        backArmY = -62;
      }
    } else if (entity.blocking) {
      frontArmX = 18; frontArmY = -84; backArmX = 6; backArmY = -73;
    } else if (entity.state === "run") {
      frontArmX += -run * 7;
      backArmX += run * 7;
    }
    pixelRect(backArmX, backArmY, 10, 31, mid);
    pixelRect(backArmX + 1, backArmY + 26, 9, 9, skin);
    pixelRect(frontArmX, frontArmY, 11, 31, dark);
    pixelRect(frontArmX + 1, frontArmY + 26, 10, 9, skin);

    pixelRect(-15, -103, 30, 29, skin);
    pixelRect(-17, -98, 4, 18, hairShade);
    pixelRect(-16 - flow * 3, -108 + energyFlow, 6, 14, hair);
    pixelRect(-10 - flow * 4, -112 - energyFlow, 7, 18, hair);
    pixelRect(-3 - flow * 3, -115 + energyFlow, 7, 20, hair);
    pixelRect(4 - flow * 2, -112 - energyFlow, 7, 18, hair);
    pixelRect(10 - flow * 2, -108 + energyFlow, 7, 14, hair);
    pixelRect(-16, -100, 32, 9, blind);
    pixelRect(-12, -98, 24, 3, entity.awakening > 0 && !tint ? "#ffffff" : blind);
    pixelRect(-9, -83, 18, 4, tint || "#c88f88");
    pixelRect(-5, -79, 10, 3, tint || "#f3d4c8");

    ctx.restore();
    if (entity.flash > 0 && !tint) {
      drawGojo(entity, clamp(entity.flash / .12, 0, 1), "#ffffff");
    }
  }

  function drawSukuna(entity, alpha = 1, tint = null) {
    const bob = entity.grounded && entity.state === "idle" ? Math.sin(performance.now() * .007) * 2 : 0;
    const run = entity.state === "run" ? Math.sin(entity.stateTime * 24) : 0;
    const attackT = entity.attack ? clamp(entity.attack.elapsed / entity.attack.duration, 0, 1) : 0;
    const reach = entity.attack ? Math.sin(attackT * Math.PI) : 0;
    const awakened = entity.awakening > 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(entity.x), Math.round(entity.y + bob));
    ctx.scale(entity.facing, 1);

    if (awakened && !tint) {
      ctx.fillStyle = "#ff183522";
      ctx.beginPath();
      ctx.ellipse(0, -53, 50 + Math.sin(performance.now() * .013) * 7, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a0208";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(rnd(-34, 34), -112);
        ctx.lineTo(rnd(-48, 48), -68);
        ctx.lineTo(rnd(-40, 40), -20);
        ctx.stroke();
      }
    }

    const dark = tint || "#171018";
    const cloth = tint || (entity.onlineVariant === "inverted" ? "#f0e7df" : "#e5ddd2");
    const red = tint || "#8e1835";
    const energy = tint || "#ff244f";
    const skin = tint || "#d5a199";
    const hair = tint || "#e8b7bd";
    let legA = run * 10;
    let legB = -run * 10;
    if (!entity.grounded) { legA = 9; legB = -8; }
    if (entity.state === "heavy") { legA = -8; legB = 12; }
    if (entity.comboStep === 3 && entity.attack?.chain) legB = -30;

    pixelRect(-18 + legA, -39, 14, 32, dark);
    pixelRect(4 + legB, -39, 14, 32, dark);
    pixelRect(-20 + legA, -9, 19, 9, tint || "#09070b");
    pixelRect(1 + legB, -9, 20, 9, tint || "#09070b");
    pixelRect(-21, -78, 42, 43, cloth);
    pixelRect(-18, -75, 36, 37, tint || "#d4c9bf");
    pixelRect(-21, -76, 7, 39, red);
    pixelRect(-5, -72, 5, 33, tint || "#b92d49");
    pixelRect(-18, -44, 36, 7, dark);

    let frontX = 15;
    let frontY = -70;
    let backX = -23;
    let backY = -70;
    if (entity.attack) {
      if (entity.attack.type === "light") {
        frontX += reach * 42;
        frontY += entity.comboStep === 2 ? reach * 16 : 0;
      } else if (entity.attack.type === "heavy") {
        frontX += reach * 50;
        frontY -= reach * 24;
      } else if (["dismantle", "cleave", "worldSlash"].includes(entity.attack.type)) {
        frontX += reach * 48;
        frontY -= 10;
        backX += reach * 22;
      }
    } else if (entity.blocking) {
      frontX = 16; frontY = -85; backX = 4; backY = -76;
    } else if (entity.state === "run") {
      frontX -= run * 8;
      backX += run * 8;
    }
    pixelRect(backX, backY, 11, 32, cloth);
    pixelRect(backX + 1, backY + 26, 10, 9, skin);
    pixelRect(frontX, frontY, 11, 32, red);
    pixelRect(frontX + 1, frontY + 26, 10, 9, skin);

    pixelRect(-16, -105, 32, 31, skin);
    pixelRect(-17, -99, 5, 21, red);
    pixelRect(-17, -111, 7, 16, hair);
    pixelRect(-11, -115, 8, 20, hair);
    pixelRect(-4, -118, 8, 22, hair);
    pixelRect(4, -115, 8, 20, hair);
    pixelRect(11, -111, 7, 16, hair);
    pixelRect(-13, -99, 10, 4, tint || "#28050e");
    pixelRect(4, -99, 10, 4, tint || "#28050e");
    pixelRect(-9, -88, 18, 4, tint || "#501020");
    pixelRect(-15, -91, 7, 3, tint || "#7d1730");
    pixelRect(8, -91, 7, 3, tint || "#7d1730");
    pixelRect(-3, -105, 3, 28, tint || "#68162c");

    if (entity.attack?.slash && !tint || ["dismantle", "cleave", "worldSlash"].includes(entity.attack?.type)) {
      ctx.globalAlpha *= .8;
      ctx.strokeStyle = energy;
      ctx.lineWidth = entity.attack?.type === "worldSlash" ? 9 : 5;
      ctx.beginPath();
      ctx.moveTo(18, -104);
      ctx.lineTo(55 + reach * 70, -38);
      ctx.stroke();
      ctx.strokeStyle = "#fff0f2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, -102);
      ctx.lineTo(57 + reach * 70, -40);
      ctx.stroke();
    }
    ctx.restore();
    if (entity.flash > 0 && !tint) drawSukuna(entity, clamp(entity.flash / .12, 0, 1), "#ffffff");
  }

  function drawHakari(entity, alpha = 1, tint = null) {
    const bob = entity.grounded && entity.state === "idle" ? Math.sin(performance.now() * .008) * 2 : 0;
    const run = entity.state === "run" ? Math.sin(entity.stateTime * 25) : 0;
    const attackT = entity.attack ? clamp(entity.attack.elapsed / entity.attack.duration, 0, 1) : 0;
    const reach = entity.attack ? Math.sin(attackT * Math.PI) : 0;
    const fever = entity.jackpot > 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(entity.x), Math.round(entity.y + bob));
    ctx.scale(entity.facing, 1);
    if ((entity.heat > 55 || fever) && !tint) {
      ctx.fillStyle = fever ? "#eaff4938" : "#42ff7b22";
      ctx.beginPath();
      ctx.ellipse(0, -52, fever ? 58 : 43, fever ? 78 : 63, 0, 0, Math.PI * 2);
      ctx.fill();
      if (fever) {
        for (let i = 0; i < 4; i++) pixelRect(rnd(-42, 42), rnd(-115, -15), rnd(4, 9), rnd(8, 20), i % 2 ? "#fff35d" : "#4dff87");
      }
    }
    const dark = tint || "#171019";
    const coat = tint || "#4c1767";
    const coatEdge = tint || "#7e2aa5";
    const shirt = tint || "#101a15";
    const skin = tint || "#bd856f";
    const hair = tint || "#3b172f";
    const energy = tint || "#55f087";
    let legA = run * 10;
    let legB = -run * 10;
    if (!entity.grounded) { legA = 8; legB = -8; }
    if (entity.comboStep === 2 && entity.attack?.chain) legA = -18;
    pixelRect(-18 + legA, -40, 14, 33, dark);
    pixelRect(4 + legB, -40, 14, 33, dark);
    pixelRect(-20 + legA, -9, 19, 9, "#09070b");
    pixelRect(1 + legB, -9, 20, 9, "#09070b");
    pixelRect(-22, -80, 44, 45, coat);
    pixelRect(-16, -76, 32, 39, shirt);
    pixelRect(-22, -78, 6, 40, coatEdge);
    pixelRect(-17, -44, 34, 7, dark);
    let frontX = 15, frontY = -71, backX = -24, backY = -71;
    if (entity.attack) {
      frontX += reach * (entity.attack.type === "roughPunch" ? 62 : 43);
      frontY += entity.comboStep === 2 ? reach * 17 : entity.attack.type === "heavy" ? -reach * 20 : 0;
      if (entity.attack.type === "doors" || entity.attack.type === "reserveBall") backX += reach * 26;
    } else if (entity.blocking) {
      frontX = 15; frontY = -86; backX = 2; backY = -77;
    } else if (entity.state === "run") {
      frontX -= run * 8;
      backX += run * 8;
    }
    pixelRect(backX, backY, 11, 32, coat);
    pixelRect(backX + 1, backY + 26, 10, 9, skin);
    pixelRect(frontX, frontY, 11, 32, coatEdge);
    pixelRect(frontX + 1, frontY + 26, 10, 9, skin);
    pixelRect(-16, -106, 32, 32, skin);
    pixelRect(-18, -113, 8, 20, hair);
    pixelRect(-12, -119, 9, 25, hair);
    pixelRect(-4, -121, 9, 27, hair);
    pixelRect(5, -117, 9, 23, hair);
    pixelRect(12, -111, 7, 18, hair);
    pixelRect(-12, -99, 10, 4, "#16080d");
    pixelRect(4, -99, 10, 4, "#16080d");
    pixelRect(-8, -86, 17, 4, "#672f34");
    if (entity.attack?.rough && !tint) {
      ctx.strokeStyle = energy;
      ctx.lineWidth = fever ? 8 : 5;
      ctx.beginPath();
      ctx.moveTo(19, -74);
      ctx.lineTo(46 + reach * 55, -68 + rnd(-8, 8));
      ctx.stroke();
      for (let i = 0; i < 5; i++) pixelRect(28 + reach * rnd(20, 74), -88 + rnd(-20, 38), rnd(3, 8), rnd(4, 13), i % 2 ? "#52f487" : "#dfff54");
    }
    ctx.restore();
    if (entity.flash > 0 && !tint) drawHakari(entity, clamp(entity.flash / .12, 0, 1), "#ffffff");
  }

  function drawChargeAura(entity) {
    const t = performance.now() * .012;
    const color = entity.character === "sukuna" ? "#ff3158" : entity.character === "hakari" ? "#58ff8c" : "#65eaff";
    ctx.save();
    ctx.translate(Math.round(entity.x), Math.round(entity.y - 55));
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = .28 + Math.sin(t) * .08;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 + i * 9 + Math.sin(t + i) * 4, 55 + i * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = .7;
    for (let i = 0; i < 8; i++) {
      const angle = t * .35 + i * Math.PI / 4;
      pixelRect(Math.cos(angle) * 42, Math.sin(angle) * 62, 4 + i % 3, 9 + i % 4, color);
    }
    ctx.restore();
  }

  function drawFighter(entity, alpha = 1, tint = null) {
    if (entity?.charging && !tint) drawChargeAura(entity);
    if (entity?.character === "hakari") drawHakari(entity, alpha, tint);
    else if (entity?.character === "sukuna") drawSukuna(entity, alpha, tint);
    else drawGojo(entity, alpha, tint);
  }

  function drawCurse(entity, alpha = 1, tint = null) {
    const type = entity.type;
    const run = entity.state === "run" ? Math.sin(entity.stateTime * 16) : 0;
    const attackT = entity.attack ? clamp(entity.attack.elapsed / entity.attack.duration, 0, 1) : 0;
    const reach = entity.attack ? Math.sin(attackT * Math.PI) : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(entity.x), Math.round(entity.y));
    ctx.scale(entity.facing, 1);
    if (entity.reaction === "head" && entity.stun > 0) ctx.rotate(-entity.facing * .08);
    if (entity.reaction === "body" && entity.stun > 0) ctx.rotate(entity.facing * .055);
    if (entity.reaction === "wall" && entity.stun > 0) ctx.scale(.88, 1.08);
    if (type.boss && !tint) {
      ctx.fillStyle = "#ff365522";
      ctx.beginPath();
      ctx.ellipse(0, -60, 54, 75, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    pixelRect(-20 + run * 5, -40, 16, 39, tint || "#160e1a");
    pixelRect(5 - run * 5, -40, 16, 39, tint || "#160e1a");
    pixelRect(-27, -84, 54, 48, tint || type.color);
    pixelRect(-20, -91, 40, 58, tint || "#251329");
    pixelRect(-27, -80, 7, 38, tint || type.accent);
    pixelRect(-28, -80, 13, 38 + reach * 26, tint || "#32172e");
    pixelRect(15 + reach * 42, -80 + reach * 9, 14, 40, tint || type.color);
    pixelRect(17 + reach * 47, -45 + reach * 9, 12, 12, tint || type.accent);
    pixelRect(-21, -111, 42, 32, tint || "#281329");
    pixelRect(-16, -106, 32, 23, tint || "#c6a8b5");
    pixelRect(-13, -102, 9, 7, tint || "#050307");
    pixelRect(6, -102, 9, 7, tint || "#050307");
    pixelRect(-10, -100, 5, 3, tint || type.accent);
    pixelRect(7, -100, 5, 3, tint || type.accent);
    pixelRect(-8, -89, 17, 5, tint || "#50182f");
    if (type.boss) {
      pixelRect(-25, -119, 9, 18, tint || type.accent);
      pixelRect(16, -119, 9, 18, tint || type.accent);
      pixelRect(-4, -126, 8, 20, tint || "#43152d");
    }
    if (entity.attack?.active && !tint) {
      ctx.strokeStyle = type.accent;
      ctx.lineWidth = 6;
      ctx.globalAlpha = .7;
      ctx.beginPath();
      ctx.arc(37, -60, 34 + reach * 35, -1.4, 1.1);
      ctx.stroke();
    }
    ctx.restore();
    if (entity.flash > 0 && !tint) {
      drawCurse(entity, clamp(entity.flash / .12, 0, 1), "#ffffff");
    }
  }

  function drawProjectiles() {
    for (const o of game.projectiles) {
      ctx.save();
      ctx.translate(Math.round(o.x), Math.round(o.y));
      if (o.type === "blue") {
        const r = 15 + Math.sin(performance.now() * .015) * 4;
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 48);
        grad.addColorStop(0, "#e7ffff");
        grad.addColorStop(.2, "#4da1ff");
        grad.addColorStop(.55, "#2527b8aa");
        grad.addColorStop(1, "#10105000");
        ctx.fillStyle = grad;
        ctx.fillRect(-50, -50, 100, 100);
        ctx.strokeStyle = "#75dfff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const a = performance.now() * .002 + i * 1.25;
          pixelRect(Math.cos(a) * 28, Math.sin(a) * 28, 4, 4, "#82eaff");
        }
      } else if (o.type === "red") {
        ctx.fillStyle = "#ff335844";
        ctx.beginPath();
        ctx.arc(0, 0, 44, 0, Math.PI * 2);
        ctx.fill();
        pixelRect(-24, -24, 48, 48, "#ef244f");
        pixelRect(-14, -14, 28, 28, "#ff8ba3");
        pixelRect(-6, -6, 12, 12, "#fff1f4");
        for (let i = 0; i < 4; i++) pixelRect(-o.vx * .06 - i * Math.sign(o.vx) * 15, rnd(-18, 18), 12, 6, "#ff4569");
      } else if (o.type === "purple") {
        ctx.scale(Math.sign(o.vx), 1);
        const grad = ctx.createLinearGradient(-130, 0, 120, 0);
        grad.addColorStop(0, "#5024b400");
        grad.addColorStop(.25, "#5630d8cc");
        grad.addColorStop(.65, "#b171ff");
        grad.addColorStop(1, "#f2d9ff");
        ctx.fillStyle = grad;
        ctx.fillRect(-150, -47, 300, 94);
        ctx.fillStyle = "#f5eaff";
        ctx.fillRect(55, -14, 90, 28);
        ctx.fillStyle = "#a35cff";
        for (let i = 0; i < 14; i++) pixelRect(rnd(-145, 125), rnd(-57, 57), rnd(5, 18), rnd(3, 8), "#b370ff");
        ctx.fillStyle = "#110218";
        for (let i = 0; i < 7; i++) pixelRect(rnd(-120, 110), rnd(-50, 50), rnd(8, 24), rnd(2, 6), "#110218");
      } else if (o.type === "dismantle" || o.type === "worldSlash") {
        ctx.rotate(Math.atan2(o.vy, o.vx));
        const length = o.type === "worldSlash" ? 270 : 112;
        const height = o.type === "worldSlash" ? 16 : 7;
        ctx.fillStyle = o.type === "worldSlash" ? "#120208" : "#ff3158";
        ctx.fillRect(-length / 2, -height / 2, length, height);
        ctx.fillStyle = "#fff1f3";
        ctx.fillRect(-length / 2 + 8, -2, length - 16, 4);
        ctx.fillStyle = "#ff244f";
        for (let i = 0; i < (o.type === "worldSlash" ? 13 : 5); i++) {
          pixelRect(rnd(-length / 2, length / 2), rnd(-28, 28), rnd(9, 28), rnd(2, 5), "#ff244f");
        }
      } else if (o.type === "door") {
        const color = o.rarity === "gold" ? "#ffe95a" : o.rarity === "red" ? "#ff4264" : "#4df083";
        pixelRect(-22, -64, 44, 128, "#101714");
        pixelRect(-19, -61, 38, 122, color);
        for (let y = -52; y < 60; y += 15) pixelRect(-17, y, 34, 5, "#17251c");
        pixelRect(-4, -61, 8, 122, "#d9ffe4");
      } else if (o.type === "reserveBall") {
        const color = o.rarity === "gold" ? "#ffe95a" : o.rarity === "red" ? "#ff4264" : "#52f487";
        ctx.fillStyle = `${color}55`;
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();
        pixelRect(-9, -9, 18, 18, color);
        pixelRect(-4, -4, 8, 8, "#f6ffe3");
        pixelRect(-Math.sign(o.vx) * 24, -3, 18, 6, color);
      } else {
        ctx.rotate(Math.atan2(o.vy, o.vx));
        pixelRect(-o.w / 2, -o.h / 2, o.w, o.h, "#6c183b");
        pixelRect(-o.w / 3, -o.h / 3, o.w * .66, o.h * .66, "#ff416e");
        pixelRect(-o.w, -3, o.w, 6, "#ff5b7c");
      }
      ctx.restore();
    }
  }

  function drawUnstablePurple() {
    const purple = game.unstablePurple;
    if (!purple) return;
    const t = performance.now() * .001;
    const progress = clamp(purple.timer / purple.maxTimer, 0, 1);
    const compression = purple.state === "firing" ? clamp(purple.fireTimer / .58, 0, 1) : 1;
    const jitter = purple.state === "unstable" ? 6 : 2;
    const x = purple.x + rnd(-jitter, jitter);
    const y = purple.y + rnd(-jitter, jitter);
    const radius = (42 + Math.sin(t * 18) * 5) * (.55 + compression * .45);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, radius * 2.1);
    aura.addColorStop(0, "#f5eaff");
    aura.addColorStop(.18, "#b66cff");
    aura.addColorStop(.48, "#5c25b8cc");
    aura.addColorStop(1, "#17062900");
    ctx.fillStyle = aura;
    ctx.fillRect(-radius * 2.2, -radius * 2.2, radius * 4.4, radius * 4.4);
    ctx.fillStyle = "#8d4fff";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#170321";
    ctx.beginPath();
    ctx.arc(0, 0, radius * .52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4c8cff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.38, radius * .58, t * 3.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ff315d";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.38, radius * .58, -t * 4.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = i % 2 ? "#d59aff" : "#16021e";
      ctx.lineWidth = rnd(2, 5);
      ctx.beginPath();
      ctx.moveTo(rnd(-radius, radius), rnd(-radius, radius));
      ctx.lineTo(rnd(-radius * 1.8, radius * 1.8), rnd(-radius * 1.8, radius * 1.8));
      ctx.lineTo(rnd(-radius * 2.3, radius * 2.3), rnd(-radius * 2.3, radius * 2.3));
      ctx.stroke();
    }
    ctx.fillStyle = "#9f66ff55";
    for (let i = 0; i < 10; i++) {
      pixelRect(rnd(-radius * 2.2, radius * 2.2), rnd(-radius * 1.8, radius * 1.8), rnd(3, 12), rnd(3, 8), i % 3 ? "#8d5cff" : "#0b0310");
    }
    ctx.fillStyle = "#0a0614dd";
    ctx.fillRect(-58, -radius - 30, 116, 10);
    ctx.strokeStyle = "#e6d8ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-58, -radius - 30, 116, 10);
    ctx.fillStyle = purple.state === "firing" ? "#f1dcff" : "#9b5cff";
    ctx.fillRect(-56, -radius - 28, 112 * progress, 6);
    ctx.restore();
  }

  function drawRemoteUnstablePurple() {
    const purple = game.remoteUnstablePurple;
    if (!purple) return;
    const t = performance.now() * .001;
    const radius = 40 + Math.sin(t * 18) * 5;
    ctx.save();
    ctx.translate(purple.x + rnd(-5, 5), purple.y + rnd(-5, 5));
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, radius * 2.1);
    aura.addColorStop(0, "#f7edff");
    aura.addColorStop(.25, "#b66cff");
    aura.addColorStop(.62, "#5b27b8aa");
    aura.addColorStop(1, "#17062900");
    ctx.fillStyle = aura;
    ctx.fillRect(-radius * 2.2, -radius * 2.2, radius * 4.4, radius * 4.4);
    ctx.fillStyle = "#8d4fff";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#13021c";
    ctx.beginPath();
    ctx.arc(0, 0, radius * .5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4c8cff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.35, radius * .55, t * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#ff315d";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.35, radius * .55, -t * 4.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of game.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (1 - p.life / p.maxLife) * 95, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.slash) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        pixelRect(0, -p.size / 4, p.size * 2.4, p.size / 2, p.color);
        ctx.restore();
      } else {
        pixelRect(p.x, p.y, p.size, p.size, p.color);
      }
    }
    ctx.restore();
  }

  function drawClashEnergy() {
    if (!game.clash) return;
    const c = game.clash;
    const centerX = W / 2;
    const y = GROUND - 95;
    const leftColor = c.kind === "red" ? "#ff365e" : c.kind === "blue" ? "#56dfff" : "#9857ff";
    const rightColor = c.kind === "red" ? "#ff7190" : c.kind === "blue" ? "#466cff" : "#ff3d73";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = leftColor;
    ctx.fillRect(game.player.x + 25, y - 15, centerX - game.player.x - 25, 30);
    ctx.fillStyle = rightColor;
    ctx.fillRect(centerX, y - 15, game.enemy.x - centerX - 25, 30);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(centerX - 9 + rnd(-5, 5), y - 36, 18, 72);
    ctx.restore();
  }

  function drawDomain() {
    if (game.domain <= 0 && game.domainIntro <= 0 && !game.clash?.domain) return;
    const intro = game.domainIntro;
    const opacity = intro > 0 ? clamp((2.35 - intro) * .7, 0, .9) : .9;
    ctx.save();
    ctx.globalAlpha = opacity;
    const shrine = game.domainCharacter === "sukuna";
    const gamble = game.domainCharacter === "hakari";
    ctx.fillStyle = shrine ? "#120306" : gamble ? "#06130d" : "#01010c";
    ctx.fillRect(0, 0, W, H);
    const t = performance.now() * .001;
    if (gamble) {
      ctx.fillStyle = "#091d16";
      ctx.fillRect(0, 70, W, GROUND - 70);
      ctx.fillStyle = "#142d25";
      ctx.fillRect(0, 110, W, 28);
      ctx.fillRect(0, GROUND - 75, W, 75);
      ctx.fillStyle = "#326f4d";
      ctx.fillRect(0, GROUND - 82, W, 7);
      ctx.fillStyle = "#d8ff5d";
      for (let x = 25; x < W; x += 58) ctx.fillRect(x, GROUND - 58, 28, 5);
      for (let i = 0; i < 12; i++) {
        const x = i * 118 - (t * 150 % 118);
        ctx.fillStyle = i % 2 ? "#5cff8c" : "#fff35d";
        ctx.fillRect(x, 84, 72, 10);
        ctx.fillStyle = "#183b2b";
        ctx.fillRect(x + 8, 147, 90, 92);
        ctx.fillStyle = "#9dfbc155";
        ctx.fillRect(x + 14, 154, 34, 68);
        ctx.fillRect(x + 56, 154, 34, 68);
      }
      ctx.fillStyle = "#0b0e14";
      ctx.fillRect(0, GROUND - 18, W, 18);
      ctx.fillStyle = "#777f75";
      ctx.fillRect(0, GROUND - 14, W, 3);
      ctx.fillRect(0, GROUND - 5, W, 3);
      for (let i = 0; i < 20; i++) {
        const x = (i * 83 + t * 85) % W;
        pixelRect(x, 50 + Math.sin(t * 3 + i) * 18, 5, 12, i % 3 ? "#58ff8c" : "#fff35d");
      }
      const slots = game.hakariDomain?.displaySlots || [7, 7, 7];
      ctx.textAlign = "center";
      ctx.font = '36px "Press Start 2P", monospace';
      slots.forEach((number, index) => {
        const x = W / 2 - 142 + index * 142;
        ctx.fillStyle = "#050907dd";
        ctx.fillRect(x - 48, 252, 96, 92);
        ctx.strokeStyle = index === 1 ? "#fff35d" : "#58ff8c";
        ctx.lineWidth = 5;
        ctx.strokeRect(x - 48, 252, 96, 92);
        ctx.fillStyle = number === 7 ? "#fff35d" : "#d9ffe5";
        ctx.fillText(String(number), x, 318);
      });
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillStyle = "#c9ffda";
      ctx.fillText(game.clash?.hakari ? "HIT JACKPOT BEFORE THE DOMAIN BREAKS" : "IDLE DEATH GAMBLE", W / 2, 225);
      ctx.restore();
      return;
    }
    if (shrine) {
      ctx.fillStyle = "#25060d";
      ctx.fillRect(W / 2 - 170, GROUND - 270, 340, 270);
      ctx.fillStyle = "#4d0c1c";
      ctx.fillRect(W / 2 - 205, GROUND - 225, 410, 28);
      ctx.fillRect(W / 2 - 145, GROUND - 320, 290, 42);
      for (let i = 0; i < 9; i++) {
        const x = W / 2 - 150 + i * 38;
        pixelRect(x, GROUND - 198, 12, 198, i % 2 ? "#170207" : "#310812");
      }
      ctx.strokeStyle = "#ff214999";
      ctx.lineWidth = 3;
      for (let i = 0; i < 28; i++) {
        const y = 75 + (i * 47 + t * 150) % 470;
        ctx.beginPath();
        ctx.moveTo(rnd(0, W * .25), y);
        ctx.lineTo(rnd(W * .65, W), y - rnd(20, 90));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    for (let i = 0; i < 110; i++) {
      const x = (i * 197 + Math.sin(i * 4.1) * 330) % W;
      const y = (i * 83 + Math.cos(i * 2.7) * 190 + t * (8 + i % 5)) % H;
      const s = i % 17 === 0 ? 4 : i % 4 === 0 ? 2 : 1;
      pixelRect(x, y, s, s, i % 7 ? "#bcecff" : "#9974ff");
    }
    ctx.strokeStyle = "#8879ff55";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 140 + i * 115 + Math.sin(t + i) * 15, 40 + i * 47, t * .1 + i, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = W * .14 + i * W * .12;
      const y = 120 + Math.sin(t * .7 + i) * 65 + (i % 2) * 330;
      ctx.fillStyle = "#d9ecff22";
      ctx.beginPath();
      ctx.ellipse(x, y, 28, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8369ff";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#02020c";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCinematic() {
    if (game.cinematic <= 0 && game.domainIntro <= 0) return;
    ctx.fillStyle = "#020308";
    const bar = game.domainIntro > 0 ? 92 : 45;
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    if (game.domainIntro > 0) {
      const progress = 1 - game.domainIntro / 2.35;
      ctx.save();
      ctx.globalAlpha = clamp(Math.sin(progress * Math.PI) * 1.3, 0, 1);
      ctx.textAlign = "center";
      const shrine = game.domainCharacter === "sukuna";
      const gamble = game.domainCharacter === "hakari";
      ctx.fillStyle = shrine ? "#ffe9ed" : gamble ? "#eaff65" : "#eafdff";
      ctx.font = '28px "Press Start 2P", monospace';
      ctx.fillText(progress < .56 ? "DOMAIN EXPANSION" : shrine ? "MALEVOLENT SHRINE" : gamble ? "IDLE DEATH GAMBLE" : "UNLIMITED VOID", W / 2, 66);
      ctx.fillStyle = shrine ? "#ff3158" : gamble ? "#58ff8c" : "#71eaff";
      ctx.fillRect(W / 2 - 150, H - 55, 300 * progress, 3);
      ctx.restore();
    } else if (game.player?.jackpotFinisher) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "#f5ff63";
      ctx.font = '30px "Press Start 2P", monospace';
      ctx.fillText("RESTLESS GAMBLER", W / 2, 62);
      ctx.fillStyle = "#58ff8c";
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText("JACKPOT FINISH", W / 2, H - 27);
      ctx.restore();
    }
  }

  function draw() {
    const sx = game.shake ? rnd(-game.shake, game.shake) : 0;
    const sy = game.shake ? rnd(-game.shake * .6, game.shake * .6) : 0;
    const halfViewW = W / (2 * game.cameraZoom);
    const halfViewH = H / (2 * game.cameraZoom);
    const focusX = clamp(game.cameraFocusX, halfViewW, W - halfViewW);
    const focusY = clamp(game.cameraFocusY, halfViewH, H - halfViewH);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(game.cameraZoom, game.cameraZoom);
    ctx.translate(-focusX + Math.round(sx), -focusY + Math.round(sy));
    drawBackground();
    if (game.state !== "menu") {
      drawDomain();
      drawProps();
      for (const a of game.afterimages) drawFighter(a, a.life / a.maxLife * .45, a.color);
      drawProjectiles();
      drawUnstablePurple();
      drawRemoteUnstablePurple();
      if (game.player) drawFighter(game.player);
      if (game.enemy) {
        if (game.online.active && game.enemy.kind === "remote") drawFighter(game.enemy);
        else drawCurse(game.enemy);
      }
      drawParticles();
      drawClashEnergy();
      if (game.player?.canAwaken && game.player.awakening <= 0) {
        ctx.save();
        ctx.globalAlpha = .45 + Math.sin(performance.now() * .01) * .2;
        ctx.strokeStyle = "#c6f8ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(game.player.x, game.player.y - 55, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawCinematic();
    }
    ctx.restore();
    if (game.blackFlash > 0) {
      const alpha = clamp(game.blackFlash * 1.8, 0, .72);
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,8,48,${alpha * .42})`;
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(i * Math.PI / 4 + performance.now() * .001);
        ctx.fillRect(0, -3, W, 6);
        ctx.restore();
      }
    }
    if (game.glitch > 0) {
      ctx.globalAlpha = clamp(game.glitch * .65, 0, .45);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "#5deaff" : "#9b47ff";
        ctx.fillRect(rnd(-20, 20), rnd(0, H), W, rnd(1, 5));
      }
      ctx.globalAlpha = 1;
    }
    if (game.realityCrack > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(game.realityCrack * 1.2, 0, .9);
      ctx.strokeStyle = "#e8d9ff";
      ctx.lineWidth = 3;
      for (let i = 0; i < 11; i++) {
        let x = W / 2 + rnd(-170, 170);
        let y = H / 2 + rnd(-110, 110);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += rnd(-95, 95);
          y += rnd(-75, 75);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    if (game.jackpotFlash > 0 || game.player?.jackpot > 0) {
      const pulse = game.jackpotFlash > 0
        ? clamp(game.jackpotFlash / 1.3, 0, 1)
        : .035 + (Math.sin(performance.now() * .012) + 1) * .018;
      ctx.fillStyle = `rgba(66,255,118,${pulse * .18})`;
      ctx.fillRect(0, 0, W, H);
      if (game.jackpotFlash > 0) {
        ctx.strokeStyle = `rgba(255,244,82,${pulse * .8})`;
        ctx.lineWidth = 9;
        ctx.strokeRect(12 + (1 - pulse) * 40, 12 + (1 - pulse) * 40, W - 24 - (1 - pulse) * 80, H - 24 - (1 - pulse) * 80);
      }
    }
    if (game.purpleExplosion > 0) {
      const phase = game.purpleExplosion / .85;
      ctx.fillStyle = `rgba(102,35,190,${phase * .36})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(236,218,255,${phase})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, (1 - phase) * W * .8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(225,250,255,${clamp(game.flash * 2.8, 0, .7)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(now) {
    const dt = Math.min(.033, (now - lastTime) / 1000);
    lastTime = now;
    if (game.online.active && game.state === "playing") {
      onlineAccumulator = Math.min(.12, onlineAccumulator + dt);
      while (onlineAccumulator >= 1 / 60) {
        update(1 / 60);
        onlineAccumulator -= 1 / 60;
      }
    } else {
      onlineAccumulator = 0;
      update(dt);
    }
    draw();
    pressed.clear();
    requestAnimationFrame(frame);
  }

  function pauseGame() {
    if (game.online.active) {
      announce("ONLINE BATTLE CANNOT PAUSE");
      return;
    }
    if (game.state === "playing") {
      game.state = "paused";
      ui.pause.classList.remove("hidden");
    } else if (game.state === "paused") {
      game.state = "playing";
      ui.pause.classList.add("hidden");
      lastTime = performance.now();
    }
  }

  function captureOnlineInput(frame) {
    if (!game.online.active || !game.player || game.state !== "playing") return null;
    const edges = game.online.inputEdges;
    const domainLocked = game.domainStartup > 0 || localFrozenByUnlimitedVoid();
    const input = domainLocked
      ? {
        move: 0, jump: false, dash: false, block: false, charge: false,
        light: false, heavy: false, special: "", domain: edges.domain, awaken: false,
      }
      : {
        move: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
        jump: edges.jump,
        dash: edges.dash,
        block: keys.has("s"),
        charge: keys.has("c"),
        light: edges.light,
        heavy: edges.heavy,
        special: edges.special,
        domain: edges.domain,
        awaken: edges.awaken,
      };
    game.online.inputEdges = {
      jump: false, dash: false, light: false, heavy: false,
      special: "", domain: false, awaken: false,
    };
    game.online.predictionHistory.set(frame, {
      x: game.player.x,
      y: game.player.y,
      vx: game.player.vx,
      vy: game.player.vy,
    });
    for (const savedFrame of game.online.predictionHistory.keys()) {
      if (savedFrame < frame - 180) game.online.predictionHistory.delete(savedFrame);
    }
    return input;
  }

  function authoritativeAttack(serverPlayer, snapshotTick) {
    const attack = serverPlayer.attack;
    if (!attack) return null;
    const names = {
      light: "M1 COMBO",
      heavy: "HEAVY ATTACK",
      roughPunch: "ROUGH CURSED PUNCH",
      cleave: "CLEAVE",
      door: "SHUTTER DOORS",
      gamblersLuck: "GAMBLER'S LUCK",
      feverBreaker: "FEVER BREAKER",
    };
    const duration = Math.max(.1, (attack.endTick - attack.startTick) / 60);
    return {
      name: names[attack.kind] || attack.kind.toUpperCase(),
      type: attack.kind,
      startTick: attack.startTick,
      activeTick: attack.activeTick,
      endActiveTick: attack.endActiveTick,
      endTick: attack.endTick,
      elapsed: clamp((snapshotTick - attack.startTick) / 60, 0, duration),
      duration,
      start: .1,
      end: Math.min(duration, .24),
      active: snapshotTick >= attack.startTick + 6,
      chain: attack.kind === "light",
      chainStep: attack.step || 0,
      hit: new Set(),
      strong: attack.kind !== "light" || attack.step === 4,
    };
  }

  function displayAuthoritativeEvent(event) {
    if (!event || event.tick < game.online.lastEventTick) return;
    game.online.lastEventTick = Math.max(game.online.lastEventTick, event.tick);
    if (event.kind === "parry") {
      announce(event.slot === game.online.slot ? "PERFECT PARRY" : "ATTACK PARRIED");
      game.slow = .35;
      game.shake = 9;
    } else if (event.kind === "reflect") {
      announce(event.slot === game.online.slot ? "PROJECTILE REFLECT" : "PROJECTILE REFLECTED");
      game.slow = .25;
      game.shake = 8;
    } else if (event.kind === "purpleFusion") {
      announce("UNSTABLE HOLLOW PURPLE");
      game.glitch = .18;
      game.shake = 7;
      if (event.slot !== game.online.slot) {
        game.remoteUnstablePurple = {
          x: Number(event.x || game.enemy.x),
          y: Number(event.y || game.enemy.y - 72),
          timer: Number(event.durationTicks || 228) / 60,
          maxTimer: Number(event.durationTicks || 228) / 60,
        };
      }
    } else if (event.kind === "purpleCollapse") {
      announce("PURPLE COLLAPSE");
      game.purpleExplosion = .85;
      game.glitch = .65;
      game.shake = 24;
      game.remoteUnstablePurple = null;
    } else if (event.kind === "domainStart") {
      game.domainCharacter = event.character || "gojo";
      game.domainOwnerSlot = Number(event.slot || 0);
      const serverIntro = game.domainStartup > 0
        ? game.domainStartup
        : Number(event.startupTicks || 141) / 60;
      game.domainStartup = serverIntro;
      game.domainIntro = serverIntro;
      game.cinematic = serverIntro;
      game.glitch = 1.15;
      game.windPaused = true;
      game.cameraTarget = 1.22;
      announce(event.character === "sukuna" ? "MALEVOLENT SHRINE"
        : event.character === "hakari" ? "IDLE DEATH GAMBLE" : "UNLIMITED VOID");
    } else if (event.kind === "domainActive") {
      game.domainCharacter = event.character || game.domainCharacter;
      game.domainOwnerSlot = Number(event.slot || game.domainOwnerSlot);
      game.domainStartup = 0;
      game.domainIntro = 0;
      game.cinematic = 0;
    } else if (event.kind === "domainSlash") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      game.shake = Math.max(game.shake, 8);
      for (let i = 0; i < 8; i++) {
        game.particles.push({
          x: victim.x + rnd(-34, 34), y: victim.y - rnd(18, victim.h),
          vx: rnd(-380, 380), vy: rnd(-300, 180), size: rnd(8, 19),
          color: i % 2 ? "#ff244f" : "#fff1f3",
          life: .25, maxLife: .25, gravity: 0, slash: true,
        });
      }
    } else if (event.kind === "specialCast") {
      const remoteCast = event.slot !== game.online.slot;
      if (remoteCast && event.technique === "purple") {
        game.remoteUnstablePurple = null;
        game.realityCrack = .75;
        game.cinematic = .42;
        game.shake = 19;
        announce("HOLLOW PURPLE");
      } else if (remoteCast && event.technique === "worldSlash") {
        game.realityCrack = .55;
        game.shake = 16;
        announce("WORLD-CUTTING DISMANTLE");
      } else if (remoteCast && event.technique === "gamblersLuck") {
        announce("GAMBLER'S LUCK");
      } else if (remoteCast && event.technique === "feverBreaker") {
        announce("FEVER BREAKER");
      }
    } else if (event.kind === "hakariRollInput") {
      const rarity = String(event.rarity || "green").toUpperCase();
      announce(`${rarity} ${String(event.technique || "ROLL").toUpperCase()}  ${event.count}/2`);
    } else if (event.kind === "worldSlashUnlocked") {
      announce(event.slot === game.online.slot ? "WORLD-CUTTING SLASH UNLOCKED" : "OPPONENT UNLOCKED WORLD SLASH");
      game.realityCrack = .3;
    } else if (event.kind === "feverBreakerLaunch" || event.kind === "feverBreakerKick") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      spawnParticles(victim.x, victim.y - 55, "#fff35d", 26, 480, 8, .7);
      game.shake = 12;
    } else if (event.kind === "gamblersLuckGrind" || event.kind === "gamblersLuckThrow") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      spawnParticles(victim.x, GROUND - 7, "#58ff8c", 30, 430, 9, .75);
      game.shake = 11;
    } else if (event.kind === "jackpot") {
      announce(event.slot === game.online.slot ? "JACKPOT" : "OPPONENT HIT JACKPOT");
      if (game.hakariDomain && Array.isArray(event.slots)) game.hakariDomain.displaySlots = event.slots;
      game.hakariDomain = null;
      game.jackpotFlash = 1.2;
      game.flash = .3;
      game.shake = 16;
    } else if (event.kind === "nearJackpot") {
      if (game.hakariDomain && Array.isArray(event.slots)) game.hakariDomain.displaySlots = event.slots;
      announce(event.slot === game.online.slot ? "REACH! NEAR JACKPOT" : "OPPONENT NEAR JACKPOT");
    } else if (event.kind === "failedRoll") {
      if (game.hakariDomain && Array.isArray(event.slots)) game.hakariDomain.displaySlots = event.slots;
      announce(event.slot === game.online.slot ? "ROLL MISSED" : "OPPONENT MISSED ROLL");
    } else if (event.kind === "clashResult") {
      announce(event.winnerSlot === game.online.slot ? "CLASH WON" : "CLASH LOST");
      game.flash = .18;
      game.shake = 16;
    } else if (event.kind === "hit" && event.slot === game.online.slot) {
      game.shake = Math.max(game.shake, 5);
    }
  }

  function applyAuthoritativeSnapshot(snapshot) {
    if (!snapshot || !game.online.active || !game.player || !game.enemy) return;
    const local = snapshot.players?.[game.online.slot];
    const remoteSlot = game.online.slot === 1 ? 2 : 1;
    const remote = snapshot.players?.[remoteSlot];
    if (!local || !remote) return;
    game.online.serverFrame = snapshot.tick;
    game.time = Number(snapshot.remainingTicks || 0) / 60;

    const predicted = game.online.predictionHistory.get(local.ackFrame);
    const predictedX = predicted?.x ?? game.player.x;
    const predictedY = predicted?.y ?? game.player.y;
    const errorX = local.x - predictedX;
    const errorY = local.y - predictedY;
    if (Math.abs(errorX) > 140 || Math.abs(errorY) > 100) {
      game.player.x = local.x;
      game.player.y = local.y;
      game.online.correctionX = 0;
      game.online.correctionY = 0;
    } else {
      game.online.correctionX = Math.abs(errorX) < 8 ? 0 : clamp(errorX * .7, -60, 60);
      game.online.correctionY = Math.abs(errorY) < 6 ? 0 : clamp(errorY * .7, -48, 48);
    }
    game.player.health = local.health;
    game.player.maxHealth = local.maxHealth || 600;
    game.player.energy = local.energy;
    game.player.lagHealth = Math.min(game.player.lagHealth, game.player.maxHealth);
    game.player.stun = Math.max(game.player.stun, Number(local.stun || 0) / 60);
    game.player.invuln = Math.max(game.player.invuln, Number(local.invuln || 0) / 60);
    game.player.awakening = Number(local.awakeningTicks || 0) / 60;
    game.player.jackpot = Number(local.jackpotTicks || 0) / 60;
    game.player.dismantleUses = Number(local.dismantleUses || 0);
    game.player.cleaveUses = Number(local.cleaveUses || 0);
    game.player.sukunaDomainUses = Number(local.sukunaDomainUses || 0);
    game.player.worldSlashUnlocked = Boolean(local.worldSlashUnlocked);
    game.player.charging = Boolean(local.charging);
    for (const [name, ticks] of Object.entries(local.cooldowns || {})) {
      if (name in game.player.cooldowns) game.player.cooldowns[name] = Number(ticks) / 60;
    }
    for (const frame of game.online.predictionHistory.keys()) {
      if (frame <= local.ackFrame) game.online.predictionHistory.delete(frame);
    }

    const remoteTarget = {
      ...remote,
      health: remote.health,
      maxHealth: remote.maxHealth || 600,
      awakening: Number(remote.awakeningTicks || 0) / 60,
      jackpot: Number(remote.jackpotTicks || 0) / 60,
      dismantleUses: Number(remote.dismantleUses || 0),
      cleaveUses: Number(remote.cleaveUses || 0),
      sukunaDomainUses: Number(remote.sukunaDomainUses || 0),
      worldSlashUnlocked: Boolean(remote.worldSlashUnlocked),
      burnout: 0,
      state: remote.attack ? "attack" : remote.charging ? "charge" : Math.abs(remote.vx) > 10 ? "run" : "idle",
      attack: authoritativeAttack(remote, snapshot.tick),
      snapshotTick: snapshot.tick,
    };
    if (snapshot.correction) game.online.snapshotBuffer.length = 0;
    const existingSnapshot = game.online.snapshotBuffer.findIndex((entry) => entry.snapshotTick === snapshot.tick);
    if (existingSnapshot >= 0) game.online.snapshotBuffer[existingSnapshot] = remoteTarget;
    else game.online.snapshotBuffer.push(remoteTarget);
    game.online.snapshotBuffer.sort((a, b) => a.snapshotTick - b.snapshotTick);
    game.online.snapshotBuffer = game.online.snapshotBuffer.slice(-24);

    const localDomainTicks = Number(local.domainTicks || 0);
    const remoteDomainTicks = Number(remote.domainTicks || 0);
    const localStartupTicks = Number(local.domainStartupTicks || 0);
    const remoteStartupTicks = Number(remote.domainStartupTicks || 0);
    const activeDomainOwner = Math.max(localDomainTicks, remoteDomainTicks) > 0
      ? (localDomainTicks >= remoteDomainTicks ? local : remote)
      : null;
    const startupDomainOwner = Math.max(localStartupTicks, remoteStartupTicks) > 0
      ? (localStartupTicks >= remoteStartupTicks ? local : remote)
      : null;
    const domainOwner = activeDomainOwner || startupDomainOwner;
    game.domain = Math.max(localDomainTicks, remoteDomainTicks) / 60;
    game.domainStartup = Math.max(localStartupTicks, remoteStartupTicks) / 60;
    if (game.domainStartup > 0) {
      game.domainIntro = game.domainStartup;
      game.cinematic = game.domainStartup;
    } else if (game.domain > 0 && game.domainIntro > 0) {
      game.domainIntro = 0;
      game.cinematic = 0;
    }
    if (domainOwner) {
      game.domainCharacter = domainOwner.character;
      game.domainOwnerSlot = Number(domainOwner.slot || 0);
    } else {
      game.domainOwnerSlot = 0;
    }
    if (game.domain > 0) {
      game.windPaused = true;
      if (domainOwner.character === "hakari") {
        if (!game.hakariDomain) {
          game.hakariDomain = {
            timer: game.domain, rollIndex: 0, slots: [1, 3, 7], displaySlots: [1, 3, 7],
            rollInputs: [], lastRarity: "", nearBonus: 0, damageTaken: 0, result: "waiting", flash: 0,
          };
        }
        game.hakariDomain.timer = game.domain;
        game.hakariDomain.rollInputs = Array.isArray(domainOwner.hakariRollInputs) ? domainOwner.hakariRollInputs : [];
        game.hakariDomain.lastRarity = domainOwner.hakariLastRarity || "";
        game.hakariDomain.nearBonus = Number(domainOwner.hakariNearBonus || 0) / 100;
      } else {
        game.hakariDomain = null;
      }
    } else {
      game.hakariDomain = null;
      if (game.domainStartup <= 0) game.windPaused = game.domainIntro > 0;
    }

    game.projectiles = game.projectiles.filter((projectile) => !projectile.serverOwned);
    for (const projectile of snapshot.projectiles || []) {
      if (projectile.owner === game.online.slot) continue;
      game.projectiles.push({
        ...projectile,
        owner: "enemy",
        type: projectile.kind,
        w: projectile.radius * 2,
        h: projectile.radius * 2,
        visualOnly: true,
        serverOwned: true,
      });
    }

    if (snapshot.clash && !game.clash) beginClash(snapshot.clash.type === "domain" ? "DOMAIN COLLISION" : "CURSED TECHNIQUE COLLISION", snapshot.clash.type === "domain", "power", true);
    if (snapshot.clash && game.clash) {
      game.clash.power = game.online.slot === 1 ? snapshot.clash.power : 100 - snapshot.clash.power;
      game.clash.timer = snapshot.clash.ticks / 60;
    } else if (!snapshot.clash && game.clash) {
      game.clash = null;
      ui.clash.classList.add("hidden");
    }
    for (const event of snapshot.events || []) displayAuthoritativeEvent(event);
  }

  function updateNetworkStatus(status = {}) {
    if (!ui.networkWarning) return;
    const reconnecting = Boolean(status.reconnecting);
    const bad = Boolean(status.bad);
    game.online.interpolationTicks = bad || reconnecting ? 10 : 6;
    ui.networkWarning.classList.toggle("hidden", !bad && !reconnecting);
    ui.networkWarning.textContent = reconnecting
      ? `! RECONNECTING ${Math.max(0, Number(status.seconds || 0)).toFixed(1)}s`
      : `! HIGH LATENCY ${Math.round(Number(status.ping || 0))}ms`;
  }

  function onlineSnapshot() {
    if (!game.online.active || !game.player || game.state !== "playing") return null;
    const p = game.player;
    const attack = p.attack ? {
      name: p.attack.name,
      type: p.attack.type,
      elapsed: p.attack.elapsed,
      duration: p.attack.duration,
      start: p.attack.start,
      end: p.attack.end,
      active: p.attack.active,
      chain: p.attack.chain,
      chainStep: p.attack.chainStep,
      aerial: p.attack.aerial,
      slash: p.attack.slash,
    } : null;
    return {
      character: p.character,
      x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      facing: p.facing, grounded: p.grounded,
      state: p.state, blocking: p.blocking,
      charging: p.charging,
      health: Math.max(0, p.health), energy: p.energy,
      awakening: p.awakening, burnout: p.burnout,
      heat: p.heat, jackpot: p.jackpot,
      comboStep: p.comboStep, airComboStep: p.airComboStep,
      attack,
    };
  }

  function receiveOnlineHit(hit) {
    const p = game.player;
    if (!game.online.active || !p || p.invuln > 0 || game.state !== "playing") return;
    const now = performance.now();
    if (p.charging) stopEnergyCharge(true);
    if (p.blocking && p.grounded) {
      const perfect = now - p.guardStart <= 105;
      if (perfect) {
        p.invuln = .42;
        p.parryStreak++;
        p.parryTimer = 3;
        p.energy = Math.min(100, p.energy + 12);
        if (p.character === "hakari") {
          p.energy = Math.min(100, p.energy + 8);
          p.heat = Math.min(100, p.heat + 18);
          p.parryHot = Math.min(4, p.parryHot + .8);
          p.nextM1Fast = true;
        }
        game.parries++;
        game.online.stats.parries++;
        game.slow = .55;
        game.hitstop = .13;
        game.shake = 10;
        game.flash = .12;
        announce(p.parryStreak > 1 ? `PARRY CHAIN x${p.parryStreak}` : "PERFECT PARRY");
        spawnShockwave(p.x + p.facing * 20, p.y - 63, "#dfffff");
        spawnParticles(p.x + p.facing * 25, p.y - 63, "#dfffff", 28, 470, 7, .65);
        sendOnline("event", { kind: "parry", streak: p.parryStreak });
        if (p.character === "sukuna") ruthlessCounter(game.enemy);
        return;
      }
      p.health -= Number(hit.damage || 0) * .25;
      p.energy = Math.max(0, p.energy - (hit.strong ? 7 : 3));
      p.vx = Number(hit.sourceFacing || 1) * Number(hit.kbX || 100) * .18;
      game.hitstop = .035;
      return;
    }

    if (p.character === "hakari" && p.rewindWindow > 0) {
      p.rewindWindow = 0;
      p.x = p.rewindX;
      p.y = p.rewindY;
      p.health = Math.max(p.health, p.rewindHealth - Number(hit.damage || 0) * .2);
      p.stun = .08;
      p.invuln = .24;
      p.heat = Math.min(100, p.heat + 12);
      game.glitch = .18;
      announce("DAMAGE REWOUND");
      return;
    }

    const incomingDamage = Number(hit.damage || 0);
    p.health -= incomingDamage;
    if (p.character === "hakari" && p.health > 0) {
      p.heat = Math.min(100, p.heat + incomingDamage * .55);
      if (game.hakariDomain) {
        game.hakariDomain.damageTaken += incomingDamage;
        if (game.hakariDomain.damageTaken >= 38) shatterHakariDomain();
      }
    }
    p.vx = Number(hit.sourceFacing || 1) * Number(hit.kbX || 130);
    if (hit.kbY) {
      p.vy = hit.downslam ? Math.abs(hit.kbY) : -Math.abs(hit.kbY);
      p.grounded = false;
    }
    p.stun = Math.max(p.stun, Number(hit.stun || .25));
    p.flash = .12;
    p.attack = null;
    p.state = "hit";
    p.damageRegen = 4;
    p.parryStreak = 0;
    p.parryTimer = 0;
    game.hitstop = hit.strong ? .095 : .045;
    game.shake = hit.strong ? 12 : 5;
    spawnParticles(p.x, p.y - p.h * .6, hit.blackFlash ? "#ff173e" : "#ff5f87", hit.strong ? 26 : 13, hit.strong ? 470 : 310, 7, .6);
    if (hit.blackFlash) {
      game.blackFlash = .5;
      game.slow = .62;
      announce("BLACK FLASH");
      spawnBlackFlash(p.x, p.y - p.h * .58);
    }
  }

  function receiveOnlineEvent(event) {
    if (!game.online.active || !event) return;
    if (event.kind === "projectile" && event.projectile) {
      game.projectiles.push({
        ...event.projectile,
        owner: "enemy",
        visualOnly: true,
        damage: Number(event.projectile.damage || 0),
        strong: Boolean(event.projectile.strong || event.projectile.type === "purple"),
      });
    } else if (event.kind === "projectileReflect" && event.projectile) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      game.projectiles.forEach((projectile, index) => {
        if (projectile.owner !== "player" || projectile.type !== event.projectile.type) return;
        const distance = Math.hypot(projectile.x - Number(event.x || 0), projectile.y - Number(event.y || 0));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      if (nearestIndex >= 0) game.projectiles.splice(nearestIndex, 1);
      game.projectiles.push({
        ...event.projectile,
        owner: "enemy",
        visualOnly: true,
        reflected: true,
      });
      game.slow = .25;
      game.shake = 8;
      announce("PROJECTILE REFLECTED");
    } else if (event.kind === "parry") {
      game.player.stun = Math.max(game.player.stun, .85 + Math.min(3, event.streak || 1) * .1);
      game.player.attack = null;
      game.slow = .35;
      game.shake = 9;
      announce("ATTACK PARRIED");
    } else if (event.kind === "domain") {
      game.online.remoteDomainWindow = 1.6;
      game.domainCharacter = event.character || game.online.remoteCharacter || "gojo";
      if (game.online.localDomainWindow > 0) {
        game.domainClashPending = true;
        beginClash("DOMAIN COLLISION", true);
        return;
      }
      game.domainIntro = 2.35;
      game.cinematic = 2.35;
      game.glitch = 1.15;
      game.windPaused = true;
      game.cameraTarget = 1.22;
      announce("DOMAIN EXPANSION");
    } else if (event.kind === "purpleFusion") {
      if (event.consumedEnemyRed) {
        let nearestRed = -1;
        let nearestDistance = Infinity;
        game.projectiles.forEach((projectile, index) => {
          if (projectile.owner !== "player" || projectile.type !== "red") return;
          const distance = Math.hypot(projectile.x - Number(event.x || 0), projectile.y - Number(event.y || 0));
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestRed = index;
          }
        });
        if (nearestRed >= 0) game.projectiles.splice(nearestRed, 1);
      }
      game.shake = 6;
      game.glitch = .18;
      spawnParticles(event.x, event.y, "#814dff", 45, 390, 9, 1);
      announce("UNSTABLE HOLLOW PURPLE");
    } else if (event.kind === "purpleCollapse") {
      game.purpleExplosion = .85;
      game.glitch = .65;
      game.flash = .45;
      game.shake = 28;
      spawnParticles(event.x, event.y, "#a15cff", 70, 760, 12, 1.2);
    } else if (event.kind === "jackpot") {
      game.enemy.jackpot = Number(event.duration || 38);
      game.enemy.awakening = game.enemy.jackpot;
      game.jackpotFlash = 1.1;
      game.flash = .3;
      game.shake = 15;
      spawnParticles(game.enemy.x, game.enemy.y - 60, "#5cff91", 70, 620, 9, 1);
      announce("OPPONENT HIT JACKPOT");
    }
  }

  function receiveOnline(channel, payload) {
    if (channel === "state") game.online.remoteTarget = payload;
    else if (channel === "hit") receiveOnlineHit(payload);
    else if (channel === "event") receiveOnlineEvent(payload);
    else if (channel === "clash" && payload?.kind === "start") {
      beginClash(payload.type || "CURSED TECHNIQUE COLLISION", Boolean(payload.domain), payload.clashKind || "power", true);
    } else if (channel === "clash" && payload?.kind === "input" && game.clash) {
      game.clash.power = clamp(game.clash.power - 4.6, 0, 100);
    }
  }

  function returnOnlineLobby() {
    game.state = "menu";
    game.online.resultReported = false;
    ui.hud.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.clash.classList.add("hidden");
    ui.menu.classList.add("hidden");
  }

  function leaveOnlineGame() {
    game.online.active = false;
    game.online.slot = 0;
    game.online.remoteTarget = null;
    selectedMode = "story";
    onlineSelection = false;
    ui.characterSelect.classList.add("hidden");
    quitToMenu();
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["a", "d", "w", "s", "c", "q", "e", "r", "t", "f", "shift", "escape", "enter", " "].includes(key)) {
      event.preventDefault();
    }
    const firstPress = !keys.has(key);
    if (firstPress) pressed.add(key);
    keys.add(key);
    if (game.clash) {
      clashInput(key);
      return;
    }
    if (game.state === "menu" && key === "enter" && !ui.menu.classList.contains("hidden")) startOfflineSelection();
    if (key === "escape" && (game.state === "playing" || game.state === "paused")) pauseGame();
    if (game.state !== "playing") return;
    if (key === "w") {
      if (firstPress) queueOnlineEdge("jump");
      jump();
    }
    if (key === "shift") {
      if (firstPress) queueOnlineEdge("dash");
      shortDash();
    }
    if (key === "e") {
      if (firstPress) queueOnlineEdge("special", "red");
      useAbility("red");
    }
    if (key === "r") {
      if (firstPress) queueOnlineEdge("special", "blue");
      useAbility("blue");
    }
    if (key === "q") {
      if (firstPress) queueOnlineEdge("special", "purple");
      useAbility("purple");
    }
    if (key === "t") {
      if (firstPress) queueOnlineEdge("domain");
      useAbility("domain");
    }
    if (key === "f") {
      if (firstPress) queueOnlineEdge("awaken");
      awaken();
    }
    if (key === "s" && game.player) game.player.guardStart = performance.now();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
    if (event.key.toLowerCase() === "s" && game.player) game.player.blocking = false;
  });

  canvas.addEventListener("mousedown", (event) => {
    if (game.state !== "playing" || game.clash) return;
    event.preventDefault();
    if (event.button === 0) {
      queueOnlineEdge("light");
      playerAttack("light");
    }
    if (event.button === 2) {
      queueOnlineEdge("heavy");
      playerAttack("heavy");
    }
  });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  $$(".mode").forEach((button) => button.addEventListener("click", () => {
    $$(".mode").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    selectedMode = button.dataset.mode;
    tone(250, .04, "square", .1, 80);
  }));

  $$(".difficulty button").forEach((button) => button.addEventListener("click", () => {
    $$(".difficulty button").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    difficulty = button.dataset.diff;
  }));

  $$(".costumes button").forEach((button) => button.addEventListener("click", () => {
    if (button.classList.contains("locked")) {
      tone(70, .06, "square", .12, -20);
      return;
    }
    $$(".costumes button").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    selectedCostume = button.dataset.costume;
    tone(280, .05, "square", .1, 110);
  }));

  function selectStage(stageId) {
    if (!stages[stageId]) return;
    selectedStage = stageId;
    bg.src = stages[selectedStage].src;
    ui.menu.style.setProperty("--stage-bg", `url("${stages[selectedStage].src}")`);
    $$(".stage").forEach((button) => button.classList.toggle("active", button.dataset.stage === selectedStage));
    tone(210, .05, "square", .1, 110);
  }

  $$(".stage").forEach((button) => button.addEventListener("click", () => selectStage(button.dataset.stage)));

  $$(".character-card").forEach((card) => card.addEventListener("click", () => {
    if (selectionLocked) return;
    selectedCharacter = card.dataset.character;
    renderCharacterSelection();
    if (onlineSelection) {
      window.dispatchEvent(new CustomEvent("voidlimit:characterPreview", { detail: { character: selectedCharacter } }));
    }
  }));
  ui.confirmCharacter.addEventListener("click", confirmCharacterSelection);
  ui.characterBack.addEventListener("click", () => {
    if (onlineSelection) {
      window.dispatchEvent(new CustomEvent("voidlimit:leaveOnline"));
      ui.characterSelect.classList.add("hidden");
      return;
    }
    ui.characterSelect.classList.add("hidden");
    game.state = "menu";
    ui.hud.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.menu.classList.remove("hidden");
    pendingOfflineSelection = false;
  });

  $("#start").addEventListener("click", startOfflineSelection);
  $("#resume").addEventListener("click", pauseGame);
  $("#restart").addEventListener("click", () => {
    ui.pause.classList.add("hidden");
    startOfflineSelection();
  });
  $("#quit").addEventListener("click", quitToMenu);
  $("#again").addEventListener("click", () => {
    if (game.online.active) window.dispatchEvent(new CustomEvent("voidlimit:rematch"));
    else startOfflineSelection();
  });
  $("#resultQuit").addEventListener("click", () => {
    if (game.online.active) window.dispatchEvent(new CustomEvent("voidlimit:returnLobby"));
    else quitToMenu();
  });
  $("#leaveOnlineResult").addEventListener("click", () => window.dispatchEvent(new CustomEvent("voidlimit:leaveOnline")));

  window.addEventListener("blur", () => {
    keys.clear();
    if (game.state === "playing" && !game.online.active) pauseGame();
  });

  window.VoidLimitOnline = {
    start: startOnlineMatch,
    select: openCharacterSelect,
    selectionState: updateOnlineSelection,
    hideSelection() {
      ui.characterSelect.classList.add("hidden");
      onlineSelection = false;
    },
    versus: configureVersus,
    snapshot: onlineSnapshot,
    input: captureOnlineInput,
    authoritative: applyAuthoritativeSnapshot,
    network: updateNetworkStatus,
    receive: receiveOnline,
    finish: finishOnlineMatch,
    stats: getOnlineStats,
    opponentStats(stats) {
      game.online.opponentStats = stats;
      if (game.mode === "online" && game.state === "result" && stats) {
        ui.resultSub.textContent = `${getOnlineStats().timeSurvived} seconds survived | Opponent dealt ${Number(stats.damage || 0).toFixed(0)} damage`;
      }
    },
    returnToLobby: returnOnlineLobby,
    leave: leaveOnlineGame,
  };

  if (new URLSearchParams(location.search).has("debug")) {
    window.__voidLimitDebug = {
      start: startGame,
      selectCharacter(character) {
        if (characters[character]) selectedCharacter = character;
      },
      openSelect: startOfflineSelection,
      step: update,
      draw,
      attack: playerAttack,
      dash: shortDash,
      jump,
      ability: useAbility,
      applyHit,
      startHakariDomain,
      resolveHakariRoll,
      startJackpot,
      beginClash,
      resolveClash,
      keys,
      pressed,
      game,
      selectStage,
      snapshot: () => game.player && game.enemy ? {
        state: game.state,
        mode: game.mode,
        player: {
          x: game.player.x,
          y: game.player.y,
          health: game.player.health,
          energy: game.player.energy,
          character: game.player.character,
          heat: game.player.heat,
          jackpot: game.player.jackpot,
          comboStep: game.player.comboStep,
          comboHits: game.player.comboHits,
          attack: game.player.attack?.name || null,
          blackFlashWindow: game.player.blackFlashWindow,
        },
        enemy: {
          x: game.enemy.x,
          y: game.enemy.y,
          health: game.enemy.health,
          reaction: game.enemy.reaction,
          wallSplat: game.enemy.wallSplat,
        },
        clash: game.clash?.kind || null,
        stage: selectedStage,
        cameraZoom: game.cameraZoom,
      } : { state: game.state },
    };
  }

  setTimeout(() => $("#boot").classList.add("done"), 1150);
  refreshCostumes();
  selectStage(selectedStage);
  requestAnimationFrame(frame);
})();
