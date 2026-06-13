"use strict";

const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const GROUND = 596;
const MAX_HEALTH = 600;
const MAX_ROLLBACK = 15;
const SNAPSHOT_INTERVAL = 3;
const EMPTY_INPUT = Object.freeze({
  move: 0, jump: false, dash: false, block: false, charge: false,
  light: false, heavy: false, special: "", domain: false, awaken: false,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const clone = (value) => JSON.parse(JSON.stringify(value));

const CHARACTER = {
  gojo: {
    speed: 295,
    light: [6, 7, 8, 9, 13],
    heavy: 14,
    specials: {
      red: { cost: 16, cooldown: 372, kind: "red", damage: 18 },
      blue: { cost: 20, cooldown: 270, kind: "blue", damage: 2.3 },
      purple: { cost: 82, cooldown: 780, kind: "purple", damage: 88, requiresPurple: true },
    },
  },
  sukuna: {
    speed: 312,
    light: [6.5, 7.5, 8.5, 9.5, 14],
    heavy: 16.5,
    specials: {
      red: { cost: 12, cooldown: 204, kind: "dismantle", damage: 15 },
      blue: { cost: 18, cooldown: 312, kind: "cleave", damage: 18 },
      purple: { cost: 72, cooldown: 720, kind: "worldSlash", damage: 39 },
    },
  },
  hakari: {
    speed: 318,
    light: [6.2, 7.2, 8.2, 9.2, 12.5],
    heavy: 16,
    specials: {
      red: { cost: 16, cooldown: 228, kind: "roughPunch", damage: 14.5 },
      blue: { cost: 20, cooldown: 330, kind: "door", damage: 13 },
      purple: { cost: 14, cooldown: 168, kind: "reserveBall", damage: 7.2 },
    },
  },
};

function normalizeInput(raw = {}) {
  const special = ["red", "blue", "purple"].includes(raw.special) ? raw.special : "";
  return {
    move: clamp(Math.round(Number(raw.move) || 0), -1, 1),
    jump: Boolean(raw.jump),
    dash: Boolean(raw.dash),
    block: Boolean(raw.block),
    charge: Boolean(raw.charge),
    light: Boolean(raw.light),
    heavy: Boolean(raw.heavy),
    special,
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
  };
}

function makePlayer(meta, settings) {
  const slot = meta.slot;
  return {
    slot,
    character: CHARACTER[meta.character] ? meta.character : "gojo",
    x: slot === 1 ? 300 : 950,
    y: GROUND,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    grounded: true,
    health: MAX_HEALTH,
    energy: Number(settings.energy) || 70,
    blocking: false,
    blockStartTick: -9999,
    charging: false,
    chargeCooldown: 0,
    chargeRecovery: 0,
    dashCooldown: 0,
    stun: 0,
    invuln: 0,
    comboStep: -1,
    comboExpires: 0,
    attack: null,
    cooldowns: { red: 0, blue: 0, purple: 0, domain: 0 },
    domainTicks: 0,
    awakeningTicks: 0,
    jackpotTicks: 0,
    unstablePurpleTicks: 0,
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
    this.players[slot].lastInputFrame = Math.max(this.players[slot].lastInputFrame, frame);
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
      this.tick++;
      this.checkResult();
      if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
      return;
    }
    this.updatePlayer(this.players[1], this.players[2], input1);
    this.updatePlayer(this.players[2], this.players[1], input2);
    if (this.resolveMeleeClash()) {
      this.tick++;
      if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
      return;
    }
    this.resolveAttacks(this.players[1], this.players[2]);
    this.resolveAttacks(this.players[2], this.players[1]);
    this.updateProjectiles();
    this.updateClash(input1, input2);
    this.tick++;
    this.checkResult();
    if (!resimulating && this.tick % SNAPSHOT_INTERVAL === 0) this.emitSnapshot(false);
  }

  updatePlayer(player, opponent, input) {
    const profile = CHARACTER[player.character];
    for (const key of Object.keys(player.cooldowns)) player.cooldowns[key] = Math.max(0, player.cooldowns[key] - 1);
    player.chargeCooldown = Math.max(0, player.chargeCooldown - 1);
    player.chargeRecovery = Math.max(0, player.chargeRecovery - 1);
    player.dashCooldown = Math.max(0, player.dashCooldown - 1);
    player.stun = Math.max(0, player.stun - 1);
    player.invuln = Math.max(0, player.invuln - 1);
    player.awakeningTicks = Math.max(0, player.awakeningTicks - 1);
    player.jackpotTicks = Math.max(0, player.jackpotTicks - 1);
    if (player.unstablePurpleTicks === 1) {
      player.health = Math.max(0, player.health - 30);
      opponent.health = Math.max(0, opponent.health - 38);
      player.stun = Math.max(player.stun, 69);
      opponent.stun = Math.max(opponent.stun, 81);
      this.events.push({ kind: "purpleCollapse", slot: player.slot, tick: this.tick });
    }
    player.unstablePurpleTicks = Math.max(0, player.unstablePurpleTicks - 1);
    player.domainTicks = Math.max(0, player.domainTicks - 1);
    if (player.domainTicks > 0 && player.character === "sukuna" && this.tick % 30 === 0) {
      this.applyDamage(player, opponent, 2.4, false, "malevolentShrine");
    }
    if (player.domainTicks > 0 && player.character === "hakari" && player.domainTicks % 150 === 0) {
      const roll = ((this.seed ^ (this.tick * 1103515245) ^ (player.slot * 12345)) >>> 0) % 100;
      if (roll < 18) {
        player.jackpotTicks = 2280;
        player.domainTicks = 0;
        player.energy = 100;
        this.events.push({ kind: "jackpot", slot: player.slot, tick: this.tick });
      } else {
        player.energy = Math.min(100, player.energy + 16);
        this.events.push({ kind: roll < 55 ? "nearJackpot" : "failedRoll", slot: player.slot, tick: this.tick });
      }
    }
    if (player.jackpotTicks > 0) {
      player.energy = 100;
      player.health = Math.min(MAX_HEALTH, player.health + .12);
    } else {
      player.energy = Math.min(100, player.energy + .018);
    }

    if (player.stun > 0) {
      player.blocking = false;
      player.charging = false;
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
        const domainSlow = opponent.domainTicks > 0 && opponent.character === "gojo" ? .27 : 1;
        const speed = profile.speed * (player.awakeningTicks > 0 ? 1.18 : 1) * domainSlow;
        player.vx = input.move * speed;
        if (input.move) player.facing = input.move;
        if (input.dash && player.dashCooldown <= 0) {
          player.vx = (input.move || player.facing) * 510;
          player.dashCooldown = 15;
          player.invuln = 6;
        }
        if (input.jump && player.grounded) {
          player.vy = -680;
          player.grounded = false;
        }
        if (!player.attack) {
          if (input.light) this.startAttack(player, "light");
          else if (input.heavy) this.startAttack(player, "heavy");
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
    }
    if (Math.abs(opponent.x - player.x) > 18 && !input.move) player.facing = opponent.x > player.x ? 1 : -1;
  }

  startAttack(player, kind) {
    const profile = CHARACTER[player.character];
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

  startSpecial(player, name) {
    const move = CHARACTER[player.character].specials[name];
    if (!move || player.cooldowns[name] > 0 || player.energy < move.cost) return;
    if (move.requiresPurple && player.unstablePurpleTicks <= 0) return;
    player.energy -= move.cost;
    player.cooldowns[name] = move.cooldown;
    if (move.kind === "roughPunch" || move.kind === "cleave" || move.kind === "door") {
      player.attack = {
        kind: move.kind, startTick: this.tick, activeTick: this.tick + 8,
        endActiveTick: this.tick + 14, endTick: this.tick + 25,
        damage: move.damage, range: move.kind === "door" ? 170 : 105, strong: true, hit: false,
      };
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
    if (move.kind === "dismantle") projectile.vx = direction * 760;
    if (move.kind === "worldSlash") projectile.radius = 90;
    this.projectiles.push(projectile);
    if (move.kind === "purple") player.unstablePurpleTicks = 0;
  }

  startDomain(player, opponent) {
    if (player.cooldowns.domain > 0 || player.energy < 100) return;
    player.energy = 0;
    player.cooldowns.domain = 1440;
    player.domains++;
    const otherRecent = opponent.domainTicks > 0 && opponent.domainTicks >= 525;
    player.domainTicks = player.character === "hakari" ? 840 : 540;
    if (otherRecent && !this.clash) {
      this.clash = { type: "domain", ticks: 240, power: 50, last: { 1: 0, 2: 0 } };
    }
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
        this.events.push({ kind: "purpleFusion", slot: owner.slot, tick: this.tick });
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
      }
      loser.stun = 90;
      loser.health = Math.max(0, loser.health - 24);
      this.events.push({ kind: "clashResult", winnerSlot: winner.slot, tick: this.tick });
      this.clash = null;
    }
  }

  checkResult() {
    if (this.result) return;
    const remainingTicks = Math.max(0, this.settings.time * TICK_RATE - this.tick);
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
        endTick: player.attack.endTick,
      } : null,
      cooldowns: player.cooldowns,
      domainTicks: player.domainTicks,
      awakeningTicks: player.awakeningTicks,
      jackpotTicks: player.jackpotTicks,
      unstablePurpleTicks: player.unstablePurpleTicks,
      ackFrame: player.lastInputFrame,
    });
    return {
      tick: this.tick,
      serverTime: this.startAt + this.tick * TICK_MS,
      startAt: this.startAt,
      remainingTicks: Math.max(0, this.settings.time * TICK_RATE - this.tick),
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
