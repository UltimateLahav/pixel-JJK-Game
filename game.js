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
    announcement: $("#announcement"),
    training: $("#trainingData"),
    resultTitle: $("#resultTitle"),
    resultSub: $("#resultSub"),
    resultAccount: $("#resultAccount"),
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
    onlineMenu: $("#onlineMenu"),
    onlineLobby: $("#onlineLobby"),
    onlineHome: $("#onlineHome"),
    accountPanel: $("#accountPanel"),
    accountButton: $("#accountButton"),
    accountButtonMode: $("#accountButtonMode"),
    accountBack: $("#accountBack"),
    guestModeButton: $("#guestModeButton"),
    googleFallbackButton: $("#googleFallbackButton"),
    googleSignUpButton: $("#googleSignUpButton"),
    googleButtonMount: $("#googleButtonMount"),
    googleSignUpMount: $("#googleSignUpMount"),
    serverLoginLink: $("#serverLoginLink"),
    googleOriginHelp: $("#googleOriginHelp"),
    accountAvatar: $("#accountAvatar"),
    accountName: $("#accountName"),
    accountEmail: $("#accountEmail"),
    accountStatus: $("#accountStatus"),
    accountMode: $("#accountMode"),
    accountStats: $("#accountStats"),
    accountSignOut: $("#accountSignOut"),
    menuAccount: $("#menuAccount"),
    menuAccountAvatar: $("#menuAccountAvatar"),
    menuAccountName: $("#menuAccountName"),
    menuAccountMode: $("#menuAccountMode"),
    settingsPanel: $("#settingsPanel"),
    settingsButton: $("#settingsButton"),
    settingsBack: $("#settingsBack"),
    musicVolume: $("#musicVolume"),
    musicVolumeValue: $("#musicVolumeValue"),
    resetSettings: $("#resetSettings"),
  };

  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 596;
  const GRAVITY = 2150;
  const MAX_PARTICLES = 220;
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
  let selectedDomainEnemy = "sukuna";
  let selectedDomainPlayer = "gojo";
  let offlineSelectionStep = "player";
  let pendingOfflineSelection = false;
  let onlineSelection = false;
  const GUEST_PROGRESS_KEY = "guestProgress";
  const GAME_SETTINGS_KEY = "voidLimitSettings";
  const SERVER_ACCOUNTS_AVAILABLE = location.protocol !== "file:";
  const HAKARI_JACKPOT_DURATION = 33.2;
  const HAKARI_JACKPOT_TRACK = "assets/hakari-jackpot.mp3";
  const DEFAULT_MUSIC_VOLUME = 0.58;
  let selectionLocked = false;
  let onlineLockRequest = null;
  let gameSettings = null;
  let googleClientId = "";
  let googleScriptPromise = null;
  let audioCtx = null;
  let master = null;
  let hakariJackpotMusic = null;
  let hakariJackpotMusicPlaying = false;
  let lastTime = performance.now();
  let onlineAccumulator = 0;

  const game = {
    state: "menu",
    player: null,
    enemy: null,
    enemies: [],
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
    domainPrevious: 0,
    domainUseTimer: 5,
    hakariDomain: null,
    trial: null,
    trialHover: -1,
    trialDebugPhase: "",
    trialOptionWarning: "",
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
      latestInputFrame: -1,
      lastAckFrame: -1,
      interpolationTicks: 6,
      snapshotBuffer: [],
      predictionHistory: new Map(),
      correctionX: 0,
      correctionY: 0,
      inputEdges: {
        jump: false, dash: false, light: false, heavy: false,
        special: "", specialRelease: "", fuga: false, domain: false, awaken: false, clash: 0, trialChoice: -1,
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
      costs: { blue: 18, red: 26, purple: 82, domain: 0 },
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
      costs: { blue: 22, red: 16, purple: 95, domain: 0 },
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
        ["T", "IDLE DEATH GAMBLE"],
      ],
      labels: { red: "ROUGH PUNCH", blue: "SHUTTER", purple: "RESERVE BALLS", domain: "GAMBLE" },
      costs: { blue: 20, red: 16, purple: 14, domain: 100 },
      cooldowns: { blue: 5.5, red: 3.8, purple: 4.2, domain: 25 },
    },
    higuruma: {
      id: "higuruma",
      name: "HIROMI HIGURUMA",
      title: "DEADLY LAWYER",
      difficulty: "MEDIUM/HARD",
      description: "A calm lawyer sorcerer who fights with a cursed gavel that changes shape, letting him hit from different ranges and punish enemies with smart timing.",
      abilities: [
        ["E", "SHAPESHIFTING GAVEL"],
        ["R", "GAVEL HOOK"],
        ["Q", "GIANT GAVEL SENTENCE"],
        ["T", "DEADLY SENTENCING"],
      ],
      labels: { red: "GAVEL", blue: "HOOK", purple: "SENTENCE", domain: "TRIAL" },
      costs: { red: 18, blue: 22, purple: 55, domain: 100 },
      cooldowns: { red: 4.5, blue: 6, purple: 12, domain: 28 },
    },
  };

  const enemyTypes = [
    { name: "DREAD WRAITH", rank: "GRADE 1", color: "#ae3867", accent: "#ff6b9a", hp: 115, speed: 155, power: 1 },
    { name: "RIFT STALKER", rank: "SPECIAL GRADE", color: "#5a36a5", accent: "#b07cff", hp: 145, speed: 185, power: 1.16 },
    { name: "ABYSS SOVEREIGN", rank: "DOMAIN USER", color: "#8e2445", accent: "#ff455f", hp: 190, speed: 170, power: 1.34, boss: true },
  ];

  const survivalCurseTypes = [
    { name: "LOW CURSE", rank: "GRADE 2", color: "#6f4d90", accent: "#b493ff", hp: 82, speed: 138, power: .82, aiLevel: .85, barrageChance: .24 },
    { name: "FIERCE CURSE", rank: "GRADE 1", color: "#ae3867", accent: "#ff6b9a", hp: 112, speed: 168, power: 1.06, aiLevel: 1.14, barrageChance: .46 },
  ];

  const trialCrimes = {
    gojo: [
      "Property destruction during sorcerer battles.",
      "Endangering civilians by allowing dangerous fights to continue.",
      "Ignoring jujutsu authority orders and acting outside the law.",
    ],
    sukuna: [
      "Mass murder in Shibuya.",
      "Possessing another person's body.",
      "Killing and mutilating sorcerers and civilians.",
    ],
    hakari: [
      "Running an illegal underground fight club.",
      "Assaulting a jujutsu higher-up.",
      "Illegal gambling and cursed energy betting.",
    ],
    higuruma: [
      "Killing people after awakening as a sorcerer.",
      "Abusing the courtroom system for personal judgment.",
      "Joining the Culling Game and collecting points through violence.",
    ],
  };

  const trialDialoguePool = [
    { id: "admit", text: "I admit it.", risk: "HONEST", icon: "paper", hint: "Strong for smaller charges. Bad if the crime is severe." },
    { id: "selfDefense", text: "That was self-defense.", risk: "SAFE", icon: "shield", hint: "Good for battle claims. Bad for civilians or possession." },
    { id: "noChoice", text: "I had no choice.", risk: "SAFE", icon: "paper", hint: "Useful when survival or force is believable." },
    { id: "noProof", text: "You have no proof.", risk: "DENIAL", icon: "mask", hint: "Strong against weak evidence. Dangerous against strong evidence." },
    { id: "systemBlame", text: "The jujutsu world made me do it.", risk: "RISKY", icon: "paper", hint: "Better for people hurt by jujutsu society." },
    { id: "protecting", text: "I was protecting someone.", risk: "SAFE", icon: "shield", hint: "Good for heroic motives. Weak for cruel characters." },
    { id: "rejectCourt", text: "I do not recognize this court.", risk: "AGGRESSIVE", icon: "warning", hint: "Disrespectful. Only intimidation can make it work." },
    { id: "necessary", text: "The damage was necessary.", risk: "RISKY", icon: "warning", hint: "Good for battlefield damage. Bad for murder charges." },
    { id: "regret", text: "I regret what happened.", risk: "HONEST", icon: "tear", hint: "Good for guilty characters. Bad for arrogant ones." },
    { id: "silent", text: "I will say nothing.", risk: "SAFE", icon: "mask", hint: "Low risk, but it gives almost no defense." },
  ];

  const trialArgumentPool = [
    { id: "contradict", text: "Contradict the testimony.", risk: "SHARP", icon: "mask", hint: "Targets lies, denial, and silence." },
    { id: "evidence", text: "Use Judgeman's evidence.", risk: "SAFE", icon: "paper", hint: "Best when evidence is strong." },
    { id: "motive", text: "Attack their motive.", risk: "RISKY", icon: "warning", hint: "Targets selfish or weak excuses." },
    { id: "violence", text: "Expose their violence.", risk: "AGGRESSIVE", icon: "warning", hint: "Stronger for severe violent crimes." },
    { id: "falseDefense", text: "Argue self-defense is false.", risk: "SHARP", icon: "shield", hint: "Targets self-defense claims." },
    { id: "unnecessary", text: "Argue the damage was unnecessary.", risk: "SHARP", icon: "paper", hint: "Targets damage and destruction charges." },
    { id: "past", text: "Use their past actions against them.", risk: "RISKY", icon: "mask", hint: "Stronger against repeat violent offenders." },
    { id: "confiscation", text: "Push for Confiscation.", risk: "SAFE", icon: "chain", hint: "Aims for a practical punishment." },
    { id: "deathPenalty", text: "Push for Death Penalty.", risk: "AGGRESSIVE", icon: "sword", hint: "Only strong when the case is severe." },
    { id: "mercy", text: "Show mercy and ask for a lighter verdict.", risk: "SAFE", icon: "tear", hint: "Lowers punishment, but can win narrow cases." },
  ];

  function trialTargetCharacter(entity) {
    return trialCrimes[entity?.character] ? entity.character : "sukuna";
  }

  function isSevereTrialCrime(crime = "") {
    return /murder|mass murder|possess|killing|mutilating|civilians/i.test(crime);
  }

  function randomTrialOptions(pool, count = 3) {
    const copy = pool.slice();
    const picked = [];
    while (picked.length < count && copy.length) {
      picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return picked;
  }

  function chooseTrialCrime(character) {
    const crimes = trialCrimes[character] || trialCrimes.sukuna;
    return crimes[Math.floor(Math.random() * crimes.length)];
  }

  function trialChargeLine(character, crime) {
    if (/mass murder|murder|killing|mutilating/i.test(crime)) return "THE COURT PRESENTS A BLOOD-STAINED CHARGE.";
    if (/property|damage|destruction/i.test(crime)) return "THE COURT PRESENTS THE DAMAGE REPORT.";
    if (/gambling|fight club|betting/i.test(crime)) return "THE COURT PRESENTS ILLEGAL WAGERS.";
    if (/possess/i.test(crime)) return "THE COURT PRESENTS A BODY WITHOUT CONSENT.";
    if (character === "higuruma") return "THE COURT KNOWS ITS OWN REFLECTION.";
    return "THE COURT PRESENTS THE CHARGE.";
  }

  function trialCharacterLine(character, phase) {
    const lines = {
      gojo: {
        testimony: "You sure this court can hold me?",
        verdict: "This got serious.",
      },
      sukuna: {
        testimony: "Judge me? Know your place.",
        verdict: "Try handing down that sentence.",
      },
      hakari: {
        testimony: "Sounds like bad luck for me.",
        verdict: "Guess the house is watching.",
      },
      higuruma: {
        testimony: "I know exactly what this place means.",
        verdict: "The law cuts both ways.",
      },
    };
    return lines[character]?.[phase] || "The accused takes the stand.";
  }

  function trialVerdictLabel(verdict = "") {
    if (verdict.includes("CONFISCATION")) return "GUILTY: CONFISCATION";
    if (verdict.includes("DEATH")) return "GUILTY: DEATH PENALTY";
    return verdict || "MISTRIAL";
  }

  function calculateTrialScore({ targetCharacter, crime, evidence, dialogue, argument, prosecutorBonus = 0, defenseBonus = 0 }) {
    const severe = isSevereTrialCrime(crime);
    const property = /property|damage|destruction|orders|gambling|fight club|higher-up|courtroom/i.test(crime);
    let defense = 36;
    let prosecutor = Number(evidence || 50);
    let severity = severe ? 12 : 0;
    const answer = dialogue?.id || "silent";
    const arg = argument?.id || "evidence";

    if (answer === "admit") defense += severe ? -20 : 20;
    if (answer === "selfDefense") defense += property ? 25 : -30;
    if (answer === "noChoice") defense += /possess|survival|forced/i.test(crime) ? 20 : 5;
    if (answer === "noProof") defense += evidence < 45 ? 20 : evidence > 60 ? -25 : -5;
    if (answer === "systemBlame") defense += ["gojo", "hakari", "higuruma"].includes(targetCharacter) ? 20 : -15;
    if (answer === "protecting") defense += ["gojo", "hakari"].includes(targetCharacter) ? 25 : targetCharacter === "sukuna" ? -25 : 5;
    if (answer === "rejectCourt") {
      defense += targetCharacter === "sukuna" ? 10 : -20;
      if (targetCharacter !== "sukuna") severity += 10;
    }
    if (answer === "necessary") defense += property ? 18 : -20;
    if (answer === "regret") {
      defense += targetCharacter === "higuruma" ? 25 : ["gojo", "hakari"].includes(targetCharacter) ? 10 : -10;
      severity -= targetCharacter === "sukuna" ? 0 : 10;
    }
    if (answer === "silent") {
      defense += 4;
      prosecutor -= 5;
    }

    if (arg === "evidence") prosecutor += 18;
    if (arg === "contradict") prosecutor += ["noProof", "rejectCourt", "silent"].includes(answer) ? 22 : 10;
    if (arg === "motive") prosecutor += ["systemBlame", "noChoice", "protecting"].includes(answer) ? 18 : 11;
    if (arg === "violence") prosecutor += severe ? 24 : 12;
    if (arg === "falseDefense") prosecutor += answer === "selfDefense" ? 26 : 8;
    if (arg === "unnecessary") prosecutor += /property|damage|destruction/i.test(crime) || answer === "necessary" ? 24 : 8;
    if (arg === "past") prosecutor += targetCharacter === "sukuna" ? 24 : 14;
    if (arg === "confiscation") prosecutor += 12;
    if (arg === "deathPenalty") {
      prosecutor += severe ? 22 : 6;
      severity += severe ? 12 : 0;
    }
    if (arg === "mercy") prosecutor -= 14;

    if (targetCharacter === "sukuna") prosecutor += severe ? 12 : 6;
    if (targetCharacter === "gojo" && /orders|property|civilians/i.test(crime)) prosecutor += 6;
    if (targetCharacter === "hakari" && /gambling|fight club/i.test(crime)) prosecutor += 8;
    if (targetCharacter === "higuruma" && /killing|judgment|Culling/i.test(crime)) prosecutor += 10;

    prosecutor += Number(prosecutorBonus || 0);
    defense += Number(defenseBonus || 0);
    const delta = Math.round(prosecutor + severity - defense);
    let verdict = "MISTRIAL";
    let punishment = "none";
    if (defense - prosecutor >= 25) {
      verdict = "NOT GUILTY";
      punishment = "notGuilty";
    } else if (Math.abs(delta) <= 7) {
      verdict = "MISTRIAL";
      punishment = "mistrial";
    } else if (delta < 15) {
      verdict = "GUILTY - FINE";
      punishment = "fine";
    } else if (delta >= (severe ? 30 : 40)) {
      verdict = "GUILTY - DEATH PENALTY";
      punishment = "deathPenalty";
    } else {
      verdict = "GUILTY - CONFISCATION";
      punishment = "confiscation";
    }
    return {
      evidence: Math.round(evidence),
      defense: Math.round(defense),
      prosecutor: Math.round(prosecutor),
      delta,
      severe,
      verdict,
      punishment,
    };
  }
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
  const higurumaGroundChain = [
    { name: "Opening Statement", duration: .21, start: .045, end: .105, cancel: .12, range: 50, h: 42, y: -70, damage: 4.6, kbX: 62, reaction: "body", color: "#f3df9f" },
    { name: "Gavel Jab", duration: .24, start: .055, end: .13, cancel: .145, range: 61, h: 46, y: -66, damage: 5.6, kbX: 78, reaction: "body", color: "#c9933e", gavel: true, dashCancel: true },
    { name: "Cross Examination", duration: .28, start: .07, end: .16, cancel: .18, range: 73, h: 51, y: -76, damage: 6.8, kbX: 96, reaction: "head", color: "#d8aa48", gavel: true, dashCancel: true, flashEligible: true },
    { name: "Gavel Uppercut", duration: .32, start: .085, end: .19, cancel: .215, range: 68, h: 62, y: -82, damage: 7.8, kbX: 92, kbY: 260, reaction: "launcher", color: "#f1c96a", gavel: true },
    { name: "Verdict Slam", duration: .48, start: .16, end: .3, cancel: .32, range: 86, h: 78, y: -68, damage: 13.5, kbX: 405, kbY: 110, reaction: "body", color: "#f2cf74", strong: true, flashEligible: true, finisher: true, gavel: true },
  ];
  const higurumaAirChain = [
    { name: "Aerial Brief", duration: .24, start: .05, end: .13, cancel: .145, range: 55, h: 46, y: -70, damage: 5.4, kbX: 70, kbY: 42, reaction: "air", color: "#f3df9f" },
    { name: "Hooking Argument", duration: .29, start: .07, end: .17, cancel: .19, range: 68, h: 54, y: -72, damage: 7, kbX: 95, kbY: 72, reaction: "air", color: "#d8aa48", gavel: true },
    { name: "Adjourned Drop", duration: .43, start: .13, end: .27, cancel: .29, range: 72, h: 70, y: -50, damage: 11.8, kbX: 90, kbY: -620, reaction: "slam", color: "#f2cf74", downslam: true, strong: true, finisher: true, gavel: true },
  ];

  function characterProfile(entity = game.player) {
    return characters[entity?.character || selectedCharacter] || characters.gojo;
  }

  function characterChains(entity = game.player) {
    if (entity?.character === "sukuna") return { ground: sukunaGroundChain, air: sukunaAirChain };
    if (entity?.character === "hakari") return { ground: entity.jackpot > 0 ? hakariJackpotGroundChain : hakariGroundChain, air: hakariAirChain };
    if (entity?.character === "higuruma") return { ground: higurumaGroundChain, air: higurumaAirChain };
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

  function loadGameSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(GAME_SETTINGS_KEY) || "{}");
      return { musicVolume: clamp(Number(saved.musicVolume ?? DEFAULT_MUSIC_VOLUME), 0, 1) };
    } catch {
      return { musicVolume: DEFAULT_MUSIC_VOLUME };
    }
  }

  function saveGameSettings() {
    try { localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(gameSettings || loadGameSettings())); } catch {}
  }

  function currentMusicVolume() {
    return clamp(Number(gameSettings?.musicVolume ?? DEFAULT_MUSIC_VOLUME), 0, 1);
  }

  function updateSettingsUi() {
    const percent = Math.round(currentMusicVolume() * 100);
    if (ui.musicVolume) ui.musicVolume.value = String(percent);
    if (ui.musicVolumeValue) ui.musicVolumeValue.textContent = `${percent}%`;
  }

  function applyMusicVolume() {
    if (hakariJackpotMusic) hakariJackpotMusic.volume = currentMusicVolume();
    updateSettingsUi();
  }

  function setMusicVolume(percent) {
    gameSettings = gameSettings || loadGameSettings();
    gameSettings.musicVolume = clamp(Number(percent) / 100, 0, 1);
    saveGameSettings();
    applyMusicVolume();
  }

  function openSettingsPanel() {
    ui.menu.classList.add("hidden");
    ui.onlineMenu?.classList.add("hidden");
    ui.accountPanel?.classList.add("hidden");
    ui.settingsPanel?.classList.remove("hidden");
    updateSettingsUi();
  }

  function closeSettingsPanel() {
    ui.settingsPanel?.classList.add("hidden");
    if (game.state === "menu") ui.menu.classList.remove("hidden");
  }

  function initSettingsSystem() {
    gameSettings = loadGameSettings();
    applyMusicVolume();
  }

  function startHakariJackpotMusic() {
    try {
      if (!hakariJackpotMusic) {
        hakariJackpotMusic = new Audio(HAKARI_JACKPOT_TRACK);
        hakariJackpotMusic.loop = true;
        hakariJackpotMusic.volume = currentMusicVolume();
        hakariJackpotMusic.preload = "auto";
      }
      applyMusicVolume();
      if (hakariJackpotMusicPlaying) return;
      hakariJackpotMusic.currentTime = 0;
      hakariJackpotMusicPlaying = true;
      const playing = hakariJackpotMusic.play();
      if (playing?.catch) playing.catch(() => { hakariJackpotMusicPlaying = false; });
    } catch {
      hakariJackpotMusicPlaying = false;
    }
  }

  function stopHakariJackpotMusic() {
    if (!hakariJackpotMusic) return;
    try {
      hakariJackpotMusic.pause();
      hakariJackpotMusic.currentTime = 0;
    } catch {}
    hakariJackpotMusicPlaying = false;
  }

  function syncHakariJackpotMusic() {
    const localJackpot = game.player?.character === "hakari" && game.player.jackpot > 0;
    const remoteJackpot = game.enemy?.character === "hakari" && game.enemy.jackpot > 0;
    if (game.state === "playing" && (localJackpot || remoteJackpot)) startHakariJackpotMusic();
    else stopHakariJackpotMusic();
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
      regenBoost: 0, damageRegen: 0, dashCooldown: 0, dashTime: 0, recoveryUsed: false,
      fastFalling: false, momentum: 0,
      burnout: 0, burnoutSmoke: 0, burned: false,
      damageDealt: 0, pressure: 0, voiceCooldown: 0,
      heat: 0, jackpot: 0, parryHot: 0,
      nextM1Fast: false,
      rewindWindow: 0, rewindX: 0, rewindY: 0, rewindHealth: 600,
      jackpotFinisher: false,
      domainsUsed: 0,
      dismantleUses: 0, cleaveUses: 0, sukunaDomainUses: 0, worldSlashUnlocked: false,
      worldSlashUses: 0,
      charging: false, chargeRecovery: 0, chargeCooldown: 0, chargePulse: 0,
      techniqueCharge: null, dismantleVolley: null, moveConfiscation: 0, airRoughCrater: false,
      executionSword: 0, executionSwordUsed: false, executionRecovery: 0, trialStartup: 0, trialStartupHealth: 600,
      fuga: 0,
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
      moveConfiscation: 0, executionSword: 0, executionSwordUsed: false, executionRecovery: 0,
      reaction: "idle", wallSplat: 0, emergencyDodges: type.boss ? 3 : 1,
      adaptation: { light: 0, heavy: 0, special: 0, parryBaits: 0 },
      baiting: 0, lastPlayerStrategy: "",
    };
  }

  function isSurvivalMode() {
    return game.mode === "survival" && !game.online.active;
  }

  function survivalEnemyLimit(wave = game.wave) {
    return Math.min(6, 3 + Math.floor(Math.max(0, wave - 1) / 5));
  }

  function activeSurvivalEnemies() {
    if (!isSurvivalMode()) return [];
    return game.enemies.filter((enemy) => enemy && enemy.health > 0);
  }

  function retargetSurvivalEnemy() {
    if (!isSurvivalMode() || !game.player) return game.enemy;
    const living = activeSurvivalEnemies();
    if (!living.length) {
      game.enemy = null;
      return null;
    }
    living.sort((a, b) => Math.abs(a.x - game.player.x) - Math.abs(b.x - game.player.x));
    game.enemy = living[0];
    return game.enemy;
  }

  function makeSurvivalEnemy(slot = 0, total = 3) {
    const diff = difficulty === "easy" ? 0.86 : difficulty === "hard" ? 1.18 : 1;
    const gradeOneChance = clamp(.25 + game.wave * .025, .25, .72);
    const type = survivalCurseTypes[chance(gradeOneChance) ? 1 : 0];
    const waveScale = 1 + Math.max(0, game.wave - 1) * .035;
    const side = slot % 2 === 0 ? -1 : 1;
    const row = Math.floor(slot / 2);
    const x = side < 0 ? 58 + row * 42 : W - 58 - row * 42;
    return {
      kind: "enemy",
      survivalCurse: true,
      aiGrade: type.rank,
      type,
      x, y: GROUND, w: 48, h: 91,
      vx: 0, vy: 0, facing: side < 0 ? 1 : -1,
      health: Math.round(type.hp * diff * waveScale), maxHealth: Math.round(type.hp * diff * waveScale), lagHealth: Math.round(type.hp * diff * waveScale),
      energy: 0,
      grounded: true, state: "idle", stateTime: 0, attack: null,
      stun: 0, invuln: 0, aiTimer: rnd(.18, .5) + slot * .05, decision: "approach",
      power: type.power * diff, flash: 0, domainUsed: false,
      moveConfiscation: 0, executionSword: 0, executionSwordUsed: false, executionRecovery: 0,
      reaction: "idle", wallSplat: 0, emergencyDodges: type.rank === "GRADE 1" ? 1 : 0,
      adaptation: { light: 0, heavy: 0, special: 0, parryBaits: 0 },
      baiting: 0, lastPlayerStrategy: "",
      spawnSlot: slot, waveSpawnTotal: total,
    };
  }

  function spawnSurvivalWave(wave = game.wave) {
    const limit = survivalEnemyLimit(wave);
    game.enemies = Array.from({ length: limit }, (_, index) => makeSurvivalEnemy(index, limit));
    game.enemy = retargetSurvivalEnemy();
  }

  function survivalAttackTargets(entity, fallback) {
    if (entity?.kind === "player" && isSurvivalMode()) return activeSurvivalEnemies();
    return fallback ? [fallback] : [];
  }

  function separateSurvivalEnemies(dt) {
    const living = activeSurvivalEnemies();
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i];
        const b = living[j];
        const gap = b.x - a.x;
        const minGap = 44;
        if (Math.abs(gap) > 0 && Math.abs(gap) < minGap) {
          const push = (minGap - Math.abs(gap)) * .5;
          const dir = Math.sign(gap);
          a.x = clamp(a.x - dir * push * dt * 16, 35, W - 35);
          b.x = clamp(b.x + dir * push * dt * 16, 35, W - 35);
        }
      }
    }
  }

  function makeRemotePlayer(slot = 2, name = "SATORU GOJO", character = "gojo", variant = "normal") {
    return {
      kind: "remote",
      character,
      type: { name, rank: characters[character]?.title || "THE STRONGEST", speed: 295, boss: false },
      onlineVariant: variant === "inverted" ? "inverted" : "normal",
      x: slot === 1 ? 300 : 950, y: GROUND, w: 44, h: 92,
      vx: 0, vy: 0, facing: slot === 1 ? 1 : -1,
      health: 600, maxHealth: 600, lagHealth: 600, energy: 70,
      grounded: true, state: "idle", stateTime: 0, attack: null,
      stun: 0, invuln: 0, flash: 0, blocking: false,
      reaction: "idle", wallSplat: 0, awakening: 0, burnout: 0, burned: false,
      moveConfiscation: 0, executionSword: 0, executionSwordUsed: false, executionRecovery: 0,
      heat: 0, jackpot: 0,
      charging: false,
      comboStep: -1, airComboStep: -1,
      adaptation: { light: 0, heavy: 0, special: 0, parryBaits: 0 },
      lastPlayerStrategy: "",
    };
  }

  function makeDomainUseEnemy(character = selectedDomainEnemy) {
    const id = characters[character] ? character : "sukuna";
    const profile = characters[id];
    const fighter = makeRemotePlayer(2, profile.name, id, "normal");
    fighter.kind = "enemy";
    fighter.type = { name: profile.name, rank: "DOMAIN USE CPU", speed: id === "hakari" ? 322 : id === "sukuna" ? 316 : id === "higuruma" ? 306 : 300, boss: false };
    fighter.health = 600;
    fighter.maxHealth = 600;
    fighter.lagHealth = 600;
    fighter.energy = 100;
    fighter.cooldowns = { blue: 0, red: 0, purple: 0, domain: 0, consecutive: 0 };
    fighter.power = difficulty === "easy" ? .92 : difficulty === "hard" ? 1.14 : 1;
    fighter.domainUse = true;
    fighter.domainUseTimer = 5;
    fighter.aiTimer = .35;
    fighter.decision = "approach";
    fighter.emergencyDodges = difficulty === "hard" ? 3 : 2;
    fighter.adaptation = { light: 0, heavy: 0, special: 0, parryBaits: 0 };
    if (id === "hakari") {
      fighter.jackpot = 9999;
      fighter.awakening = 9999;
      fighter.heat = 100;
      fighter.power *= 1.08;
    }
    if (id === "higuruma") {
      fighter.awakening = 9999;
      fighter.executionSword = 9999;
      fighter.executionSwordUsed = false;
      fighter.power *= 1.05;
    }
    return fighter;
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
    ensureCharacterRoster();
    const profile = characters[selectedCharacter];
    $$(".character-card").forEach((card) => card.classList.toggle("active", card.dataset.character === selectedCharacter));
    ui.selectCharacterName.textContent = profile.name;
    ui.selectDifficulty.textContent = `DIFFICULTY: ${profile.difficulty}`;
    ui.selectDescription.textContent = profile.description;
    ui.selectAbilities.innerHTML = profile.abilities
      .map(([key, name]) => `<span><kbd>${key}</kbd> ${name}</span>`)
      .join("");
    updateOfflineSelectionCopy();
  }

  function updateOfflineSelectionCopy() {
    if (onlineSelection || !ui.characterSelect || ui.characterSelect.classList.contains("hidden")) return;
    if (selectedMode !== "domainUse") {
      ui.selectModeLabel.textContent = `${selectedMode.toUpperCase()} / SELECT YOUR FIGHTER`;
      ui.selectionStatus.textContent = "SELECT A FIGHTER";
      ui.confirmCharacter.textContent = "LOCK IN";
      return;
    }
    if (offlineSelectionStep === "enemy") {
      const playerProfile = characters[selectedDomainPlayer] || characters.gojo;
      ui.selectModeLabel.textContent = "DOMAIN USE / SELECT THE ENEMY";
      ui.selectionStatus.textContent = "CHOOSE WHO WILL SPAM DOMAINS EVERY 5 SECONDS";
      ui.confirmCharacter.textContent = "LOCK ENEMY";
      ui.characterBack.textContent = "BACK TO FIGHTER";
      ui.selectionP1.querySelector("strong").textContent = playerProfile.name;
      ui.selectionP1.querySelector("small").textContent = "LOCKED";
      ui.selectionP1.dataset.character = selectedDomainPlayer;
      ui.selectionP1.classList.add("locked");
      ui.selectionP2.querySelector("strong").textContent = characters[selectedCharacter]?.name || "DOMAIN ENEMY";
      ui.selectionP2.querySelector("small").textContent = "SELECTING ENEMY";
      ui.selectionP2.dataset.character = selectedCharacter;
      ui.selectionP2.classList.remove("locked");
    } else {
      ui.selectModeLabel.textContent = "DOMAIN USE / SELECT YOUR FIGHTER";
      ui.selectionStatus.textContent = "LOCK YOUR FIGHTER, THEN PICK THE DOMAIN ENEMY";
      ui.confirmCharacter.textContent = "LOCK FIGHTER";
      ui.characterBack.textContent = "BACK";
      ui.selectionP1.querySelector("strong").textContent = "PLAYER 1";
      ui.selectionP1.querySelector("small").textContent = "NOT LOCKED";
      ui.selectionP1.dataset.character = selectedCharacter;
      ui.selectionP1.classList.remove("locked");
      ui.selectionP2.querySelector("strong").textContent = "DOMAIN ENEMY";
      ui.selectionP2.querySelector("small").textContent = "CHOOSE NEXT";
      ui.selectionP2.dataset.character = selectedDomainEnemy;
      ui.selectionP2.classList.remove("locked");
    }
  }

  function bindCharacterCard(card) {
    if (!card || card.dataset.bound === "true") return;
    card.dataset.bound = "true";
    card.addEventListener("click", () => {
      if (selectionLocked) return;
      selectedCharacter = card.dataset.character;
      if (!onlineSelection && selectedMode === "domainUse" && offlineSelectionStep === "enemy") {
        selectedDomainEnemy = selectedCharacter;
      }
      renderCharacterSelection();
      if (onlineSelection) {
        window.dispatchEvent(new CustomEvent("voidlimit:characterPreview", { detail: { character: selectedCharacter } }));
      }
    });
  }

  function ensureCharacterRoster() {
    const roster = document.querySelector(".character-roster");
    if (!roster || document.querySelector('.character-card[data-character="higuruma"]')) {
      $$(".character-card").forEach(bindCharacterCard);
      return;
    }
    if (typeof roster.insertAdjacentHTML !== "function") return;
    roster.insertAdjacentHTML("beforeend", `
        <button class="character-card" data-character="higuruma">
          <div class="pixel-portrait higuruma-pixel">
            <i class="portrait-aura"></i><i class="portrait-body"></i><i class="portrait-head"></i><i class="portrait-hair"></i><i class="portrait-face"></i>
          </div>
          <span>DEADLY LAWYER</span>
          <strong>HIROMI HIGURUMA</strong>
          <small>TACTICAL / GAVEL</small>
        </button>`);
    $$(".character-card").forEach(bindCharacterCard);
  }

  function openCharacterSelect(options = {}) {
    ensureCharacterRoster();
    onlineSelection = Boolean(options.online);
    pendingOfflineSelection = !onlineSelection;
    if (!onlineSelection) offlineSelectionStep = "player";
    selectionLocked = false;
    onlineLockRequest = null;
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
    if (local?.character && characters[local.character] && (!onlineLockRequest || local.character === onlineLockRequest.character || local.locked)) {
      selectedCharacter = local.character;
      renderCharacterSelection();
    }
    if (local?.locked) {
      onlineLockRequest = null;
      selectionLocked = true;
      ui.confirmCharacter.disabled = true;
      ui.confirmCharacter.textContent = "LOCKED";
      ui.selectionStatus.textContent = remote?.locked ? "BOTH FIGHTERS LOCKED" : "WAITING FOR OPPONENT...";
    } else if (onlineLockRequest) {
      ui.confirmCharacter.disabled = true;
      ui.confirmCharacter.textContent = "LOCKING...";
      ui.selectionStatus.textContent = `LOCKING ${characters[onlineLockRequest.character]?.name || "FIGHTER"}...`;
    } else {
      selectionLocked = false;
      ui.confirmCharacter.disabled = false;
      ui.confirmCharacter.textContent = "LOCK IN";
    }
  }

  function matchupDialogue(localCharacter, remoteCharacter) {
    if (localCharacter === "sukuna" && remoteCharacter === "gojo") return "SUKUNA: COME ON, STRONGEST. ENTERTAIN ME.";
    if (localCharacter === "gojo" && remoteCharacter === "sukuna") return "GOJO: LET'S SETTLE WHO STANDS AT THE TOP.";
    if (localCharacter === "hakari" && remoteCharacter === "gojo") return "HAKARI: LET'S SEE IF THE STRONGEST CAN BEAT LUCK.";
    if (localCharacter === "hakari" && remoteCharacter === "sukuna") return "HAKARI: EVEN A KING CAN LOSE A BAD BET.";
    if (localCharacter === "higuruma") return "HIGURUMA: I WILL END THIS WITH PROCEDURE.";
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
    const p1Variant = localSlot === 1 ? options.localVariant : options.remoteVariant;
    const p2Variant = localSlot === 1 ? options.remoteVariant : options.localVariant;
    ui.introP1.textContent = p1Name || "PLAYER 1";
    ui.introP2.textContent = p2Name || "PLAYER 2";
    ui.introCharacterP1.textContent = characters[p1Character]?.name || "CURSED SPIRIT";
    ui.introCharacterP2.textContent = characters[p2Character]?.name || "CURSED SPIRIT";
    ui.introPortraitP1.className = `intro-silhouette ${p1Character || "curse"}${p1Variant === "inverted" ? " inverted" : ""}`;
    ui.introPortraitP2.className = `intro-silhouette ${p2Character || "curse"}${p2Variant === "inverted" ? " inverted" : ""}`;
    ui.introDialogue.textContent = matchupDialogue(options.localCharacter, options.remoteCharacter);
  }

  function startOfflineSelection() {
    offlineSelectionStep = "player";
    selectedDomainPlayer = selectedCharacter;
    if (!characters[selectedDomainEnemy]) selectedDomainEnemy = "sukuna";
    openCharacterSelect({ online: false, localName: "PLAYER 1", remoteName: "CURSED SPIRIT" });
  }

  function confirmCharacterSelection() {
    if (selectionLocked) return;
    const activeCard = document.querySelector(`.character-card[data-character="${selectedCharacter}"]`);
    if (onlineSelection) {
      onlineLockRequest = { character: selectedCharacter, startedAt: performance.now() };
      ui.confirmCharacter.disabled = true;
      ui.confirmCharacter.textContent = "LOCKING...";
      ui.selectionStatus.textContent = `LOCKING ${characters[selectedCharacter]?.name || "FIGHTER"}...`;
      window.dispatchEvent(new CustomEvent("voidlimit:characterLocked", { detail: { character: selectedCharacter } }));
      setTimeout(() => {
        if (!onlineSelection || selectionLocked || onlineLockRequest?.character !== selectedCharacter) return;
        onlineLockRequest = null;
        ui.confirmCharacter.disabled = false;
        ui.confirmCharacter.textContent = "LOCK IN";
        ui.selectionStatus.textContent = "SERVER DID NOT CONFIRM YET. CHECK CONNECTION OR TRY LOCKING AGAIN.";
      }, 5000);
      return;
    }
    if (selectedMode === "domainUse" && offlineSelectionStep === "player") {
      selectedDomainPlayer = selectedCharacter;
      offlineSelectionStep = "enemy";
      selectedCharacter = selectedDomainEnemy;
      selectionLocked = false;
      ui.confirmCharacter.disabled = false;
      ui.selectionP1.classList.add("locked");
      ui.selectionP1.querySelector("strong").textContent = characters[selectedDomainPlayer].name;
      ui.selectionP1.querySelector("small").textContent = "LOCKED";
      $$(".character-card").forEach((card) => card.classList.remove("locked"));
      renderCharacterSelection();
      tone(320, .08, "square", .14, 160);
      return;
    }
    selectionLocked = true;
    const remoteCharacter = selectedMode === "domainUse" ? selectedCharacter : "curse";
    const remoteName = selectedMode === "domainUse" ? characters[remoteCharacter]?.name || "DOMAIN ENEMY" : "CURSED SPIRIT";
    if (selectedMode === "domainUse") {
      selectedDomainEnemy = remoteCharacter;
      selectedCharacter = selectedDomainPlayer;
    }
    ui.confirmCharacter.disabled = true;
    ui.confirmCharacter.textContent = "LOCKED";
    activeCard?.classList.add("locked");
    ui.selectionP1.classList.add("locked");
    ui.selectionP1.querySelector("small").textContent = "LOCKED";
    ui.selectionStatus.textContent = "FIGHTER LOCKED";
    ui.characterSelect.classList.add("hidden");
    configureVersus({
      slot: 1,
      localCharacter: selectedCharacter,
      remoteCharacter,
      localName: characters[selectedCharacter].name,
      remoteName,
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
    stopHakariJackpotMusic();
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
    game.enemies = [];
    game.enemy = selectedMode === "domainUse" ? makeDomainUseEnemy(selectedDomainEnemy) : makeEnemy(0);
    if (selectedMode === "survival") spawnSurvivalWave(1);
    game.particles.length = 0;
    game.projectiles.length = 0;
    game.afterimages.length = 0;
    game.shake = 0;
    game.flash = 0;
    game.hitstop = 0;
    game.slow = 0;
    game.time = selectedMode === "training" || selectedMode === "domainUse" ? Infinity : selectedMode === "survival" ? 120 : 99;
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
    game.trial = null;
    game.domainTick = .5;
    game.domainUseTimer = 5;
    game.jackpotFlash = 0;
    resetProps();
    ui.menu.classList.add("hidden");
    ui.settingsPanel?.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.clash.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    announce(selectedMode === "domainUse" ? `DOMAIN USE: ${characters[selectedDomainEnemy]?.name || "ENEMY"}`
      : selectedMode === "training" ? "TRAINING START"
      : selectedCharacter === "sukuna" ? "THE KING ENTERS"
        : selectedCharacter === "hakari" ? "FEVER START"
          : selectedCharacter === "higuruma" ? "COURT IS IN SESSION" : "CURTAIN OPEN");
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
    game.online.latestInputFrame = -1;
    game.online.lastAckFrame = -1;
    game.online.snapshotBuffer.length = 0;
    game.online.predictionHistory.clear();
    game.online.correctionX = 0;
    game.online.correctionY = 0;
    game.domainOwnerSlot = 0;
    game.domainStartup = 0;
    game.domainPrevious = 0;
    game.online.inputEdges = {
      jump: false, dash: false, light: false, heavy: false,
      special: "", specialRelease: "", fuga: false, domain: false, awaken: false, clash: 0, trialChoice: -1,
    };
    game.online.stats = { damage: 0, parries: 0, blackFlashes: 0, domains: 0 };
    game.time = Number(options.time) === 0 ? Infinity : Number(options.time) || 99;
    game.player.energy = Number(options.energy) || 70;
    game.player.character = selectedCharacter;
    game.player.onlineVariant = options.localVariant === "inverted" ? "inverted" : "normal";
    game.player.x = options.slot === 1 ? 300 : 950;
    game.player.facing = options.slot === 1 ? 1 : -1;
    game.enemy = makeRemotePlayer(
      options.slot === 1 ? 2 : 1,
      game.online.remoteName,
      game.online.remoteCharacter,
      options.remoteVariant
    );
    game.enemy.energy = Number(options.energy) || 70;
    ui.menu.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.onlineMenu?.classList.add("hidden");
    ui.intro?.classList.add("hidden");
    ui.characterSelect.classList.add("hidden");
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
    recordSurvivalWaveCheckpoint();
    stopHakariJackpotMusic();
    game.state = "menu";
    ui.hud.classList.add("hidden");
    ui.pause.classList.add("hidden");
    ui.result.classList.add("hidden");
    ui.clash.classList.add("hidden");
    ui.settingsPanel?.classList.add("hidden");
    ui.menu.classList.remove("hidden");
  }

  function announce(text) {
    ui.announcement.textContent = text;
    ui.announcement.classList.remove("show");
    void ui.announcement.offsetWidth;
    ui.announcement.classList.add("show");
  }

  function spawnParticles(x, y, color, count = 12, speed = 280, size = 5, life = .45) {
    const available = Math.max(0, MAX_PARTICLES - game.particles.length);
    if (available <= 0) return;
    const pressureScale = game.particles.length > MAX_PARTICLES * .72 ? .45 : 1;
    const amount = Math.min(available, Math.max(1, Math.ceil(count * pressureScale)));
    for (let i = 0; i < amount; i++) {
      const a = rnd(0, Math.PI * 2);
      const s = rnd(speed * .25, speed);
      game.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rnd(2, size), color, life: rnd(life * .5, life), maxLife: life,
        gravity: chance(.4) ? 600 : 0,
      });
    }
  }

  function showPurpleCollapse(x, y) {
    const fallbackX = game.player && game.enemy ? (game.player.x + game.enemy.x) / 2 : W / 2;
    const fallbackY = game.player ? game.player.y - 70 : GROUND - 70;
    const explosionX = Number.isFinite(Number(x)) ? Number(x) : fallbackX;
    const explosionY = Number.isFinite(Number(y)) ? Number(y) : fallbackY;
    game.unstablePurple = null;
    game.remoteUnstablePurple = null;
    if (game.player) game.player.burned = true;
    if (game.enemy) game.enemy.burned = true;
    game.flash = Math.max(game.flash, .28);
    game.shake = Math.max(game.shake, 28);
    game.cameraTarget = Math.max(game.cameraTarget, 1.28);
    spawnParticles(explosionX, explosionY, "#08020f", 24, 680, 12, 1);
    spawnParticles(explosionX, explosionY, "#a15cff", 36, 760, 10, 1.05);
    spawnParticles(explosionX, explosionY, "#ff704a", 12, 520, 7, .72);
    announce("PURPLE COLLAPSE");
    tone(35, 1.1, "sawtooth", .48, 240);
    noise(.8, .38);
  }

  function addAfterimage(entity, color = "#55e7ff") {
    game.afterimages.push({
      x: entity.x, y: entity.y, facing: entity.facing,
      character: entity.character,
      onlineVariant: entity.onlineVariant,
      burned: entity.burned,
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
    if (!p || p.stun > 0 || p.charging || p.techniqueCharge || p.chargeRecovery > 0 || game.cinematic > 0 || game.clash || (game.online.active && Date.now() < game.online.startAt)) return;
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
    if (!aerial) {
      p.vx = 0;
      p.dashTime = 0;
    }
    if (type === "light") {
      startM1(aerial);
      return;
    } else {
      const attack = p.character === "higuruma"
        ? aerial
          ? { name: "Falling Gavel", duration: .48, start: .15, end: .31, range: 76, h: 72, y: -52, damage: 16, kbX: 165, kbY: -520, color: "#f2cf74", strong: true, gavel: true }
          : { name: "Objection Strike", duration: .46, start: .16, end: .3, range: 86, h: 66, y: -74, damage: 16, kbX: 320, kbY: 230, color: "#d8aa48", strong: true, gavel: true }
        : p.character === "hakari"
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
      attack = p.character === "higuruma"
        ? { ...attack, name: "Brief Launcher", range: 76, damage: 13.2, kbX: 72, kbY: 650, reaction: "launcher", launcher: true, jumpCancel: true, grab: true, color: "#f2cf74" }
        : p.character === "hakari"
        ? { ...attack, name: "Fever Headbutt", range: 70, damage: 13, kbX: 75, kbY: 660, reaction: "launcher", launcher: true, jumpCancel: true, grab: true }
        : p.character === "sukuna"
        ? { ...attack, name: "Savage Ascent", range: 68, damage: 12, kbX: 70, kbY: 680, reaction: "launcher", launcher: true, jumpCancel: true, grab: true }
        : { ...attack, name: "Rising Limit", kbX: 95, kbY: 610, reaction: "launcher", launcher: true, jumpCancel: true };
    } else if (!aerial && step === 4 && directionDown) {
      attack = p.character === "higuruma"
        ? { ...attack, name: "Judgment Floor Slam", y: -53, h: 70, damage: 14.2, kbX: 38, kbY: -650, reaction: "slam", downslam: true, groundFollow: true, bounce: true, color: "#f2cf74" }
        : p.character === "hakari"
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
      specialCancel: p.character === "higuruma" ? (!aerial && (step === 2 || step === 3)) : true,
      hitConfirmed: false,
      color: p.character === "higuruma" ? (attack.color || "#d8aa48") : p.character === "hakari" ? "#55f087" : p.character === "sukuna" ? (attack.slash ? "#ff244f" : "#ff7892") : attack.flashEligible ? "#9cefff" : "#78eaff",
    };
    if (!aerial) {
      p.vx = 0;
      p.dashTime = 0;
    }
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
    if (!p || p.stun > 0 || p.charging || p.techniqueCharge || p.chargeRecovery > 0 || p.dashCooldown > 0 || game.cinematic > 0 || (game.online.active && Date.now() < game.online.startAt)) return;
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
    p.dashTime = .14;
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
    const unlocked = p.dismantleUses >= 5 && p.cleaveUses >= 2 && p.sukunaDomainUses >= 1;
    if (unlocked && !p.worldSlashUnlocked) {
      p.worldSlashUnlocked = true;
      announce("WORLD-CUTTING SLASH UNLOCKED");
      game.realityCrack = .35;
      tone(52, .65, "sawtooth", .3, 220);
    }
    return p.worldSlashUnlocked;
  }

  function beginChargedTechnique(name) {
    const p = game.player;
    if (!p || p.techniqueCharge || p.stun > 0 || p.charging || p.moveConfiscation > 0) return false;
    if (name !== "red" || !["gojo", "sukuna", "higuruma"].includes(p.character) || p.cooldowns.red > 0) return false;
    const canSpecialCancel = p.attack?.hitConfirmed && p.attack.specialCancel && p.attack.elapsed >= p.attack.start;
    if (p.attack && !canSpecialCancel) return false;
    const cost = characterProfile(p).costs.red;
    if (p.energy < cost) return false;
    if (canSpecialCancel) {
      p.attack = null;
      game.score += 150;
    }
    p.techniqueCharge = { name, elapsed: 0, releaseDelay: -1, auto: false };
    p.vx = 0;
    p.state = p.character === "sukuna" ? "dismantleCharge" : p.character === "higuruma" ? "gavelCharge" : "redCharge";
    p.blocking = false;
    announce(p.character === "sukuna" ? "DISMANTLE CHARGE" : p.character === "higuruma" ? "GAVEL CHARGE" : "REVERSAL: RED CHARGE");
    return true;
  }

  function releaseChargedTechnique() {
    const p = game.player;
    if (!p?.techniqueCharge || p.techniqueCharge.releaseDelay >= 0) return;
    if (p.techniqueCharge.elapsed <= .3) {
      fireQuickTechnique();
      return;
    }
    if (p.character === "higuruma") {
      fireChargedTechnique();
      return;
    }
    p.techniqueCharge.releaseDelay = .5;
  }

  function cancelChargedTechnique(interrupted = false) {
    const p = game.player;
    if (!p?.techniqueCharge) return;
    if (interrupted) {
      if (p.character === "gojo") p.energy = Math.max(0, p.energy - 30);
      if (p.character === "sukuna") p.cooldowns.red = Math.max(p.cooldowns.red, characters.sukuna.cooldowns.red * .5);
      if (p.character === "higuruma") p.cooldowns.red = Math.max(p.cooldowns.red, characters.higuruma.cooldowns.red * .5);
      announce(p.character === "gojo" ? "RED CHARGE BROKEN -30 CE" : p.character === "higuruma" ? "GAVEL CHARGE BROKEN" : "DISMANTLE INTERRUPTED");
    }
    p.techniqueCharge = null;
  }

  function dismantleMode(p) {
    if (p.grounded) return "straight";
    return p.jumps === 0 ? "autoAim" : "groundSlash";
  }

  function spawnDismantleSlash(p, e, volley) {
    const direction = e.x >= p.x ? 1 : -1;
    const originX = p.x + direction * 55;
    const originY = p.y - 72;
    let vx = direction * 760;
    let vy = 0;
    let w = 115;
    let h = 38;
    let kbY = 110;
    if (volley.mode === "groundSlash") {
      vx = 0;
      vy = 900;
      w = 38;
      h = 115;
      kbY = -330;
    } else if (volley.mode === "autoAim") {
      const dx = e.x - originX;
      const dy = e.y - e.h * .55 - originY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      vx = dx / distance * 760;
      vy = dy / distance * 760;
    }
    const projectile = {
      owner: "player", type: "dismantle", x: originX, y: originY,
      vx, vy, w, h, life: .85,
      damage: volley.damage, kbX: 330, kbY, strong: false,
    };
    game.projectiles.push(projectile);
    sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
    tone(240, .12, "sawtooth", .22, -170);
  }

  function queueDismantleVolley(p, e, count, damage) {
    const volley = {
      remaining: count,
      timer: 0,
      damage,
      mode: dismantleMode(p),
    };
    spawnDismantleSlash(p, e, volley);
    volley.remaining--;
    volley.timer = .2;
    p.dismantleVolley = volley.remaining > 0 ? volley : null;
  }

  function updateDismantleVolley(dt) {
    const p = game.player;
    const volley = p?.dismantleVolley;
    if (!p || !volley) return;
    volley.timer -= dt;
    while (volley.remaining > 0 && volley.timer <= 0) {
      spawnDismantleSlash(p, isSurvivalMode() ? retargetSurvivalEnemy() : game.enemy, volley);
      volley.remaining--;
      volley.timer += .2;
    }
    if (volley.remaining <= 0) p.dismantleVolley = null;
  }

  function startHigurumaGavelAttack(charged = false) {
    const p = game.player;
    if (!p) return;
    p.attack = charged
      ? {
        name: "Giant Gavel Swing", elapsed: 0, duration: .62, start: .18, end: .4,
        active: false, hit: new Set(), type: "gavel", specialCancel: false,
        range: 132, h: 82, y: -74, damage: 28, kbX: 390, kbY: 180,
        reaction: "body", color: "#f2cf74", strong: true, gavel: true, crack: true,
      }
      : {
        name: "Shapeshifting Gavel", elapsed: 0, duration: .42, start: .1, end: .24,
        active: false, hit: new Set(), type: "gavel", specialCancel: true,
        range: 76, h: 58, y: -70, damage: 15, kbX: 250, kbY: 100,
        reaction: "body", color: "#d8aa48", strong: false, gavel: true,
      };
    p.vx = 0;
    p.dashTime = 0;
    p.state = charged ? "giantGavel" : "gavel";
    if (charged) {
      spawnShockwave(p.x + p.facing * 86, GROUND - 4, "#f2cf74");
      spawnParticles(p.x + p.facing * 86, GROUND - 7, "#c9933e", 26, 320, 8, .7);
      game.shake = Math.max(game.shake, 8);
    }
  }

  function fireQuickTechnique() {
    const p = game.player;
    const e = game.enemy;
    if (!p?.techniqueCharge) return;
    p.techniqueCharge = null;
    p.vx = 0;
    if (p.character === "higuruma") {
      p.energy -= characters.higuruma.costs.red;
      p.cooldowns.red = characters.higuruma.cooldowns.red;
      startHigurumaGavelAttack(false);
      announce("SHAPESHIFTING GAVEL");
      spawnParticles(p.x + p.facing * 42, p.y - 66, "#f2cf74", 14, 230, 6, .45);
      tone(280, .13, "square", .2, 90);
      return;
    }
    if (p.character === "gojo") {
      p.energy -= 26;
      p.cooldowns.red = characters.gojo.cooldowns.red;
      p.attack = { name: "Reversal: Red", elapsed: 0, duration: .66, start: .12, end: .34, active: false, hit: new Set(), type: "red" };
      p.state = "cast";
      const projectile = {
        owner: "player", type: "red", x: p.x + p.facing * 55, y: p.y - 80,
        vx: p.facing * 510, vy: 0, w: 48, h: 48, life: 1.5,
        damage: 18, kbX: 620, kbY: 240, strong: true,
      };
      game.projectiles.push(projectile);
      sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
      announce("REVERSAL: RED");
      tone(150, .35, "sawtooth", .3, -100);
      return;
    }

    p.energy -= 16;
    p.cooldowns.red = characters.sukuna.cooldowns.red;
    p.dismantleUses++;
    updateWorldSlashUnlock(p);
    p.attack = {
      name: "Dismantle", elapsed: 0, duration: .42, start: .08, end: .28,
      active: false, hit: new Set(), type: "dismantle", specialCancel: true,
    };
    p.state = "slash";
    queueDismantleVolley(p, e, 1, 15);
    announce(p.grounded ? "DISMANTLE" : p.jumps === 0 ? "AERIAL DISMANTLE: LOCK" : "AERIAL DISMANTLE: GROUND");
  }

  function fireChargedTechnique() {
    const p = game.player;
    const e = game.enemy;
    const charge = p?.techniqueCharge;
    if (!p || !charge) return;
    const ratio = clamp(charge.elapsed / 5, 0, 1);
    p.techniqueCharge = null;
    p.vx = 0;
    if (p.character === "higuruma") {
      p.energy -= characters.higuruma.costs.red;
      p.cooldowns.red = characters.higuruma.cooldowns.red;
      startHigurumaGavelAttack(true);
      announce("GIANT GAVEL");
      tone(175, .22, "square", .24, 160);
      return;
    }
    if (p.character === "gojo") {
      p.energy -= 26;
      p.cooldowns.red = characters.gojo.cooldowns.red;
      p.attack = { name: "Charged Reversal: Red", elapsed: 0, duration: .58, start: .18, end: .34, active: false, hit: new Set(), type: "red" };
      p.state = "cast";
      const size = 46 - ratio * 20;
      const projectile = {
        owner: "player", type: "red", x: p.x + p.facing * 52, y: p.y - 80,
        vx: p.facing * (510 + ratio * 620), vy: 0, w: size, h: size, life: 1.5,
        damage: 18 + ratio * 18, kbX: 620 + ratio * 180, kbY: 240, strong: true,
      };
      game.projectiles.push(projectile);
      sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
      announce(`RED RELEASE ${charge.elapsed.toFixed(1)}s`);
      tone(150, .35, "sawtooth", .3, 160);
      return;
    }

    if (p.energy < 32) {
      p.techniqueCharge = charge;
      fireQuickTechnique();
      return;
    }
    p.energy -= 32;
    p.cooldowns.red = characters.sukuna.cooldowns.red;
    p.dismantleUses++;
    updateWorldSlashUnlock(p);
    const count = 1 + Math.floor(ratio * 5);
    const damage = 15 * (.8 - ratio * .5);
    p.attack = {
      name: "Dismantle Barrage", elapsed: 0, duration: .45 + (count - 1) * .2, start: .08, end: .4 + (count - 1) * .2,
      active: false, hit: new Set(), type: "dismantle", specialCancel: true,
    };
    p.state = "slash";
    queueDismantleVolley(p, e, count, damage);
    announce(`${count} DISMANTLE SLASH${count > 1 ? "ES" : ""}`);
  }

  function startFuga() {
    const p = game.player;
    if (!p || p.character !== "sukuna" || p.energy < 70 || p.cooldowns.red > 0 || p.cooldowns.blue > 0
      || p.stun > 0 || p.attack || p.moveConfiscation > 0) return false;
    cancelChargedTechnique();
    p.energy -= 70;
    p.cooldowns.red = Math.max(p.cooldowns.red, 12);
    p.cooldowns.blue = Math.max(p.cooldowns.blue, 12);
    p.attack = {
      name: "Fuga", elapsed: 0, duration: 2.65, start: 1.65, end: 2.25,
      active: false, hit: new Set(), type: "fuga", specialCancel: false,
    };
    p.fuga = { timer: 2.65, fired: false };
    p.invuln = 2.65;
    p.vx = 0;
    p.state = "fuga";
    game.cinematic = .55;
    game.cameraTarget = 1.2;
    announce("FUGA");
    return true;
  }

  function abilityTuning(p, name) {
    const profile = characterProfile(p);
    if (p?.character === "higuruma" && p.executionSword > 0 && name === "purple" && !p.executionSwordUsed) {
      return { cost: 0, cooldown: 1.5, label: "EXECUTIONER" };
    }
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
    const e = game.enemy;
    const profile = characterProfile(p);
    const domainResponse = game.online.active && name === "domain" && game.online.remoteDomainWindow > 0;
    if (p?.moveConfiscation > 0 && ["red", "blue", "purple", "domain"].includes(name)) {
      announce("CONFISCATED");
      tone(65, .08, "square", .15, -80);
      spawnParticles(p.x, p.y - 70, "#f2cf74", 10, 210, 5, .35);
      return;
    }
    if (!p || p.stun > 0 || p.charging || p.techniqueCharge || p.chargeRecovery > 0 || p.executionRecovery > 0
      || (game.cinematic > 0 && !domainResponse) || game.clash || (game.online.active && Date.now() < game.online.startAt)) return;
    if (!(name in profile.costs)) return;
    if (p.character === "gojo" && name === "purple") {
      if (!game.unstablePurple || game.unstablePurple.state !== "unstable") return;
      stabilizeHollowPurple();
      return;
    }
    if (p.character === "gojo" && p.burnout > 0 && (name === "blue" || name === "red" || name === "domain")) return;
    if (p.character === "sukuna" && name === "purple" && !updateWorldSlashUnlock(p)) {
      announce(`WORLD SLASH LOCKED ${p.dismantleUses}/5 D  ${p.cleaveUses}/2 C  ${p.sukunaDomainUses}/1 DOMAIN`);
      tone(70, .08, "square", .14, -30);
      return;
    }
    const canSpecialCancel = p.attack?.hitConfirmed && p.attack.specialCancel && p.attack.elapsed >= p.attack.start;
    if (p.attack && !canSpecialCancel) return;
    const tuning = abilityTuning(p, name);
    if (p.character === "sukuna" && name === "purple" && p.worldSlashUses >= 2) {
      announce("WORLD SLASH EXHAUSTED 2/2");
      return;
    }
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
    } else if (p.character === "higuruma") {
      useHigurumaTechnique(name);
    } else if (name === "blue") {
      if (!p.grounded && p.jumps === 0) {
        p.attack = {
          name: "Blue Skyfall", elapsed: 0, duration: .82, start: .14, end: .58,
          active: false, hit: new Set(), type: "blueSkyfall", specialCancel: false,
        };
        p.state = "blueSkyfall";
        e.x = lerp(e.x, p.x, .78);
        e.y = Math.min(e.y, p.y + 35);
        e.vx = 0;
        e.vy = 840;
        e.grounded = false;
        e.stun = Math.max(e.stun, .72);
        setTimeout(() => {
          if (game.state !== "playing") return;
          applyHit(p, e, {
            name: "Blue Skyfall Kick", type: "special", damage: 24,
            kbX: 70, kbY: -920, strong: true, downslam: true,
            reaction: "slam", color: "#4e8fff",
          });
          spawnShockwave(e.x, GROUND - 4, "#4e8fff");
          spawnParticles(e.x, GROUND - 8, "#65758d", 34, 430, 10, .85);
        }, 360);
        announce("BLUE SKYFALL");
        return;
      }
      p.attack = { name: "Lapse: Blue", elapsed: 0, duration: .58, start: .22, end: .36, active: false, hit: new Set(), type: "blue" };
      p.vx = 0;
      p.dashTime = 0;
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
      p.vx = 0;
      p.dashTime = 0;
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

  function useHigurumaTechnique(name) {
    const p = game.player;
    const e = game.enemy;
    if (name === "red") {
      startHigurumaGavelAttack(false);
      announce("SHAPESHIFTING GAVEL");
      tone(280, .13, "square", .2, 90);
    } else if (name === "blue") {
      const distance = Math.abs(e.x - p.x);
      if (!p.grounded) {
        p.attack = {
          name: "Downward Gavel Hook", elapsed: 0, duration: .58, start: .14, end: .36,
          active: false, hit: new Set(), type: "gavelHook", specialCancel: false,
          range: 78, h: 86, y: -40, damage: 18, kbX: 80, kbY: -680,
          reaction: "slam", color: "#f2cf74", strong: true, gavel: true, downslam: true, bounce: true,
        };
        p.vy = Math.max(p.vy, 620);
        p.state = "hookSlam";
        announce("DOWNWARD HOOK");
      } else if (distance <= 108) {
        p.attack = {
          name: "Gavel Hook Throw", elapsed: 0, duration: .54, start: .12, end: .32,
          active: false, hit: new Set(), type: "gavelHook", specialCancel: false,
          range: 112, h: 72, y: -74, damage: 16, kbX: 220, kbY: 160,
          reaction: "body", color: "#d8aa48", strong: true, gavel: true, throwBehind: true,
        };
        p.state = "hookThrow";
        announce("GAVEL HOOK THROW");
      } else {
        p.attack = {
          name: "Gavel Hook Pull", elapsed: 0, duration: .48, start: .11, end: .3,
          active: false, hit: new Set(), type: "gavelHook", specialCancel: true,
          range: 225, h: 58, y: -72, damage: 10, kbX: 210, kbY: 60,
          reaction: "body", color: "#c9933e", strong: false, gavel: true, pull: true,
        };
        p.state = "hook";
        announce("GAVEL HOOK");
      }
      p.vx = 0;
      p.dashTime = 0;
      tone(330, .16, "square", .22, -90);
    } else if (name === "purple") {
      if (p.executionSword > 0 && !p.executionSwordUsed) {
        startExecutionSwordAttack(p, e);
        return;
      }
      p.attack = {
        name: "Giant Gavel Sentence", elapsed: 0, duration: .88, start: .34, end: .56,
        active: false, hit: new Set(), type: "sentence", specialCancel: false,
        range: 156, h: 108, y: -78, damage: 45, kbX: 360, kbY: -820,
        reaction: "slam", color: "#f2cf74", strong: true, gavel: true, downslam: true,
        crumple: true, glass: true,
      };
      p.vx = 0;
      p.dashTime = 0;
      p.state = "sentence";
      game.cinematic = .22;
      game.cameraTarget = 1.16;
      game.shake = Math.max(game.shake, 10);
      announce("GIANT GAVEL SENTENCE");
      tone(110, .35, "square", .28, 210);
    } else if (name === "domain") {
      startDeadlySentencing();
    }
  }

  function clearTrialCombatMotion() {
    for (const fighter of [game.player, game.enemy]) {
      if (!fighter) continue;
      fighter.vx = 0;
      fighter.vy = 0;
      fighter.attack = null;
      fighter.blocking = false;
      fighter.charging = false;
      fighter.state = fighter.character === "higuruma" ? "domainPose" : "judged";
    }
  }

  function startDeadlySentencing() {
    const p = game.player;
    if (!p || p.character !== "higuruma") return;
    if (game.online.active && game.online.authoritative) {
      if (p.moveConfiscation > 0) {
        if (p.moveConfiscation > 0) announce("CONFISCATED");
        return;
      }
      p.domainsUsed = (p.domainsUsed || 0) + 1;
      game.online.stats.domains++;
      p.trialStartup = 2;
      p.trialStartupHealth = p.health;
      p.vx = 0;
      p.attack = null;
      p.state = "domainPose";
      game.trial = {
        phase: "startup",
        online: true,
        casterSlot: game.online.slot,
        targetSlot: game.online.slot === 1 ? 2 : 1,
        timer: 2,
        maxTimer: 2,
        message: "DOMAIN EXPANSION: DEADLY SENTENCING",
        options: [],
        argumentOptions: [],
        chosenDialogue: null,
        chosenArgument: null,
      };
      game.domainCharacter = "higuruma";
      game.domainOwnerSlot = game.online.slot;
      game.domainStartup = 2;
      game.domainIntro = 2;
      game.cinematic = 2;
      game.glitch = .7;
      game.windPaused = true;
      announce("DOMAIN EXPANSION: DEADLY SENTENCING");
      tone(95, .45, "square", .25, 180);
      noise(.18, .4);
      return;
    }
    p.domainsUsed = (p.domainsUsed || 0) + 1;
    p.trialStartup = 2;
    p.trialStartupHealth = p.health;
    p.vx = 0;
    p.attack = null;
    p.state = "domainPose";
    game.trial = {
      phase: "startup",
      caster: "player",
      target: "enemy",
      casterSlot: game.online.active ? game.online.slot : 1,
      targetSlot: game.online.active ? (game.online.slot === 1 ? 2 : 1) : 2,
      timer: 2,
      maxTimer: 2,
      message: "DOMAIN EXPANSION: DEADLY SENTENCING",
      options: [],
      argumentOptions: [],
      chosenDialogue: null,
      chosenArgument: null,
    };
    game.domainCharacter = "higuruma";
    game.domainOwnerSlot = game.online.active ? game.online.slot : 1;
    game.domainIntro = 2;
    game.cinematic = 2;
    game.glitch = .7;
    game.windPaused = true;
    announce("DOMAIN EXPANSION: DEADLY SENTENCING");
    tone(95, .45, "square", .25, 180);
    noise(.18, .4);
  }

  function failDeadlySentencing(reason = "DOMAIN FAILED") {
    const p = game.player;
    if (p) {
      p.trialStartup = 0;
      p.state = "hit";
    }
    clearTrialState();
    announce(reason);
    tone(60, .15, "square", .18, -120);
  }

  function beginOfflineTrial() {
    const p = game.player;
    const e = game.enemy;
    if (!p || !e) return;
    const targetCharacter = trialTargetCharacter(e);
    const crime = chooseTrialCrime(targetCharacter);
    const evidence = Math.round(rnd(isSevereTrialCrime(crime) ? 48 : 30, isSevereTrialCrime(crime) ? 86 : 80));
    const options = randomTrialOptions(trialDialoguePool, 3);
    game.trial = {
      phase: "charge",
      online: false,
      caster: "player",
      target: "enemy",
      casterSlot: 1,
      targetSlot: 2,
      targetCharacter,
      crime,
      evidence,
      options,
      argumentOptions: [],
      timer: 3,
      maxTimer: 3,
      message: trialChargeLine(targetCharacter, crime),
      line: trialChargeLine(targetCharacter, crime),
      chosenDialogue: null,
      chosenArgument: null,
      verdict: "",
      punishment: "none",
      prosecutor: 0,
      defense: 0,
      prosecutorBonus: 0,
      defenseBonus: 0,
    };
    clearTrialCombatMotion();
    game.domainIntro = 0;
    game.cinematic = 0;
    game.glitch = .25;
    game.shake = 8;
    announce("COURT IS NOW IN SESSION");
    spawnParticles(W / 2, 135, "#f2cf74", 26, 360, 7, .8);
  }

  function selectTrialAiDialogue(character, options) {
    const ids = options.map((option) => option.id);
    const preferred = character === "gojo"
      ? ["protecting", "necessary", "systemBlame", "noProof"]
      : character === "sukuna"
        ? ["rejectCourt", "noProof", "silent", "admit"]
        : character === "hakari"
          ? ["systemBlame", "noChoice", "silent", "necessary"]
          : ["regret", "admit", "systemBlame", "silent"];
    const found = preferred.find((id) => ids.includes(id));
    return Math.max(0, ids.indexOf(found));
  }

  function selectTrialAiArgument(crime, options) {
    const ids = options.map((option) => option.id);
    const preferred = isSevereTrialCrime(crime)
      ? ["deathPenalty", "violence", "past", "evidence"]
      : /self-defense/i.test(crime)
        ? ["falseDefense", "contradict", "evidence", "confiscation"]
        : /property|damage|destruction/i.test(crime)
          ? ["unnecessary", "evidence", "confiscation", "motive"]
          : ["evidence", "confiscation", "motive", "contradict"];
    const found = preferred.find((id) => ids.includes(id));
    return Math.max(0, ids.indexOf(found));
  }

  function trialCardRect(index) {
    const margin = 68;
    const gap = 18;
    const w = (W - margin * 2 - gap * 2) / 3;
    const h = 112;
    return { x: margin + index * (w + gap), y: H - h - 96, w, h };
  }

  function canvasPointFromMouse(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function trialCardIndexAt(point, trial = game.trial) {
    const choice = visibleTrialChoice(trial);
    if (!choice.options.length || !point) return -1;
    for (let index = 0; index < choice.options.length; index++) {
      const card = trialCardRect(index);
      if (point.x >= card.x && point.x <= card.x + card.w && point.y >= card.y && point.y <= card.y + card.h) return index;
    }
    return -1;
  }

  function selectableTrialPhase(trial = game.trial) {
    return Boolean(trial && (trial.phase === "testimony" || trial.phase === "argument"));
  }

  function visibleTrialChoice(trial = game.trial) {
    if (!trial) return { phase: "", options: [] };
    const phase = selectableTrialPhase(trial) ? trial.phase : "";
    const testimonyOptions = Array.isArray(trial.options) ? trial.options : [];
    const argumentOptions = Array.isArray(trial.argumentOptions) ? trial.argumentOptions : [];
    if (phase === "testimony" && testimonyOptions.length) {
      return { phase: "testimony", options: testimonyOptions.filter(Boolean).slice(0, 3) };
    }
    if (phase === "argument" && argumentOptions.length) {
      return { phase: "argument", options: argumentOptions.filter(Boolean).slice(0, 3) };
    }
    return { phase: "", options: [] };
  }

  function localCanChooseTrial(trial = game.trial) {
    const choice = visibleTrialChoice(trial);
    if (!choice.phase || !choice.options.length) return false;
    if (!game.online.active || !game.online.authoritative) return true;
    const slot = Number(game.online.slot || 0);
    return choice.phase === "testimony"
      ? slot === Number(trial.targetSlot || 0)
      : slot === Number(trial.casterSlot || 0);
  }

  function trialChoiceStatus(trial = game.trial) {
    const choice = visibleTrialChoice(trial);
    if (!trial || !choice.phase || !choice.options.length) return { choice, canChoose: false, pending: false, label: "" };
    const canChoose = localCanChooseTrial(trial);
    const pending = game.online.active && game.online.authoritative && trial.localChoicePendingPhase === choice.phase;
    const label = pending
      ? "CHOICE SENT"
      : canChoose
        ? (choice.phase === "argument" ? "YOUR ARGUMENT - PRESS 1 / 2 / 3 OR CLICK" : "YOUR TESTIMONY - PRESS 1 / 2 / 3 OR CLICK")
        : "WAITING FOR OPPONENT";
    return { choice, canChoose, pending, label };
  }

  function syncTrialUiState() {
    const trial = game.trial;
    if (!trial) {
      game.trialHover = -1;
      game.trialDebugPhase = "";
      game.trialOptionWarning = "";
      return;
    }
    const choice = visibleTrialChoice(trial);
    const phaseKey = `${trial.phase}:${Math.ceil(Number(trial.timer || 0) * 10)}:${(trial.options || []).length}:${(trial.argumentOptions || []).length}`;
    if (game.trialDebugPhase !== phaseKey) {
      // console.log("[TRIAL]", trial.phase, trial.timer, (trial.options || []).length, (trial.argumentOptions || []).length);
      game.trialDebugPhase = phaseKey;
    }
    if (!choice.options.length) game.trialHover = -1;
    if (selectableTrialPhase(trial) && !choice.options.length) {
      const warnKey = `${trial.phase}:missing`;
      if (game.trialOptionWarning !== warnKey) {
        console.warn("[TRIAL] missing selectable options", trial.phase);
        game.trialOptionWarning = warnKey;
      }
    } else {
      game.trialOptionWarning = "";
    }
    if (trial.localChoicePendingPhase && trial.localChoicePendingPhase !== trial.phase) {
      trial.localChoicePendingPhase = "";
    }
    if (trial.localChoicePendingPhase === "testimony" && (trial.dialogue || trial.chosenDialogue || trial.phase !== "testimony")) {
      trial.localChoicePendingPhase = "";
    }
    if (trial.localChoicePendingPhase === "argument" && (trial.argument || trial.chosenArgument || trial.phase !== "argument")) {
      trial.localChoicePendingPhase = "";
    }
  }

  function clearTrialState() {
    game.trial = null;
    game.trialHover = -1;
    game.trialDebugPhase = "";
    game.trialOptionWarning = "";
    game.domainIntro = 0;
    game.domainStartup = 0;
    game.domainOwnerSlot = 0;
    game.cinematic = 0;
    game.windPaused = false;
    for (const fighter of [game.player, game.enemy]) {
      if (!fighter) continue;
      if (fighter.state === "judged" || fighter.state === "domainPose" || fighter.state === "voidFrozen") fighter.state = "idle";
      fighter.charging = false;
      fighter.blocking = false;
    }
  }

  function chooseTrialOption(index) {
    const trial = game.trial;
    const choice = visibleTrialChoice(trial);
    if (!trial || !choice.options.length || !localCanChooseTrial(trial)) return;
    const safeIndex = clamp(Math.round(Number(index) || 0), 0, choice.options.length - 1);
    if (game.online.active && game.online.authoritative) {
      if (trial.localChoicePendingPhase === choice.phase) return;
      trial.localChoicePendingPhase = choice.phase;
      queueOnlineEdge("trialChoice", safeIndex);
      announce(choice.phase === "argument" ? "ARGUMENT SENT" : "TESTIMONY SENT");
      game.trialHover = -1;
      return;
    }
    if (choice.phase === "testimony") {
      const option = choice.options[safeIndex];
      trial.chosenDialogue = option;
      trial.message = `${trialCharacterLine(trial.targetCharacter, "testimony")} "${option?.text || "I will say nothing."}"`;
      trial.argumentOptions = randomTrialOptions(trialArgumentPool, 3);
      trial.phase = "argument";
      trial.localChoicePendingPhase = "";
      game.trialHover = -1;
      trial.timer = 8;
      trial.maxTimer = 8;
      tone(180, .12, "square", .15, 120);
    } else if (choice.phase === "argument") {
      const option = choice.options[safeIndex];
      game.trialHover = -1;
      resolveOfflineTrial(option);
    }
  }

  function resolveOfflineTrial(argument) {
    const trial = game.trial;
    if (!trial) return;
    trial.chosenArgument = argument;
    const score = calculateTrialScore({
      targetCharacter: trial.targetCharacter,
      crime: trial.crime,
      evidence: trial.evidence,
      dialogue: trial.chosenDialogue || trialDialoguePool.find((option) => option.id === "silent"),
      argument,
    });
    Object.assign(trial, score, {
      phase: "verdictClash",
      timer: 3,
      maxTimer: 3,
      baseProsecutor: score.prosecutor,
      baseDefense: score.defense,
      prosecutorBonus: 0,
      defenseBonus: 0,
      message: "THE SCALE WILL DECIDE",
    });
    game.shake = 8;
    announce("VERDICT CLASH");
    tone(120, .18, "square", .18, 160);
  }

  function finalizeOfflineTrialVerdict() {
    const trial = game.trial;
    if (!trial) return;
    const score = calculateTrialScore({
      targetCharacter: trial.targetCharacter,
      crime: trial.crime,
      evidence: trial.evidence,
      dialogue: trial.chosenDialogue || trialDialoguePool.find((option) => option.id === "silent"),
      argument: trial.chosenArgument || trialArgumentPool.find((option) => option.id === "evidence"),
      prosecutorBonus: trial.prosecutorBonus,
      defenseBonus: trial.defenseBonus,
    });
    Object.assign(trial, score, {
      phase: "verdict",
      timer: 2,
      maxTimer: 2,
      message: trialVerdictLabel(score.verdict),
      verdict: score.verdict,
      punishment: score.punishment,
    });
    applyTrialPunishment(score.punishment, trial.target === "player" ? game.player : game.enemy, trial.caster === "player" ? game.player : game.enemy);
    game.shake = 20;
    game.flash = .28;
    announce(trialVerdictLabel(score.verdict));
    tone(score.punishment === "deathPenalty" ? 58 : 105, .48, "square", .34, 260);
    noise(.22, .45);
    spawnParticles(W / 2, H / 2, score.punishment === "deathPenalty" ? "#ffb23d" : "#f2cf74", 52, 560, 10, 1);
  }

  function applyTrialPunishment(punishment, target, caster) {
    if (!target || !caster) return;
    if (punishment === "confiscation") {
      target.moveConfiscation = Math.max(target.moveConfiscation || 0, 15);
      target.attack = null;
      target.charging = false;
      target.techniqueCharge = null;
      target.fuga = 0;
      target.jackpot = 0;
      announce("TECHNIQUE CONFISCATED");
      spawnParticles(target.x, target.y - target.h * .55, "#f2cf74", 36, 380, 8, .85);
      tone(95, .3, "square", .25, -90);
    } else if (punishment === "deathPenalty" && caster.character === "higuruma") {
      caster.executionSword = 18;
      caster.executionSwordUsed = false;
      caster.cooldowns.purple = 0;
      announce("EXECUTIONER'S SWORD");
      game.flash = .32;
      spawnParticles(caster.x, caster.y - 80, "#f2cf74", 48, 460, 8, .9);
      tone(64, .55, "square", .34, 180);
    } else if (punishment === "fine") {
      target.energy = Math.max(0, target.energy - 25);
      if (target.cooldowns) {
        for (const key of Object.keys(target.cooldowns)) target.cooldowns[key] += 2;
      }
    } else if (punishment === "mistrial") {
      target.energy = Math.max(0, target.energy - 15);
      caster.energy = Math.max(0, caster.energy - 15);
      target.vx = Math.sign(target.x - caster.x || 1) * 420;
      caster.vx = -Math.sign(target.x - caster.x || 1) * 320;
    } else if (punishment === "notGuilty") {
      caster.energy = Math.max(0, caster.energy - 50);
      caster.executionRecovery = Math.max(caster.executionRecovery || 0, 4);
    }
  }

  function endTrialWithFightResume() {
    if (!game.trial) return;
    game.trial.phase = "resume";
    game.trial.timer = .8;
    game.trial.maxTimer = .8;
    game.trial.message = "READY?";
    game.trial.options = [];
    game.trial.argumentOptions = [];
    game.trial.localChoicePendingPhase = "";
    game.trialHover = -1;
    game.flash = .12;
  }

  function updateTrial(dt) {
    const trial = game.trial;
    if (!trial) return false;
    ui.pause.classList.add("hidden");
    ui.characterSelect.classList.add("hidden");
    ui.menu.classList.add("hidden");
    ui.onlineMenu?.classList.add("hidden");
    ui.onlineLobby?.classList.add("hidden");
    ui.onlineHome?.classList.add("hidden");
    ui.intro?.classList.add("hidden");
    ui.result.classList.add("hidden");
    syncTrialUiState();
    if (game.player && game.enemy) {
      const focus = trial.phase === "startup" || trial.phase === "argument"
        ? game.player.x
        : trial.phase === "testimony"
          ? game.enemy.x
          : W / 2;
      game.cameraFocusX = lerp(game.cameraFocusX, focus, clamp(dt * 3.5, 0, 1));
      game.cameraFocusY = lerp(game.cameraFocusY, trial.phase === "verdict" ? 175 : GROUND / 2 + 40, clamp(dt * 3.5, 0, 1));
      game.cameraTarget = trial.phase === "startup" || trial.phase === "verdict" ? 1.25 : trial.phase === "argument" || trial.phase === "testimony" ? 1.14 : 1.04;
    }
    if (trial.phase === "startup") {
      if (game.online.active && game.online.authoritative) {
        trial.timer = Math.max(0, trial.timer - dt);
        clearTrialCombatMotion();
        return true;
      }
      const p = game.player;
      if (!p || p.stun > 0 || p.health < p.trialStartupHealth - .1) {
        failDeadlySentencing("DOMAIN BROKEN");
        return false;
      }
      trial.timer -= dt;
      p.trialStartup = Math.max(0, trial.timer);
      if (trial.timer <= 0 && (!game.online.active || !game.online.authoritative)) beginOfflineTrial();
      clearTrialCombatMotion();
      return true;
    }
    clearTrialCombatMotion();
    if (game.online.active && game.online.authoritative) {
      trial.timer = Math.max(0, trial.timer - dt);
      if (trial.phase === "resume" && trial.timer <= 0) {
        clearTrialState();
        announce("FIGHT");
      } else if (trial.phase === "resume" && trial.timer <= .45) {
        trial.message = "FIGHT";
      }
      return true;
    }
    trial.timer -= dt;
    if (trial.phase === "charge" && trial.timer <= 0) {
      trial.phase = "testimony";
      trial.timer = 8;
      trial.maxTimer = 8;
      trial.message = "CHOOSE TESTIMONY";
      tone(230, .12, "square", .14, 120);
      const targetIsAi = trial.target !== "player";
      if (targetIsAi) {
        const pick = selectTrialAiDialogue(trial.targetCharacter, trial.options);
        setTimeout(() => {
          if (game.trial === trial && trial.phase === "testimony") chooseTrialOption(pick);
        }, 900);
      }
    } else if (trial.phase === "testimony" && trial.timer <= 0) {
      const silentIndex = Math.max(0, trial.options.findIndex((option) => option.id === "silent"));
      chooseTrialOption(silentIndex);
    } else if (trial.phase === "argument" && trial.timer <= 0) {
      const evidenceIndex = Math.max(0, trial.argumentOptions.findIndex((option) => option.id === "evidence"));
      chooseTrialOption(evidenceIndex);
    } else if (trial.phase === "verdictClash") {
      if (keys.has("a")) trial.prosecutorBonus = Math.min(8, (trial.prosecutorBonus || 0) + dt * 3.2);
      if (keys.has("d")) trial.defenseBonus = Math.min(8, (trial.defenseBonus || 0) + dt * 2.2);
      if (trial.target !== "player") trial.defenseBonus = Math.min(8, (trial.defenseBonus || 0) + dt * 1.7);
      if (Math.floor((trial.timer + dt) * 4) !== Math.floor(trial.timer * 4)) tone(58, .05, "sine", .12, 30);
      if (trial.timer <= 0) finalizeOfflineTrialVerdict();
    } else if (trial.phase === "verdict" && trial.timer <= 0) {
      endTrialWithFightResume();
    } else if (trial.phase === "resume") {
      if (trial.timer <= .45) trial.message = "FIGHT";
      if (trial.timer <= 0) {
        clearTrialState();
        announce("FIGHT");
      }
    }
    return true;
  }

  function startExecutionSwordAttack(p, target) {
    if (!p || p.executionSword <= 0 || p.executionSwordUsed) return;
    p.executionSwordUsed = true;
    p.attack = {
      name: "Executioner's Sword", elapsed: 0, duration: .78, start: .24, end: .36,
      active: false, hit: new Set(), type: "executionSword", specialCancel: false,
      range: 112, h: 76, y: -76, damage: 500, kbX: 120, kbY: 80,
      reaction: "slash", color: "#f2cf74", strong: true, execution: true, fixedDamage: true,
    };
    p.vx = p.facing * 220;
    p.dashTime = 0;
    p.state = "executionSword";
    game.cinematic = .28;
    game.cameraTarget = 1.18;
    announce("EXECUTIONER'S SWORD");
    tone(420, .2, "square", .24, 320);
    spawnParticles(p.x + p.facing * 40, p.y - 70, "#f2cf74", 20, 320, 7, .55);
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
      const enhanced = p.energy + characters.sukuna.costs.blue > 50;
      p.attack = {
        name: enhanced ? "Maximum Output: Cleave" : "Cleave", elapsed: 0, duration: enhanced ? .62 : .48, start: .16, end: enhanced ? .4 : .31,
        active: false, hit: new Set(), type: "cleave", specialCancel: true,
        range: enhanced ? 148 : 104, h: enhanced ? 104 : 82, y: -88, damage: (15 + weakened * 13) * (enhanced ? 1.65 : 1),
        kbX: 310, kbY: 170, reaction: "slash", color: "#ff244f", strong: weakened > .45, slash: true,
      };
      if (enhanced) {
        p.cooldowns.blue = 10;
        announce("MAXIMUM OUTPUT: CLEAVE");
      }
      p.state = "slash";
      tone(105, .2, "sawtooth", .25, 220);
    } else if (name === "purple") {
      p.worldSlashUses++;
      p.attack = {
        name: "World Slash", elapsed: 0, duration: .82, start: .34, end: .52,
        active: false, hit: new Set(), type: "worldSlash", specialCancel: false, damage: 200,
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
          damage: 200, kbX: 760, kbY: 240, strong: true, erasing: true,
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
      const doorIndex = game.projectiles.findIndex((projectile) =>
        projectile.owner === "player" && projectile.type === "door" && Math.abs(projectile.x - p.x) < 190
      );
      if (doorIndex >= 0) {
        const door = game.projectiles.splice(doorIndex, 1)[0];
        const projectile = {
          owner: "player", type: "door", rarity: door.rarity,
          x: door.x, y: door.y, vx: p.facing * 760, vy: -40,
          w: 54, h: 118, life: 1.25, damage: 34,
          kbX: 580, kbY: 190, strong: true, launchedDoor: true,
        };
        game.projectiles.push(projectile);
        p.cooldowns.red = Math.max(p.cooldowns.red, 8);
        p.cooldowns.blue = Math.max(p.cooldowns.blue, 10);
        p.attack = { name: "Shutter Breaker", elapsed: 0, duration: .56, start: .12, end: .34, active: false, hit: new Set(), type: "roughPunch" };
        p.state = "roughPunch";
        announce("SHUTTER BREAKER");
        return;
      }
      if (!p.grounded) {
        p.attack = {
          name: "Rough Downkick", elapsed: 0, duration: .62, start: .12, end: .5,
          active: false, hit: new Set(), type: "roughPunch", specialCancel: false,
          range: 72, h: 90, y: -32, damage: 24, kbX: 60, kbY: -820,
          reaction: "slam", color: "#55f087", strong: true, rough: true, downslam: true,
        };
        p.vy = 900;
        p.airRoughCrater = true;
        p.state = "roughDownkick";
        announce("ROUGH DOWNKICK");
        return;
      }
      p.attack = {
        name: "Rough Cursed Punch", elapsed: 0, duration: p.jackpot > 0 ? .3 : .44,
        start: p.jackpot > 0 ? .08 : .14, end: p.jackpot > 0 ? .2 : .3,
        active: false, hit: new Set(), type: "roughPunch", specialCancel: true,
        range: 96, h: 65, y: -72, damage: p.jackpot > 0 ? 18 : 14.5,
        kbX: 270, kbY: 120, reaction: "body", color: "#55f087",
        strong: true, rough: true, armor: true,
      };
      p.attack.moveSpeed = p.jackpot > 0 ? 620 : 490;
      p.vx = p.facing * p.attack.moveSpeed;
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
        p.attack.moveSpeed = 285;
        p.state = "gamblersLuck";
        p.vx = p.facing * p.attack.moveSpeed;
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
        p.attack.moveSpeed = 220;
        p.state = "feverBreaker";
        p.vx = p.facing * p.attack.moveSpeed;
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
          w: 20, h: 20, life: 2.4, damage: 30, kbX: 210, kbY: 85,
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
    spawnParticles(x, y, "#814dff", 22, 340, 7, .82);
    spawnParticles(x, y, "#ff315d", 8, 280, 5, .58);
    spawnParticles(x, y, "#438cff", 8, 280, 5, .58);
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
    p.vx = 0;
    p.dashTime = 0;
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
    spawnParticles(purple.x, purple.y, "#b06cff", 28, 610, 9, .9);
    damageProps(p, { strong: true, damage: 100, range: 900, y: -180, h: 240 });
    game.props.forEach((prop) => { prop.hp = 0; });
    tone(42, 1.2, "sawtooth", .46, 330);
    noise(.65, .32);
  }

  function collapseUnstablePurple() {
    const purple = game.unstablePurple;
    const p = game.player;
    const primaryEnemy = isSurvivalMode() ? retargetSurvivalEnemy() : game.enemy;
    if (!purple) return;
    const playerDistance = Math.hypot(p.x - purple.x, (p.y - p.h / 2) - purple.y);
    if (playerDistance < 430) {
      p.health -= 30;
      p.vx = Math.sign(p.x - purple.x || -purple.facing) * 620;
      p.vy = -360;
      p.stun = 1.15;
      p.burnout = 9;
      p.attack = null;
    }
    const purpleTargets = isSurvivalMode() ? activeSurvivalEnemies() : [primaryEnemy].filter(Boolean);
    for (const e of purpleTargets) {
      const enemyDistance = Math.hypot(e.x - purple.x, (e.y - e.h / 2) - purple.y);
      if (enemyDistance < 470) {
        e.health -= 38;
        e.vx = Math.sign(e.x - purple.x || purple.facing) * 780;
        e.vy = -440;
        e.stun = 1.35;
        e.reaction = "purpleBlast";
        e.burned = true;
      }
    }
    p.burned = true;
    game.props.forEach((prop) => {
      if (Math.abs(prop.x + prop.w / 2 - purple.x) < 500) prop.hp = 0;
    });
    showPurpleCollapse(purple.x, purple.y);
    sendOnline("event", { kind: "purpleCollapse", x: purple.x, y: purple.y });
  }

  function activateDomain() {
    const p = game.player;
    const profile = characterProfile(p);
    const localSlot = game.online.active ? game.online.slot : 1;
    const activeEnemyDomain = game.domain > 0
      && !game.clash
      && (
        game.domainOwnerSlot > 0
          ? game.domainOwnerSlot !== localSlot
          : game.domainCharacter && game.domainCharacter !== p.character
      );
    if (p.character === "sukuna") {
      p.sukunaDomainUses++;
      updateWorldSlashUnlock(p);
    }
    p.domainsUsed = (p.domainsUsed || 0) + 1;
    p.cooldowns.domain = profile.cooldowns.domain;
    p.attack = null;
    p.state = "domain";
    p.invuln = 2.4;
    if (activeEnemyDomain) {
      game.domainClashPending = true;
      game.domainIntro = 0;
      game.cinematic = 0;
      game.domainStartup = 0;
      game.windPaused = true;
      if (game.online.active) {
        game.online.stats.domains++;
        game.online.localDomainWindow = 1.6;
        sendOnline("event", { kind: "domain", character: p.character, counter: true });
      }
      beginClash("DOMAIN COLLISION", true);
      if (game.clash) game.clash.counterDomain = true;
      announce("DOMAIN CLASH");
      tone(85, .5, "sawtooth", .25, 120);
      return;
    }
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
    game.domain = 60;
    game.domainCharacter = "hakari";
    game.hakariDomain = {
      timer: 60,
      rollIndex: 0,
      maxRolls: 5,
      slots: [1, 3, 7],
      displaySlots: [1, 3, 7],
      rollInputs: [],
      lastRarity: "",
      chanceNumerator: 1,
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
    const rarityMultiplier = { green: 1, red: 3, gold: 6 };
    const jackpotNumerator = Math.min(239, domain.rollInputs.reduce(
      (total, input) => total * (rarityMultiplier[input.rarity] || 1),
      1,
    ));
    domain.chanceNumerator = jackpotNumerator;
    const roll = Math.random();
    const result = forced || (roll < jackpotNumerator / 239 ? "jackpot" : "fail");
    const number = 1 + Math.floor(Math.random() * 7);
    if (result === "jackpot") {
      domain.slots = [number, number, number];
      domain.displaySlots = [...domain.slots];
      domain.result = "jackpot";
      startJackpot();
    } else {
      domain.slots = [1 + Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 7)];
      domain.displaySlots = [...domain.slots];
      domain.result = "fail";
      p.energy = Math.min(100, p.energy + 10);
      p.stun = Math.max(p.stun, .28);
      announce(`ROLL ${domain.rollIndex + 1}/5 MISSED`);
      tone(90, .25, "square", .18, -40);
    }
    domain.flash = .7;
    domain.rollIndex++;
    domain.rollInputs = [];
    if (result !== "jackpot" && domain.rollIndex >= domain.maxRolls) {
      shatterHakariDomain(false, "FIVE ROLLS MISSED");
    }
  }

  function startJackpot(fromClash = false) {
    const p = game.player;
    p.jackpot = HAKARI_JACKPOT_DURATION;
    p.energy = 100;
    p.health = Math.min(p.maxHealth, p.health + 18);
    p.awakening = HAKARI_JACKPOT_DURATION;
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
    startHakariJackpotMusic();
    if (game.online.active) sendOnline("event", { kind: "jackpot", duration: HAKARI_JACKPOT_DURATION });
  }

  function shatterHakariDomain(forced = false, message = "GAMBLE SHATTERED") {
    const p = game.player;
    if (!game.hakariDomain && !forced) return;
    game.hakariDomain = null;
    game.domain = 0;
    p.energy = Math.max(0, p.energy - 28);
    p.stun = Math.max(p.stun, 1.15);
    game.shake = 17;
    game.glitch = .45;
    announce(message);
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
        stopHakariJackpotMusic();
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

  function enemyStartAttack(type = "light") {
    const e = game.enemy;
    if (!e || e.stun > 0 || e.attack) return;
    const boss = e.type.boss;
    const defs = {
      light: { name: "Rend", duration: .48, start: .18, end: .29, range: 64, h: 62, y: -76, damage: 10, kbX: 210, kbY: 100 },
      barrage: { name: "Curse Barrage", duration: .7, start: .15, end: .53, range: 70, h: 66, y: -78, damage: 12, kbX: 150, kbY: 70 },
      heavy: { name: "Calamity Crush", duration: .78, start: .38, end: .53, range: boss ? 105 : 83, h: 80, y: -87, damage: boss ? 22 : 17, kbX: 390, kbY: 290, strong: true },
      sweep: { name: "Night Sweep", duration: .62, start: .29, end: .43, range: 92, h: 42, y: -42, damage: 14, kbX: 260, kbY: 210 },
    };
    e.attack = { ...defs[type], elapsed: 0, hit: new Set(), active: false, type };
    e.state = type;
    e.stateTime = 0;
  }

  function enemyStartCharacterMelee(e, strong = false) {
    if (!e || e.stun > 0 || e.attack) return false;
    const chain = characterChains(e).ground;
    const step = strong ? chain.length - 1 : Math.floor(rnd(0, Math.min(4, chain.length)));
    const base = chain[clamp(step, 0, chain.length - 1)];
    e.attack = {
      ...base,
      elapsed: 0,
      hit: new Set(),
      active: false,
      type: strong || base.strong ? "heavy" : "light",
      damage: base.damage * (strong ? 1.15 : .95),
      specialCancel: false,
      chainStep: step,
    };
    e.state = base.slash ? "slash" : base.gavel ? "gavel" : strong || base.strong ? "heavy" : "light";
    e.stateTime = 0;
    e.vx = e.facing * Number(strong ? 70 : 42);
    return true;
  }

  function enemyProjectileCharacter(e, projectile) {
    if (!e || !projectile) return false;
    game.projectiles.push({ owner: "enemy", ...projectile });
    e.state = projectile.castState || "cast";
    e.stateTime = .35;
    tone(projectile.tone || 160, .14, "sawtooth", .17, projectile.slide || 0);
    return true;
  }

  function enemyStartCharacterSpecial(e) {
    if (!e || e.stun > 0 || e.attack) return false;
    const p = game.player;
    const dist = Math.abs(p.x - e.x);
    const facing = e.facing || (p.x > e.x ? 1 : -1);
    e.energy = 100;
    if (e.character === "gojo") {
      const roll = Math.random();
      if (roll > .82 && dist > 150) {
        return enemyProjectileCharacter(e, {
          type: "purple", x: e.x + facing * 94, y: e.y - 84,
          vx: facing * 640, vy: 0, w: 160, h: 88, life: 1.25,
          damage: 48, kbX: 780, kbY: 210, strong: true, erasing: true,
          tone: 46, slide: 280,
        });
      }
      if (roll > .45) {
        return enemyProjectileCharacter(e, {
          type: "red", x: e.x + facing * 55, y: e.y - 80,
          vx: facing * 520, vy: 0, w: 48, h: 48, life: 1.5,
          damage: 18, kbX: 620, kbY: 240, strong: true,
          tone: 150, slide: -90,
        });
      }
      return enemyProjectileCharacter(e, {
        type: "blue", x: e.x + facing * 170, y: e.y - 105,
        vx: facing * 55, vy: 0, w: 38, h: 38, life: 2.4,
        damage: 2.3, tick: 0, strong: false,
        tone: 250, slide: 180,
      });
    }
    if (e.character === "sukuna") {
      const roll = Math.random();
      if (roll > .86 && dist > 120) {
        return enemyProjectileCharacter(e, {
          type: "worldSlash", x: e.x + facing * 70, y: e.y - 82,
          vx: facing * 780, vy: 0, w: 190, h: 42, life: 1.05,
          damage: 68, kbX: 760, kbY: 180, strong: true,
          tone: 90, slide: -180,
        });
      }
      if (dist < 135 && roll > .44) {
        e.attack = {
          name: "Cleave", elapsed: 0, duration: .52, start: .15, end: .34,
          active: false, hit: new Set(), type: "cleave", range: 96, h: 74, y: -78,
          damage: 24, kbX: 360, kbY: 130, reaction: "slash", color: "#ff244f", strong: true,
        };
        e.state = "slash";
        return true;
      }
      return enemyProjectileCharacter(e, {
        type: "dismantle", x: e.x + facing * 52, y: e.y - 74,
        vx: facing * 640, vy: 0, w: 92, h: 26, life: .75,
        damage: 18, kbX: 330, kbY: 80, strong: false,
        tone: 230, slide: -160,
      });
    }
    if (e.character === "hakari") {
      const roll = Math.random();
      if (dist < 125 && roll > .42) {
        e.attack = {
          name: roll > .72 ? "Fever Breaker" : "Rough Cursed Punch",
          elapsed: 0, duration: roll > .72 ? .62 : .48, start: .12, end: roll > .72 ? .42 : .3,
          active: false, hit: new Set(), type: "roughPunch", range: roll > .72 ? 112 : 88,
          h: 72, y: -72, damage: roll > .72 ? 25 : 18, kbX: roll > .72 ? 430 : 330,
          kbY: roll > .72 ? 420 : 160, reaction: roll > .72 ? "launcher" : "body",
          color: "#55f087", strong: true, rough: true,
        };
        e.vx = facing * 280;
        e.state = "roughPunch";
        return true;
      }
      if (roll > .45) {
        return enemyProjectileCharacter(e, {
          type: "reserveBall", x: e.x + facing * 45, y: e.y - 72,
          vx: facing * 520, vy: -120, w: 28, h: 28, life: 2.2,
          damage: 30, kbX: 240, kbY: 120, strong: false, bounces: 2,
          tone: 390, slide: 140,
        });
      }
      return enemyProjectileCharacter(e, {
        type: "door", x: e.x + facing * 92, y: e.y - 72,
        vx: facing * 420, vy: 0, w: 58, h: 92, life: .9,
        damage: 22, kbX: 380, kbY: 140, strong: true,
        tone: 180, slide: -80,
      });
    }
    if (e.character === "higuruma") {
      if (e.executionSword > 0 && !e.executionSwordUsed && dist < 160 && chance(.34)) {
        startExecutionSwordAttack(e, p);
        return true;
      }
      const roll = Math.random();
      if (roll > .72) {
        e.attack = {
          name: "Giant Gavel Sentence", elapsed: 0, duration: .88, start: .34, end: .56,
          active: false, hit: new Set(), type: "sentence", range: 156, h: 108, y: -78,
          damage: 45, kbX: 360, kbY: -720, reaction: "slam", color: "#f2cf74",
          strong: true, gavel: true, downslam: true,
        };
      } else if (roll > .38) {
        e.attack = {
          name: "Gavel Hook", elapsed: 0, duration: .52, start: .12, end: .32,
          active: false, hit: new Set(), type: "gavelHook", range: 210, h: 62, y: -72,
          damage: 14, kbX: 210, kbY: 70, reaction: "body", color: "#d8aa48",
          strong: false, gavel: true, pull: true,
        };
      } else {
        e.attack = {
          name: "Shapeshifting Gavel", elapsed: 0, duration: .48, start: .1, end: .28,
          active: false, hit: new Set(), type: "gavel", range: 104, h: 66, y: -70,
          damage: 22, kbX: 310, kbY: 120, reaction: "body", color: "#f2cf74",
          strong: true, gavel: true,
        };
      }
      e.state = "gavel";
      return true;
    }
    return false;
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
    if (isPlayerDefending && p.techniqueCharge) cancelChargedTechnique(true);
    if (isPlayerDefending && p.charging) stopEnergyCharge(true);
    if (isPlayerDefending && p.attack?.type === "executionSword" && p.attack.elapsed < p.attack.start) {
      p.executionSword = 0;
      p.executionSwordUsed = true;
      p.executionRecovery = 1.5;
      p.attack = null;
      announce("SWORD STARTUP BROKEN");
    }

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
    if (attack.pull) {
      defender.x = lerp(defender.x, attacker.x + attacker.facing * 64, .65);
      defender.vx = -attacker.facing * 420;
      defender.stun = Math.max(defender.stun, .55);
    }
    if (attack.throwBehind) {
      defender.x = clamp(attacker.x - attacker.facing * 72, 26, W - 26);
      defender.vx = -attacker.facing * 520;
      defender.vy = -120;
      defender.grounded = false;
      defender.stun = Math.max(defender.stun, .68);
    }
    if (attack.crumple && defender.grounded) {
      defender.stun = Math.max(defender.stun, .9);
      defender.vx *= .35;
    }
    defender.stun = armored ? .08 : clamp(.12 + damage * .012, .16, .62);
    if (attack.pull) defender.stun = Math.max(defender.stun, .55);
    if (attack.throwBehind) defender.stun = Math.max(defender.stun, .68);
    if (attack.crumple && defender.grounded) defender.stun = Math.max(defender.stun, .9);
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
      if (p.character === "higuruma" || attack.gavel) {
        spawnParticles(defender.x, defender.y - defender.h * .58, "#f2cf74", attack.strong ? 22 : 11, 330, 7, .5);
        spawnParticles(defender.x + rnd(-14, 14), defender.y - defender.h * .55, "#fff7dc", attack.strong ? 12 : 6, 210, 5, .42);
        if (attack.glass) {
          spawnShockwave(defender.x, defender.y - defender.h * .52, "#f2cf74");
          game.realityCrack = Math.max(game.realityCrack, .2);
          for (let i = 0; i < 12; i++) {
            game.particles.push({
              x: defender.x, y: defender.y - defender.h * .58,
              vx: rnd(-430, 430), vy: rnd(-360, 160),
              size: rnd(4, 10), color: i % 2 ? "#f2cf74" : "#fff7dc",
              life: .55, maxLife: .55, gravity: 180, slash: true,
            });
          }
        }
        if (attack.crack) {
          spawnShockwave(defender.x, GROUND - 2, "#f2cf74");
          spawnParticles(defender.x, GROUND - 7, "#6c5130", 22, 300, 8, .65);
        }
      }
      if (attack.execution) {
        p.executionSword = 0;
        p.executionSwordUsed = true;
        p.cooldowns.purple = 1.5;
        game.slow = .5;
        game.hitstop = .5;
        game.flash = .45;
        game.cameraTarget = 1.35;
        announce(defender.health <= defender.maxHealth * .2 ? "EXECUTION" : "EXECUTIONER'S CUT");
        spawnParticles(defender.x, defender.y - defender.h * .55, "#050505", 36, 520, 11, .85);
        spawnParticles(defender.x, defender.y - defender.h * .55, "#f2cf74", 42, 560, 8, .8);
        spawnShockwave(defender.x, defender.y - defender.h * .55, "#f2cf74");
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
      if (attack.groundFollow || (attack.downslam && (p.character === "sukuna" || p.character === "higuruma"))) {
        const slamColor = p.character === "higuruma" ? "#f2cf74" : "#ff365e";
        const dustColor = p.character === "higuruma" ? "#6c5130" : "#6d3540";
        spawnShockwave(defender.x, GROUND - 2, slamColor);
        spawnParticles(defender.x, GROUND - 8, dustColor, 30, 390, 9, .8);
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
      for (const currentTarget of survivalAttackTargets(entity, target)) {
        if (!currentTarget || attack.hit.has(currentTarget) || !rectsOverlap(box, bodyBox(currentTarget))) continue;
        attack.hit.add(currentTarget);
        const predictedOnlineHit = game.online.active && game.online.authoritative
          && entity.kind === "player" && currentTarget.kind === "remote";
        if (predictedOnlineHit) {
          attack.hitConfirmed = true;
          spawnParticles(
            currentTarget.x - entity.facing * 12,
            currentTarget.y - currentTarget.h * .58,
            attack.color || "#64eaff",
            attack.strong ? 16 : 8,
            attack.strong ? 360 : 240,
            attack.strong ? 7 : 4,
            attack.strong ? .5 : .28
          );
          game.hitstop = attack.strong ? .055 : .025;
          game.shake = Math.max(game.shake, attack.strong ? 7 : 3);
        } else if (applyHit(entity, currentTarget, attack)) {
          attack.hitConfirmed = true;
        }
      }
    }
    if (attack.elapsed >= attack.duration) {
      const buffered = entity.kind === "player" && entity.attackBuffer > 0 && entity.bufferedAttack === "light" && attack.chain;
      const nextStep = attack.chainStep + 1;
      if (entity.kind === "player" && attack.type === "executionSword" && !attack.hitConfirmed) {
        entity.executionSword = 0;
        entity.executionRecovery = 1.5;
        entity.cooldowns.purple = Math.max(entity.cooldowns.purple, 1.5);
        announce("MISSED VERDICT");
        spawnParticles(entity.x + entity.facing * 75, entity.y - 70, "#f2cf74", 20, 280, 6, .55);
        tone(82, .16, "square", .15, -160);
      }
      entity.attack = null;
      if (entity.grounded) entity.vx = 0;
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
    const localSlot = game.online.active ? game.online.slot : 1;
    return Boolean(
      game.domain > 0
      && game.domainCharacter === "gojo"
      && game.domainOwnerSlot > 0
      && game.domainOwnerSlot !== localSlot
    );
  }

  function updatePlayer(dt) {
    const p = game.player;
    const e = game.enemy;
    if (game.online.active && game.online.authoritative) {
      const correctionBlend = clamp(dt * 12, 0, 1);
      p.x += game.online.correctionX * correctionBlend;
      p.y += game.online.correctionY * correctionBlend;
      game.online.correctionX *= 1 - correctionBlend;
      game.online.correctionY *= 1 - correctionBlend;
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
    const localSlot = game.online.active ? game.online.slot : 1;
    const damagedByEnemySukunaDomain = game.domain > 0
      && game.domainCharacter === "sukuna"
      && game.domainOwnerSlot > 0
      && game.domainOwnerSlot !== localSlot
      && (!game.online.active || !game.online.authoritative);
    if (damagedByEnemySukunaDomain) {
      game.domainTick -= dt;
      if (game.domainTick <= 0) {
        game.domainTick += .5;
        const slashDamage = p.blocking ? 7.5 : 15;
        p.health = Math.max(0, p.health - slashDamage);
        p.stun = Math.max(p.stun, .08);
        p.reaction = "slash";
        game.shake = Math.max(game.shake, 8);
        for (let i = 0; i < 7; i++) {
          game.particles.push({
            x: p.x + rnd(-35, 35), y: p.y - rnd(18, p.h),
            vx: rnd(-360, 360), vy: rnd(-280, 180), size: rnd(8, 18),
            color: i % 2 ? "#ff244f" : "#fff1f3",
            life: .24, maxLife: .24, gravity: 0, slash: true,
          });
        }
      }
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
    p.dashTime = Math.max(0, p.dashTime - dt);
    p.regenBoost = Math.max(0, p.regenBoost - dt);
    p.damageRegen = Math.max(0, p.damageRegen - dt);
    p.burnout = Math.max(0, p.burnout - dt);
    p.burnoutSmoke = Math.max(0, p.burnoutSmoke - dt);
    p.voiceCooldown = Math.max(0, p.voiceCooldown - dt);
    p.rewindWindow = Math.max(0, p.rewindWindow - dt);
    p.chargeCooldown = Math.max(0, p.chargeCooldown - dt);
    p.chargeRecovery = Math.max(0, p.chargeRecovery - dt);
    p.chargePulse = Math.max(0, p.chargePulse - dt);
    p.moveConfiscation = Math.max(0, p.moveConfiscation - dt);
    p.executionSword = Math.max(0, p.executionSword - dt);
    p.executionRecovery = Math.max(0, p.executionRecovery - dt);
    if (p.executionSword <= 0) p.executionSwordUsed = false;
    if (p.techniqueCharge) {
      p.techniqueCharge.elapsed = Math.min(5, p.techniqueCharge.elapsed + dt);
      p.vx = 0;
      p.blocking = false;
      p.state = p.character === "sukuna" ? "dismantleCharge" : p.character === "higuruma" ? "gavelCharge" : "redCharge";
      if (p.techniqueCharge.releaseDelay >= 0) {
        p.techniqueCharge.releaseDelay -= dt;
        if (p.techniqueCharge.releaseDelay <= 0) fireChargedTechnique();
      } else if (p.techniqueCharge.elapsed >= 5) {
        p.techniqueCharge.auto = true;
        if (p.character === "higuruma") fireChargedTechnique();
        else p.techniqueCharge.releaseDelay = .5;
      }
    }
    updateDismantleVolley(dt);
    if (p.fuga) {
      p.fuga.timer -= dt;
      p.vx = 0;
      if (!p.fuga.fired && p.fuga.timer <= 1.05) {
        p.fuga.fired = true;
        const projectile = {
          owner: "player", type: "fuga", x: p.x + p.facing * 62, y: p.y - 76,
          vx: p.facing * 820, vy: 0, w: 82, h: 52, life: 1.4,
          damage: 90, kbX: 760, kbY: 320, strong: true, erasing: true, burns: true,
        };
        game.projectiles.push(projectile);
        sendOnline("event", { kind: "projectile", projectile: { ...projectile, owner: undefined } });
        game.shake = 18;
        game.flash = .22;
        spawnParticles(projectile.x, projectile.y, "#ff7a25", 55, 620, 11, 1);
        announce("OPEN");
      }
      if (p.fuga.timer <= 0) p.fuga = null;
    }
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
        const chargeColor = p.character === "sukuna" ? "#ff3158" : p.character === "hakari" ? "#58ff8c" : p.character === "higuruma" ? "#f2cf74" : "#65eaff";
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
    p.canAwaken = false;
    for (const name of Object.keys(p.cooldowns)) p.cooldowns[name] = Math.max(0, p.cooldowns[name] - dt);
    const aggressionRegen = p.character === "sukuna" ? p.pressure * (p.awakening > 0 ? 1.7 : 1.05) : 0;
    const drainingOwnedDomain = game.domain > 0 && game.domainOwnerSlot === (game.online.active ? game.online.slot : 1)
      && (!game.online.active || !game.online.authoritative) && ["gojo", "sukuna"].includes(game.domainCharacter);
    if (drainingOwnedDomain) {
      const drain = game.domainCharacter === "gojo" ? 20 : 10;
      p.energy = Math.max(0, p.energy - dt * drain);
      if (p.energy <= 0) game.domain = 0;
    }
    const regenRate = (1.05 + (p.regenBoost > 0 ? 2.1 : 0) + (p.damageRegen > 0 ? 1.6 : 0) + aggressionRegen)
      * (p.burnout > 0 ? .28 : 1);
    if (!drainingOwnedDomain) p.energy = Math.min(100, p.energy + dt * regenRate);
    if (p.burnout > 0 && p.burnoutSmoke <= 0) {
      p.burnoutSmoke = .09;
      game.particles.push({
        x: p.x + rnd(-12, 12), y: p.y - rnd(45, 92),
        vx: rnd(-18, 18), vy: rnd(-85, -45), size: rnd(5, 10),
        color: chance(.25) ? "#ff6238" : "#34313c",
        life: .8, maxLife: .8, gravity: -20, smoke: true,
      });
    }

    if (p.executionRecovery > 0) {
      p.vx = 0;
      p.blocking = false;
      p.state = "executionMiss";
    } else if (p.stun <= 0 && p.dashTime > 0 && !p.attack && !p.charging && !p.techniqueCharge && game.cinematic <= 0) {
      p.blocking = false;
      p.state = "dash";
    } else if (p.stun <= 0 && !p.attack && !p.charging && !p.techniqueCharge && p.chargeRecovery <= 0 && game.cinematic <= 0) {
      const move = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      const speed = (p.jackpot > 0 ? 402 : p.awakening > 0 ? (p.character === "sukuna" ? 385 : 360) : p.character === "sukuna" ? 312 : p.character === "hakari" ? 318 : p.character === "higuruma" ? 306 : 295) * (p.burnout > 0 ? .58 : 1);
      if (move) {
        const onlineDirectMovement = game.online.active && game.online.authoritative;
        const acceleration = p.grounded ? 22 : 7;
        p.vx = onlineDirectMovement ? move * speed : lerp(p.vx, move * speed, clamp(dt * acceleration, 0, 1));
        p.momentum = clamp(p.momentum + dt * 1.8, 0, 1);
        p.facing = move;
        if (p.grounded) p.state = "run";
        p.trailTimer -= dt;
        if (p.awakening > 0 && p.trailTimer <= 0) {
          addAfterimage(p, p.character === "sukuna" ? "#ff3158" : p.character === "hakari" ? "#5cff91" : p.character === "higuruma" ? "#f2cf74" : "#a7efff");
          p.trailTimer = .09;
        }
      } else {
        const onlineDirectMovement = game.online.active && game.online.authoritative;
        p.vx = onlineDirectMovement ? 0 : lerp(p.vx, 0, clamp(dt * (p.grounded ? 30 : 1.8), 0, 1));
        p.momentum = Math.max(0, p.momentum - dt * 2);
        if (p.grounded && !p.blocking) p.state = "idle";
      }
      p.blocking = keys.has("s") && p.grounded;
      if (p.blocking) {
        p.state = "block";
        p.vx *= .7;
      }
    } else if (p.stun <= 0 && p.attack) {
      p.blocking = false;
      if (p.grounded) p.vx = p.facing * Number(p.attack.moveSpeed || 0);
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
      if (p.airRoughCrater) {
        p.airRoughCrater = false;
        game.shake = 16;
        spawnShockwave(p.x, GROUND - 4, "#55f087");
        spawnParticles(p.x, GROUND - 8, "#65705f", 38, 440, 10, .85);
      }
    } else {
      p.grounded = false;
      if (!p.attack && !p.wall) p.state = "jump";
    }

    const targetEnemy = isSurvivalMode() ? retargetSurvivalEnemy() : e;
    if (targetEnemy && !p.attack && Math.abs(targetEnemy.x - p.x) > 18) p.facing = targetEnemy.x > p.x ? 1 : -1;
    if (targetEnemy) updateAttack(p, targetEnemy, dt * (p.jackpot > 0 ? 1.3 : p.awakening > 0 ? (p.character === "sukuna" ? 1.2 : 1.13) : 1));
  }

  function updateEnemy(dt) {
    if (isSurvivalMode()) {
      updateSurvivalEnemies(dt);
      return;
    }
    updateEnemyEntity(game.enemy, dt);
  }

  function updateSurvivalEnemies(dt) {
    const living = activeSurvivalEnemies();
    if (!living.length) {
      retargetSurvivalEnemy();
      return;
    }
    for (const enemy of living) {
      game.enemy = enemy;
      updateEnemyEntity(enemy, dt);
    }
    separateSurvivalEnemies(dt);
    retargetSurvivalEnemy();
  }

  function updateEnemyEntity(e, dt) {
    const p = game.player;
    if (!e) return;
    if (game.online.active && e.kind === "remote") {
      updateRemotePlayer(dt);
      return;
    }
    const enemySlot = game.online.active ? (game.online.slot === 1 ? 2 : 1) : 2;
    const damagedByPlayerSukunaDomain = game.domain > 0
      && game.domainCharacter === "sukuna"
      && game.domainOwnerSlot !== enemySlot;
    if (damagedByPlayerSukunaDomain) {
      game.domainTick -= dt;
      if (game.domainTick <= 0) {
        game.domainTick += .5;
        const slashDamage = e.blocking ? 7.5 : 15;
        e.health = Math.max(0, e.health - slashDamage);
        e.stun = Math.max(e.stun, .1);
        e.reaction = "slash";
        p.damageDealt += slashDamage;
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
    const frozenByPlayerGojoDomain = game.domain > 0
      && game.domainCharacter === "gojo"
      && game.domainOwnerSlot !== enemySlot;
    if (frozenByPlayerGojoDomain) {
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
    e.moveConfiscation = Math.max(0, Number(e.moveConfiscation || 0) - dt);
    e.executionSword = Math.max(0, Number(e.executionSword || 0) - dt);
    e.executionRecovery = Math.max(0, Number(e.executionRecovery || 0) - dt);
    e.energy = Math.min(100, e.energy + dt * 1.3);
    e.facing = p.x > e.x ? 1 : -1;

    if (e.stun > 0) {
      e.state = e.wallSplat > 0 ? "wallSplat" : `hit-${e.reaction}`;
    } else if (!e.attack && game.cinematic <= 0) {
      e.aiTimer -= dt;
      const dist = Math.abs(p.x - e.x);
      if (e.aiTimer <= 0) {
        const aggression = (difficulty === "easy" ? .72 : difficulty === "hard" ? 1.18 : 1) * Number(e.type.aiLevel || 1);
        e.aiTimer = rnd(e.domainUse ? .22 : .18, e.domainUse ? .55 : .48) / aggression;
        if (e.domainUse && e.character) {
          if (dist < 118 && chance(.58)) {
            enemyStartCharacterMelee(e, chance(.38));
          } else if (dist < 420 && chance(.72)) {
            if (!enemyStartCharacterSpecial(e)) e.decision = "approach";
          } else if (dist < 135) {
            enemyStartCharacterMelee(e, false);
          } else {
            e.decision = "approach";
          }
        } else {
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
          enemyStartAttack(e.survivalCurse ? (roll < Number(e.type.barrageChance || .35) ? "barrage" : "light") : roll > .7 ? "heavy" : roll > .38 ? "sweep" : "light");
        } else if (!e.survivalCurse && dist < 270 && chance(.2 * aggression)) {
          enemyProjectile();
        } else {
          e.decision = "approach";
        }
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
    e.burned = Boolean(target.burned);
    e.onlineVariant = target.variant === "inverted" || target.onlineVariant === "inverted" ? "inverted" : "normal";
    e.heat = target.heat || 0;
    e.jackpot = target.jackpot || 0;
    e.charging = Boolean(target.charging);
    e.techniqueCharge = Number(target.chargedSpecialTicks || 0) > 0
      ? { name: "red", elapsed: Number(target.chargedSpecialTicks) / 60 }
      : null;
    e.moveConfiscation = Number(target.moveConfiscation || 0);
    e.executionSword = Number(target.executionSword || 0);
    e.executionSwordUsed = Boolean(target.executionSwordUsed);
    e.executionRecovery = Number(target.executionRecovery || 0);
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
    const opponentCharacter = game.online.active
      ? (game.online.remoteCharacter || game.enemy.character || "sukuna")
      : game.domain > 0 && game.domainOwnerSlot !== 1 && characters[game.domainCharacter]
        ? game.domainCharacter
        : game.player.character === "gojo" ? "sukuna" : "gojo";
    game.clash = {
      timer: domain ? 4 : 3.2,
      maxTimer: domain ? 4 : 3.2,
      power: 50,
      displayPower: 50,
      lastKey: "",
      domain,
      kind,
      pulse: 0,
      hakari,
      leftCharacter: game.player.character,
      rightCharacter: opponentCharacter,
    };
    game.cinematic = 0;
    game.player.attack = null;
    game.enemy.attack = null;
    game.player.vx = 0;
    game.enemy.vx = 0;
    ui.clashType.textContent = type;
    ui.clash.classList.remove("hidden");
    ui.clash.classList.toggle("domain-clash", domain);
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
    const authoritative = game.online.active && game.online.authoritative;
    if (!authoritative) c.timer -= dt;
    c.pulse -= dt;
    if (!authoritative) {
      const enemyPressure = game.online.active ? 0 : difficulty === "easy" ? 4.6 : difficulty === "hard" ? 8.2 : 6.2;
      c.power -= dt * enemyPressure * (c.domain ? 1.2 : 1);
      c.power = clamp(c.power, 0, 100);
    }
    c.displayPower = lerp(Number(c.displayPower ?? 50), c.power, clamp(dt * 14, 0, 1));
    ui.clashPlayer.style.width = `${c.displayPower}%`;
    ui.clashEnemy.style.width = `${100 - c.displayPower}%`;
    ui.clash.style.setProperty("--clash-split", `${c.displayPower}%`);
    game.shake = Math.max(game.shake, 5 + (1 - c.timer / c.maxTimer) * 11);
    game.cameraTarget = 1.24 + (1 - c.timer / c.maxTimer) * .12;
    if (c.pulse <= 0) {
      c.pulse = .3;
      spawnShockwave(W / 2, GROUND - 95, c.kind === "red" ? "#ff365e" : c.kind === "blue" ? "#5ccfff" : "#a263ff");
      game.props.forEach((prop) => {
        if (prop.hp > 0) prop.hp -= c.domain ? 2.2 : 1.2;
      });
    }
    if (!authoritative && (c.timer <= 0 || c.power <= 0 || c.power >= 100)) resolveClash(c.power >= 50);
  }

  function clashInput(key) {
    const c = game.clash;
    if (!c || (key !== "a" && key !== "d") || c.lastKey === key) return;
    c.lastKey = key;
    c.power = clamp(c.power + 4.6, 0, 100);
    c.displayPower = clamp(Number(c.displayPower ?? c.power) + 2.3, 0, 100);
    if (game.online.active && game.online.authoritative) queueOnlineEdge("clash", key === "a" ? -1 : 1);
    else if (game.online.active) sendOnline("clash", { kind: "input" });
    game.shake = 5;
    spawnParticles(W / 2 + rnd(-60, 60), H / 2 + rnd(-40, 40), key === "a" ? "#62eaff" : "#8a6bff", 5, 260, 5, .35);
    tone(key === "a" ? 310 : 390, .045, "square", .12, 40);
  }

  function resolveClash(won) {
    const wasDomain = game.clash.domain;
    const hakariClash = game.clash.hakari;
    const counterDomain = game.clash.counterDomain;
    game.clash = null;
    ui.clash.classList.add("hidden");
    ui.clash.classList.remove("domain-clash");
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
      else if (wasDomain) {
        game.domain = 8;
        game.domainCharacter = game.player.character;
        game.domainOwnerSlot = game.online.active ? game.online.slot : 1;
        game.domainTick = .5;
      }
      spawnParticles(game.enemy.x, game.enemy.y - 55, "#65e9ff", 42, 560, 8, 1);
    } else {
      announce(hakariClash ? "GAMBLE OVERWHELMED" : "LIMIT BROKEN");
      game.player.health -= wasDomain ? (hakariClash ? 12 : 22) : 15;
      game.player.stun = hakariClash ? 1.65 : 1.25;
      game.player.vx = -game.player.facing * 520;
      if (hakariClash) shatterHakariDomain(true);
      else if (wasDomain && !counterDomain) game.domain = 0;
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
        const blueAttacker = o.owner === "player" ? p : e;
        const blueTargets = o.owner === "player" && isSurvivalMode() ? activeSurvivalEnemies() : [o.owner === "player" ? e : p].filter(Boolean);
        o.tick = Number.isFinite(o.tick) ? o.tick - dt : 0;
        const pulseReady = !o.visualOnly && o.tick <= 0;
        let pulsed = false;
        for (const blueTarget of blueTargets) {
          const dx = o.x - blueTarget.x;
          const dy = o.y - (blueTarget.y - blueTarget.h / 2);
          const dist = Math.hypot(dx, dy);
          if (dist < 340) {
            const predictedRemote = game.online.active && game.online.authoritative && blueTarget.kind === "remote";
            if (!predictedRemote) {
              blueTarget.vx += (dx / Math.max(1, dist)) * 940 * dt;
              blueTarget.vy += (dy / Math.max(1, dist)) * 470 * dt;
            }
            if (!predictedRemote && pulseReady && dist < 85) {
              applyHit(blueAttacker, blueTarget, { name: "Blue", type: "special", damage: o.damage, kbX: 20, kbY: 0, color: "#3d8dff", fixedDamage: o.reflected });
              pulsed = true;
            }
          }
        }
        if (pulsed) o.tick = .38;
        if (chance(.35)) spawnParticles(o.x, o.y, "#4e7fff", 1, 80, 3, .3);
      }
      if (o.visualOnly) {
        if (o.life <= 0 || o.x < -300 || o.x > W + 300) game.projectiles.splice(i, 1);
        continue;
      }

      const box = { x: o.x - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h };
      const projectileTargets = o.owner === "player" && isSurvivalMode() ? activeSurvivalEnemies() : [o.owner === "player" ? e : p].filter(Boolean);
      for (const target of projectileTargets) {
        if (!target || o.hitTarget || (o.hitTargets && o.hitTargets.has(target)) || o.type === "blue" || !rectsOverlap(box, bodyBox(target))) continue;
        o.hitTargets ||= new Set();
        o.hitTargets.add(target);
        const attacker = o.owner === "player" ? p : e;
        if (!attacker) continue;
        const predictedRemote = game.online.active && game.online.authoritative
          && attacker.kind === "player" && target.kind === "remote";
        const projectileNames = {
          purple: "Hollow Purple",
          red: "Reversal: Red",
          dismantle: "Dismantle",
          worldSlash: "World Slash",
          fuga: "Fuga",
          door: "Shutter Doors",
          reserveBall: "Reserve Ball",
        };
        if (predictedRemote) {
          spawnParticles(
            target.x, target.y - target.h * .55,
            o.type === "fuga" ? "#ff8a28"
              : o.type === "door" || o.type === "reserveBall" ? "#55f087"
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
            color: o.type === "fuga" ? "#ff8a28"
              : o.type === "door" || o.type === "reserveBall" ? "#55f087"
              : o.type === "dismantle" || o.type === "worldSlash" ? "#ff244f"
              : o.owner === "player" ? (o.type === "red" ? "#ff315f" : "#8d55ff") : "#ff4c73",
          });
        }
        if (o.type === "purple") {
          damageProps(p, { strong: true, damage: 50, range: 400, y: -150, h: 180 });
        }
        if (o.type === "fuga") {
          target.burned = true;
          game.shake = 25;
          game.flash = .35;
          for (let burst = 0; burst < 5; burst++) {
            spawnParticles(target.x + rnd(-70, 70), GROUND - rnd(20, 180), burst % 2 ? "#ffbc45" : "#ff4d18", 24, 620, 12, 1);
          }
          announce("FUGA IMPACT");
        }
        if (!o.erasing) {
          o.hitTarget = true;
          o.life = 0;
          break;
        }
      }

      if (o.life <= 0 || o.x < -300 || o.x > W + 300) {
        if (["red", "purple", "dismantle", "worldSlash", "fuga"].includes(o.type)) {
          const color = o.type === "purple" ? "#8c5fff" : o.type === "fuga" ? "#ff7a25" : "#ff3d62";
          spawnParticles(o.x, o.y, color, o.type === "purple" ? 12 : o.type === "worldSlash" ? 18 : 14, 380, 7, .55);
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
    const e = isSurvivalMode() ? retargetSurvivalEnemy() : game.enemy;
    if (!e) return;
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
      spawnParticles(purple.x + rnd(-32, 32), purple.y + rnd(-32, 32), color, 1, 150, 4, .3);
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
    if (game.particles.length > MAX_PARTICLES) {
      game.particles.splice(0, game.particles.length - MAX_PARTICLES);
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
    const domainBeforeDecay = game.domain;
    game.domain = Math.max(0, game.domain - dt);
    game.domainStartup = Math.max(0, game.domainStartup - dt);
    game.domainIntro = Math.max(0, game.domainIntro - dt);
    game.cinematic = Math.max(0, game.cinematic - dt);
    const domainJustEnded = (game.domainPrevious > 0 && game.domain <= 0) || (domainBeforeDecay > 0 && game.domain <= 0);
    if (domainJustEnded && game.player && (!game.online.active || !game.online.authoritative)
      && game.domainOwnerSlot === (game.online.active ? game.online.slot : 1)) {
      game.player.moveConfiscation = Math.max(game.player.moveConfiscation, 5);
      announce("TECHNIQUES CONFISCATED 5s");
    }
    game.domainPrevious = game.domain;
    if (game.domain <= 0 && game.domainIntro <= 0) game.windPaused = false;
    if (game.domain <= 0 && game.domainStartup <= 0 && game.domainIntro <= 0) game.domainOwnerSlot = 0;
    if (!game.clash && game.blackFlash <= 0 && game.cinematic <= 0) game.cameraTarget = lerp(game.cameraTarget, 1, clamp(dt * 4.5, 0, 1));
    game.cameraZoom = lerp(game.cameraZoom, game.cameraTarget, clamp(dt * 7, 0, 1));
    if (!game.clash && game.player && game.enemy && game.cinematic <= 0) {
      game.cameraFocusX = lerp(game.cameraFocusX, (game.player.x + game.enemy.x) / 2, clamp(dt * 3, 0, 1));
      game.cameraFocusY = lerp(game.cameraFocusY, GROUND / 2 + 85, clamp(dt * 3, 0, 1));
    }
  }

  function triggerEnemyDomainUse(enemy) {
    if (!enemy || enemy.stun > 0 || enemy.health <= 0 || game.domain > 0 || game.domainStartup > 0 || game.trial || game.clash) return false;
    if (enemy.character === "hakari" || enemy.character === "higuruma") return false;
    game.domain = enemy.character === "sukuna" ? 15 : 12;
    game.domainCharacter = enemy.character;
    game.domainOwnerSlot = 2;
    game.domainTick = .5;
    game.windPaused = true;
    game.glitch = Math.max(game.glitch, enemy.character === "sukuna" ? .35 : .55);
    game.flash = Math.max(game.flash, .16);
    game.shake = Math.max(game.shake, 12);
    game.cameraTarget = Math.max(game.cameraTarget, 1.18);
    game.cameraFocusX = (game.player.x + enemy.x) / 2;
    game.cameraFocusY = GROUND - 110;
    enemy.state = "domain";
    enemy.stateTime = 0;
    enemy.invuln = Math.max(enemy.invuln || 0, .45);
    enemy.domainUseTimer = 5;
    spawnParticles(W / 2, H / 2, enemy.character === "sukuna" ? "#ff254c" : "#9f8cff", 76, 520, 7, 1.2);
    announce(enemy.character === "sukuna" ? "ENEMY MALEVOLENT SHRINE" : "ENEMY UNLIMITED VOID");
    speakLine(enemy.character === "sukuna" ? "Open your eyes." : "Domain Expansion.");
    tone(55, 1.1, "sine", .24, 220);
    return true;
  }

  function updateDomainUseMode(dt) {
    if (game.mode !== "domainUse" || !game.enemy || game.online.active) return;
    const e = game.enemy;
    e.energy = 100;
    if (e.character === "hakari") {
      e.jackpot = 9999;
      e.awakening = 9999;
      e.heat = 100;
      if (game.jackpotFlash <= 0) game.jackpotFlash = .08;
      return;
    }
    if (e.character === "higuruma") {
      e.awakening = 9999;
      e.executionSword = 9999;
      e.executionSwordUsed = false;
      return;
    }
    if (game.domain > 0 || game.domainStartup > 0 || game.trial || game.clash || e.stun > 0) return;
    e.domainUseTimer = Math.max(0, Number(e.domainUseTimer || 5) - dt);
    if (e.domainUseTimer <= 0 && !triggerEnemyDomainUse(e)) e.domainUseTimer = .25;
  }

  function checkRound(dt) {
    if (game.mode !== "training" && Number.isFinite(game.time) && game.domain <= 0 && game.domainStartup <= 0) game.time = Math.max(0, game.time - dt);
    const p = game.player;
    const e = game.enemy;
    p.lagHealth = lerp(p.lagHealth, p.health, clamp(dt * 2, 0, 1));
    if (e) e.lagHealth = lerp(e.lagHealth, e.health, clamp(dt * 2, 0, 1));

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

    if (game.mode === "survival") {
      for (const enemy of game.enemies) {
        enemy.lagHealth = lerp(enemy.lagHealth, enemy.health, clamp(dt * 2, 0, 1));
        if (enemy.health <= 0) {
          enemy.health = 0;
          enemy.stun = Math.max(enemy.stun, .8);
        }
      }
      const living = activeSurvivalEnemies();
      retargetSurvivalEnemy();
      if (!living.length && !game.outcomePending) {
        game.outcomePending = true;
        game.transition = 1.15;
        game.score += Math.round(game.time * 28 + p.health * 12 + game.wave * 450);
        announce("WAVE CLEAR");
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
          if (p.health > 0 && game.time > 0 && !activeSurvivalEnemies().length && continueMode()) return;
          finishGame(p.health > 0 && !activeSurvivalEnemies().length);
        }
      }
      return;
    }

    if (!e) return;

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
      spawnSurvivalWave(game.wave);
      game.player.health = Math.min(game.player.maxHealth, game.player.health + 8);
      game.player.energy = Math.min(100, game.player.energy + 15);
      game.unstablePurple = null;
      game.time += 22;
      game.outcomePending = false;
      game.projectiles.length = 0;
      announce(`WAVE ${game.wave} - ${survivalEnemyLimit(game.wave)} CURSES`);
      recordSurvivalWaveCheckpoint();
      return true;
    }
    return false;
  }

  function finishGame(won, draw = false) {
    stopHakariJackpotMusic();
    game.state = "result";
    ui.hud.classList.add("hidden");
    ui.result.classList.remove("hidden");
    ui.resultTitle.textContent = draw ? "DRAW" : won ? "VICTORY" : "DEFEAT";
    ui.resultSub.textContent = game.mode === "online"
      ? draw
        ? `${Math.floor((Date.now() - game.online.startedAt) / 1000)} seconds fought | No winner`
        : `${Math.floor((Date.now() - game.online.startedAt) / 1000)} seconds survived | ${game.online.remoteName}`
      : won
        ? game.mode === "story" ? "The curtain falls. The strongest remains." : game.mode === "domainUse" ? "You survived the domain pressure." : "Another impossible record."
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
    if (won && game.mode === "domainUse") unlockCostume("eclipse");
    recordMatchProgress(won, draw);
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

  function finishOnlineMatch(won, opponentStats, draw = false) {
    if (!game.online.active) return;
    game.online.opponentStats = opponentStats;
    game.player.health = Math.max(0, game.player.health);
    game.enemy.health = Math.max(0, game.enemy.health);
    finishGame(won, draw);
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

  function blankAccountProgress() {
    return {
      stats: {
        totalWins: 0,
        totalLosses: 0,
        bestSurvivalWave: 0,
        bossRushClears: 0,
        maxCombo: 0,
        blackFlashes: 0,
        domainsUsed: 0,
        charactersPlayed: {},
      },
      unlocks: { costumes: ["uniform"], titles: [], badges: [] },
      settings: { lastCharacter: selectedCharacter, lastStage: selectedStage, lastCostume: selectedCostume, difficulty },
    };
  }

  function accountNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function cleanList(values, fallback = []) {
    const out = new Set(fallback);
    if (Array.isArray(values)) values.forEach((value) => {
      const clean = String(value || "").replace(/[<>&]/g, "").trim().slice(0, 40);
      if (clean) out.add(clean);
    });
    return [...out];
  }

  function normalizeProgress(progress = {}) {
    const base = blankAccountProgress();
    const stats = progress.stats || {};
    base.stats.totalWins = accountNumber(stats.totalWins);
    base.stats.totalLosses = accountNumber(stats.totalLosses);
    base.stats.bestSurvivalWave = accountNumber(stats.bestSurvivalWave);
    base.stats.bossRushClears = accountNumber(stats.bossRushClears);
    base.stats.maxCombo = accountNumber(stats.maxCombo);
    base.stats.blackFlashes = accountNumber(stats.blackFlashes);
    base.stats.domainsUsed = accountNumber(stats.domainsUsed);
    if (stats.charactersPlayed && typeof stats.charactersPlayed === "object") {
      for (const [character, count] of Object.entries(stats.charactersPlayed)) {
        const id = String(character || "").replace(/[<>&]/g, "").trim().slice(0, 32);
        if (id) base.stats.charactersPlayed[id] = accountNumber(count);
      }
    }
    const unlocks = progress.unlocks || {};
    base.unlocks.costumes = cleanList(unlocks.costumes, ["uniform"]);
    base.unlocks.titles = cleanList(unlocks.titles);
    base.unlocks.badges = cleanList(unlocks.badges);
    const settings = progress.settings || {};
    for (const key of ["lastCharacter", "lastStage", "lastCostume", "difficulty"]) {
      const clean = String(settings[key] || "").replace(/[<>&]/g, "").trim().slice(0, 48);
      if (clean) base.settings[key] = clean;
    }
    return base;
  }

  function mergeProgress(baseProgress, incomingProgress) {
    const base = normalizeProgress(baseProgress);
    const incoming = normalizeProgress(incomingProgress);
    for (const key of ["totalWins", "totalLosses", "bossRushClears", "blackFlashes", "domainsUsed"]) {
      base.stats[key] = accountNumber(base.stats[key]) + accountNumber(incoming.stats[key]);
    }
    base.stats.bestSurvivalWave = Math.max(base.stats.bestSurvivalWave, incoming.stats.bestSurvivalWave);
    base.stats.maxCombo = Math.max(base.stats.maxCombo, incoming.stats.maxCombo);
    for (const [character, count] of Object.entries(incoming.stats.charactersPlayed)) {
      base.stats.charactersPlayed[character] = accountNumber(base.stats.charactersPlayed[character]) + accountNumber(count);
    }
    base.unlocks.costumes = cleanList(incoming.unlocks.costumes, base.unlocks.costumes);
    base.unlocks.titles = cleanList(incoming.unlocks.titles, base.unlocks.titles);
    base.unlocks.badges = cleanList(incoming.unlocks.badges, base.unlocks.badges);
    base.settings = { ...base.settings, ...incoming.settings };
    return base;
  }

  function progressFromProfile(profile = {}) {
    return normalizeProgress({ stats: profile.stats, unlocks: profile.unlocks, settings: profile.settings });
  }

  function loadGuestProgress() {
    try {
      const saved = normalizeProgress(JSON.parse(localStorage.getItem(GUEST_PROGRESS_KEY) || "{}"));
      saved.unlocks.costumes = cleanList(unlockedCostumes(), saved.unlocks.costumes);
      return saved;
    } catch {
      const fallback = blankAccountProgress();
      fallback.unlocks.costumes = cleanList(unlockedCostumes(), ["uniform"]);
      return fallback;
    }
  }

  function saveGuestProgress(progress) {
    try { localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(normalizeProgress(progress))); } catch {}
  }

  function progressHasMeaningfulData(progress) {
    const clean = normalizeProgress(progress);
    const stats = clean.stats;
    const played = Object.values(stats.charactersPlayed || {}).some((count) => accountNumber(count) > 0);
    const statsTotal = stats.totalWins + stats.totalLosses + stats.bestSurvivalWave + stats.bossRushClears
      + stats.maxCombo + stats.blackFlashes + stats.domainsUsed;
    const unlocks = cleanList(clean.unlocks.costumes).filter((name) => name !== "uniform").length
      + cleanList(clean.unlocks.titles).length
      + cleanList(clean.unlocks.badges).length;
    return statsTotal > 0 || played || unlocks > 0;
  }

  function guestMergeKey() {
    const profile = accountState.user || {};
    const raw = profile.email || profile.displayName || "google-user";
    const safe = String(raw).replace(/[^a-z0-9_.@-]/gi, "_").slice(0, 96);
    return `voidLimitGuestMerged:${safe}`;
  }

  function guestProgressSignature(progress) {
    return JSON.stringify(normalizeProgress(progress));
  }

  function syncLocalUnlocks(progress) {
    const costumes = cleanList(progress?.unlocks?.costumes, unlockedCostumes());
    try { localStorage.setItem("voidLimitCostumes", JSON.stringify(costumes)); } catch {}
    refreshCostumes();
  }

  function accountRequest(path, options = {}) {
    if (!SERVER_ACCOUNTS_AVAILABLE) return Promise.reject(new Error("Server required for accounts"));
    return fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.error || "Cloud save failed, local save kept");
      return data;
    });
  }

  function setAccountStatus(message, kind = "") {
    if (!ui.accountStatus) return;
    ui.accountStatus.textContent = message;
    ui.accountStatus.classList.toggle("error", kind === "error");
    ui.accountStatus.classList.toggle("ok", kind === "ok");
  }

  function updateGoogleOriginHelp() {
    if (!ui.googleOriginHelp) return;
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      ui.googleOriginHelp.classList.add("error");
      ui.googleOriginHelp.textContent = "Google blocks file:// pages. Run start-online.bat, then open http://localhost:4173 for Sign In or Sign Up.";
      return;
    }
    ui.googleOriginHelp.classList.remove("error");
    ui.googleOriginHelp.textContent = `Current Google origin: ${location.origin}. If Google says "no registered origin", add this exact origin in Google Cloud OAuth Authorized JavaScript origins.`;
  }

  function setAccountAvatar(img, url) {
    if (!img) return;
    const frame = img.parentElement;
    const hasImage = Boolean(url);
    img.src = hasImage ? url : "";
    frame?.classList.toggle("has-image", hasImage);
  }

  function setOnlineDefaultName(name) {
    const input = $("#onlineName");
    if (!input || !name) return;
    const current = input.value.trim();
    if (!current || current === "Gojo" || current === "Guest Fighter") input.value = name.slice(0, 16);
  }

  function applySavedSettings(progress) {
    const settings = progress?.settings || {};
    if (characters[settings.lastCharacter]) selectedCharacter = settings.lastCharacter;
    if (stages[settings.lastStage]) selectedStage = settings.lastStage;
    const costumeSet = new Set(cleanList(progress?.unlocks?.costumes, unlockedCostumes()));
    if (settings.lastCostume && costumeSet.has(settings.lastCostume)) selectedCostume = settings.lastCostume;
    if (["easy", "normal", "hard"].includes(settings.difficulty)) difficulty = settings.difficulty;
    $$(".difficulty button").forEach((button) => button.classList.toggle("active", button.dataset.diff === difficulty));
    $$(".costumes button").forEach((button) => button.classList.toggle("active", button.dataset.costume === selectedCostume));
    if (stages[selectedStage]) selectStage(selectedStage);
  }

  function updateAccountUi() {
    updateGoogleOriginHelp();
    const profile = accountState.user;
    const progress = accountState.progress || loadGuestProgress();
    const signed = Boolean(profile && !accountState.isGuest);
    const name = signed ? profile.displayName || "Void Fighter" : "Guest Fighter";
    ui.menuAccount?.classList.toggle("signed", signed);
    ui.menuAccount?.classList.toggle("guest", !signed);
    if (ui.menuAccountName) ui.menuAccountName.textContent = name;
    if (ui.menuAccountMode) ui.menuAccountMode.textContent = signed ? "SIGNED IN" : "GUEST MODE";
    if (ui.accountButtonMode) ui.accountButtonMode.textContent = signed ? "SIGNED" : "GUEST";
    if (ui.accountName) ui.accountName.textContent = name;
    if (ui.accountEmail) ui.accountEmail.textContent = signed ? profile.email || "Google account" : "Offline progress stays on this browser.";
    if (ui.accountMode) {
      ui.accountMode.textContent = signed ? "SIGNED IN" : "GUEST MODE";
      ui.accountMode.classList.toggle("signed", signed);
      ui.accountMode.classList.toggle("guest", !signed);
    }
    setAccountAvatar(ui.accountAvatar, signed ? profile.picture : "");
    setAccountAvatar(ui.menuAccountAvatar, signed ? profile.picture : "");
    ui.accountSignOut?.classList.toggle("hidden", !signed);
    ui.serverLoginLink?.classList.toggle("hidden", SERVER_ACCOUNTS_AVAILABLE);
    const values = [
      progress.stats.totalWins,
      progress.stats.bestSurvivalWave,
      progress.stats.maxCombo,
      progress.stats.domainsUsed,
    ];
    ui.accountStats?.querySelectorAll("b").forEach((node, index) => {
      node.textContent = String(values[index] || 0);
    });
    if (ui.resultAccount) ui.resultAccount.textContent = signed ? `SIGNED IN: ${name}` : "GUEST MODE - LOCAL SAVE";
  }

  async function accountLogin(credential) {
    setAccountStatus("Signing in with Google...");
    try {
      const data = await accountRequest("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) });
      accountState.user = data.user;
      accountState.isGuest = false;
      accountState.progress = progressFromProfile(data.user);
      syncLocalUnlocks(accountState.progress);
      setOnlineDefaultName(data.user.displayName || "");
      await accountMergeGuestProgress();
      setAccountStatus("Signed in. Progress synced.", "ok");
      updateAccountUi();
      window.dispatchEvent(new CustomEvent("voidlimit:accountUpdated", { detail: { user: accountState.user } }));
    } catch (error) {
      setAccountStatus(error.message || "Login failed, continue as guest", "error");
    }
  }

  async function accountLogout() {
    try { await accountRequest("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
    accountState.user = null;
    accountState.isGuest = true;
    accountState.progress = loadGuestProgress();
    setAccountStatus("Signed out. Guest mode is active.");
    updateAccountUi();
    window.dispatchEvent(new CustomEvent("voidlimit:accountUpdated", { detail: { user: null } }));
  }

  async function accountLoadProgress() {
    accountState.progress = loadGuestProgress();
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      accountState.user = null;
      accountState.isGuest = true;
      setAccountStatus("Run start-online.bat, then open http://localhost:4173 to sign in or sign up. Guest Mode works here.", "error");
      updateAccountUi();
      return accountState.progress;
    }
    try {
      const data = await accountRequest("/api/me");
      if (data.user) {
        accountState.user = data.user;
        accountState.isGuest = false;
        accountState.progress = progressFromProfile(data.user);
        syncLocalUnlocks(accountState.progress);
        setOnlineDefaultName(data.user.displayName || "");
        await accountMergeGuestProgress();
        setAccountStatus("Signed in. Progress loaded.", "ok");
      } else {
        accountState.user = null;
        accountState.isGuest = true;
        setAccountStatus(
          googleClientId
            ? `Google ready for ${location.origin}. If sign-in says no registered origin, add this origin in Google Cloud.`
            : "Google login is not configured. Guest Mode is still available.",
          googleClientId ? "ok" : "error",
        );
      }
    } catch {
      accountState.user = null;
      accountState.isGuest = true;
      setAccountStatus("Google login unavailable. Guest mode is active.", "error");
    }
    updateAccountUi();
    return accountState.progress;
  }

  async function accountSaveProgress(delta) {
    const cleanDelta = normalizeProgress(delta);
    if (accountState.isGuest || !accountState.user) {
      accountState.progress = mergeProgress(loadGuestProgress(), cleanDelta);
      saveGuestProgress(accountState.progress);
      syncLocalUnlocks(accountState.progress);
      setAccountStatus("Guest progress saved locally.", "ok");
      updateAccountUi();
      return accountState.progress;
    }
    accountState.progress = mergeProgress(accountState.progress, cleanDelta);
    updateAccountUi();
    try {
      const data = await accountRequest("/api/save-progress", { method: "POST", body: JSON.stringify({ progress: cleanDelta }) });
      accountState.user = data.user;
      accountState.progress = progressFromProfile(data.user);
      syncLocalUnlocks(accountState.progress);
      setAccountStatus("Progress saved.", "ok");
    } catch {
      const guest = mergeProgress(loadGuestProgress(), cleanDelta);
      saveGuestProgress(guest);
      setAccountStatus("Cloud save failed, local save kept.", "error");
    }
    updateAccountUi();
    return accountState.progress;
  }

  async function accountMergeGuestProgress() {
    if (accountState.isGuest || !accountState.user) return;
    const guest = loadGuestProgress();
    if (!progressHasMeaningfulData(guest)) {
      try { localStorage.removeItem(GUEST_PROGRESS_KEY); } catch {}
      return;
    }
    const mergeKey = guestMergeKey();
    const signature = guestProgressSignature(guest);
    if (localStorage.getItem(mergeKey) === signature) {
      try { localStorage.removeItem(GUEST_PROGRESS_KEY); } catch {}
      return;
    }
    try {
      const data = await accountRequest("/api/save-progress", { method: "POST", body: JSON.stringify({ progress: guest }) });
      accountState.user = data.user;
      accountState.progress = progressFromProfile(data.user);
      syncLocalUnlocks(accountState.progress);
      localStorage.setItem(mergeKey, signature);
      localStorage.removeItem(GUEST_PROGRESS_KEY);
    } catch {
      setAccountStatus("Cloud merge failed, guest save kept locally.", "error");
    }
  }

  function matchProgressDelta(won, draw) {
    const stats = game.mode === "online" ? getOnlineStats() : {
      blackFlashes: game.player?.blackFlashes || 0,
      domains: game.player?.domainsUsed || 0,
    };
    const delta = blankAccountProgress();
    delta.stats.totalWins = won && !draw ? 1 : 0;
    delta.stats.totalLosses = !won && !draw ? 1 : 0;
    delta.stats.bestSurvivalWave = game.mode === "survival" ? game.wave : 0;
    delta.stats.bossRushClears = won && game.mode === "domainUse" ? 1 : 0;
    delta.stats.maxCombo = game.maxCombo || 0;
    delta.stats.blackFlashes = stats.blackFlashes || 0;
    delta.stats.domainsUsed = stats.domains || 0;
    delta.stats.charactersPlayed[selectedCharacter] = 1;
    delta.unlocks.costumes = unlockedCostumes();
    delta.settings = {
      lastCharacter: selectedCharacter,
      lastStage: selectedStage,
      lastCostume: selectedCostume,
      difficulty,
    };
    return delta;
  }

  function recordMatchProgress(won, draw) {
    accountSaveProgress(matchProgressDelta(won, draw));
  }

  function survivalWaveProgressDelta() {
    const delta = blankAccountProgress();
    delta.stats.bestSurvivalWave = Math.max(1, game.wave || 1);
    delta.unlocks.costumes = unlockedCostumes();
    delta.settings = {
      lastCharacter: selectedCharacter,
      lastStage: selectedStage,
      lastCostume: selectedCostume,
      difficulty,
    };
    return delta;
  }

  function recordSurvivalWaveCheckpoint() {
    if (game.mode !== "survival" || game.online.active || !game.player) return;
    accountSaveProgress(survivalWaveProgressDelta());
  }

  function openAccountPanel() {
    ui.menu.classList.add("hidden");
    ui.onlineMenu?.classList.add("hidden");
    ui.settingsPanel?.classList.add("hidden");
    ui.accountPanel.classList.remove("hidden");
    updateAccountUi();
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      setAccountStatus("Run start-online.bat, then open http://localhost:4173 to sign in or sign up. Guest Mode works here.", "error");
    } else if (!googleClientId) {
      setAccountStatus("Google login is not configured. Guest Mode is still available.", "error");
    }
  }

  function closeAccountPanel() {
    ui.accountPanel.classList.add("hidden");
    if (game.state === "menu") ui.menu.classList.remove("hidden");
  }

  async function loadAccountConfig() {
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      googleClientId = "";
      setAccountStatus("Run start-online.bat, then open http://localhost:4173 to sign in or sign up. Guest Mode works here.", "error");
      return "";
    }
    try {
      const data = await accountRequest("/api/config");
      googleClientId = String(data.googleClientId || "").trim();
      return googleClientId;
    } catch {
      googleClientId = "";
      setAccountStatus("Google login unavailable. Guest Mode is still available.", "error");
      return "";
    }
  }

  function loadGoogleIdentityScript() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (googleScriptPromise) return googleScriptPromise;
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Google login unavailable"));
      document.head.appendChild(script);
    });
    return googleScriptPromise;
  }

  async function beginGoogleAuth(mode = "signin") {
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      setAccountStatus("Google login requires running start-online.bat, then opening http://localhost:4173. Guest Mode is still available.", "error");
      return;
    }
    if (!googleClientId) {
      setAccountStatus("Google login is not configured. Guest Mode is still available.", "error");
      return;
    }
    setAccountStatus(mode === "signup" ? "Opening Google sign up..." : "Opening Google sign in...");
    try {
      await initGoogleLogin();
      if (window.google?.accounts?.id) window.google.accounts.id.prompt();
      else setAccountStatus("Google login unavailable. Guest Mode is still available.", "error");
    } catch {
      setAccountStatus("Google login unavailable. Guest Mode is still available.", "error");
    }
  }

  async function initGoogleLogin() {
    if (!SERVER_ACCOUNTS_AVAILABLE) {
      setAccountStatus("Run start-online.bat, then open http://localhost:4173 to sign in or sign up. Guest Mode works here.", "error");
      return;
    }
    if (!googleClientId) {
      setAccountStatus("Google login is not configured. Guest Mode is still available.", "error");
      return;
    }
    try {
      await loadGoogleIdentityScript();
      if (!window.google?.accounts?.id) throw new Error("Google login unavailable");
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => accountLogin(response.credential),
      });
      if (ui.googleButtonMount && !ui.googleButtonMount.childElementCount) {
        window.google.accounts.id.renderButton(ui.googleButtonMount, {
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 240,
        });
      }
      if (ui.googleSignUpMount && !ui.googleSignUpMount.childElementCount) {
        window.google.accounts.id.renderButton(ui.googleSignUpMount, {
          theme: "filled_black",
          size: "large",
          text: "signup_with",
          shape: "rectangular",
          width: 240,
        });
      }
      ui.googleButtonMount?.parentElement?.parentElement?.classList.add("google-ready");
      ui.googleFallbackButton?.classList.add("hidden");
      ui.googleSignUpButton?.classList.add("hidden");
    } catch {
      setAccountStatus("Google login unavailable. Guest Mode is still available.", "error");
    }
  }

  const accountState = {
    user: null,
    isGuest: true,
    progress: null,
    login: accountLogin,
    logout: accountLogout,
    loadProgress: accountLoadProgress,
    saveProgress: accountSaveProgress,
    mergeGuestProgress: accountMergeGuestProgress,
  };
  window.VoidLimitAccount = accountState;

  function initAccountSystem() {
    accountState.progress = loadGuestProgress();
    updateAccountUi();
    loadAccountConfig().then(() => initGoogleLogin()).then(() => accountLoadProgress()).then((progress) => {
      syncLocalUnlocks(progress);
      applySavedSettings(progress);
      updateAccountUi();
    });
  }

  function updateHud() {
    const p = game.player;
    const e = isSurvivalMode() ? retargetSurvivalEnemy() : game.enemy;
    if (!p || !e) return;
    const survivalLiving = activeSurvivalEnemies();
    const profile = characterProfile(p);
    const enemyProfile = game.online.active || game.mode === "domainUse" ? characterProfile(e) : null;
    ui.playerHealth.style.transform = `scaleX(${clamp(p.health / p.maxHealth, 0, 1)})`;
    ui.playerLag.style.transform = `scaleX(${clamp(p.lagHealth / p.maxHealth, 0, 1)})`;
    ui.playerEnergy.style.transform = `scaleX(${p.energy / 100})`;
    ui.enemyHealth.style.transform = `scaleX(${clamp(e.health / e.maxHealth, 0, 1)})`;
    ui.enemyLag.style.transform = `scaleX(${clamp(e.lagHealth / e.maxHealth, 0, 1)})`;
    ui.enemyEnergy.style.transform = `scaleX(${e.energy / 100})`;
    ui.playerName.textContent = `${profile.name}  ${Math.ceil(p.health)} HP`;
    const playerPortrait = p.character === "sukuna" ? "sukuna-portrait" : p.character === "hakari" ? "hakari-portrait" : p.character === "higuruma" ? "higuruma-portrait" : "gojo-portrait";
    const playerMark = p.character === "sukuna" ? "SK" : p.character === "hakari" ? "HK" : p.character === "higuruma" ? "HG" : "VI";
    ui.playerPortrait.className = `portrait ${playerPortrait}`;
    ui.playerPortrait.querySelector("span").textContent = playerMark;
    ui.enemyName.textContent = isSurvivalMode()
      ? `SURVIVAL CURSES ${survivalLiving.length}/${survivalEnemyLimit(game.wave)}`
      : game.mode === "domainUse"
        ? `${enemyProfile.name}  ${Math.ceil(e.health)} HP`
      : `${game.online.active ? enemyProfile.name : e.type.name}  ${Math.ceil(e.health)} HP`;
    ui.enemyState.textContent = game.online.active
      ? `${e.type.rank}${e.onlineVariant === "inverted" ? " / INVERTED" : ""}${e.burned ? " / BURNED" : ""}`
      : game.mode === "domainUse"
        ? `${e.character === "hakari" ? "PERMANENT JACKPOT" : e.character === "higuruma" ? "AWAKENED JUDGMENT" : `DOMAIN IN ${Math.max(0, e.domainUseTimer || 0).toFixed(1)}s`}`
      : isSurvivalMode() ? `${e.type.rank} TARGET / PUNCH + BARRAGE` : e.type.rank;
    const enemyPortrait = e.character === "sukuna" ? "sukuna-portrait" : e.character === "hakari" ? "hakari-portrait" : e.character === "higuruma" ? "higuruma-portrait" : "gojo-portrait";
    const enemyMark = e.character === "sukuna" ? "SK" : e.character === "hakari" ? "HK" : e.character === "higuruma" ? "HG" : "VI";
    ui.enemyPortrait.className = `portrait ${game.online.active || game.mode === "domainUse" ? enemyPortrait : "curse-portrait"}`;
    ui.enemyPortrait.querySelector("span").textContent = game.online.active || game.mode === "domainUse" ? enemyMark : "CR";
    const normalPlayerState = game.online.active
      ? `PLAYER ${game.online.slot}${p.onlineVariant === "inverted" ? " / INVERTED" : ""}${p.burned ? " / BURNED" : ""}${p.jackpot > 0 ? ` / JACKPOT ${p.jackpot.toFixed(1)}s` : ""}`
      : p.awakening > 0
        ? `${p.character === "sukuna" ? "KING OF CURSES" : p.character === "hakari" ? "JACKPOT MODE" : "AWAKENED"} ${p.awakening.toFixed(1)}s`
        : p.burnout > 0 ? `BURNT OUT ${p.burnout.toFixed(1)}s`
          : profile.title;
    ui.playerState.textContent = p.charging
      ? `CHARGING CE ${p.energy.toFixed(0)}%`
      : p.techniqueCharge
        ? `${p.character === "sukuna" ? "DISMANTLE" : p.character === "higuruma" ? "GAVEL" : "RED"} CHARGE ${p.techniqueCharge.elapsed.toFixed(1)}/5.0s`
      : p.moveConfiscation > 0
          ? `TECHNIQUES CONFISCATED ${p.moveConfiscation.toFixed(1)}s`
        : game.domain > 0 && game.domainOwnerSlot === (game.online.active ? game.online.slot : 1)
          && ["gojo", "sukuna"].includes(game.domainCharacter)
          ? `DOMAIN DRAIN ${game.domainCharacter === "gojo" ? 20 : 10} CE/s`
      : p.chargeRecovery > 0
        ? `CHARGE RECOVERY ${p.chargeRecovery.toFixed(1)}s`
        : p.chargeCooldown > 0 ? `CHARGE COOLDOWN ${p.chargeCooldown.toFixed(1)}s` : normalPlayerState;
    ui.timer.textContent = game.mode === "training" || !Number.isFinite(game.time) ? "INF" : String(Math.ceil(game.time)).padStart(2, "0");
    ui.mode.textContent = game.mode === "domainUse" ? "DOMAIN USE" : game.mode.toUpperCase();
    ui.wave.textContent = game.online.active ? `P${game.online.slot} / ${Math.max(0, Math.round(game.online.startAt - Date.now())) > 0 ? "SYNC" : "LIVE"}`
      : game.mode === "domainUse" ? `DOMAIN ENEMY`
      : game.mode === "survival" ? `WAVE ${game.wave} / CAP ${survivalEnemyLimit(game.wave)}` : game.mode === "training" ? "FRAME LAB" : `ENCOUNTER ${game.wave}`;
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

    document.querySelectorAll("[data-ability]").forEach((el) => {
      el.classList.toggle("hidden", !(el.dataset.ability in profile.costs));
    });
    for (const [name] of Object.entries(profile.costs)) {
      const el = document.querySelector(`[data-ability="${name}"]`);
      if (!el) continue;
      const tuning = abilityTuning(p, name);
      const cost = tuning.cost;
      const cd = p.cooldowns[name];
      const ratio = cd > 0 ? 1 - cd / tuning.cooldown : 1;
      el.querySelector("i").style.transform = `scaleX(${ratio})`;
      el.querySelector("span").textContent = tuning.label;
      const burntOutLock = p.character === "gojo" && p.burnout > 0 && (name === "blue" || name === "red" || name === "domain");
      const purpleReady = p.character !== "gojo" || name !== "purple" || (game.unstablePurple?.state === "unstable");
      const worldSlashReady = p.character !== "sukuna" || name !== "purple" || p.worldSlashUnlocked;
      const executionReady = p.character !== "higuruma" || name !== "purple" || p.executionSword <= 0 || !p.executionSwordUsed;
      el.dataset.timer = p.techniqueCharge?.name === name
        ? `${p.techniqueCharge.elapsed.toFixed(1)}s`
        : cd > 0 ? `${cd.toFixed(1)}s` : "";
      el.classList.toggle("locked", p.energy < cost || cd > 0 || p.moveConfiscation > 0 || burntOutLock || !purpleReady
        || !worldSlashReady || !executionReady || (p.character === "sukuna" && name === "purple" && p.worldSlashUses >= 2));
      el.classList.toggle("confiscated", p.moveConfiscation > 0);
      const hint = el.querySelector("b");
      if (hint && name === "purple") {
        hint.textContent = p.character === "sukuna" && !p.worldSlashUnlocked
          ? `${p.dismantleUses}/5 D  ${p.cleaveUses}/2 C  ${p.sukunaDomainUses}/1 T`
          : p.character === "sukuna"
            ? `200 DMG / ${p.worldSlashUses}/2 USED`
          : p.character === "higuruma" && p.executionSword > 0
            ? p.executionSwordUsed ? "ATTEMPT USED" : `${p.executionSword.toFixed(1)}s`
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
          ? `${game.hakariDomain.displaySlots.join(" - ")} / TRY ${Math.min(5, game.hakariDomain.rollIndex + 1)}/5 / ODDS ${game.hakariDomain.chanceNumerator || 1}/239 / SETUP ${game.hakariDomain.rollInputs.length}/2${game.hakariDomain.lastRarity ? ` / ${game.hakariDomain.lastRarity.toUpperCase()}` : ""}`
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
    if (!p || p.stun > 0 || p.blocking || p.charging || p.techniqueCharge || p.chargeRecovery > 0 || (game.online.active && Date.now() < game.online.startAt)) return;
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
    syncHakariJackpotMusic();
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
    if (game.trial) {
      const paused = updateTrial(dt);
      if (paused) {
        updateEffects(dt);
        updateHud();
        return;
      }
    }
    const scaledDt = dt * (game.slow > 0 ? .22 : 1);
    updateDomainUseMode(scaledDt);
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
    const burned = Boolean(entity.burned || entity.burnout > 0);
    const inverted = entity.onlineVariant === "inverted";
    const palette = burned && !tint
      ? inverted
        ? ["#6b6870", "#958e94", "#c05c87"]
        : ["#171419", "#2b242b", "#6d413a"]
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
    const skin = tint || (burned ? (inverted ? "#a57979" : "#6d4a45") : inverted ? "#dcaeb5" : "#f0c9bd");
    const hair = tint || (burned ? (inverted ? "#c8bec3" : "#625b61") : inverted ? "#17213a" : "#edfaff");
    const hairShade = tint || (burned ? (inverted ? "#8f4868" : "#332d33") : inverted ? "#ff65ad" : "#9fd8ec");
    const blind = tint || (entity.awakening > 0 ? "#baf7ff" : burned ? (inverted ? "#eee8ec" : "#09070b") : inverted ? "#f4fbff" : "#11162a");

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
    if (burned && !tint) {
      pixelRect(-14, -91, 5, 9, inverted ? "#54283b" : "#09070b");
      pixelRect(5, -67, 7, 12, inverted ? "#763c55" : "#3a1717");
      pixelRect(-17, -51, 5, 11, inverted ? "#d06c92" : "#d45137");
    }

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

    const burned = Boolean(entity.burned);
    const inverted = entity.onlineVariant === "inverted";
    const dark = tint || (burned ? (inverted ? "#62646c" : "#11090b") : inverted ? "#edf1f6" : "#15131b");
    const cloth = tint || (burned ? (inverted ? "#b9b5af" : "#382b28") : inverted ? "#242c39" : "#eee6d8");
    const clothShadow = tint || (burned ? (inverted ? "#8e8a87" : "#241a19") : inverted ? "#425064" : "#c9bcad");
    const inner = tint || (burned ? (inverted ? "#d0d2d7" : "#100d12") : inverted ? "#dde5ef" : "#24202c");
    const red = tint || (burned ? (inverted ? "#3f6a83" : "#61202a") : inverted ? "#238bad" : "#8e1835");
    const energy = tint || (burned ? (inverted ? "#65cfff" : "#ff6a32") : inverted ? "#48dfff" : "#ff244f");
    const skin = tint || (burned ? (inverted ? "#aaa09d" : "#6f3c34") : inverted ? "#6ca7b5" : "#d7a08f");
    const hair = tint || (burned ? (inverted ? "#d7dce2" : "#4a3230") : inverted ? "#245264" : "#ef9eae");
    const hairShadow = tint || (burned ? (inverted ? "#abaeb5" : "#302020") : inverted ? "#173945" : "#c96f83");
    const mark = tint || (burned ? (inverted ? "#d9d9dc" : "#090609") : inverted ? "#edf5f8" : "#28050e");
    let legA = run * 10;
    let legB = -run * 10;
    if (!entity.grounded) { legA = 9; legB = -8; }
    if (entity.state === "heavy") { legA = -8; legB = 12; }
    if (entity.comboStep === 3 && entity.attack?.chain) legB = -30;

    pixelRect(-18 + legA, -39, 14, 32, dark);
    pixelRect(4 + legB, -39, 14, 32, dark);
    pixelRect(-20 + legA, -9, 19, 9, tint || "#09070b");
    pixelRect(1 + legB, -9, 20, 9, tint || "#09070b");
    pixelRect(-24, -80, 48, 44, cloth);
    pixelRect(-19, -76, 38, 39, clothShadow);
    pixelRect(-10, -78, 20, 39, inner);
    pixelRect(-17, -76, 10, 29, cloth);
    pixelRect(7, -76, 10, 29, cloth);
    pixelRect(-5, -77, 10, 32, red);
    pixelRect(-21, -47, 42, 10, dark);
    pixelRect(-18, -46, 36, 4, red);

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
    pixelRect(backX, backY, 12, 33, cloth);
    pixelRect(backX + 1, backY + 21, 11, 7, clothShadow);
    pixelRect(backX + 1, backY + 26, 10, 9, skin);
    pixelRect(frontX, frontY, 12, 33, cloth);
    pixelRect(frontX + 1, frontY + 21, 11, 7, red);
    pixelRect(frontX + 1, frontY + 26, 10, 9, skin);

    pixelRect(-16, -105, 32, 31, skin);
    pixelRect(-18, -108, 7, 17, hairShadow);
    pixelRect(-16, -114, 8, 21, hair);
    pixelRect(-10, -119, 9, 25, hair);
    pixelRect(-3, -122, 9, 28, hair);
    pixelRect(5, -119, 9, 25, hair);
    pixelRect(12, -114, 8, 21, hair);
    pixelRect(-18, -104, 5, 13, hairShadow);
    pixelRect(-13, -100, 10, 4, mark);
    pixelRect(4, -100, 10, 4, mark);
    pixelRect(-10, -108, 4, 7, mark);
    pixelRect(6, -108, 4, 7, mark);
    pixelRect(-4, -105, 3, 10, mark);
    pixelRect(1, -105, 3, 10, mark);
    pixelRect(-16, -92, 8, 3, mark);
    pixelRect(8, -92, 8, 3, mark);
    pixelRect(-14, -87, 7, 3, mark);
    pixelRect(7, -87, 7, 3, mark);
    pixelRect(-8, -82, 16, 4, mark);
    pixelRect(-3, -97, 3, 18, mark);
    if (burned && !tint) {
      pixelRect(-12, -103, 6, 10, inverted ? "#29495c" : "#090506");
      pixelRect(7, -73, 8, 14, inverted ? "#3e758e" : "#35100f");
      pixelRect(-20, -55, 6, 13, inverted ? "#6cd7ff" : "#e45b31");
    }

    if (entity.attack?.type === "fuga" && !tint) {
      const progress = clamp(entity.attack.elapsed / entity.attack.duration, 0, 1);
      const flames = Math.min(5, 1 + Math.floor(progress * 6));
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < flames; i++) {
        const spread = (i - (flames - 1) / 2) * 10;
        const size = 7 + progress * 16 + i * 2;
        ctx.fillStyle = i % 2 ? "#ffd35a" : "#ff5b1f";
        ctx.beginPath();
        ctx.moveTo(25 + spread, -73 - size);
        ctx.lineTo(16 + spread, -66);
        ctx.lineTo(31 + spread, -64);
        ctx.closePath();
        ctx.fill();
      }
      if (progress > .55) {
        ctx.strokeStyle = "#ffb52f";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(-17, -70);
        ctx.lineTo(34 + progress * 28, -70);
        ctx.stroke();
        ctx.fillStyle = "#fff0a0";
        ctx.beginPath();
        ctx.moveTo(57 + progress * 28, -70);
        ctx.lineTo(28 + progress * 28, -86);
        ctx.lineTo(34 + progress * 28, -70);
        ctx.lineTo(28 + progress * 28, -54);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }

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
    const burned = Boolean(entity.burned);
    const inverted = entity.onlineVariant === "inverted";
    const dark = tint || (burned ? (inverted ? "#666769" : "#0b110d") : inverted ? "#ebe6f0" : "#16151d");
    const coat = tint || (burned ? (inverted ? "#8d807a" : "#263429") : inverted ? "#d5c6a1" : "#302448");
    const coatEdge = tint || (burned ? (inverted ? "#d56f9f" : "#57634a") : inverted ? "#a7864f" : "#57426e");
    const shirt = tint || (burned ? (inverted ? "#b9b9b0" : "#131813") : inverted ? "#282532" : "#e7e0d5");
    const skin = tint || (burned ? (inverted ? "#b2a199" : "#714733") : inverted ? "#77a997" : "#bd856f");
    const hair = tint || (burned ? (inverted ? "#d5d0cd" : "#211a18") : inverted ? "#3f3453" : "#d8c080");
    const hairShadow = tint || (burned ? (inverted ? "#aba7a2" : "#171311") : inverted ? "#271e39" : "#a78a4f");
    const brow = tint || (burned ? (inverted ? "#ddd7d1" : "#080706") : inverted ? "#ebe3d3" : "#241a1c");
    const gold = tint || (burned ? (inverted ? "#62577b" : "#4b4121") : inverted ? "#574178" : "#d6ab45");
    const energy = tint || (burned ? (inverted ? "#ff78b5" : "#95a84d") : inverted ? "#d43b9c" : "#55f087");
    let legA = run * 10;
    let legB = -run * 10;
    if (!entity.grounded) { legA = 8; legB = -8; }
    if (entity.comboStep === 2 && entity.attack?.chain) legA = -18;
    pixelRect(-18 + legA, -40, 14, 33, dark);
    pixelRect(4 + legB, -40, 14, 33, dark);
    pixelRect(-20 + legA, -9, 19, 9, "#09070b");
    pixelRect(1 + legB, -9, 20, 9, "#09070b");
    pixelRect(-25, -81, 50, 46, coat);
    pixelRect(-17, -77, 34, 40, shirt);
    pixelRect(-25, -78, 8, 40, coatEdge);
    pixelRect(17, -78, 8, 40, coatEdge);
    pixelRect(-17, -77, 8, 34, coat);
    pixelRect(9, -77, 8, 34, coat);
    pixelRect(-3, -74, 6, 25, gold);
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
    pixelRect(backX, backY, 13, 33, coat);
    pixelRect(backX + 1, backY + 21, 12, 7, coatEdge);
    pixelRect(backX + 1, backY + 26, 10, 9, skin);
    pixelRect(frontX, frontY, 13, 33, coat);
    pixelRect(frontX + 1, frontY + 21, 12, 7, coatEdge);
    pixelRect(frontX + 1, frontY + 26, 10, 9, skin);
    pixelRect(-16, -106, 32, 32, skin);
    pixelRect(-19, -111, 8, 17, hairShadow);
    pixelRect(-17, -116, 9, 21, hair);
    pixelRect(-11, -121, 10, 27, hair);
    pixelRect(-4, -124, 11, 30, hair);
    pixelRect(5, -122, 11, 28, hair);
    pixelRect(13, -117, 9, 23, hair);
    pixelRect(17, -112, 7, 17, hairShadow);
    pixelRect(-11, -100, 9, 4, brow);
    pixelRect(4, -100, 11, 4, brow);
    pixelRect(-10, -96, 7, 3, tint || "#e7d8b5");
    pixelRect(6, -96, 7, 3, tint || "#e7d8b5");
    pixelRect(-8, -86, 17, 4, tint || "#6b3432");
    pixelRect(12, -90, 3, 8, gold);
    if (burned && !tint) {
      pixelRect(-13, -104, 7, 11, inverted ? "#59404d" : "#080907");
      pixelRect(5, -71, 8, 13, inverted ? "#a34972" : "#313a20");
      pixelRect(-21, -57, 6, 14, inverted ? "#ff77b3" : "#a8bb50");
    }
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

  function drawHiguruma(entity, alpha = 1, tint = null) {
    const bob = entity.grounded && entity.state === "idle" ? Math.sin(performance.now() * .006) * 2 : 0;
    const run = entity.state === "run" ? Math.sin(entity.stateTime * 22) : 0;
    const attackT = entity.attack ? clamp(entity.attack.elapsed / entity.attack.duration, 0, 1) : 0;
    const reach = entity.attack ? Math.sin(attackT * Math.PI) : 0;
    const flow = clamp(entity.vx / 330, -1, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(entity.x), Math.round(entity.y + bob));
    ctx.scale(entity.facing, 1);

    if ((entity.techniqueCharge || entity.attack?.gavel) && !tint) {
      ctx.fillStyle = "#f2cf741c";
      ctx.beginPath();
      ctx.ellipse(0, -53, 44 + Math.sin(performance.now() * .01) * 5, 64, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7dc";
      for (let i = 0; i < 5; i++) pixelRect(rnd(-43, 43), rnd(-118, -26), rnd(4, 9), rnd(3, 8), i % 2 ? "#f2cf74" : "#fff7dc");
    }

    const burned = Boolean(entity.burned);
    const inverted = entity.onlineVariant === "inverted";
    const suit = tint || (burned ? (inverted ? "#c7c8ca" : "#111010") : inverted ? "#efe6d0" : "#15171e");
    const suitShadow = tint || (burned ? (inverted ? "#8e8b87" : "#2a211c") : inverted ? "#6c5430" : "#282d38");
    const shirt = tint || (burned ? (inverted ? "#4a4a4b" : "#d1cdc2") : inverted ? "#191b24" : "#efe9dd");
    const tie = tint || (burned ? (inverted ? "#43607a" : "#44311a") : inverted ? "#37526b" : "#6b4a24");
    const skin = tint || (burned ? (inverted ? "#9e9188" : "#6b4c3e") : inverted ? "#7fb6c9" : "#d0a18e");
    const hair = tint || (burned ? (inverted ? "#e0ded8" : "#1b1716") : inverted ? "#d9d1bf" : "#17151a");
    const hairShade = tint || (burned ? (inverted ? "#a7a199" : "#080707") : inverted ? "#a48d64" : "#312a28");
    const gold = tint || (burned ? (inverted ? "#677694" : "#5b431f") : inverted ? "#3e5581" : "#d8aa48");
    const paper = tint || (burned ? (inverted ? "#4c4a48" : "#c9c0a6") : inverted ? "#1f2633" : "#fff7dc");

    let legA = run * 8;
    let legB = -run * 8;
    if (!entity.grounded) { legA = 7; legB = -8; }
    if (entity.comboStep === 3 && entity.attack?.chain) legB = -24;
    pixelRect(-17 + legA, -39, 13, 32, suit);
    pixelRect(5 + legB, -39, 13, 32, suit);
    pixelRect(-19 + legA, -9, 18, 9, tint || "#09090d");
    pixelRect(2 + legB, -9, 20, 9, tint || "#09090d");
    pixelRect(-24, -80, 48, 44, suit);
    pixelRect(-18, -77, 36, 39, suitShadow);
    pixelRect(-10, -78, 20, 38, shirt);
    pixelRect(-4, -76, 8, 32, tie);
    pixelRect(-25, -79, 8, 40, suit);
    pixelRect(17, -79, 8, 40, suit);
    pixelRect(-21, -45, 42, 8, tint || "#08090f");

    let frontX = 15, frontY = -71, backX = -24, backY = -71;
    if (entity.attack) {
      frontX += reach * (entity.attack.type === "sentence" ? 32 : entity.attack.type === "gavelHook" ? 62 : entity.attack.gavel ? 52 : 40);
      frontY += entity.attack.type === "sentence" ? -reach * 22 : entity.attack.type === "heavy" ? -reach * 18 : 0;
      if (entity.attack.type === "gavelHook") backX += reach * 24;
      if (entity.attack.type === "sentence") backY -= 14;
    } else if (entity.blocking) {
      frontX = 13; frontY = -86; backX = 3; backY = -76;
    } else if (entity.state === "run") {
      frontX -= run * 7;
      backX += run * 7;
    }
    pixelRect(backX, backY, 12, 32, suit);
    pixelRect(backX + 1, backY + 26, 10, 9, skin);
    pixelRect(frontX, frontY, 12, 32, suit);
    pixelRect(frontX + 1, frontY + 26, 10, 9, skin);

    const gavelX = frontX + 8;
    const gavelY = frontY + 25;
    const giant = entity.attack?.type === "sentence" || (entity.attack?.type === "gavel" && entity.attack.strong);
    const hook = entity.attack?.type === "gavelHook";
    const sword = entity.executionSword > 0 || entity.attack?.type === "executionSword" || entity.attack?.execution;
    if (sword) {
      ctx.strokeStyle = "#050505";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(gavelX + 8, gavelY - 14);
      ctx.lineTo(gavelX + 92 + reach * 46, gavelY - 56 + reach * 12);
      ctx.stroke();
      ctx.strokeStyle = gold;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(gavelX + 10, gavelY - 16);
      ctx.lineTo(gavelX + 94 + reach * 46, gavelY - 58 + reach * 12);
      ctx.stroke();
      pixelRect(gavelX + 2, gavelY - 19, 18, 8, paper);
    } else {
      pixelRect(gavelX + 6, gavelY - 16, giant ? 44 : 24, giant ? 10 : 6, gold);
      pixelRect(gavelX + 15, gavelY - 26, giant ? 24 : 13, giant ? 28 : 15, suitShadow);
    }
    if (hook) {
      ctx.strokeStyle = gold;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gavelX + 18, gavelY - 16);
      ctx.lineTo(gavelX + 88 + reach * 54, gavelY - 28);
      ctx.lineTo(gavelX + 101 + reach * 54, gavelY - 12);
      ctx.stroke();
    }
    if (entity.attack?.glass && !tint) {
      ctx.strokeStyle = "#fff7dc";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(42 + reach * 50, -90 + i * 12);
        ctx.lineTo(82 + reach * 70, -105 + i * 18);
        ctx.stroke();
      }
    }

    pixelRect(-16, -106, 32, 31, skin);
    pixelRect(-18 - flow * 2, -108, 7, 16, hairShade);
    pixelRect(-17 - flow * 2, -113, 9, 20, hair);
    pixelRect(-10 - flow * 3, -117, 11, 24, hair);
    pixelRect(-1 - flow * 2, -119, 12, 26, hair);
    pixelRect(8 - flow * 2, -115, 10, 21, hair);
    pixelRect(14, -108, 6, 15, hairShade);
    pixelRect(-12, -99, 10, 4, tint || "#2b2220");
    pixelRect(4, -99, 10, 4, tint || "#2b2220");
    pixelRect(-10, -94, 6, 3, tint || "#efe0cc");
    pixelRect(6, -94, 6, 3, tint || "#efe0cc");
    pixelRect(-7, -86, 16, 4, tint || "#694036");
    pixelRect(-2, -79, 6, 3, tint || "#a87969");
    if (burned && !tint) {
      pixelRect(-13, -103, 6, 10, inverted ? "#43526a" : "#070606");
      pixelRect(7, -72, 8, 13, inverted ? "#5b6f91" : "#35271a");
      pixelRect(-22, -58, 6, 14, inverted ? "#91a3d4" : "#d09d40");
    }
    if (entity.attack?.gavel && !tint) {
      ctx.strokeStyle = gold;
      ctx.lineWidth = entity.attack.strong ? 7 : 4;
      ctx.beginPath();
      ctx.moveTo(24, -78);
      ctx.lineTo(58 + reach * 58, -78 + rnd(-5, 5));
      ctx.stroke();
      for (let i = 0; i < 4; i++) pixelRect(33 + reach * rnd(16, 72), -88 + rnd(-20, 28), rnd(3, 8), rnd(3, 8), i % 2 ? paper : gold);
    }
    ctx.restore();
    if (entity.flash > 0 && !tint) drawHiguruma(entity, clamp(entity.flash / .12, 0, 1), "#ffffff");
  }

  function drawChargeAura(entity) {
    const t = performance.now() * .012;
    const color = entity.character === "sukuna" ? "#ff3158" : entity.character === "hakari" ? "#58ff8c" : entity.character === "higuruma" ? "#f2cf74" : "#65eaff";
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

  function drawTechniqueCharge(entity) {
    const elapsed = clamp(Number(entity.techniqueCharge?.elapsed || 0), 0, 5);
    if (elapsed <= 0) return;
    const ratio = elapsed / 5;
    const sukuna = entity.character === "sukuna";
    const higuruma = entity.character === "higuruma";
    const color = sukuna ? "#ff3158" : higuruma ? "#f2cf74" : "#ff274f";
    const core = sukuna ? "#fff0f2" : higuruma ? "#fff7dc" : "#fff7f8";
    ctx.save();
    ctx.translate(Math.round(entity.x + entity.facing * 34), Math.round(entity.y - 72));
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = .55 + ratio * .35;
    ctx.fillStyle = `${color}55`;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + ratio * 22, 0, Math.PI * 2);
    ctx.fill();
    pixelRect(-6 - ratio * 5, -6 - ratio * 5, 12 + ratio * 10, 12 + ratio * 10, core);
    for (let i = 0; i < 4 + Math.floor(ratio * 8); i++) {
      const angle = performance.now() * .004 + i * .9;
      pixelRect(Math.cos(angle) * (20 + ratio * 18), Math.sin(angle) * (20 + ratio * 18), 5, 5, color);
    }
    ctx.restore();
  }

  function drawFighter(entity, alpha = 1, tint = null) {
    if (entity?.charging && !tint) drawChargeAura(entity);
    if (entity?.techniqueCharge && !tint) drawTechniqueCharge(entity);
    if (entity?.character === "higuruma") drawHiguruma(entity, alpha, tint);
    else if (entity?.character === "hakari") drawHakari(entity, alpha, tint);
    else if (entity?.character === "sukuna") drawSukuna(entity, alpha, tint);
    else drawGojo(entity, alpha, tint);
    if (entity?.moveConfiscation > 0 && !tint) {
      ctx.save();
      ctx.globalAlpha = .72;
      ctx.strokeStyle = "#f2cf74";
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const y = entity.y - 84 + i * 24;
        ctx.beginPath();
        ctx.moveTo(entity.x - 42, y + Math.sin(performance.now() * .006 + i) * 5);
        ctx.lineTo(entity.x + 42, y + Math.cos(performance.now() * .006 + i) * 5);
        ctx.stroke();
      }
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff0a8";
      ctx.fillText("CONFISCATED", entity.x, entity.y - 126);
      ctx.restore();
    }
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
        const redSize = Number(o.w || 48);
        ctx.fillStyle = "#ff335844";
        ctx.beginPath();
        ctx.arc(0, 0, redSize * .92, 0, Math.PI * 2);
        ctx.fill();
        pixelRect(-redSize / 2, -redSize / 2, redSize, redSize, "#ef244f");
        pixelRect(-redSize * .29, -redSize * .29, redSize * .58, redSize * .58, "#ff8ba3");
        pixelRect(-redSize * .125, -redSize * .125, redSize * .25, redSize * .25, "#fff1f4");
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
        for (let i = 0; i < 6; i++) pixelRect(rnd(-145, 125), rnd(-57, 57), rnd(4, 12), rnd(2, 6), "#b370ff");
        ctx.fillStyle = "#110218";
        for (let i = 0; i < 3; i++) pixelRect(rnd(-120, 110), rnd(-50, 50), rnd(6, 16), rnd(2, 5), "#110218");
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
      } else if (o.type === "fuga") {
        ctx.rotate(Math.atan2(o.vy, o.vx));
        const pulse = 1 + Math.sin(performance.now() * .02) * .12;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#ff4d18";
        ctx.beginPath();
        ctx.moveTo(52, 0);
        ctx.lineTo(-34, -28);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-34, 28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd45c";
        ctx.beginPath();
        ctx.moveTo(38, 0);
        ctx.lineTo(-20, -12);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-20, 12);
        ctx.closePath();
        ctx.fill();
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

  function drawDomainClashPose(character, x, y, facing = 1, scale = 1) {
    const skin = character === "sukuna" ? "#d7a08f" : character === "hakari" ? "#bd856f" : "#d9aaa0";
    const hair = character === "sukuna" ? "#ef9eae" : character === "hakari" ? "#d8c080" : "#edfaff";
    const coat = character === "sukuna" ? "#eee6d8" : character === "hakari" ? "#302448" : "#101725";
    const accent = character === "sukuna" ? "#8e1835" : character === "hakari" ? "#55f087" : "#61eaff";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(facing * scale, scale);
    ctx.fillStyle = "#05060a88";
    ctx.beginPath();
    ctx.ellipse(0, 5, 42, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    pixelRect(-18, -66, 14, 66, "#13131a");
    pixelRect(4, -66, 14, 66, "#13131a");
    pixelRect(-24, -136, 48, 76, coat);
    if (character === "sukuna") {
      pixelRect(-8, -134, 16, 69, "#24202c");
      pixelRect(-4, -131, 8, 62, accent);
    } else if (character === "hakari") {
      pixelRect(-15, -132, 30, 65, "#e7e0d5");
      pixelRect(-3, -128, 6, 46, "#d6ab45");
    }
    pixelRect(-17, -170, 34, 35, skin);
    if (character === "gojo") {
      pixelRect(-19, -180, 8, 19, hair);
      pixelRect(-13, -187, 8, 25, hair);
      pixelRect(-5, -190, 9, 28, hair);
      pixelRect(4, -187, 9, 25, hair);
      pixelRect(12, -181, 8, 20, hair);
      pixelRect(-16, -164, 32, 8, "#101a31");
      pixelRect(-26, -143, 12, 76, coat);
      pixelRect(-27, -151, 11, 12, skin);
      pixelRect(17, -209, 12, 77, coat);
      pixelRect(18, -215, 11, 13, skin);
      pixelRect(21, -225, 4, 13, skin);
      pixelRect(27, -225, 4, 13, skin);
      pixelRect(-30, -153, 4, 13, accent);
      pixelRect(28, -218, 4, 10, accent);
    } else if (character === "sukuna") {
      pixelRect(-18, -181, 8, 20, hair);
      pixelRect(-11, -188, 9, 27, hair);
      pixelRect(-3, -191, 10, 30, hair);
      pixelRect(6, -187, 10, 26, hair);
      pixelRect(14, -181, 7, 20, hair);
      pixelRect(-13, -165, 10, 4, "#28050e");
      pixelRect(4, -165, 10, 4, "#28050e");
      pixelRect(-15, -155, 8, 3, "#28050e");
      pixelRect(7, -155, 8, 3, "#28050e");
      pixelRect(-29, -145, 13, 64, coat);
      pixelRect(16, -145, 13, 64, coat);
      pixelRect(-27, -151, 10, 13, skin);
      pixelRect(17, -151, 10, 13, skin);
      pixelRect(-11, -146, 11, 42, coat);
      pixelRect(1, -146, 11, 42, coat);
      pixelRect(-10, -151, 9, 12, skin);
      pixelRect(2, -151, 9, 12, skin);
      pixelRect(-5, -156, 3, 10, "#28050e");
      pixelRect(3, -156, 3, 10, "#28050e");
    } else {
      pixelRect(-19, -179, 9, 18, hair);
      pixelRect(-12, -187, 10, 26, hair);
      pixelRect(-4, -191, 11, 30, hair);
      pixelRect(5, -188, 11, 27, hair);
      pixelRect(14, -181, 8, 20, hair);
      pixelRect(-13, -165, 10, 4, "#241a1c");
      pixelRect(4, -165, 11, 4, "#241a1c");
      pixelRect(-31, -145, 14, 65, coat);
      pixelRect(17, -145, 14, 65, coat);
      pixelRect(-28, -151, 10, 13, skin);
      pixelRect(18, -151, 10, 13, skin);
      pixelRect(-12, -148, 10, 45, coat);
      pixelRect(2, -148, 10, 45, coat);
      pixelRect(-10, -154, 9, 12, skin);
      pixelRect(2, -154, 9, 12, skin);
      pixelRect(-4, -159, 3, 10, accent);
      pixelRect(4, -159, 3, 10, accent);
    }
    ctx.restore();
  }

  function drawDomainClashSide(character, left, right, isLeft) {
    const width = Math.max(1, right - left);
    const center = left + width * .5;
    const t = performance.now() * .001;
    if (character === "sukuna") {
      ctx.fillStyle = "#170208";
      ctx.fillRect(left, 0, width, H);
      ctx.fillStyle = "#3c0715";
      ctx.fillRect(left, GROUND - 118, width, 118);
      const shrineW = Math.min(330, width * .72);
      const shrineX = center - shrineW / 2;
      ctx.fillStyle = "#25040d";
      ctx.fillRect(shrineX, GROUND - 235, shrineW, 235);
      ctx.fillStyle = "#690f27";
      ctx.fillRect(shrineX - 24, GROUND - 210, shrineW + 48, 24);
      ctx.fillRect(shrineX + shrineW * .12, GROUND - 274, shrineW * .76, 42);
      ctx.fillStyle = "#120207";
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(shrineX + 18 + i * Math.max(18, (shrineW - 44) / 7), GROUND - 181, 11, 181);
      }
      ctx.strokeStyle = "#ff315899";
      ctx.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const y = 95 + (i * 43 + t * 180) % 430;
        ctx.beginPath();
        ctx.moveTo(left + (i * 71) % width, y);
        ctx.lineTo(left + ((i * 113 + 170) % width), y - 45);
        ctx.stroke();
      }
      drawDomainClashPose("sukuna", center, GROUND - 246, isLeft ? 1 : -1, .82);
    } else if (character === "hakari") {
      ctx.fillStyle = "#06130d";
      ctx.fillRect(left, 0, width, H);
      ctx.fillStyle = "#142d25";
      ctx.fillRect(left, 90, width, 34);
      ctx.fillRect(left, GROUND - 84, width, 84);
      ctx.fillStyle = "#326f4d";
      ctx.fillRect(left, GROUND - 91, width, 7);
      for (let i = 0; i < 6; i++) {
        const x = left + ((i * 118 - t * 90) % (width + 118));
        ctx.fillStyle = i % 2 ? "#5cff8c" : "#fff35d";
        ctx.fillRect(x, 72, 72, 10);
        ctx.fillStyle = "#183b2b";
        ctx.fillRect(x + 8, 142, 88, 112);
        ctx.fillStyle = "#9dfbc155";
        ctx.fillRect(x + 15, 150, 30, 94);
        ctx.fillRect(x + 56, 150, 30, 94);
      }
      const numbers = [7, 3, 7];
      numbers.forEach((number, index) => {
        const boxX = center - 112 + index * 76;
        ctx.fillStyle = "#050907dd";
        ctx.fillRect(boxX - 28, 278, 56, 62);
        ctx.strokeStyle = index === 1 ? "#fff35d" : "#58ff8c";
        ctx.lineWidth = 4;
        ctx.strokeRect(boxX - 28, 278, 56, 62);
        ctx.fillStyle = number === 7 ? "#fff35d" : "#d9ffe5";
        ctx.textAlign = "center";
        ctx.font = '25px "Press Start 2P", monospace';
        ctx.fillText(String(number), boxX, 321);
      });
      drawDomainClashPose("hakari", center, GROUND - 8, isLeft ? 1 : -1, .9);
    } else {
      ctx.fillStyle = "#01010c";
      ctx.fillRect(left, 0, width, H);
      for (let i = 0; i < 72; i++) {
        const x = left + ((i * 83 + Math.sin(i * 4.7) * 120) % width + width) % width;
        const y = (i * 59 + t * (9 + i % 4)) % H;
        pixelRect(x, y, i % 13 === 0 ? 4 : 2, i % 13 === 0 ? 4 : 2, i % 5 ? "#bcecff" : "#9974ff");
      }
      ctx.strokeStyle = "#796cff55";
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(center, 310, 80 + i * 46 + Math.sin(t + i) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const eyeX = left + width * (.16 + i * .17);
        const eyeY = 110 + (i % 2) * 84;
        ctx.fillStyle = "#e9f7ff";
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 24, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#725cff";
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      drawDomainClashPose("gojo", center, GROUND - 5, isLeft ? 1 : -1, .95);
    }
    const label = character === "sukuna" ? "MALEVOLENT SHRINE" : character === "hakari" ? "IDLE DEATH GAMBLE" : "UNLIMITED VOID";
    ctx.textAlign = "center";
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = character === "sukuna" ? "#ff7892" : character === "hakari" ? "#dfff63" : "#c9f7ff";
    ctx.fillText(label, center, 145);
  }

  function drawDomainClashTableau() {
    const c = game.clash;
    if (!c?.domain) return;
    const split = clamp(W * Number(c.displayPower ?? c.power ?? 50) / 100, W * .18, W * .82);
    ctx.save();
    drawDomainClashSide(c.leftCharacter || "gojo", 0, split, true);
    drawDomainClashSide(c.rightCharacter || "sukuna", split, W, false);
    ctx.fillStyle = "#ffffff";
    for (let y = -20; y < H + 40; y += 34) {
      const offset = Math.sin(y * .045 + performance.now() * .01) * 10;
      ctx.fillRect(split - 3 + offset, y, 6, 24);
    }
    ctx.fillStyle = "#ffffff22";
    ctx.fillRect(split - 20, 0, 40, H);
    ctx.restore();
  }

  function drawDomain() {
    if (game.clash?.domain) return;
    if (game.domain <= 0 && game.domainIntro <= 0 && !game.clash?.domain) return;
    if (game.domainCharacter === "higuruma" && game.trial) return;
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

  function wrappedLines(text, maxChars = 46) {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawTrialIcon(icon, x, y, color = "#f2cf74") {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    if (icon === "shield") {
      ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(13, -7); ctx.lineTo(8, 12); ctx.lineTo(0, 18); ctx.lineTo(-8, 12); ctx.lineTo(-13, -7); ctx.closePath();
      ctx.stroke();
    } else if (icon === "mask") {
      ctx.strokeRect(-13, -10, 26, 20);
      ctx.fillRect(-8, -3, 5, 4); ctx.fillRect(4, -3, 5, 4);
      ctx.beginPath(); ctx.moveTo(-10, 11); ctx.lineTo(10, -10); ctx.stroke();
    } else if (icon === "tear") {
      ctx.fillStyle = "#75b8ff";
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(15, 5, 0, 17); ctx.quadraticCurveTo(-15, 5, 0, -15); ctx.fill();
    } else if (icon === "warning") {
      ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(16, 14); ctx.lineTo(-16, 14); ctx.closePath(); ctx.stroke();
      ctx.fillRect(-2, -3, 4, 10); ctx.fillRect(-2, 10, 4, 4);
    } else if (icon === "sword") {
      ctx.strokeStyle = "#fff0bd";
      ctx.beginPath(); ctx.moveTo(-10, 15); ctx.lineTo(15, -18); ctx.stroke();
      ctx.fillRect(-14, 9, 17, 5);
    } else if (icon === "chain") {
      ctx.strokeRect(-15, -7, 18, 14); ctx.strokeRect(-3, -7, 18, 14);
    } else {
      ctx.fillStyle = "#fff7dc";
      ctx.fillRect(-12, -15, 24, 30);
      ctx.fillStyle = "#b88c41";
      ctx.fillRect(-7, -6, 14, 2); ctx.fillRect(-7, 1, 12, 2); ctx.fillRect(-7, 8, 15, 2);
    }
    ctx.restore();
  }

  function drawTrialCourtFigure(label, x, y, character, prosecutor = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = prosecutor ? "#221a12" : "#131118";
    ctx.fillRect(-82, -18, 164, 58);
    ctx.strokeStyle = prosecutor ? "#f2cf74" : "#8f7342";
    ctx.lineWidth = 3;
    ctx.strokeRect(-82, -18, 164, 58);
    ctx.fillStyle = prosecutor ? "#f2cf74" : "#fff7dc";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 20);
    ctx.fillStyle = character === "sukuna" ? "#ff3158" : character === "hakari" ? "#55f087" : character === "higuruma" ? "#f2cf74" : "#8eeaff";
    ctx.fillRect(-14, -70, 28, 48);
    ctx.fillStyle = "#f1c0a5";
    ctx.fillRect(-12, -98, 24, 25);
    if (prosecutor) {
      ctx.strokeStyle = "#f2cf74";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(14, -62);
      ctx.lineTo(62, -78);
      ctx.stroke();
    }
    ctx.restore();
  }

  function trialJudgemanSpeech(trial) {
    if (!trial) return "COURT IS NOW IN SESSION.";
    const crime = String(trial.crime || "THE CHARGE").replace(/\.$/, "");
    const verdict = trialVerdictLabel(trial.verdict || "");
    if (trial.phase === "startup") return "DOMAIN EXPANSION: DEADLY SENTENCING.";
    if (trial.phase === "charge") return `THE ACCUSED IS SUSPECTED OF: ${crime}.`;
    if (trial.phase === "testimony") return `DEFEND YOURSELF. CHARGE: ${crime}.`;
    if (trial.phase === "argument") return "PROSECUTION, PRESENT YOUR ARGUMENT.";
    if (trial.phase === "verdictClash") return "THE SCALE WILL DECIDE THE SENTENCE.";
    if (verdict.includes("CONFISCATION")) return "CONFISCATION.";
    if (verdict.includes("DEATH")) return "DEATH PENALTY.";
    if (verdict.includes("FINE")) return "GUILTY. PAY THE FINE.";
    if (verdict.includes("NOT GUILTY")) return "NOT GUILTY.";
    if (verdict.includes("MISTRIAL")) return "MISTRIAL.";
    return "THE VERDICT HAS BEEN HANDED DOWN.";
  }

  function drawJudgemanCreature(x, y, t, death = false) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.2) * 4);
    ctx.globalAlpha = .92;
    ctx.fillStyle = death ? "#1f0504" : "#08070b";
    ctx.strokeStyle = death ? "#ffb23d" : "#f2cf74";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -78, 96, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = death ? "#ffb23d" : "#f2cf74";
    ctx.fillRect(-72, -34, 144, 16);
    ctx.fillRect(-46, 0, 92, 14);
    ctx.fillRect(-24, 28, 48, 10);
    ctx.fillStyle = "#fff7dc";
    for (let i = 0; i < 5; i++) {
      const ex = -54 + i * 27;
      const ey = -92 + Math.sin(t * 3 + i) * 4;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = death ? "#ff372d" : "#121013";
      ctx.fillRect(ex - 3, ey - 3, 6, 6);
      ctx.fillStyle = "#fff7dc";
    }
    ctx.strokeStyle = death ? "#ff5a35" : "#fff0a8";
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * .82 + i * Math.PI * .205;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 76, -76 + Math.sin(a) * 90);
      ctx.lineTo(Math.cos(a) * 116, -80 + Math.sin(a) * 126);
      ctx.stroke();
    }
    ctx.fillStyle = death ? "#ffb23d" : "#f2cf74";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.fillText("JUDGEMAN", 0, 58);
    ctx.restore();
  }

  function drawJudgemanSpeechBox(trial, t, death = false) {
    const text = trialJudgemanSpeech(trial);
    const lines = wrappedLines(text.toUpperCase(), trial.phase === "charge" || trial.phase === "testimony" ? 50 : 38).slice(0, 3);
    const x = 360;
    const y = 142;
    const w = 560;
    const h = 76;
    ctx.save();
    ctx.fillStyle = death ? "#220604ef" : "#07060cef";
    ctx.strokeStyle = death ? "#ffb23d" : "#f2cf74";
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + 52, y + h);
    ctx.lineTo(x - 30, y + h + 34);
    ctx.lineTo(x + 86, y + h - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = death ? "#ffcf72" : "#f2cf74";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText("JUDGEMAN SAYS", x + 18, y + 21);
    ctx.fillStyle = "#fff7dc";
    ctx.font = '9px "Press Start 2P", monospace';
    lines.forEach((line, index) => ctx.fillText(line, x + 18, y + 43 + index * 16));
    ctx.restore();
  }

  function drawTrialCourtroom(layer = "full") {
    const trial = game.trial;
    if (!trial) return;
    const backgroundOnly = layer === "background";
    const uiOnly = layer === "ui";
    const t = performance.now() * .001;
    const intro = trial.phase === "startup" ? clamp(1 - trial.timer / Math.max(.1, trial.maxTimer || 2), 0, 1) : 1;
    const death = trial.punishment === "deathPenalty" && (trial.phase === "verdict" || trial.phase === "resume");
    ctx.save();
    if (!uiOnly) {
      ctx.globalAlpha = clamp(.28 + intro * .82, .28, 1);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, death ? "#1f0504" : "#17100a");
      grad.addColorStop(.52, "#050407");
      grad.addColorStop(1, death ? "#2a0a04" : "#1f1609");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = death ? "#ffb23d55" : "#f2cf7448";
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = i * 96 + Math.sin(t + i) * 18;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(W / 2 + Math.sin(i) * 110, 420);
        ctx.stroke();
      }
      ctx.fillStyle = "#07060add";
      for (let row = 0; row < 3; row++) {
        for (let x = 60; x < W; x += 155) {
          ctx.fillRect(x, 410 + row * 42, 110, 14);
          ctx.fillRect(x + 8, 424 + row * 42, 10, 36);
          if ((x + row) % 2 === 0) {
            ctx.fillStyle = "#f2cf7425";
            ctx.fillRect(x + 46, 386 + row * 42, 18, 24);
            ctx.fillStyle = "#07060add";
          }
        }
      }
      for (let i = 0; i < 8; i++) {
        const x = 68 + i * 162;
        ctx.strokeStyle = "#f2cf7440";
        ctx.strokeRect(x, 90, 62, 405);
        for (let y = 106; y < 475; y += 42) {
          ctx.beginPath();
          ctx.arc(x + 14, y, 8, 0, Math.PI * 2);
          ctx.arc(x + 48, y + 20, 8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = i % 2 ? "#0c0a0e80" : "#f2cf7410";
        ctx.fillRect(i * 70 - (t * 18 % 70), GROUND - 52 + Math.sin(t * 2 + i) * 8, 86, 18);
      }

      for (let i = 0; i < 24; i++) {
        const x = (i * 83 + Math.sin(t * .8 + i) * 38 + W) % W;
        const y = 90 + ((i * 41 + t * 24) % 330);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(t + i) * .2);
        ctx.fillStyle = "#fff7dc22";
        ctx.fillRect(-16, -11, 32, 22);
        ctx.fillStyle = "#f2cf7445";
        ctx.fillRect(-10, -4, 20, 2);
        ctx.fillRect(-10, 3, 15, 2);
        ctx.restore();
      }

      const judgeY = 126 + Math.sin(t * 2.4) * 6;
      ctx.strokeStyle = "#f2cf7466";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W / 2, 48);
      ctx.lineTo(W / 2, 190);
      ctx.moveTo(W / 2 - 145, 104);
      ctx.lineTo(W / 2 + 145, 104);
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + side * 112, 104);
        ctx.lineTo(W / 2 + side * 74, 172);
        ctx.lineTo(W / 2 + side * 150, 172);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = "#100e14";
      ctx.fillRect(W / 2 - 210, 204, 420, 104);
      ctx.strokeStyle = "#f2cf74";
      ctx.lineWidth = trial.phase === "verdict" ? 7 : 4;
      ctx.strokeRect(W / 2 - 210, 204, 420, 104);

      const casterSlot = Number(trial.casterSlot || 0);
      const caster = game.online.active
        ? (casterSlot && casterSlot !== game.online.slot ? game.enemy : game.player)
        : (game.player?.character === "higuruma" ? game.player : game.enemy?.character === "higuruma" ? game.enemy : game.player);
      const judgemanX = clamp(Number(caster?.x ?? 286), 138, W - 138);
      const judgemanY = clamp(Number(caster?.y ?? GROUND) - 212, 220, 360);
      drawJudgemanCreature(judgemanX, judgemanY, t, death);

      ctx.fillStyle = death ? "#2b0a07" : "#18131b";
      ctx.fillRect(W / 2 - 105, judgeY - 38, 210, 92);
      ctx.fillStyle = death ? "#ffb23d" : "#f2cf74";
      ctx.fillRect(W / 2 - 70, judgeY - 14, 140, 12);
      ctx.fillRect(W / 2 - 48, judgeY + 12, 96, 12);
      ctx.fillStyle = "#fff7dc";
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(trial.phase === "verdict" ? "JUDGEMAN DECIDES" : "JUDGEMAN", W / 2, 244);
      if (trial.phase === "verdict") {
        ctx.fillStyle = death ? "#ff3d28" : "#fff1a8";
        ctx.fillRect(W / 2 - 42, judgeY - 4, 24, 8);
        ctx.fillRect(W / 2 + 18, judgeY - 4, 24, 8);
      }
      if (trial.phase === "verdict" || trial.phase === "verdictClash") {
        ctx.save();
        ctx.translate(W / 2 + 190, 126);
        ctx.rotate(Math.sin(t * 8) * .08);
        ctx.fillStyle = "#f2cf74";
        ctx.fillRect(-55, -8, 110, 16);
        ctx.fillRect(-13, -38, 26, 60);
        ctx.restore();
      }

      if (backgroundOnly) {
        ctx.restore();
        return;
      }
    }

    ctx.globalAlpha = 1;
    drawJudgemanSpeechBox(trial, t, death);

    ctx.textAlign = "center";
    ctx.fillStyle = "#f2cf74";
    ctx.font = '24px "Press Start 2P", monospace';
    ctx.fillText(trial.phase === "startup" && intro < .55 ? "DOMAIN EXPANSION" : "DEADLY SENTENCING", W / 2, 46);
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = "#fff7dc";
    ctx.fillText(trial.message || "COURT IS NOW IN SESSION.", W / 2, 76);

    const leftScore = Number(trial.prosecutor || trial.baseProsecutor || 0) + Number(trial.prosecutorBonus || 0);
    const rightScore = Number(trial.defense || trial.baseDefense || 0) + Number(trial.defenseBonus || 0);
    ctx.fillStyle = "#0a090dcc";
    ctx.fillRect(56, 92, 250, 62);
    ctx.fillRect(W - 306, 92, 250, 62);
    ctx.strokeStyle = "#f2cf74";
    ctx.strokeRect(56, 92, 250, 62);
    ctx.strokeRect(W - 306, 92, 250, 62);
    ctx.fillStyle = "#f2cf74";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillText("HIGURUMA ARGUMENT", 74, 116);
    ctx.fillText(trial.phase === "verdictClash" ? "MASH A/D" : "PROSECUTION", 74, 140);
    ctx.textAlign = "right";
    ctx.fillText("ACCUSED DEFENSE", W - 74, 116);
    ctx.fillText(trial.phase === "verdictClash" ? "RESIST" : "TESTIMONY", W - 74, 140);
    ctx.textAlign = "center";
    const evidence = clamp(Number(trial.evidence || 0) / 100, 0, 1);
    ctx.fillStyle = "#211709";
    ctx.fillRect(W / 2 - 180, 92, 360, 18);
    ctx.fillStyle = evidence > .65 ? "#ffdb66" : evidence > .4 ? "#d49b45" : "#8d6a38";
    ctx.fillRect(W / 2 - 180, 92, 360 * evidence, 18);
    ctx.strokeStyle = "#fff7dc66";
    ctx.strokeRect(W / 2 - 180, 92, 360, 18);
    ctx.fillStyle = "#fff7dc";
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`EVIDENCE STRENGTH ${Math.round(evidence * 100)}%`, W / 2, 128);

    ctx.textAlign = "left";
    ctx.fillStyle = "#0c0b0fdd";
    ctx.fillRect(92, 418, W - 184, 86);
    ctx.strokeStyle = "#f2cf74";
    ctx.lineWidth = 3;
    ctx.strokeRect(92, 418, W - 184, 86);
    ctx.fillStyle = "#f2cf74";
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText(`ACCUSED: ${(characters[trial.targetCharacter]?.name || trial.targetCharacter || "UNKNOWN").toUpperCase()}`, 116, 445);
    ctx.fillStyle = "#fff7dc";
    ctx.font = '9px "Press Start 2P", monospace';
    wrappedLines(trial.crime || "Preparing evidence...", 88).slice(0, 2).forEach((line, index) => ctx.fillText(line.toUpperCase(), 116, 474 + index * 18));

    if (trial.phase === "verdictClash") {
      const ratio = clamp(.5 + (leftScore - rightScore) / 120, .12, .88);
      if (trial.chosenArgument?.text || trial.argument?.text) {
        ctx.save();
        ctx.translate(W / 2, 256);
        ctx.rotate(-.08);
        ctx.fillStyle = "#050505cc";
        ctx.fillRect(-430, -28, 860, 56);
        ctx.strokeStyle = "#f2cf74";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-455, 24);
        ctx.lineTo(455, -24);
        ctx.stroke();
        ctx.fillStyle = "#fff0a8";
        ctx.font = '15px "Press Start 2P", monospace';
        ctx.textAlign = "center";
        ctx.fillText(String(trial.chosenArgument?.text || trial.argument?.text || "ARGUMENT").toUpperCase(), 0, 7);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(W / 2, 320);
      ctx.rotate((ratio - .5) * .55);
      ctx.strokeStyle = "#f2cf74";
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-210, 0); ctx.lineTo(210, 0); ctx.stroke();
      ctx.fillStyle = "#f2cf74";
      ctx.fillRect(-10, -72, 20, 140);
      ctx.restore();
      ctx.fillStyle = "#0a090ddd";
      ctx.fillRect(W / 2 - 220, 350, 440, 46);
      ctx.strokeStyle = "#f2cf74";
      ctx.strokeRect(W / 2 - 220, 350, 440, 46);
      ctx.fillStyle = "#fff7dc";
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(`TIP THE SCALE  ${Math.ceil(trial.timer || 0)}`, W / 2, 379);
    }

    const status = trialChoiceStatus(trial);
    const choice = status.choice;
    const options = choice.options;
    if (options.length) {
      const firstCard = trialCardRect(0);
      const timerY = firstCard.y + firstCard.h + 8;
      ctx.textAlign = "center";
      ctx.fillStyle = status.canChoose && !status.pending ? "#fff0a8" : "#8da0ba";
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText(status.label, W / 2, firstCard.y - 14);
      options.forEach((option, index) => {
        const card = trialCardRect(index);
        const x = card.x;
        const y = card.y;
        const hover = status.canChoose && !status.pending && game.trialHover === index;
        const disabled = !status.canChoose || status.pending;
        ctx.fillStyle = hover ? "#251b0cee" : disabled ? "#080b13c8" : "#0b0a0dcc";
        ctx.fillRect(x, y, card.w, card.h);
        ctx.strokeStyle = hover ? "#fff0a8" : disabled ? "#40506d" : "#f2cf74";
        ctx.lineWidth = hover ? 5 : 3;
        ctx.strokeRect(x, y, card.w, card.h);
        drawTrialIcon(option?.icon || "paper", x + 38, y + 48, hover ? "#fff0a8" : disabled ? "#5c6980" : "#f2cf74");
        ctx.fillStyle = disabled ? "#6f7d96" : "#f2cf74";
        ctx.font = '11px "Press Start 2P", monospace';
        ctx.textAlign = "left";
        ctx.fillText(`${index + 1}`, x + 18, y + 26);
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText(String(option?.risk || "CHOICE").toUpperCase(), x + 62, y + 26);
        ctx.fillStyle = disabled ? "#9aa6bb" : "#fff7dc";
        wrappedLines(String(option?.text || "No statement.").toUpperCase(), 36).slice(0, 3).forEach((line, row) => ctx.fillText(line, x + 62, y + 48 + row * 13));
        ctx.fillStyle = disabled ? "#68748a" : "#c9b78d";
        wrappedLines(String(option?.hint || ""), 44).slice(0, 2).forEach((line, row) => ctx.fillText(line.toUpperCase(), x + 16, y + 94 + row * 11));
        if (disabled) {
          ctx.fillStyle = "rgba(2, 5, 12, .42)";
          ctx.fillRect(x, y, card.w, card.h);
        }
      });
      const timerRatio = clamp(Number(trial.timer || 0) / Math.max(.1, Number(trial.maxTimer || 8)), 0, 1);
      ctx.fillStyle = "#3b2811";
      ctx.fillRect(230, timerY, W - 460, 8);
      ctx.fillStyle = "#f2cf74";
      ctx.fillRect(230, timerY, (W - 460) * timerRatio, 8);
    }

    if (trial.phase === "verdict" || trial.phase === "resume") {
      const verdict = trialVerdictLabel(trial.verdict || trial.message);
      ctx.textAlign = "center";
      ctx.fillStyle = death ? "#130000e8" : "#000000dd";
      ctx.fillRect(0, H / 2 - 80, W, 160);
      ctx.strokeStyle = death ? "#ffb23d" : "#f2cf74";
      ctx.lineWidth = 7;
      ctx.strokeRect(96, H / 2 - 62, W - 192, 124);
      ctx.fillStyle = death ? "#ffd26c" : "#f2cf74";
      ctx.font = '27px "Press Start 2P", monospace';
      ctx.fillText(verdict.toUpperCase(), W / 2, H / 2 + 8);
      ctx.font = '10px "Press Start 2P", monospace';
      if (trial.punishment === "confiscation") ctx.fillText("TECHNIQUE CONFISCATED", W / 2, H / 2 + 42);
      else if (trial.punishment === "deathPenalty") ctx.fillText("EXECUTIONER'S SWORD GRANTED", W / 2, H / 2 + 42);
      else if (trial.punishment === "mistrial") ctx.fillText("PAPERS SCATTER / SCALE CRACKED", W / 2, H / 2 + 42);
      else if (trial.punishment === "notGuilty") ctx.fillText("CHAINS BREAK", W / 2, H / 2 + 42);
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
      drawTrialCourtroom("background");
      drawProps();
      for (const a of game.afterimages) drawFighter(a, a.life / a.maxLife * .45, a.color);
      drawProjectiles();
      drawUnstablePurple();
      drawRemoteUnstablePurple();
      if (game.player) drawFighter(game.player);
      if (isSurvivalMode()) {
        for (const enemy of activeSurvivalEnemies()) drawCurse(enemy);
      } else if (game.enemy) {
        if ((game.online.active && game.enemy.kind === "remote") || game.enemy.character) drawFighter(game.enemy);
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
    drawDomainClashTableau();
    drawTrialCourtroom("ui");
    for (const fighter of [game.player, game.enemy]) {
      if (fighter?.attack?.type === "executionSword") {
        const a = fighter.attack;
        const windup = a.elapsed < a.start;
        ctx.save();
        ctx.globalAlpha = windup ? .55 + Math.sin(performance.now() * .03) * .18 : .9;
        ctx.strokeStyle = windup ? "#f2cf74" : "#050505";
        ctx.lineWidth = windup ? 2 : 13;
        ctx.beginPath();
        ctx.moveTo(fighter.x + fighter.facing * 22, fighter.y - 92);
        ctx.lineTo(fighter.x + fighter.facing * 270, fighter.y - 128);
        ctx.stroke();
        if (!windup) {
          ctx.strokeStyle = "#f2cf74";
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(fighter.x + fighter.facing * 22, fighter.y - 92);
          ctx.lineTo(fighter.x + fighter.facing * 270, fighter.y - 128);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
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
    const trialLocked = Boolean(game.trial && game.trial.phase !== "startup");
    const trialClashMove = game.trial?.phase === "verdictClash"
      ? (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0)
      : 0;
    const domainLocked = game.domainStartup > 0 || localFrozenByUnlimitedVoid() || trialLocked;
    const input = domainLocked
      ? {
        move: trialClashMove, jump: false, dash: false, block: false, charge: false,
        light: false, heavy: false, special: "", domain: edges.domain, awaken: false, clash: edges.clash,
        trialChoice: edges.trialChoice,
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
        specialHeld: ["gojo", "sukuna", "higuruma"].includes(game.player.character) && keys.has("e") ? "red" : "",
        specialRelease: edges.specialRelease,
        fuga: edges.fuga,
        domain: edges.domain,
        awaken: edges.awaken,
        clash: edges.clash,
        trialChoice: edges.trialChoice,
      };
    game.online.inputEdges = {
      jump: false, dash: false, light: false, heavy: false,
      special: "", specialRelease: "", fuga: false, domain: false, awaken: false, clash: 0, trialChoice: -1,
    };
    game.online.predictionHistory.set(frame, {
      x: game.player.x,
      y: game.player.y,
      vx: game.player.vx,
      vy: game.player.vy,
    });
    game.online.latestInputFrame = Math.max(game.online.latestInputFrame, frame);
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
      roughDownkick: "ROUGH DOWNKICK",
      cleave: "CLEAVE",
      blueSkyfall: "BLUE SKYFALL",
      door: "SHUTTER DOORS",
      gamblersLuck: "GAMBLER'S LUCK",
      feverBreaker: "FEVER BREAKER",
      gavel: "SHAPESHIFTING GAVEL",
      chargedGavel: "GIANT GAVEL",
      gavelHookPull: "GAVEL HOOK",
      gavelThrow: "GAVEL HOOK THROW",
      gavelAirSlam: "DOWNWARD HOOK",
      gavelSentence: "GIANT GAVEL SENTENCE",
      executionSword: "EXECUTIONER'S SWORD",
      fuga: "FUGA",
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
      gavel: ["gavel", "chargedGavel", "gavelHookPull", "gavelThrow", "gavelAirSlam", "gavelSentence", "executionSword"].includes(attack.kind),
      glass: attack.kind === "gavelSentence",
      execution: attack.kind === "executionSword",
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
      showPurpleCollapse(event.x, event.y);
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
    } else if (event.kind === "domainTrialStart") {
      game.domainCharacter = "higuruma";
      game.domainOwnerSlot = Number(event.slot || 0);
      game.domainStartup = Number(event.startupTicks || 90) / 60;
      game.domainIntro = game.domainStartup;
      game.cinematic = game.domainStartup;
      game.trial = {
        phase: "startup",
        online: true,
        casterSlot: Number(event.slot || 0),
        targetSlot: Number(event.slot || 0) === 1 ? 2 : 1,
        timer: game.domainStartup,
        maxTimer: game.domainStartup,
        message: "DOMAIN EXPANSION: DEADLY SENTENCING",
        options: [],
        argumentOptions: [],
      };
      game.glitch = .7;
      game.windPaused = true;
      announce("DOMAIN EXPANSION: DEADLY SENTENCING");
    } else if (event.kind === "domainTrialFailed") {
      clearTrialState();
      announce(event.slot === game.online.slot ? "DOMAIN BROKEN" : "OPPONENT DOMAIN BROKEN");
    } else if (event.kind === "trialCharge") {
      game.domainCharacter = "higuruma";
      game.domainOwnerSlot = Number(event.casterSlot || 0);
      game.trial = {
        phase: "charge",
        online: true,
        casterSlot: Number(event.casterSlot || 0),
        targetSlot: Number(event.targetSlot || 0),
        targetCharacter: event.targetCharacter || "sukuna",
        crime: event.crime || "",
        evidence: Number(event.evidence || 50),
        options: Array.isArray(event.options) ? event.options : [],
        argumentOptions: [],
        timer: Number(event.chargeTicks || 180) / 60,
        maxTimer: Number(event.chargeTicks || 180) / 60,
        message: event.line || "COURT IS NOW IN SESSION.",
        line: event.line || "COURT IS NOW IN SESSION.",
        chosenDialogue: null,
        chosenArgument: null,
        dialogue: null,
        argument: null,
        localChoicePendingPhase: "",
        prosecutorBonus: 0,
        defenseBonus: 0,
      };
      game.trialHover = -1;
      game.domainIntro = 0;
      game.cinematic = 0;
      game.windPaused = true;
      announce("COURT IS NOW IN SESSION");
    } else if (event.kind === "trialAccusedChoice") {
      if (game.trial) {
        game.trial.phase = "argument";
        game.trial.chosenDialogue = event.choice || null;
        game.trial.dialogue = event.choice || null;
        game.trial.argumentOptions = Array.isArray(event.argumentOptions) ? event.argumentOptions : [];
        game.trial.localChoicePendingPhase = "";
        game.trialHover = -1;
        game.trial.timer = Number(event.timerTicks || 480) / 60;
        game.trial.maxTimer = game.trial.timer;
        game.trial.message = `ACCUSED: "${event.choice?.text || "I will say nothing."}"`;
      }
      announce(event.slot === game.online.slot ? "TESTIMONY ENTERED" : "OPPONENT TESTIFIED");
    } else if (event.kind === "trialArgumentChoice") {
      if (game.trial) {
        game.trial.chosenArgument = event.choice || null;
        game.trial.argument = event.choice || null;
        game.trial.localChoicePendingPhase = "";
        game.trialHover = -1;
        game.trial.message = event.choice?.text || "ARGUMENT ENTERED";
      }
    } else if (event.kind === "trialVerdictClash") {
      if (game.trial) {
        game.trial.phase = "verdictClash";
        game.trial.baseProsecutor = Number(event.prosecutor || 0);
        game.trial.baseDefense = Number(event.defense || 0);
        game.trial.prosecutor = Number(event.prosecutor || 0);
        game.trial.defense = Number(event.defense || 0);
        game.trial.prosecutorBonus = 0;
        game.trial.defenseBonus = 0;
        game.trial.localChoicePendingPhase = "";
        game.trialHover = -1;
        game.trial.timer = Number(event.timerTicks || 180) / 60;
        game.trial.maxTimer = game.trial.timer;
        game.trial.message = "THE SCALE WILL DECIDE";
      }
      announce("VERDICT CLASH");
    } else if (event.kind === "trialVerdict") {
      if (game.trial) {
        game.trial.phase = "verdict";
        game.trial.verdict = event.verdict || "MISTRIAL";
        game.trial.punishment = event.punishment || "none";
        game.trial.prosecutor = Number(event.prosecutor || game.trial.prosecutor || 0);
        game.trial.defense = Number(event.defense || game.trial.defense || 0);
        game.trial.prosecutorBonus = Number(event.prosecutorBonus || game.trial.prosecutorBonus || 0);
        game.trial.defenseBonus = Number(event.defenseBonus || game.trial.defenseBonus || 0);
        game.trial.localChoicePendingPhase = "";
        game.trialHover = -1;
        game.trial.timer = 2;
        game.trial.maxTimer = 2;
        game.trial.message = trialVerdictLabel(game.trial.verdict);
      }
      game.shake = 18;
      game.flash = .24;
      announce(event.verdict || "VERDICT");
    } else if (event.kind === "trialConfiscationStart") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      victim.moveConfiscation = Number(event.durationTicks || 900) / 60;
      spawnParticles(victim.x, victim.y - victim.h * .55, "#f2cf74", 34, 360, 8, .85);
      announce(event.slot === game.online.slot ? "TECHNIQUE CONFISCATED" : "OPPONENT CONFISCATED");
    } else if (event.kind === "trialConfiscationEnd") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      victim.moveConfiscation = 0;
      announce(event.slot === game.online.slot ? "TECHNIQUE RESTORED" : "OPPONENT TECHNIQUE RESTORED");
    } else if (event.kind === "executionSwordStart") {
      const caster = event.slot === game.online.slot ? game.player : game.enemy;
      caster.executionSword = Number(event.durationTicks || 1080) / 60;
      caster.executionSwordUsed = false;
      game.flash = .22;
      spawnParticles(caster.x, caster.y - 80, "#f2cf74", 42, 430, 8, .85);
      announce(event.slot === game.online.slot ? "EXECUTIONER'S SWORD" : "OPPONENT HAS EXECUTIONER'S SWORD");
    } else if (event.kind === "executionSwordHit") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      game.hitstop = .5;
      game.flash = .45;
      game.shake = 24;
      spawnParticles(victim.x, victim.y - victim.h * .55, "#050505", 34, 520, 11, .85);
      spawnParticles(victim.x, victim.y - victim.h * .55, "#f2cf74", 40, 560, 8, .8);
      announce("EXECUTION");
    } else if (event.kind === "executionSwordMiss") {
      const caster = event.slot === game.online.slot ? game.player : game.enemy;
      caster.executionSword = 0;
      caster.executionSwordUsed = true;
      caster.executionRecovery = 1.5;
      spawnParticles(caster.x + caster.facing * 75, caster.y - 70, "#f2cf74", 18, 260, 6, .55);
      announce(event.slot === game.online.slot ? "MISSED VERDICT" : "OPPONENT MISSED VERDICT");
    } else if (event.kind === "executionSwordEnd") {
      const caster = event.slot === game.online.slot ? game.player : game.enemy;
      caster.executionSword = 0;
      caster.executionSwordUsed = false;
      announce(event.slot === game.online.slot ? "SWORD EXPIRED" : "OPPONENT SWORD EXPIRED");
    } else if (event.kind === "trialPunishmentEnd") {
      clearTrialState();
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
      } else if (remoteCast && event.technique === "gavel") {
        announce("OPPONENT: SHAPESHIFTING GAVEL");
      } else if (remoteCast && event.technique === "chargedGavel") {
        announce("OPPONENT: GIANT GAVEL");
      } else if (remoteCast && event.technique === "executionSword") {
        announce("OPPONENT: EXECUTIONER'S SWORD");
      } else if (remoteCast && String(event.technique || "").startsWith("gavel")) {
        announce(`OPPONENT: ${String(event.technique).replace(/([A-Z])/g, " $1").toUpperCase()}`);
      }
    } else if (event.kind === "hakariRollInput") {
      const rarity = String(event.rarity || "green").toUpperCase();
      announce(`${rarity} ${String(event.technique || "ROLL").toUpperCase()}  ${event.count}/2`);
    } else if (event.kind === "worldSlashUnlocked") {
      announce(event.slot === game.online.slot ? "WORLD-CUTTING SLASH UNLOCKED" : "OPPONENT UNLOCKED WORLD SLASH");
      game.realityCrack = .3;
    } else if (event.kind === "fugaStart" || event.kind === "fugaFire") {
      announce(event.slot === game.online.slot ? "FUGA" : "OPPONENT: FUGA");
      game.cinematic = Math.max(game.cinematic, .45);
      game.cameraTarget = 1.2;
      game.flash = .12;
    } else if (event.kind === "fugaImpact") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      victim.burned = true;
      game.shake = 25;
      game.flash = .35;
      for (let burst = 0; burst < 5; burst++) {
        spawnParticles(victim.x + rnd(-70, 70), GROUND - rnd(20, 180), burst % 2 ? "#ffbc45" : "#ff4d18", 24, 620, 12, 1);
      }
    } else if (event.kind === "roughDownkick") {
      const fighter = event.slot === game.online.slot ? game.player : game.enemy;
      spawnShockwave(fighter.x, GROUND - 4, "#55f087");
      spawnParticles(fighter.x, GROUND - 8, "#65705f", 38, 440, 10, .85);
      game.shake = 16;
    } else if (event.kind === "blueSkyfall") {
      const victim = event.targetSlot === game.online.slot ? game.player : game.enemy;
      spawnShockwave(victim.x, GROUND - 4, "#4e8fff");
      spawnParticles(victim.x, GROUND - 8, "#65758d", 34, 430, 10, .85);
      game.shake = 15;
    } else if (event.kind === "shutterBreaker") {
      announce(event.slot === game.online.slot ? "SHUTTER BREAKER" : "OPPONENT: SHUTTER BREAKER");
      game.shake = 10;
    } else if (event.kind === "movesConfiscated" && event.slot === game.online.slot) {
      game.player.moveConfiscation = Number(event.durationTicks || 300) / 60;
      announce("TECHNIQUES CONFISCATED 5s");
    } else if (event.kind === "feverBreakerLaunch" || event.kind === "feverBreakerKick") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      spawnParticles(victim.x, victim.y - 55, "#fff35d", 26, 480, 8, .7);
      game.shake = 12;
    } else if (event.kind === "gamblersLuckGrind" || event.kind === "gamblersLuckThrow") {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      spawnParticles(victim.x, GROUND - 7, "#58ff8c", 30, 430, 9, .75);
      game.shake = 11;
    } else if (["gavelHookPull", "gavelThrow", "gavelAirSlam", "gavelSentence"].includes(event.kind)) {
      const victim = event.slot === game.online.slot ? game.player : game.enemy;
      const groundImpact = event.kind === "gavelAirSlam" || event.kind === "gavelSentence";
      spawnParticles(victim.x, victim.y - victim.h * .55, "#f2cf74", event.kind === "gavelSentence" ? 34 : 20, 430, 8, .7);
      spawnParticles(victim.x, victim.y - victim.h * .55, "#fff7dc", 12, 260, 5, .45);
      if (groundImpact) spawnShockwave(victim.x, GROUND - 4, "#f2cf74");
      game.shake = Math.max(game.shake, event.kind === "gavelSentence" ? 17 : 10);
    } else if (event.kind === "jackpot") {
      announce(event.slot === game.online.slot ? "JACKPOT" : "OPPONENT HIT JACKPOT");
      const jackpotFighter = event.slot === game.online.slot ? game.player : game.enemy;
      if (jackpotFighter?.character === "hakari") {
        jackpotFighter.jackpot = HAKARI_JACKPOT_DURATION;
        jackpotFighter.awakening = HAKARI_JACKPOT_DURATION;
      }
      if (game.hakariDomain && Array.isArray(event.slots)) game.hakariDomain.displaySlots = event.slots;
      game.hakariDomain = null;
      game.jackpotFlash = 1.2;
      game.flash = .3;
      game.shake = 16;
      startHakariJackpotMusic();
    } else if (event.kind === "failedRoll") {
      if (game.hakariDomain && Array.isArray(event.slots)) {
        game.hakariDomain.displaySlots = event.slots;
        game.hakariDomain.rollIndex = Number(event.attempt || game.hakariDomain.rollIndex);
        game.hakariDomain.chanceNumerator = Number(event.chanceNumerator || 1);
      }
      const rollLabel = `${Number(event.attempt || 1)}/${Number(event.maxAttempts || 5)}`;
      announce(event.finalAttempt
        ? (event.slot === game.online.slot ? "FIVE ROLLS MISSED" : "OPPONENT'S DOMAIN SHATTERED")
        : (event.slot === game.online.slot ? `ROLL ${rollLabel} MISSED` : `OPPONENT MISSED ROLL ${rollLabel}`));
    } else if (event.kind === "clashResult") {
      announce(Number(event.winnerSlot || 0) === 0 ? "CLASH DRAW" : event.winnerSlot === game.online.slot ? "CLASH WON" : "CLASH LOST");
      game.flash = .18;
      game.shake = 16;
    } else if (event.kind === "hit" && event.slot === game.online.slot) {
      game.shake = Math.max(game.shake, 5);
    }
  }

  function applyAuthoritativeSnapshot(snapshot) {
    if (!snapshot || !game.online.active || !game.player || !game.enemy) return;
    const normalizeTrialSnapshot = (trial) => {
      if (!trial) return null;
      const chosenDialogue = trial.chosenDialogue || trial.dialogue || null;
      const chosenArgument = trial.chosenArgument || trial.argument || null;
      const line = trial.line || "";
      const existing = game.trial && game.trial.online ? game.trial : null;
      const snapshotOptions = Array.isArray(trial.options) ? trial.options.filter(Boolean) : [];
      const snapshotArgumentOptions = Array.isArray(trial.argumentOptions) ? trial.argumentOptions.filter(Boolean) : [];
      const options = snapshotOptions.length || !existing || existing.phase !== trial.phase
        ? snapshotOptions
        : Array.isArray(existing.options) ? existing.options : [];
      const argumentOptions = snapshotArgumentOptions.length || !existing || existing.phase !== trial.phase
        ? snapshotArgumentOptions
        : Array.isArray(existing.argumentOptions) ? existing.argumentOptions : [];
      return {
        ...trial,
        online: true,
        options,
        argumentOptions,
        dialogue: chosenDialogue,
        argument: chosenArgument,
        chosenDialogue,
        chosenArgument,
        localChoicePendingPhase: existing?.localChoicePendingPhase || "",
        line,
        timer: Number(trial.timer || 0) / 60,
        maxTimer: Number(trial.maxTimer || trial.timer || 1) / 60,
        message: trial.verdict
          ? trialVerdictLabel(trial.verdict)
          : line || (trial.phase === "charge"
            ? "COURT IS NOW IN SESSION."
            : trial.phase === "testimony"
              ? "CHOOSE TESTIMONY"
              : trial.phase === "argument"
                ? "CHOOSE ARGUMENT"
                : trial.phase === "verdictClash"
                  ? "THE SCALE WILL DECIDE"
                  : trial.phase === "resume"
                    ? "READY?"
                    : "DOMAIN EXPANSION: DEADLY SENTENCING"),
      };
    };
    const local = snapshot.players?.[game.online.slot];
    const remoteSlot = game.online.slot === 1 ? 2 : 1;
    const remote = snapshot.players?.[remoteSlot];
    if (!local || !remote) return;
    game.online.serverFrame = snapshot.tick;
    game.time = Number(snapshot.remainingTicks) < 0 ? Infinity : Number(snapshot.remainingTicks || 0) / 60;

    const errorX = local.x - game.player.x;
    const errorY = local.y - game.player.y;
    const ackFrame = Number(local.ackFrame ?? -1);
    game.online.lastAckFrame = Math.max(game.online.lastAckFrame, ackFrame);
    const hasUnacknowledgedInput = game.online.latestInputFrame > ackFrame;
    const localMovementActive = (keys.has("a") !== keys.has("d"))
      || game.player.dashTime > 0
      || Math.abs(game.player.vx) > 20;
    const frozenByRemoteVoid = remote.character === "gojo" && Number(remote.domainTicks || 0) > 0;
    const forcedGameplayState = Number(local.stun || 0) > 0 || frozenByRemoteVoid;
    const canReconcilePosition = forcedGameplayState
      || (!hasUnacknowledgedInput && !localMovementActive && !game.player.attack && !game.player.charging);
    if (forcedGameplayState && (Math.abs(errorX) > 110 || Math.abs(errorY) > 85)) {
      game.player.x = local.x;
      game.player.y = local.y;
      game.online.correctionX = 0;
      game.online.correctionY = 0;
    } else {
      const correctionScale = forcedGameplayState ? .7 : .28;
      game.online.correctionX = canReconcilePosition && Math.abs(errorX) >= 12
        ? clamp(errorX * correctionScale, -48, 48)
        : 0;
      game.online.correctionY = canReconcilePosition && Math.abs(errorY) >= 10
        ? clamp(errorY * correctionScale, -40, 40)
        : 0;
    }
    if (forcedGameplayState) {
      game.player.vx = Number(local.vx || 0);
      game.player.vy = Number(local.vy || 0);
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
    game.player.worldSlashUses = Number(local.worldSlashUses || 0);
    game.player.moveConfiscation = Number(local.moveConfiscationTicks || 0) / 60;
    game.player.executionSword = Number(local.executionSwordTicks || 0) / 60;
    game.player.executionSwordUsed = Boolean(local.executionSwordUsed);
    game.player.executionRecovery = Number(local.executionRecoveryTicks || 0) / 60;
    if (Number(local.chargedSpecialTicks || 0) > 0) {
      game.player.techniqueCharge = {
        name: "red",
        elapsed: Number(local.chargedSpecialTicks || 0) / 60,
        releaseDelay: Number(local.chargedReleaseTicks ?? -1) / 60,
      };
    } else if (game.player.techniqueCharge && !keys.has("e")) {
      game.player.techniqueCharge = null;
    }
    game.player.charging = Boolean(local.charging);
    game.player.burned = Boolean(local.burned);
    game.player.onlineVariant = local.variant === "inverted" ? "inverted" : "normal";
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
      worldSlashUses: Number(remote.worldSlashUses || 0),
      moveConfiscation: Number(remote.moveConfiscationTicks || 0) / 60,
      executionSword: Number(remote.executionSwordTicks || 0) / 60,
      executionSwordUsed: Boolean(remote.executionSwordUsed),
      executionRecovery: Number(remote.executionRecoveryTicks || 0) / 60,
      burnout: 0,
      burned: Boolean(remote.burned),
      variant: remote.variant === "inverted" ? "inverted" : "normal",
      state: Number(remote.dashTicks || 0) > 0 ? "dash" : remote.attack ? "attack" : remote.charging ? "charge" : Math.abs(remote.vx) > 10 ? "run" : "idle",
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
            maxRolls: 5, rollInputs: [], lastRarity: "", chanceNumerator: 1, result: "waiting", flash: 0,
          };
        }
        game.hakariDomain.timer = game.domain;
        game.hakariDomain.rollIndex = Number(domainOwner.hakariRollAttempts || 0);
        game.hakariDomain.rollInputs = Array.isArray(domainOwner.hakariRollInputs) ? domainOwner.hakariRollInputs : [];
        game.hakariDomain.lastRarity = domainOwner.hakariLastRarity || "";
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
      game.clash.leftCharacter = local.character;
      game.clash.rightCharacter = remote.character;
    } else if (!snapshot.clash && game.clash) {
      game.clash = null;
      ui.clash.classList.add("hidden");
    }
    const snapshotTrial = normalizeTrialSnapshot(snapshot.trial);
    if (snapshotTrial && !game.trial) {
      game.trial = snapshotTrial;
      game.domainCharacter = "higuruma";
      game.domainOwnerSlot = Number(snapshotTrial.casterSlot || 0);
      game.windPaused = true;
    } else if (snapshotTrial && game.trial) {
      Object.assign(game.trial, snapshotTrial);
      game.domainCharacter = "higuruma";
      game.domainOwnerSlot = Number(snapshotTrial.casterSlot || 0);
      game.windPaused = true;
    } else if (!snapshotTrial && game.trial?.online) {
      clearTrialState();
    }
    syncTrialUiState();
    for (const event of snapshot.events || []) displayAuthoritativeEvent(event);
    syncTrialUiState();
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
      gavel: p.attack.gavel,
      glass: p.attack.glass,
    } : null;
    return {
      character: p.character,
      x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      facing: p.facing, grounded: p.grounded,
      state: p.state, blocking: p.blocking,
      charging: p.charging,
      health: Math.max(0, p.health), energy: p.energy,
      awakening: p.awakening, burnout: p.burnout,
      burned: p.burned, onlineVariant: p.onlineVariant,
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
      if (game.domain > 0 && game.domainOwnerSlot === game.online.slot && !game.clash) {
        game.domainClashPending = true;
        beginClash("DOMAIN COLLISION", true);
        return;
      }
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
      spawnParticles(event.x, event.y, "#814dff", 18, 320, 7, .75);
      announce("UNSTABLE HOLLOW PURPLE");
    } else if (event.kind === "purpleCollapse") {
      showPurpleCollapse(event.x, event.y);
    } else if (event.kind === "jackpot") {
      game.enemy.jackpot = Number(event.duration || HAKARI_JACKPOT_DURATION);
      game.enemy.awakening = game.enemy.jackpot;
      game.jackpotFlash = 1.1;
      game.flash = .3;
      game.shake = 15;
      spawnParticles(game.enemy.x, game.enemy.y - 60, "#5cff91", 70, 620, 9, 1);
      startHakariJackpotMusic();
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
    stopHakariJackpotMusic();
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

  window.addEventListener("voidlimit:characterRejected", (event) => {
    if (!onlineSelection || selectionLocked) return;
    onlineLockRequest = null;
    ui.confirmCharacter.disabled = false;
    ui.confirmCharacter.textContent = "LOCK IN";
    ui.selectionStatus.textContent = event.detail?.message || "CHARACTER WAS NOT ACCEPTED BY SERVER";
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["a", "d", "w", "s", "c", "q", "e", "r", "t", "shift", "escape", "enter", " ", "1", "2", "3"].includes(key)) {
      event.preventDefault();
    }
    const firstPress = !keys.has(key);
    if (firstPress) pressed.add(key);
    keys.add(key);
    if (game.trial && ["1", "2", "3"].includes(key) && firstPress) {
      chooseTrialOption(Number(key) - 1);
      return;
    }
    if (game.clash) {
      clashInput(key);
      return;
    }
    if (game.state === "menu" && key === "enter" && !ui.menu.classList.contains("hidden")) startOfflineSelection();
    if (key === "escape" && game.trial) {
      announce("COURT CANNOT BE SKIPPED");
      return;
    }
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
      if (game.player?.moveConfiscation > 0) {
        announce("CONFISCATED");
        tone(65, .08, "square", .15, -80);
        return;
      }
      if (game.player?.character === "sukuna" && keys.has("r") && firstPress) {
        if (startFuga()) queueOnlineEdge("fuga");
      } else if (["gojo", "sukuna", "higuruma"].includes(game.player?.character)) {
        if (firstPress) beginChargedTechnique("red");
      } else {
        if (firstPress) queueOnlineEdge("special", "red");
        useAbility("red");
      }
    }
    if (key === "r") {
      if (game.player?.character === "sukuna" && keys.has("e") && firstPress) {
        if (startFuga()) queueOnlineEdge("fuga");
      } else {
        if (firstPress) queueOnlineEdge("special", "blue");
        useAbility("blue");
      }
    }
    if (key === "q") {
      if (firstPress) queueOnlineEdge("special", "purple");
      useAbility("purple");
    }
    if (key === "t") {
      if ("domain" in characterProfile(game.player).costs) {
        if (firstPress) queueOnlineEdge("domain");
        useAbility("domain");
      }
    }
    if (key === "s" && game.player) game.player.guardStart = performance.now();
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    keys.delete(key);
    if (key === "e" && ["gojo", "sukuna", "higuruma"].includes(game.player?.character)) {
      releaseChargedTechnique();
      queueOnlineEdge("specialRelease", "red");
    }
    if (key === "s" && game.player) game.player.blocking = false;
  });

  function handleCanvasPress(event, pointOverride = null) {
    if (game.state !== "playing" || game.clash) return;
    event.preventDefault();
    if (game.trial) {
      const choice = visibleTrialChoice(game.trial);
      if (choice.options.length) {
        const point = pointOverride || canvasPointFromMouse(event);
        const clicked = trialCardIndexAt(point, game.trial);
        if (clicked >= 0) chooseTrialOption(clicked);
      }
      return;
    }
    if (event.button === 0) {
      queueOnlineEdge("light");
      playerAttack("light");
    }
    if (event.button === 2) {
      queueOnlineEdge("heavy");
      playerAttack("heavy");
    }
  }

  canvas.addEventListener("pointerdown", handleCanvasPress);

  canvas.addEventListener("mousedown", (event) => {
    if (window.PointerEvent) return;
    handleCanvasPress(event);
  });

  canvas.addEventListener("touchstart", (event) => {
    if (window.PointerEvent || !event.touches?.length) return;
    const touch = event.touches[0];
    const point = canvasPointFromMouse(touch);
    handleCanvasPress(event, point);
  }, { passive: false });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("mousemove", (event) => {
    if (!game.trial) {
      game.trialHover = -1;
      return;
    }
    const point = canvasPointFromMouse(event);
    game.trialHover = -1;
    const choice = visibleTrialChoice(game.trial);
    if (!choice.options.length) return;
    game.trialHover = trialCardIndexAt(point, game.trial);
  });

  function touchActionPress(action, button) {
    if (game.state !== "playing") return;
    button?.classList.add("pressed");
    if (action === "left") return keys.add("a");
    if (action === "right") return keys.add("d");
    if (action === "block") {
      keys.add("s");
      if (game.player) game.player.guardStart = performance.now();
      return;
    }
    if (action === "charge") return keys.add("c");
    if (action === "jump") {
      queueOnlineEdge("jump");
      jump();
      return;
    }
    if (action === "dash") {
      queueOnlineEdge("dash");
      shortDash();
      return;
    }
    if (action === "light") {
      queueOnlineEdge("light");
      playerAttack("light");
      return;
    }
    if (action === "heavy") {
      queueOnlineEdge("heavy");
      playerAttack("heavy");
      return;
    }
    if (action === "e") {
      keys.add("e");
      if (game.player?.moveConfiscation > 0) {
        announce("CONFISCATED");
        tone(65, .08, "square", .15, -80);
      } else if (game.player?.character === "sukuna" && keys.has("r")) {
        if (startFuga()) queueOnlineEdge("fuga");
      } else if (["gojo", "sukuna", "higuruma"].includes(game.player?.character)) {
        beginChargedTechnique("red");
      } else {
        queueOnlineEdge("special", "red");
        useAbility("red");
      }
      return;
    }
    if (action === "r") {
      keys.add("r");
      if (game.player?.character === "sukuna" && keys.has("e")) {
        if (startFuga()) queueOnlineEdge("fuga");
      } else {
        queueOnlineEdge("special", "blue");
        useAbility("blue");
      }
      return;
    }
    if (action === "q") {
      queueOnlineEdge("special", "purple");
      useAbility("purple");
      return;
    }
    if (action === "t") {
      if ("domain" in characterProfile(game.player).costs) {
        queueOnlineEdge("domain");
        useAbility("domain");
      }
    }
  }

  function touchActionRelease(action, button) {
    button?.classList.remove("pressed");
    if (action === "left") keys.delete("a");
    else if (action === "right") keys.delete("d");
    else if (action === "block") {
      keys.delete("s");
      if (game.player) game.player.blocking = false;
    } else if (action === "charge") keys.delete("c");
    else if (action === "e") {
      keys.delete("e");
      if (["gojo", "sukuna", "higuruma"].includes(game.player?.character)) {
        releaseChargedTechnique();
        queueOnlineEdge("specialRelease", "red");
      }
    } else if (action === "r") {
      keys.delete("r");
    }
  }

  $$("#touchControls [data-touch]").forEach((button) => {
    const action = button.dataset.touch;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      touchActionPress(action, button);
    });
    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      touchActionRelease(action, button);
    });
    button.addEventListener("pointercancel", () => touchActionRelease(action, button));
    button.addEventListener("lostpointercapture", () => touchActionRelease(action, button));
  });

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

  ensureCharacterRoster();
  $$(".character-card").forEach(bindCharacterCard);
  ui.confirmCharacter.addEventListener("click", confirmCharacterSelection);
  ui.characterBack.addEventListener("click", () => {
    if (onlineSelection) {
      window.dispatchEvent(new CustomEvent("voidlimit:leaveOnline"));
      ui.characterSelect.classList.add("hidden");
      return;
    }
    if (selectedMode === "domainUse" && offlineSelectionStep === "enemy") {
      offlineSelectionStep = "player";
      selectedCharacter = selectedDomainPlayer;
      selectionLocked = false;
      ui.confirmCharacter.disabled = false;
      $$(".character-card").forEach((card) => card.classList.remove("locked"));
      renderCharacterSelection();
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
  ui.settingsButton?.addEventListener("click", openSettingsPanel);
  ui.settingsBack?.addEventListener("click", closeSettingsPanel);
  ui.musicVolume?.addEventListener("input", () => setMusicVolume(ui.musicVolume.value));
  ui.resetSettings?.addEventListener("click", () => setMusicVolume(DEFAULT_MUSIC_VOLUME * 100));
  ui.accountButton?.addEventListener("click", openAccountPanel);
  ui.accountBack?.addEventListener("click", closeAccountPanel);
  ui.guestModeButton?.addEventListener("click", () => {
    accountState.isGuest = true;
    accountState.user = null;
    accountState.progress = loadGuestProgress();
    setAccountStatus("Guest mode is active.");
    updateAccountUi();
    closeAccountPanel();
  });
  ui.googleFallbackButton?.addEventListener("click", () => beginGoogleAuth("signin"));
  ui.googleSignUpButton?.addEventListener("click", () => beginGoogleAuth("signup"));
  ui.accountSignOut?.addEventListener("click", accountLogout);
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
  initSettingsSystem();
  initAccountSystem();
  requestAnimationFrame(frame);
})();
