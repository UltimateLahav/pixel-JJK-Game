"use strict";

const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const GROUND = 596;
const MAX_HEALTH = 600;
const MAX_ROLLBACK = 15;
const SNAPSHOT_INTERVAL = 3;
const DOMAIN_STARTUP_TICKS = 141;
const EMPTY_INPUT = Object.freeze({
  move: 0, jump: false, dash: false, block: false, charge: false,
  light: false, heavy: false, special: "", specialHeld: "", specialRelease: "",
  fuga: false, domain: false, awaken: false,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clone = (value) => JSON.parse(JSON.stringify(value));

const CHARACTER = {
  gojo: {
    speed: 295,
    light: [6, 7, 8, 9, 13],
    heavy: 14,
    specials: {
      red: { cost: 26, cooldown: 372, kind: "red", damage: 18 },
      blue: { cost: 18, cooldown: 270, kind: "blue", damage: 2.3 },
      purple: { cost: 82, cooldown: 780, kind: "purple", damage: 88, requiresPurple: true },
    },
  },
  sukuna: {
    speed: 312,
    light: [6.5, 7.5, 8.5, 9.5, 14],
    heavy: 16.5,
    specials: {
      red: { cost: 16, cooldown: 204, kind: "dismantle", damage: 15 },
      blue: { cost: 22, cooldown: 312, kind: "cleave", damage: 18 },
      purple: { cost: 95, cooldown: 900, kind: "worldSlash", damage: 200 },
    },
  },
  hakari: {
    speed: 318,
    light: [6.2, 7.2, 8.2, 9.2, 12.5],
    heavy: 16,
    specials: {
      red: { cost: 16, cooldown: 228, kind: "roughPunch", damage: 14.5 },
      blue: { cost: 20, cooldown: 330, kind: "door", damage: 13 },
      purple: { cost: 14, cooldown: 252, kind: "reserveBall", damage: 30 },
    },
  },
};

function normalizeInput(raw = {}) {
  const special = ["red", "blue", "purple"].includes(raw.special) ? raw.special : "";
  const specialHeld = raw.specialHeld === "red" ? "red" : "";
  const specialRelease = raw.specialRelease === "red" ? "red" : "";
  return {
    move: clamp(Math.round(Number(raw.move) || 0), -1, 1),
    jump: Boolean(raw.jump),
    dash: Boolean(raw.dash),
    block: Boolean(raw.block),
    charge: Boolean(raw.charge),
    light: Boolean(raw.light),
    heavy: Boolean(raw.heavy),
    special,
    specialHeld,
    specialRelease,
    fuga: Boolean(raw.fuga),
    domain: Boolean(raw.domain),
    awaken: Boolean(raw.awaken),
  };
}

function heldInput(input) {
  return {
    ...EMPTY_INPUT,
    move: input.move,
    block: input.block,
    charge: input.charge,
    specialHeld: input.specialHeld,
  };
}

function makePlayer(meta, settings) {
  const slot = meta.slot;
  return {
    slot,
    character: CHARACTER[meta.character] ? meta.character : "gojo",
    variant: meta.variant === "inverted" ? "inverted" : "normal",
    x: slot === 1 ? 300 : 950,
    y: GROUND,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    grounded: true,
    jumps: 1,
    health: MAX_HEALTH,
    energy: Number(settings.energy) || 70,
    blocking: false,
    blockStartTick: -9999,
    charging: false,
    chargeCooldown: 0,
    chargeRecovery: 0,
    dashCooldown: 0,
    dashTicks: 0,
    dashDirection: slot === 1 ? 1 : -1,
    stun: 0,
    invuln: 0,
    comboStep: -1,
    comboExpires: 0,
    attack: null,
    cooldowns: { red: 0, blue: 0, purple: 0, domain: 0 },
    domainTicks: 0,
    domainStartupTicks: 0,
    pendingDomainTicks: 0,
    domainElapsedTicks: 0,
    awakeningTicks: 0,
    jackpotTicks: 0,
    unstablePurpleTicks: 0,
    unstablePurpleX: 640,
    unstablePurpleY: GROUND - 86,
    burned: false,
    dismantleUses: 0,
    cleaveUses: 0,
    sukunaDomainUses: 0,
    worldSlashUnlocked: false,
    worldSlashUses: 0,
    chargedSpecialTicks: 0,
    chargedReleaseTicks: -1,
    dismantleVolley: null,
    moveConfiscationTicks: 0,
    fugaTicks: 0,
    fugaFired: false,
    hakariRollInputs: [],
    hakariLastRarity: "",
    hakariRollAttempts: 0,
    pendingFollowup: null,
    parries: 0,
    blackFlashes: 0,
    domains: 0,
    damage: 0,
    lastInputFrame: -1,
  };
}

class AuthoritativeMatch {
  constructor({ players, settings, startAt, seed, onSnapshot, onResult }) {
    this.settings = { time: Number(settings.time) || 99, energy: Number(settings.energy) || 70 };
    this.startAt = Number(startAt);
    this.seed = Number(seed) || 1;
    this.tick = 0;
    this.roundTicks = 0;
    this.players = Object.fromEntries(players.map((player) => [player.slot, makePlayer(player, this.settings)]));
    this.inputs = { 1: new Map(), 2: new Map() };
    this.lastInputs = { 1: { ...EMPTY_INPUT }, 2: { ...EMPTY_INPUT } };
    this.projectiles = [];
    this.history = new Map();
    this.events = [];
    this.clash = null;
    this.result = null;
    this.onSnapshot = onSnapshot;
    this.onResult = onResult;
    this.lastAdvanceAt = this.startAt;
  }

  receiveInput(slot, packet) {
    if (!this.players[slot] || this.result) return;
    const frame = Math.max(0, Math.floor(Number(packet.frame) || 0));
    if (frame > this.tick + 120 || frame < this.tick - MAX_ROLLBACK) return;
    const input = normalizeInput(packet.input);
    this.inputs[slot].set(frame, input);
    if (frame < this.tick && this.history.has(frame)) this.rollback(frame);
  }

  disconnect(slot) {
    if (!this.players[slot] || this.result) return;
    this.lastInputs[slot] = { ...EMPTY_INPUT };
    this.players[slot].blocking = false;
    this.players[slot].charging = false;
    this.players[slot].vx = 0;
  }

  forfeit(slot) {
    if (!this.players[slot] || this.result) return;
    this.players[slot].health = 0;
    this.checkResult();
  }

  rollback(frame) {
    const target = this.tick;
    const saved = this.history.get(frame);
    if (!saved) return;
    this.restore(saved);
    this.tick = frame;
    while (this.tick < target && !this.result) this.step(true);
    this.emitSnapshot(true);
  }

  advance(now = Date.now()) {
    if (this.result || now < this.startAt) return;
    const targetTick = Math.max(0, Math.floor((now - this.startAt) / TICK_MS));
    let budget = 12;
    while (this.tick < targetTick && budget-- > 0 && !this.result) this.step(false);
  }

  saveHistory() {
    this.history.set(this.tick, {
      players: clone(this.players),
      projectiles: clone(this.projectiles),
      clash: clone(this.clash),
      result: clone(this.result),
      lastInputs: clone(this.lastInputs),
      events: clone(this.events),
      roundTicks: this.roundTicks,
    });
    for (const frame of this.history.keys()) {
      if (frame < this.tick - MAX_ROLLBACK - 2) this.history.delete(frame);
    }
  }

  restore(saved) {
    this.players = clone(saved.players);
    this.projectiles = clone(saved.projectiles);
    this.clash = clone(saved.clash);
    this.result = clone(saved.result);
    this.lastInputs = clone(saved.lastInputs);
    this.events = clone(saved.events || []);
    this.roundTicks = Number(saved.roundTicks || 0);
  }

  inputFor(slot) {
    const exact = this.inputs[slot].get(this.tick);
    if (exact) {
      this.lastInputs[slot] = heldInput(exact);
      this.players[slot].lastInputFrame = Math.max(this.players[slot].lastInputFrame, this.tick);
      return exact;
    }
    return this.lastInputs[slot];
  }

  step(resimulating) {
    this.saveHistory();
    const input1 = this.inputFor(1);
    const input2 = this.inputFor(2);
    if (this.clash) {
      this.updateClash(input1, input2);
      if (!this.domainClockPaused()) this.roundTicks++;
      this.tick++;
      this.checkResult();
      if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
      return;
    }
    this.updatePlayer(this.players[1], this.players[2], input1);
    this.updatePlayer(this.players[2], this.players[1], input2);
    if (this.resolveMeleeClash()) {
      if (!this.domainClockPaused()) this.roundTicks++;
      this.tick++;
      if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
      return;
    }
    this.resolveAttacks(this.players[1], this.players[2]);
    this.resolveAttacks(this.players[2], this.players[1]);
    this.updateProjectiles();
    this.updateClash(input1, input2);
    if (!this.domainClockPaused()) this.roundTicks++;
    this.tick++;
    this.checkResult();
    if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
  }

  domainClockPaused() {
    return Object.values(this.players).some((player) => player.domainTicks > 0 || player.domainStartupTicks > 0);
  }

  updatePlayer(player, opponent, input) {
    const profile = CHARACTER[player.character];
    for (const key of Object.keys(player.cooldowns)) player.cooldowns[key] = Math.max(0, player.cooldowns[key] - 1);
    player.chargeCooldown = Math.max(0, player.chargeCooldown - 1);
    player.chargeRecovery = Math.max(0, player.chargeRecovery - 1);
    player.dashCooldown = Math.max(0, player.dashCooldown - 1);
    player.dashTicks = Math.max(0, player.dashTicks - 1);
    player.stun = Math.max(0, player.stun - 1);
    player.invuln = Math.max(0, player.invuln - 1);
    player.awakeningTicks = Math.max(0, player.awakeningTicks - 1);
    player.jackpotTicks = Math.max(0, player.jackpotTicks - 1);
    player.moveConfiscationTicks = Math.max(0, player.moveConfiscationTicks - 1);
    if (player.fugaTicks > 0) {
      player.fugaTicks--;
      player.invuln = Math.max(player.invuln, 2);
      player.vx = 0;
      if (!player.fugaFired && player.fugaTicks <= 63) {
        player.fugaFired = true;
        this.projectiles.push({
          id: `${player.slot}-${this.tick}-fuga`,
          owner: player.slot, kind: "fuga",
          x: player.x + player.facing * 62, y: player.y - 76,
          vx: player.facing * 820, vy: 0, life: 84,
          damage: 90, radius: 42, strong: true, reflected: false, burns: true,
        });
        this.events.push({ kind: "fugaFire", slot: player.slot, x: player.x, y: player.y - 76, tick: this.tick });
      }
      if (player.fugaTicks === 0) player.fugaFired = false;
    }
    if (player.unstablePurpleTicks === 1) {
      player.health = Math.max(0, player.health - 30);
      opponent.health = Math.max(0, opponent.health - 38);
      player.stun = Math.max(player.stun, 69);
      opponent.stun = Math.max(opponent.stun, 81);
      player.burned = true;
      opponent.burned = true;
      this.events.push({
        kind: "purpleCollapse",
        slot: player.slot,
        x: player.unstablePurpleX,
        y: player.unstablePurpleY,
        tick: this.tick,
      });
    }
    player.unstablePurpleTicks = Math.max(0, player.unstablePurpleTicks - 1);
    const domainWasActive = player.domainTicks > 0;
    if (player.domainStartupTicks > 0) {
      player.domainStartupTicks--;
      if (player.domainStartupTicks === 0 && player.pendingDomainTicks > 0) {
        player.domainTicks = player.pendingDomainTicks;
        player.pendingDomainTicks = 0;
        player.domainElapsedTicks = 0;
        this.events.push({
          kind: "domainActive", slot: player.slot, character: player.character,
          durationTicks: player.domainTicks, tick: this.tick,
        });
      }
    } else if (player.domainTicks > 0) {
      player.domainTicks--;
      player.domainElapsedTicks++;
      if (player.character === "gojo" || player.character === "sukuna") {
        player.energy = Math.max(0, player.energy - (player.character === "gojo" ? 20 : 10) / TICK_RATE);
        if (player.energy <= 0) player.domainTicks = 0;
      }
    } else {
      player.domainElapsedTicks = 0;
    }
    if (domainWasActive && player.domainTicks <= 0) {
      player.moveConfiscationTicks = Math.max(player.moveConfiscationTicks, 300);
      this.events.push({ kind: "movesConfiscated", slot: player.slot, durationTicks: 300, tick: this.tick });
    }
    if (player.domainTicks > 0 && player.character === "sukuna" && player.domainElapsedTicks > 0 && player.domainElapsedTicks % 30 === 0) {
      const damage = Math.min(opponent.blocking ? 7.5 : 15, opponent.health);
      opponent.health = Math.max(0, opponent.health - damage);
      opponent.stun = Math.max(opponent.stun, 6);
      player.damage += damage;
      this.events.push({ kind: "domainSlash", slot: opponent.slot, sourceSlot: player.slot, damage, tick: this.tick });
    }
    if (player.pendingFollowup && this.tick >= player.pendingFollowup.tick) {
      const target = this.players[player.pendingFollowup.target];
      if (target && target.health > 0) {
        if (player.pendingFollowup.kind === "feverBreaker") {
          const damage = Math.min(8, target.health);
          target.health = Math.max(0, target.health - damage);
          target.vy = 820;
          target.stun = Math.max(target.stun, 30);
          player.damage += damage;
          this.events.push({ kind: "feverBreakerKick", slot: target.slot, sourceSlot: player.slot, damage, tick: this.tick });
        } else if (player.pendingFollowup.kind === "gamblersLuck") {
          const damage = Math.min(6, target.health);
          target.health = Math.max(0, target.health - damage);
          target.vx = player.facing * 650;
          target.vy = -130;
          target.stun = Math.max(target.stun, 24);
          player.damage += damage;
          this.events.push({ kind: "gamblersLuckThrow", slot: target.slot, sourceSlot: player.slot, damage, tick: this.tick });
        }
      }
      player.pendingFollowup = null;
    }
    if (player.jackpotTicks > 0) {
      player.energy = 100;
      player.health = Math.min(MAX_HEALTH, player.health + .12);
    } else if (!(player.domainTicks > 0 && ["gojo", "sukuna"].includes(player.character))) {
      player.energy = Math.min(100, player.energy + .018);
    }

    const domainOpening = player.domainStartupTicks > 0 || opponent.domainStartupTicks > 0;
    if (domainOpening) {
      player.blocking = false;
      player.charging = false;
      player.attack = null;
      player.vx = 0;
      player.vy = 0;
      return;
    }

    const frozenByVoid = opponent.domainTicks > 0 && opponent.character === "gojo";
    if (frozenByVoid) {
      player.blocking = false;
      player.charging = false;
      player.attack = null;
      player.vx = 0;
      player.vy = 0;
      return;
    }

    this.updateDismantleVolley(player, opponent);
    if (input.fuga && !player.attack) this.startFuga(player);
    if (this.updateChargedSpecial(player, opponent, input)) {
      player.vx = 0;
      player.vy += 1800 / TICK_RATE;
      player.y += player.vy / TICK_RATE;
      if (player.y >= GROUND) {
        player.y = GROUND;
        player.vy = 0;
        player.grounded = true;
        player.jumps = 1;
      }
      return;
    }

    if (player.stun > 0) {
      player.blocking = false;
      player.charging = false;
    } else if (player.dashTicks > 0 && !player.attack) {
      player.blocking = false;
      player.charging = false;
      player.vx = player.dashDirection * 510;
    } else if (input.charge && player.chargeCooldown <= 0 && player.chargeRecovery <= 0 && !player.attack) {
      player.charging = true;
      player.blocking = false;
      player.vx = 0;
      player.energy = Math.min(100, player.energy + .4);
    } else {
      if (player.charging && !input.charge) {
        player.charging = false;
        player.chargeRecovery = 12;
        player.chargeCooldown = 60;
      }
      const wasBlocking = player.blocking;
      player.blocking = input.block && player.grounded && !player.attack && player.chargeRecovery <= 0;
      if (player.blocking && !wasBlocking) player.blockStartTick = this.tick;

      if (!player.blocking && !player.charging && player.chargeRecovery <= 0) {
        const speed = profile.speed * (player.awakeningTicks > 0 ? 1.18 : 1);
        if (player.attack) {
          player.vx = player.facing * Number(player.attack.moveSpeed || 0);
        } else {
          player.vx = input.move * speed;
        }
        if (input.move && !player.attack) player.facing = input.move;
        if (!player.attack && input.dash && player.dashCooldown <= 0) {
          player.dashDirection = input.move || player.facing;
          player.dashTicks = 8;
          player.vx = player.dashDirection * 510;
          player.dashCooldown = 15;
          player.invuln = 6;
        }
        if (!player.attack && input.jump && (player.grounded || player.jumps > 0)) {
          if (!player.grounded) player.jumps--;
          player.vy = -680;
          player.grounded = false;
        }
        if (!player.attack) {
          if (input.light) this.startAttack(player, "light");
          else if (input.heavy) this.startAttack(player, "heavy");
          else if (input.fuga) this.startFuga(player);
          else if (input.special) this.startSpecial(player, input.special);
          else if (input.domain) this.startDomain(player, opponent);
          else if (input.awaken && player.energy >= 40) {
            player.energy -= 40;
            player.awakeningTicks = 720;
          }
        }
      } else {
        player.vx = 0;
      }
    }

    if (player.attack && this.tick >= player.attack.endTick) player.attack = null;
    player.vy += 1800 / TICK_RATE;
    player.x = clamp(player.x + player.vx / TICK_RATE, 26, 1254);
    player.y += player.vy / TICK_RATE;
    if (player.y >= GROUND) {
      player.y = GROUND;
      player.vy = 0;
      player.grounded = true;
      player.jumps = 1;
    }
    if (Math.abs(opponent.x - player.x) > 18 && !input.move) player.facing = opponent.x > player.x ? 1 : -1;
  }

  startAttack(player, kind) {
    const profile = CHARACTER[player.character];
    player.vx = 0;
    player.dashTicks = 0;
    if (kind === "light") {
      player.comboStep = this.tick <= player.comboExpires ? (player.comboStep + 1) % 5 : 0;
      player.comboExpires = this.tick + 28;
      const damage = profile.light[player.comboStep];
      player.attack = {
        kind: "light", step: player.comboStep, startTick: this.tick,
        activeTick: this.tick + 7, endActiveTick: this.tick + 10,
        endTick: this.tick + 18, damage, range: player.comboStep === 4 ? 88 : 68,
        strong: player.comboStep === 4, hit: false,
      };
    } else {
      player.attack = {
        kind: "heavy", startTick: this.tick,
        activeTick: this.tick + 10, endActiveTick: this.tick + 15,
        endTick: this.tick + 27, damage: profile.heavy, range: 84, strong: true, hit: false,
      };
    }
  }

  updateChargedSpecial(player, opponent, input) {
    const supportsCharge = ["gojo", "sukuna"].includes(player.character);
    if (!supportsCharge) return false;
    const cost = player.character === "sukuna" ? 16 : 26;
    if (input.specialHeld === "red" && player.chargedSpecialTicks <= 0
      && player.chargedReleaseTicks < 0 && !player.attack && player.cooldowns.red <= 0
      && player.energy >= cost && player.moveConfiscationTicks <= 0 && player.stun <= 0) {
      player.chargedSpecialTicks = 1;
    } else if (input.specialHeld === "red" && player.chargedSpecialTicks > 0 && player.chargedReleaseTicks < 0) {
      player.chargedSpecialTicks = Math.min(300, player.chargedSpecialTicks + 1);
    }
    if (player.chargedSpecialTicks <= 0) return false;
    if (input.specialRelease === "red" && player.chargedSpecialTicks <= 18 && player.chargedReleaseTicks < 0) {
      this.fireQuickSpecial(player, opponent);
      return false;
    }
    if ((input.specialRelease === "red" || player.chargedSpecialTicks >= 300) && player.chargedReleaseTicks < 0) {
      player.chargedReleaseTicks = 30;
    }
    if (player.chargedReleaseTicks >= 0) {
      player.chargedReleaseTicks--;
      if (player.chargedReleaseTicks <= 0) this.fireChargedSpecial(player, opponent);
    }
    return player.chargedSpecialTicks > 0;
  }

  dismantleMode(player) {
    if (player.grounded) return "straight";
    return player.jumps === 0 ? "autoAim" : "groundSlash";
  }

  fireDismantleSlash(player, opponent, volley) {
    const direction = opponent.x >= player.x ? 1 : -1;
    const originX = player.x + direction * 55;
    const originY = player.y - 72;
    let vx = direction * 760;
    let vy = 0;
    if (volley.mode === "groundSlash") {
      vx = 0;
      vy = 900;
    } else if (volley.mode === "autoAim") {
      const dx = opponent.x - originX;
      const dy = opponent.y - 46 - originY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      vx = dx / distance * 760;
      vy = dy / distance * 760;
    }
    this.projectiles.push({
      id: `${player.slot}-${this.tick}-dismantle-volley-${volley.sequence}`,
      owner: player.slot, kind: "dismantle",
      x: originX, y: originY,
      vx, vy, life: 52, damage: volley.damage, radius: 28,
      strong: false, reflected: false,
    });
    volley.sequence++;
  }

  queueDismantleVolley(player, opponent, count, damage) {
    const volley = {
      remaining: count,
      nextTick: this.tick,
      damage,
      mode: this.dismantleMode(player),
      sequence: 0,
    };
    this.fireDismantleSlash(player, opponent, volley);
    volley.remaining--;
    volley.nextTick = this.tick + 12;
    player.dismantleVolley = volley.remaining > 0 ? volley : null;
  }

  updateDismantleVolley(player, opponent) {
    const volley = player.dismantleVolley;
    if (!volley || this.tick < volley.nextTick) return;
    this.fireDismantleSlash(player, opponent, volley);
    volley.remaining--;
    volley.nextTick += 12;
    if (volley.remaining <= 0) player.dismantleVolley = null;
  }

  fireQuickSpecial(player, opponent) {
    player.chargedSpecialTicks = 0;
    player.chargedReleaseTicks = -1;
    if (player.character === "gojo") {
      player.energy -= 26;
      player.cooldowns.red = CHARACTER.gojo.specials.red.cooldown;
      this.projectiles.push({
        id: `${player.slot}-${this.tick}-quick-red`,
        owner: player.slot, kind: "red",
        x: player.x + player.facing * 55, y: player.y - 80,
        vx: player.facing * 510, vy: 0, life: 90,
        damage: 18, radius: 24, strong: true, reflected: false,
      });
      player.attack = {
        kind: "red", startTick: this.tick, activeTick: this.tick,
        endActiveTick: this.tick, endTick: this.tick + 40,
        damage: 0, range: 0, strong: false, hit: true,
      };
      this.events.push({ kind: "specialCast", slot: player.slot, technique: "red", charge: 0, tick: this.tick });
      return;
    }

    player.energy -= 16;
    player.cooldowns.red = CHARACTER.sukuna.specials.red.cooldown;
    player.dismantleUses++;
    this.updateWorldSlashUnlock(player);
    player.attack = {
      kind: "dismantle", startTick: this.tick, activeTick: this.tick,
      endActiveTick: this.tick, endTick: this.tick + 25,
      damage: 0, range: 0, strong: false, hit: true,
    };
    this.queueDismantleVolley(player, opponent, 1, 15);
    this.events.push({ kind: "specialCast", slot: player.slot, technique: "dismantle", count: 1, charge: 0, tick: this.tick });
  }

  fireChargedSpecial(player, opponent) {
    const ratio = clamp(player.chargedSpecialTicks / 300, 0, 1);
    player.chargedSpecialTicks = 0;
    player.chargedReleaseTicks = -1;
    if (player.character === "gojo") {
      player.energy -= 26;
      player.cooldowns.red = CHARACTER.gojo.specials.red.cooldown;
      this.projectiles.push({
        id: `${player.slot}-${this.tick}-charged-red`,
        owner: player.slot, kind: "red",
        x: player.x + player.facing * 52, y: player.y - 80,
        vx: player.facing * (510 + ratio * 620), vy: 0, life: 90,
        damage: 18 + ratio * 18, radius: 23 - ratio * 10,
        strong: true, reflected: false,
      });
      player.attack = {
        kind: "red", startTick: this.tick, activeTick: this.tick,
        endActiveTick: this.tick, endTick: this.tick + 35,
        damage: 0, range: 0, strong: false, hit: true,
      };
      this.events.push({ kind: "specialCast", slot: player.slot, technique: "red", charge: ratio, tick: this.tick });
      return;
    }

    if (player.energy < 32) {
      player.chargedSpecialTicks = Math.min(player.chargedSpecialTicks || 1, 18);
      this.fireQuickSpecial(player, opponent);
      return;
    }
    player.energy -= 32;
    player.cooldowns.red = CHARACTER.sukuna.specials.red.cooldown;
    player.dismantleUses++;
    this.updateWorldSlashUnlock(player);
    const count = 1 + Math.floor(ratio * 5);
    const damage = 15 * (.8 - ratio * .5);
    this.queueDismantleVolley(player, opponent, count, damage);
    player.attack = {
      kind: "dismantle", startTick: this.tick, activeTick: this.tick,
      endActiveTick: this.tick, endTick: this.tick + 25 + (count - 1) * 12,
      damage: 0, range: 0, strong: false, hit: true,
    };
    this.events.push({ kind: "specialCast", slot: player.slot, technique: "dismantleBarrage", count, charge: ratio, tick: this.tick });
  }

  startFuga(player) {
    if (player.character !== "sukuna" || player.energy < 70 || player.cooldowns.red > 0
      || player.cooldowns.blue > 0 || player.moveConfiscationTicks > 0) return;
    player.chargedSpecialTicks = 0;
    player.chargedReleaseTicks = -1;
    player.energy -= 70;
    player.cooldowns.red = 720;
    player.cooldowns.blue = 720;
    player.fugaTicks = 159;
    player.fugaFired = false;
    player.invuln = 159;
    player.vx = 0;
    player.attack = {
      kind: "fuga", startTick: this.tick, activeTick: this.tick + 99,
      endActiveTick: this.tick + 135, endTick: this.tick + 159,
      damage: 0, range: 0, strong: true, hit: true, moveSpeed: 0,
    };
    this.events.push({ kind: "fugaStart", slot: player.slot, tick: this.tick });
  }

  startSpecial(player, name) {
    if (player.moveConfiscationTicks > 0) return;
    let move = { ...CHARACTER[player.character].specials[name] };
    if (player.character === "sukuna" && name === "purple" && !player.worldSlashUnlocked) return;
    if (player.character === "sukuna" && name === "purple" && player.worldSlashUses >= 2) return;
    if (player.character === "hakari" && player.jackpotTicks > 0 && name === "blue") {
      move = { cost: 10, cooldown: 660, kind: "gamblersLuck", damage: 22 };
    } else if (player.character === "hakari" && player.jackpotTicks > 0 && name === "purple") {
      move = { cost: 8, cooldown: 540, kind: "feverBreaker", damage: 20 };
    }
    const enhancedCleave = player.character === "sukuna" && name === "blue" && player.energy > 50;
    if (enhancedCleave) {
      move.damage *= 1.65;
      move.cooldown = 600;
    }
    if (!move || player.cooldowns[name] > 0 || player.energy < move.cost) return;
    if (move.requiresPurple && player.unstablePurpleTicks <= 0) return;
    player.energy -= move.cost;
    player.cooldowns[name] = move.cooldown;
    player.vx = 0;
    player.dashTicks = 0;
    if (player.character === "sukuna" && name === "red") player.dismantleUses++;
    if (player.character === "sukuna" && name === "blue") player.cleaveUses++;
    if (player.character === "sukuna" && name === "purple") player.worldSlashUses++;
    this.updateWorldSlashUnlock(player);
    this.events.push({
      kind: "specialCast", slot: player.slot, technique: move.kind,
      x: player.x, y: player.y - 72, facing: player.facing, tick: this.tick,
    });
    if (move.kind === "roughPunch") {
      const doorIndex = this.projectiles.findIndex((projectile) =>
        projectile.owner === player.slot && projectile.kind === "door" && Math.abs(projectile.x - player.x) < 190
      );
      if (doorIndex >= 0) {
        const door = this.projectiles.splice(doorIndex, 1)[0];
        Object.assign(door, {
          id: `${player.slot}-${this.tick}-launched-door`,
          vx: player.facing * 760, vy: -40, life: 75,
          damage: 34, radius: 34, strong: true, launchedDoor: true,
        });
        this.projectiles.push(door);
        player.cooldowns.red = Math.max(player.cooldowns.red, 480);
        player.cooldowns.blue = Math.max(player.cooldowns.blue, 600);
        player.attack = {
          kind: "roughPunch", startTick: this.tick, activeTick: this.tick + 6,
          endActiveTick: this.tick + 16, endTick: this.tick + 34,
          damage: 0, range: 0, strong: true, hit: true,
        };
        this.events.push({ kind: "shutterBreaker", slot: player.slot, tick: this.tick });
        return;
      }
      if (!player.grounded) {
        player.attack = {
          kind: "roughDownkick", startTick: this.tick, activeTick: this.tick + 7,
          endActiveTick: this.tick + 24, endTick: this.tick + 38,
          damage: 24, range: 78, strong: true, hit: false,
        };
        player.vy = 900;
        this.events.push({ kind: "roughDownkick", slot: player.slot, tick: this.tick });
        return;
      }
    }
    if (move.kind === "blue" && !player.grounded && player.jumps === 0) {
      const opponent = this.players[player.slot === 1 ? 2 : 1];
      const damage = Math.min(24, opponent.health);
      opponent.x = player.x;
      opponent.y = Math.min(opponent.y, player.y + 35);
      opponent.vy = 920;
      opponent.grounded = false;
      opponent.stun = Math.max(opponent.stun, 44);
      opponent.health = Math.max(0, opponent.health - damage);
      player.damage += damage;
      player.attack = {
        kind: "blueSkyfall", startTick: this.tick, activeTick: this.tick + 8,
        endActiveTick: this.tick + 34, endTick: this.tick + 49,
        damage: 0, range: 0, strong: true, hit: true,
      };
      this.events.push({ kind: "blueSkyfall", slot: player.slot, targetSlot: opponent.slot, damage, tick: this.tick });
      return;
    }
    if (move.kind === "roughPunch" || move.kind === "cleave"
      || move.kind === "gamblersLuck" || move.kind === "feverBreaker") {
      player.attack = {
        kind: move.kind, startTick: this.tick, activeTick: this.tick + 8,
        endActiveTick: this.tick + (move.kind === "gamblersLuck" ? 22 : 14),
        endTick: this.tick + (move.kind === "gamblersLuck" ? 48 : move.kind === "feverBreaker" ? 38 : 25),
        damage: move.damage,
        range: move.kind === "gamblersLuck" ? 132 : enhancedCleave ? 148 : 105,
        strong: true, hit: false,
      };
      player.attack.moveSpeed = move.kind === "roughPunch"
        ? (player.jackpotTicks > 0 ? 620 : 490)
        : move.kind === "gamblersLuck"
          ? 285
          : move.kind === "feverBreaker"
            ? 220
            : 0;
      player.vx = player.facing * player.attack.moveSpeed;
      return;
    }
    const direction = player.facing;
    const projectile = {
      id: `${player.slot}-${this.tick}-${name}`,
      owner: player.slot,
      kind: move.kind,
      x: player.x + direction * 58,
      y: player.y - 72,
      vx: direction * (move.kind === "blue" ? 55 : move.kind === "purple" ? 760 : 560),
      vy: 0,
      life: move.kind === "blue" ? 168 : 100,
      damage: move.damage,
      radius: move.kind === "purple" ? 150 : move.kind === "blue" ? 26 : 32,
      strong: ["red", "purple", "worldSlash"].includes(move.kind),
      reflected: false,
    };
    if (move.kind === "reserveBall") {
      projectile.vx = direction * 540;
      projectile.vy = -140;
      projectile.radius = 12;
    }
    if (move.kind === "door") {
      projectile.vx = 0;
      projectile.y = GROUND - 64;
      projectile.life = 50;
      projectile.radius = 28;
      projectile.rarity = player.domainTicks > 0
        ? this.registerHakariRoll(player, "shutter")
        : this.hakariRarity(player, "shutter");
    }
    if (move.kind === "dismantle") projectile.vx = direction * 760;
    if (move.kind === "worldSlash") {
      projectile.vx = direction * 920;
      projectile.radius = 90;
    }
    if (player.character === "hakari" && player.domainTicks > 0 && move.kind === "reserveBall") {
      projectile.rarity = this.registerHakariRoll(player, "reserve");
    } else if (player.character === "hakari" && move.kind === "reserveBall") {
      projectile.rarity = this.hakariRarity(player, "reserve");
    }
    this.projectiles.push(projectile);
    const castTicks = {
      blue: 35,
      red: 40,
      purple: 55,
      dismantle: 25,
      worldSlash: 49,
      door: 29,
      reserveBall: 20,
    }[move.kind] || 24;
    player.attack = {
      kind: move.kind,
      startTick: this.tick,
      activeTick: this.tick,
      endActiveTick: this.tick,
      endTick: this.tick + castTicks,
      damage: 0,
      range: 0,
      strong: false,
      hit: true,
      moveSpeed: 0,
    };
    if (move.kind === "purple") player.unstablePurpleTicks = 0;
  }

  startDomain(player, opponent) {
    if (player.cooldowns.domain > 0 || player.moveConfiscationTicks > 0) return;
    if (player.character === "hakari" && player.energy < 100) return;
    if (player.character === "hakari") player.energy = 0;
    player.vx = 0;
    player.vy = 0;
    player.attack = null;
    player.blocking = false;
    player.charging = false;
    player.cooldowns.domain = 1440;
    player.domains++;
    if (player.character === "sukuna") {
      player.sukunaDomainUses++;
      this.updateWorldSlashUnlock(player);
    }
    const otherRecent = opponent.domainTicks > 0 || opponent.domainStartupTicks > 0;
    player.domainTicks = 0;
    player.pendingDomainTicks = player.character === "gojo" ? 720 : player.character === "sukuna" ? 900 : 3600;
    player.domainStartupTicks = DOMAIN_STARTUP_TICKS;
    player.domainElapsedTicks = 0;
    if (player.character === "hakari") {
      player.hakariRollInputs = [];
      player.hakariLastRarity = "";
      player.hakariRollAttempts = 0;
    }
    this.events.push({
      kind: "domainStart", slot: player.slot, character: player.character,
      durationTicks: player.pendingDomainTicks, startupTicks: player.domainStartupTicks, tick: this.tick,
    });
    if (otherRecent && !this.clash) {
      this.clash = { type: "domain", ticks: 240, power: 50, last: { 1: 0, 2: 0 } };
    }
  }

  updateWorldSlashUnlock(player) {
    const unlocked = player.character === "sukuna"
      && player.dismantleUses >= 5
      && player.cleaveUses >= 2
      && player.sukunaDomainUses >= 1;
    if (unlocked && !player.worldSlashUnlocked) {
      player.worldSlashUnlocked = true;
      this.events.push({ kind: "worldSlashUnlocked", slot: player.slot, tick: this.tick });
    }
  }

  deterministicPercent(player, salt = 0) {
    return this.deterministicRange(player, salt, 100);
  }

  deterministicRange(player, salt = 0, range = 100) {
    return ((this.seed ^ ((this.tick + salt) * 1103515245) ^ (player.slot * 12345)) >>> 0) % range;
  }

  hakariRarity(player, technique) {
    const value = this.deterministicPercent(player, player.hakariRollInputs.length * 97 + (technique === "reserve" ? 31 : 67));
    const parryBoost = Math.min(6, player.parries);
    return value < 6 + parryBoost ? "gold" : value < 32 + parryBoost ? "red" : "green";
  }

  registerHakariRoll(player, technique) {
    const rarity = this.hakariRarity(player, technique);
    player.hakariLastRarity = rarity;
    player.hakariRollInputs.push({ technique, rarity });
    this.events.push({
      kind: "hakariRollInput", slot: player.slot, technique, rarity,
      count: player.hakariRollInputs.length, tick: this.tick,
    });
    if (player.hakariRollInputs.length >= 2) this.resolveHakariRoll(player);
    return rarity;
  }

  resolveHakariRoll(player) {
    const rarityMultiplier = { green: 1, red: 3, gold: 6 };
    const jackpotNumerator = Math.min(239, player.hakariRollInputs.reduce(
      (total, input) => total * (rarityMultiplier[input.rarity] || 1),
      1,
    ));
    const attempt = Math.min(5, player.hakariRollAttempts + 1);
    const roll = this.deterministicRange(player, 211 + player.domains * 19 + attempt * 43, 239);
    const number = 1 + this.deterministicPercent(player, 419) % 7;
    player.hakariRollAttempts = attempt;
    if (roll < jackpotNumerator) {
      player.jackpotTicks = 2280;
      player.domainTicks = 0;
      player.energy = 100;
      this.events.push({
        kind: "jackpot", slot: player.slot, slots: [number, number, number],
        attempt, maxAttempts: 5, chanceNumerator: jackpotNumerator, chanceDenominator: 239, tick: this.tick,
      });
    } else {
      const finalAttempt = attempt >= 5;
      if (finalAttempt) {
        player.domainTicks = 0;
        player.pendingDomainTicks = 0;
        player.energy = Math.max(0, player.energy - 28);
        player.stun = Math.max(player.stun, 69);
      } else {
        player.energy = Math.min(100, player.energy + 10);
      }
      this.events.push({
        kind: "failedRoll", slot: player.slot,
        slots: [
          1 + this.deterministicPercent(player, 501) % 7,
          1 + this.deterministicPercent(player, 607) % 7,
          1 + this.deterministicPercent(player, 719) % 7,
        ],
        attempt, maxAttempts: 5, finalAttempt,
        chanceNumerator: jackpotNumerator, chanceDenominator: 239, tick: this.tick,
      });
    }
    player.hakariRollInputs = [];
  }

  resolveAttacks(attacker, defender) {
    const attack = attacker.attack;
    if (!attack || attack.hit || this.tick < attack.activeTick || this.tick > attack.endActiveTick) return;
    const inFront = Math.sign(defender.x - attacker.x || attacker.facing) === attacker.facing;
    const distance = Math.abs(defender.x - attacker.x);
    const vertical = Math.abs((defender.y - 46) - (attacker.y - 46));
    if (inFront && distance <= attack.range && vertical < 95) {
      attack.hit = true;
      this.applyDamage(attacker, defender, attack.damage, attack.strong, attack.kind);
      if (attack.kind === "feverBreaker") {
        defender.vy = -620;
        defender.grounded = false;
        attacker.pendingFollowup = { kind: "feverBreaker", target: defender.slot, tick: this.tick + 16 };
        this.events.push({ kind: "feverBreakerLaunch", slot: defender.slot, sourceSlot: attacker.slot, tick: this.tick });
      } else if (attack.kind === "gamblersLuck") {
        defender.x = clamp(attacker.x + attacker.facing * 74, 26, 1254);
        defender.vx = attacker.facing * 240;
        defender.stun = Math.max(defender.stun, 40);
        attacker.pendingFollowup = { kind: "gamblersLuck", target: defender.slot, tick: this.tick + 24 };
        this.events.push({ kind: "gamblersLuckGrind", slot: defender.slot, sourceSlot: attacker.slot, tick: this.tick });
      }
    }
  }

  resolveMeleeClash() {
    const p1 = this.players[1];
    const p2 = this.players[2];
    const a = p1.attack;
    const b = p2.attack;
    if (!a?.strong || !b?.strong) return false;
    const activeA = this.tick >= a.activeTick && this.tick <= a.endActiveTick;
    const activeB = this.tick >= b.activeTick && this.tick <= b.endActiveTick;
    if (!activeA || !activeB || Math.abs(p1.x - p2.x) > 170) return false;
    p1.attack = null;
    p2.attack = null;
    this.clash = { type: "power", ticks: 192, power: 50, last: { 1: 0, 2: 0 } };
    this.events.push({ kind: "clashStart", type: "power", tick: this.tick });
    return true;
  }

  applyDamage(attacker, defender, damage, strong, source) {
    if (defender.invuln > 0) return;
    if (defender.chargedSpecialTicks > 0) {
      if (defender.character === "gojo") defender.energy = Math.max(0, defender.energy - 30);
      if (defender.character === "sukuna") {
        defender.cooldowns.red = Math.max(defender.cooldowns.red, Math.ceil(CHARACTER.sukuna.specials.red.cooldown / 2));
      }
      defender.chargedSpecialTicks = 0;
      defender.chargedReleaseTicks = -1;
      this.events.push({ kind: "chargedMoveInterrupted", slot: defender.slot, tick: this.tick });
    }
    if (defender.blocking) {
      if (this.tick - defender.blockStartTick <= 6) {
        defender.parries++;
        defender.energy = Math.min(100, defender.energy + 12);
        attacker.stun = Math.max(attacker.stun, 60);
        attacker.attack = null;
        this.events.push({ kind: "parry", slot: defender.slot, source, tick: this.tick });
        return;
      }
      damage *= .25;
    }
    defender.health = Math.max(0, defender.health - damage);
    defender.stun = Math.max(defender.stun, strong ? 22 : 10);
    defender.vx = attacker.facing * (strong ? 360 : 150);
    attacker.damage += damage;
    this.events.push({ kind: "hit", slot: defender.slot, source, damage, tick: this.tick });
  }

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.life--;
      projectile.x += projectile.vx / TICK_RATE;
      projectile.y += projectile.vy / TICK_RATE;
      if (projectile.kind === "reserveBall") projectile.vy += 520 / TICK_RATE;
      const owner = this.players[projectile.owner];
      const target = this.players[projectile.owner === 1 ? 2 : 1];
      if (!owner || !target) {
        this.projectiles.splice(i, 1);
        continue;
      }
      for (let j = 0; j < this.projectiles.length; j++) {
        if (j === i) continue;
        const other = this.projectiles[j];
        if (other.owner === projectile.owner) continue;
        const sameTechnique = projectile.kind === other.kind && ["red", "blue"].includes(projectile.kind);
        const powerCollision = ["purple", "worldSlash"].includes(projectile.kind) && other.strong
          || ["purple", "worldSlash"].includes(other.kind) && projectile.strong;
        if (!sameTechnique && !powerCollision) continue;
        if (Math.hypot(projectile.x - other.x, projectile.y - other.y) > projectile.radius + other.radius) continue;
        const clashType = sameTechnique ? projectile.kind : "power";
        this.projectiles.splice(Math.max(i, j), 1);
        this.projectiles.splice(Math.min(i, j), 1);
        this.clash = { type: clashType, ticks: 192, power: 50, last: { 1: 0, 2: 0 } };
        this.events.push({ kind: "clashStart", type: clashType, tick: this.tick });
        return;
      }

      if (projectile.kind === "blue") {
        const dx = projectile.x - target.x;
        const dy = projectile.y - (target.y - 46);
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance < 340) {
          target.vx += dx / distance * 15.7;
          target.vy += dy / distance * 7.8;
        }
      }

      const distance = Math.hypot(projectile.x - target.x, projectile.y - (target.y - 46));
      if (distance <= projectile.radius + 24 && projectile.kind !== "blue") {
        if (target.blocking && this.tick - target.blockStartTick <= 6 && !projectile.reflected) {
          projectile.owner = target.slot;
          projectile.vx *= -1;
          projectile.vy = 0;
          projectile.reflected = true;
          target.parries++;
          target.energy = Math.min(100, target.energy + 12);
          this.events.push({ kind: "reflect", slot: target.slot, projectile: projectile.kind, tick: this.tick });
          continue;
        }
        this.applyDamage(owner, target, projectile.damage, projectile.strong, projectile.kind);
        if (projectile.burns) {
          target.burned = true;
          this.events.push({ kind: "fugaImpact", slot: target.slot, sourceSlot: owner.slot, tick: this.tick });
        }
        if (!["purple", "worldSlash"].includes(projectile.kind)) projectile.life = 0;
      }
      if (projectile.kind === "blue" && distance < 75 && this.tick % 23 === 0) {
        this.applyDamage(owner, target, projectile.damage, false, "blue");
      }

      if (projectile.life <= 0 || projectile.x < -300 || projectile.x > 1580) this.projectiles.splice(i, 1);
    }
    this.resolvePurpleFusion();
  }

  resolvePurpleFusion() {
    for (let i = 0; i < this.projectiles.length; i++) {
      const blue = this.projectiles[i];
      if (blue.kind !== "blue") continue;
      for (let j = 0; j < this.projectiles.length; j++) {
        if (i === j) continue;
        const red = this.projectiles[j];
        if (red.kind !== "red") continue;
        if (Math.hypot(blue.x - red.x, blue.y - red.y) > blue.radius + red.radius) continue;
        const owner = this.players[blue.owner];
        if (owner?.character !== "gojo") continue;
        owner.unstablePurpleTicks = 228;
        owner.unstablePurpleX = (blue.x + red.x) / 2;
        owner.unstablePurpleY = (blue.y + red.y) / 2;
        this.events.push({
          kind: "purpleFusion", slot: owner.slot,
          x: owner.unstablePurpleX, y: owner.unstablePurpleY,
          durationTicks: 228, tick: this.tick,
        });
        this.projectiles.splice(Math.max(i, j), 1);
        this.projectiles.splice(Math.min(i, j), 1);
        return;
      }
    }
  }

  updateClash(input1, input2) {
    if (!this.clash) return;
    this.clash.ticks--;
    for (const [slot, input] of [[1, input1], [2, input2]]) {
      if (!input.move || input.move === this.clash.last[slot]) continue;
      this.clash.last[slot] = input.move;
      this.clash.power += slot === 1 ? 2.8 : -2.8;
    }
    this.clash.power = clamp(this.clash.power, 0, 100);
    if (this.clash.ticks <= 0 || this.clash.power <= 0 || this.clash.power >= 100) {
      const winner = this.clash.power >= 50 ? this.players[1] : this.players[2];
      const loser = winner.slot === 1 ? this.players[2] : this.players[1];
      if (winner.character === "hakari") {
        winner.jackpotTicks = 2280;
        winner.energy = 100;
        winner.domainTicks = 0;
      }
      loser.domainTicks = 0;
      winner.domainStartupTicks = 0;
      winner.pendingDomainTicks = 0;
      loser.domainStartupTicks = 0;
      loser.pendingDomainTicks = 0;
      loser.hakariRollInputs = [];
      loser.stun = 90;
      loser.health = Math.max(0, loser.health - 24);
      this.events.push({ kind: "clashResult", winnerSlot: winner.slot, tick: this.tick });
      this.clash = null;
    }
  }

  checkResult() {
    if (this.result) return;
    const remainingTicks = Math.max(0, this.settings.time * TICK_RATE - this.roundTicks);
    const p1 = this.players[1];
    const p2 = this.players[2];
    if (p1.health > 0 && p2.health > 0 && remainingTicks > 0) return;
    const winnerSlot = p1.health === p2.health ? 1 : p1.health > p2.health ? 1 : 2;
    this.result = {
      winnerSlot,
      endedAt: Date.now(),
      tick: this.tick,
      stats: {
        1: { damage: p1.damage, parries: p1.parries, blackFlashes: p1.blackFlashes, domains: p1.domains },
        2: { damage: p2.damage, parries: p2.parries, blackFlashes: p2.blackFlashes, domains: p2.domains },
      },
    };
    this.emitSnapshot(false);
    if (this.onResult) this.onResult(this.result);
  }

  snapshot(consumeEvents = false) {
    const serializePlayer = (player) => ({
      slot: player.slot,
      character: player.character,
      variant: player.variant,
      x: player.x, y: player.y, vx: player.vx, vy: player.vy,
      facing: player.facing, grounded: player.grounded,
      health: player.health, maxHealth: MAX_HEALTH, energy: player.energy,
      blocking: player.blocking, charging: player.charging,
      stun: player.stun, invuln: player.invuln,
      comboStep: player.comboStep,
      attack: player.attack ? {
        kind: player.attack.kind,
        step: player.attack.step,
        startTick: player.attack.startTick,
        activeTick: player.attack.activeTick,
        endActiveTick: player.attack.endActiveTick,
        endTick: player.attack.endTick,
      } : null,
      cooldowns: player.cooldowns,
      dashTicks: player.dashTicks,
      domainTicks: player.domainTicks,
      domainStartupTicks: player.domainStartupTicks,
      pendingDomainTicks: player.pendingDomainTicks,
      awakeningTicks: player.awakeningTicks,
      jackpotTicks: player.jackpotTicks,
      unstablePurpleTicks: player.unstablePurpleTicks,
      burned: player.burned,
      dismantleUses: player.dismantleUses,
      cleaveUses: player.cleaveUses,
      sukunaDomainUses: player.sukunaDomainUses,
      worldSlashUnlocked: player.worldSlashUnlocked,
      worldSlashUses: player.worldSlashUses,
      chargedSpecialTicks: player.chargedSpecialTicks,
      chargedReleaseTicks: player.chargedReleaseTicks,
      moveConfiscationTicks: player.moveConfiscationTicks,
      fugaTicks: player.fugaTicks,
      hakariRollInputs: player.hakariRollInputs,
      hakariLastRarity: player.hakariLastRarity,
      hakariRollAttempts: player.hakariRollAttempts,
      ackFrame: player.lastInputFrame,
    });
    return {
      tick: this.tick,
      serverTime: this.startAt + this.tick * TICK_MS,
      startAt: this.startAt,
      remainingTicks: Math.max(0, this.settings.time * TICK_RATE - this.roundTicks),
      players: { 1: serializePlayer(this.players[1]), 2: serializePlayer(this.players[2]) },
      projectiles: this.projectiles.map((projectile) => ({ ...projectile })),
      clash: this.clash ? { ...this.clash } : null,
      events: consumeEvents ? this.events.splice(0) : clone(this.events),
      result: this.result,
    };
  }

  emitSnapshot(correction) {
    if (this.onSnapshot) this.onSnapshot({ ...this.snapshot(true), correction: Boolean(correction) });
  }
}

module.exports = {
  AuthoritativeMatch,
  TICK_RATE,
  TICK_MS,
  MAX_ROLLBACK,
};
