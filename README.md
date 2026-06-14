# Void Limit

A browser fighting game built with HTML5 Canvas, including three playable
fighters and two-player online rooms.

Open `index.html` directly in a modern browser. No installation is required.

## Online battle

1. Run `start-online.bat`.
2. Open `http://localhost:4173` on the host computer.
3. Choose **Online Battle**, enter a name, and create a room.
4. Player 2 opens the same address using the host computer's local network IP,
   such as `http://192.168.1.20:4173`, then joins with the seven-character code.
5. Both players ready up. The host chooses the stage, time, starting energy, and
   starts the synchronized match.

Rooms support two players only. They include lobby chat, ping indicators,
host-controlled settings, synchronized loading, reconnect protection, rematches,
and online battle statistics. Player 2 uses an inverted palette so mirror
matches remain readable.

Online combat uses a server-authoritative 60 Hz simulation. Clients send
timestamped input frames rather than positions, health, hits, or match results.
Local actions are predicted immediately, then reconciled against authoritative
snapshots. Remote movement is interpolated about 100 ms behind the newest server
frame for smooth motion.

The server keeps recent frame history for rollback and lag compensation. Inputs
arriving within the compensation window rewind and resimulate hits, parries,
projectile reflections, dodges, Domains, and clashes. A high-latency warning
automatically increases interpolation, and disconnected players have a
20-second reconnect window before the server awards a forfeit.

## Character selection

Every offline and online match now opens the character selection screen first.
Online selections are visible to both players and the match cannot load until
both fighters lock in.

- **Satoru Gojo**: technical defense and space control using Red, Blue, Hollow
  Purple, and Unlimited Void.
- **Ryomen Sukuna**: aggressive rushdown and counter-offense using Dismantle,
  Cleave, World Slash, and Malevolent Shrine.
- **Kinji Hakari**: high-pressure gambling brawler using Rough Cursed Punch,
  Shutter Doors, Reserve Balls, Consecutive Effect, and Idle Death Gamble.

All characters use the same movement and button layout. Hakari has unique
five-hit ground and air chains, a Heat Meter, and a three-slot Domain sequence.
Idle Death Gamble allows five completed rolls. A roll only begins after two
Domain techniques: two Reserve Balls, two Shutter Doors, or one of each. The
base Jackpot chance is 1 in 239. Green keeps the chance unchanged, red
multiplies it by 3, and gold multiplies it by 6; both setup rarities multiply
together. Jackpot lasts 38 seconds with unlimited cursed energy and automatic
healing.

During Jackpot, `Q` becomes **Fever Breaker**, a launch-and-spike combo, and
`R` becomes **Gambler's Luck**, a ground-dragging throw. Both have low energy
costs and long cooldowns.

The online server uses only Node.js built-in features and does not install
packages. Windows Firewall may ask the host to allow local network access the
first time the server starts.

## Stages

Choose a stage from the title screen:

- Shinjuku: ruined neon city and collapsed highways
- Jujutsu High: mountain academy courtyard
- Shibuya: rain-soaked nighttime crossing
- Kyoto Goodwill Event: forest tournament grounds

Each stage has its own lighting palette and destructible props.

## Controls

- `A` / `D`: Move
- `W`: Jump / wall jump
- `S`: Guard / perfect parry / aerial fast fall
- `Mouse 1`: Five-hit M1 chain / aerial chain
- `Mouse 2`: Heavy attack / Black Flash timing input
- `Shift`: Short dash / air dash / hit-confirm dash cancel
- `C`: Hold to charge cursed energy
- `E`, `R`, `Q`: Character special techniques
- `T`: Character Domain Expansion
- `F`: Awakening / Hakari Consecutive Effect
- `A` / `D`: Alternate during clashes
- `Esc`: Pause

## Advanced combat

- Hold forward during M1 hit five for a launcher.
- Hold down during M1 hit five for a downslam.
- Jump after a launcher to continue into the aerial chain.
- M1 hits two and three can be dash-cancelled after they connect.
- Blue, Red, and Purple can special-cancel from confirmed M1 hits.
- Eligible hits briefly show an `M2 NOW` Black Flash timing prompt.
- Red/Red, Blue/Blue, Purple/power attacks, and Domain/Domain can clash.
- Every playable character has 600 HP.
- Holding `C` charges cursed energy but locks movement and attacks. Releasing
  it creates a 0.2-second recovery and a one-second cooldown before charging
  can begin again.
- A projectile that reaches a perfectly timed guard is reflected toward its
  owner with the same base damage.
- Blue actively pulls its target. An enemy Red colliding with the player's
  active Blue also creates unstable Hollow Purple.
- Unlimited Void lasts 12 seconds and completely freezes its trapped opponent.
- Malevolent Shrine lasts 15 seconds and deals 15 damage on each slash tick.
- Sukuna's World Slash costs 95 cursed energy and deals triple damage. It
  unlocks after using Dismantle 10 times, Cleave 5 times, and Malevolent Shrine
  once during the match.
- Online players receive the same Domain backgrounds, projectiles, Hollow
  Purple instability, Shrine slashes, and cinematic combat effects.

## Hollow Purple

Hollow Purple cannot be cast directly. Create and fire it with this sequence:

1. Press `R` to cast Blue.
2. While Blue is active, press `E` so Red collides with the Blue sphere.
3. The fusion creates an unstable Hollow Purple with a short countdown.
4. Press `Q` before the timer expires to compress and fire it.

If the timer expires, the sphere explodes and damages both fighters. Gojo becomes
Burnt Out: movement and energy regeneration are reduced, his sprite becomes
charred, and Red, Blue, and Domain Expansion are temporarily disabled.

The generated arena artwork is original and is used as a parallax backdrop.

Complete Story to unlock the Snowfall costume. Clear the three-stage Boss Rush
to unlock Eclipse. Unlocks persist in browser storage.
