# ASCENSION

ASCENSION is a browser-based dark fantasy gladiator RPG focused on turn-based arena combat, character progression, loot, tournaments, and an early multiplayer prototype.

This repository is intentionally lightweight:

- Single-player runs directly in the browser from `index.html`
- Core gameplay is plain JavaScript with no build step
- Progress is stored in `localStorage`
- Multiplayer is an optional Node.js WebSocket server in `server.js`

This document is written for both humans and AI agents so the project can be understood quickly and extended safely.

---

## 1. Project Snapshot

- Genre: turn-based gladiator RPG
- Theme: dark fantasy arena progression
- Current state: single-player is the main game, multiplayer is alpha/prototype
- Frontend stack: HTML + CSS + vanilla JavaScript
- Backend stack: Node.js + `ws` for multiplayer only
- Persistence: browser `localStorage` for single-player saves

Core loop:

1. Create a gladiator
2. Fight in the pit or tournaments
3. Earn gold, XP, and loot
4. Upgrade equipment and stats
5. Unlock skills and manage injuries
6. Repeat with stronger encounters

---

## 2. How To Run

### Single-player

Open `index.html` in a browser.

There is no build pipeline.

### Multiplayer prototype

Install dependencies once:

```bash
npm install
```

Start the WebSocket server:

```bash
npm run multiplayer
```

Default server address:

```text
ws://localhost:8080
```

---

## 3. High-Level Architecture

The game is split into a few clear layers.

### Frontend entry

- `index.html` defines the UI screens and script load order
- `gladiator_game.css` contains the full visual layer
- `gladiator_game.js` builds the main `game` object and handles screen/UI orchestration
- `multiplayer.js` handles browser-side multiplayer UI and socket messaging

### Config layer

Located in `scripts/config/`.

This contains constants and game definitions such as:

- base stats and utility constants
- status effects
- audio hooks
- potion definitions
- injuries
- tournament tiers

### Data layer

Located in `scripts/data/`.

This contains content catalogs:

- weapons
- armor
- trinkets
- enemies
- skill tree

### Core systems

Located in `scripts/core/`.

This contains reusable game logic:

- `player.js` - source of truth for player stats and progression
- `item_system.js` - item instance generation helpers
- `item_name_generator.js` - legendary naming helpers
- `display_helpers.js` - UI formatting helpers

### Gameplay modules

Located in `scripts/modules/`.

- `save_load.js` - save slots and persistence
- `shop.js` - shop stock generation, trading, potion inventory logic
- `encounter.js` - pit setup, previews, tournaments, injuries
- `combat.js` - turn-based combat engine
- `blackjack.js` - side activity/minigame

### Multiplayer backend

- `server.js` - lightweight authoritative lobby/match server for prototype PvP

---

## 4. Script Load Order Matters

This project relies on browser globals. The load order in `index.html` is important and should be preserved.

Order:

1. `scripts/config/`
2. `scripts/data/`
3. `scripts/core/`
4. `scripts/modules/`
5. `multiplayer.js`
6. `gladiator_game.js`

Why this matters:

- Many files expose global constants, functions, or objects
- There is no module bundler/import system
- Refactors that change load order can break the whole game silently

---

## 5. Main Game Object

The heart of the frontend is the `game` object in `gladiator_game.js`.

It is composed by merging module objects:

```js
const game = {
    ...gameSaveLoad,
    ...gameShop,
    ...gameEncounter,
    player: null,
    // UI and flow methods...
};
```

Important implication:

- Modules are plain objects, not classes
- Shared state lives on `game`
- New gameplay features usually plug into this merged-object structure

If adding a new system, prefer following this pattern instead of introducing a second competing application controller.

---

## 6. Player Model

`scripts/core/player.js` is the primary source of truth for player power.

It owns:

- identity: name, class, avatar
- progression: level, XP, gold, wins, skill points
- base stats: `str`, `atk`, `def`, `vit`, `mag`, `chr`
- inventory and equipment
- injuries
- skill ranks
- bag/potion slots

Important derived-stat methods:

- `getEffectiveStr()`
- `getEffectiveAtk()`
- `getEffectiveDef()`
- `getEffectiveVit()`
- `getMaxHp()`
- `getTotalArmor()`
- `getDmgRange()`
- `getHitBonus()`
- `getCritBonus()`
- `getDodgeBonus()`

If combat balance feels wrong, check `player.js` first before changing UI or reward code.

---

## 7. Combat System

`scripts/modules/combat.js` is the single-player combat engine.

It handles:

- fight initialization
- enemy generation for encounters
- turn order
- attack resolution
- armor and HP damage
- status effects / DOTs
- combat log updates
- potion use during combat
- victory / defeat handling
- transition back to hub

Combat data flow in practice:

1. Encounter config is prepared in `encounter.js`
2. `combat.init()` builds player and enemy combat state
3. Player chooses attack type such as quick, normal, or power
4. Hit chance and damage are derived from player methods and combat rules
5. Armor absorbs damage first, then HP is reduced
6. DOT/status effects may be applied
7. Enemy turn resolves with similar logic
8. Rewards, injuries, and progression are resolved after the outcome

Important note:

- `player.js` defines the player's real stats
- `combat.js` consumes those stats and applies fight rules

When balancing the game, keep this separation intact.

---

## 8. Encounters, Pit, and Tournaments

`scripts/modules/encounter.js` controls the progression layer around combat.

It manages:

- pit mode selection
- encounter preview UI
- enemy preview calculations
- tournament unlock rules
- tournament round generation
- injury application after fights

Current encounter types:

- `duel` - normal 1v1
- `duo` - 1v2
- `no_armor` - higher-risk variant with no armor rules

Tournament behavior:

- tournaments unlock by level
- tier progression is tracked with `tournamentsCompleted`
- each tier generates a sequence of rounds
- later rounds can force named enemies and 1v2 fights

---

## 9. Items, Loot, and Shop

Item content is defined in:

- `scripts/data/weapon_catalog.js`
- `scripts/data/armor_catalog.js`
- `scripts/data/trinket_catalog.js`

Item creation logic lives in:

- `scripts/core/item_system.js`

Shop logic lives in:

- `scripts/modules/shop.js`

The shop system currently handles:

- random stock generation based on player level
- rarity distribution
- duplicate limiting
- legendary caps
- potion stock generation
- price adjustment from charisma-related effects
- buy/sell flows

Notable design details:

- shop stock is persistent per save slot
- legendary weapons use generated names
- weapon affixes can add DOT/status behavior
- potion inventory is stack-based

---

## 10. Skill Tree

Skill data lives in `scripts/data/skill_tree.js`.

The game currently uses branch-based progression tied to weapon/class identities.

The UI and unlock logic are handled by `gladiator_game.js`, while numeric effects are read through `Player` helpers such as:

- `getSkillRank()`
- `getSkillEffect()`
- `getConditionalSkillEffect()`

Rule of thumb:

- define skill data in the data file
- let `player.js` interpret the stats
- let UI only render and unlock

---

## 11. Injury System

Injury definitions live in `scripts/config/injuries.js`.

Runtime logic is mostly resolved in `scripts/modules/encounter.js`.

Injuries are temporary fight-based penalties that can affect things like:

- attack
- defense
- armor scaling
- hit chance
- crit chance
- dodge
- HP or regen

This is an important balancing system because it adds consequences beyond a single fight loss.

---

## 12. Save System

Single-player saves use browser `localStorage`.

Implementation:

- file: `scripts/modules/save_load.js`
- key: `arenaV7_saves`
- slots: up to 5 gladiators

The save system stores more than the player object. It also persists run-specific meta like:

- shop stock
- potion stock
- shop refresh counters
- last active slot

The loader also contains migration logic for older saves, so be careful when changing save structure.

Best practice when adding new player fields:

1. initialize them in `Player`
2. make load-time migration safe in `save_load.js`
3. avoid breaking older saves

---

## 13. Multiplayer Prototype

Multiplayer is currently an isolated alpha feature, not the full long-term architecture.

### Client

`multiplayer.js` handles:

- server connection
- create/join lobby
- ready state
- match start
- combat action sending
- rendering simple PvP combat UI

### Server

`server.js` handles:

- WebSocket connections
- temporary 2-player lobbies
- host tracking
- ready checks
- match state creation
- authoritative action resolution
- state broadcasting

Prototype PvP rules are simplified compared to single-player:

- no full item/inventory simulation
- no full skill tree simulation on server
- profile data is reduced to base combat fields
- action set is only quick / normal / power

This is good enough for testing PvP flow, but it is not yet the final persistent world design.

For future direction, see `ASCENSION-MultiplayerPlan.md`.

---

## 14. Current Design Philosophy

The project currently follows these practical rules:

- keep everything simple and browser-native
- prefer extending existing systems over rewriting architecture
- preserve global-script compatibility
- avoid hard dependencies on a build system
- keep single-player as the main stable experience
- treat multiplayer as a separate evolving layer

---

## 15. AI Development Guide

If you are an AI agent continuing work on this project, use these rules first.

### Understand before changing

- Read `index.html` to understand what is loaded and in what order
- Read `gladiator_game.js` to understand screen flow and the `game` object
- Read `player.js` before changing balance
- Read `combat.js` before changing fight behavior
- Read `save_load.js` before adding persistent fields

### Safe extension points

- new player stat logic -> `scripts/core/player.js`
- new fight rule -> `scripts/modules/combat.js`
- new encounter/tournament rule -> `scripts/modules/encounter.js`
- new shop/item behavior -> `scripts/modules/shop.js` and data catalogs
- new content definitions -> `scripts/config/` or `scripts/data/`
- new UI screens/buttons -> `index.html`, `gladiator_game.js`, `gladiator_game.css`

### Things to be careful with

- Do not break script load order
- Do not assume ES modules/imports exist
- Do not rewrite large files unless necessary
- Do not break old save compatibility
- Do not let UI become the source of truth for balance math
- Do not mix prototype multiplayer assumptions into single-player systems without intention

### Recommended workflow for changes

1. identify whether the change is data, rules, UI, or persistence
2. update the smallest relevant file set
3. keep logic modular and attached to existing systems
4. manually verify in browser since there is no automated test suite

---

## 16. Known Project Constraints

- No bundler
- No automated tests
- No lint setup
- No type system
- Heavy reliance on DOM IDs and browser globals
- Some files are large and combine UI with game logic

This means regressions are most likely to come from:

- wrong DOM ID usage
- missing globals
- load order mistakes
- save migration mistakes
- small balance edits with large downstream impact

---

## 17. Good Next Improvements

Based on the current codebase and `TODO.md`, strong next candidates are:

- combat log writing polish and more dramatic arena narration
- balance tuning for attack/hit scaling and potion economy
- better tournament pacing and level gating
- more item/status utility such as bandage-style bleed counterplay
- further multiplayer expansion toward the persistent-world plan

---

## 18. Recent UI Updates

The project recently received a round of UI/UX improvements that AI agents should be aware of before making layout changes.

### Hub layout

- the overall game window and active play area were increased
- hub action cards were reorganized into a clearer two-column structure
- all shop-related buttons were grouped on the right side
- `Potion Shop` now sits below `Combat Store`
- `Iron City Tournament` now appears above `The Pit`

### Inventory bag UI

- the inventory `BAG` sidebar was redesigned to support high-capacity bags more cleanly
- 20-slot bag capacity no longer pushes the UI outside the visible play area
- the bag panel now uses a denser, scrollable grid with improved spacing and readability

### Combat bag modal

- the in-combat `BAG` modal was upgraded with a cleaner header and item count
- bag entries now render in a more readable card layout
- the modal supports internal scrolling so all assigned combat items remain reachable

### Tooltip behavior

- `Combat Store` items now use the shared item tooltip/preview system
- cure consumables and bag upgrades display the same hover-preview style used elsewhere in the game

### Scrollbar styling

- default browser white/gray scrollbars were replaced with a darker theme that better matches the game's visual style

---

## 19. Important Files At A Glance

- `index.html` - UI structure and script load order
- `gladiator_game.js` - main game controller and screen logic
- `gladiator_game.css` - all major styling
- `multiplayer.js` - multiplayer browser client
- `server.js` - multiplayer WebSocket server
- `scripts/core/player.js` - player stats and progression source of truth
- `scripts/modules/combat.js` - combat engine
- `scripts/modules/encounter.js` - pit/tournament/injury flow
- `scripts/modules/shop.js` - shop and potion economy
- `scripts/modules/save_load.js` - save slots and migration logic
- `ASCENSION-MultiplayerPlan.md` - long-term multiplayer architecture vision
- `TODO.md` - active rough ideas and balancing notes

---

## 20. Short Mental Model

If you need to understand the project fast, think of it like this:

- `Player` defines what the gladiator really is
- `combat` decides what happens in battle
- `encounter` decides what kind of battle happens next
- `shop` decides what gear/potions are available
- `save_load` preserves the run
- `game` ties all screens and systems together
- `server.js` is a separate prototype PvP authority layer

That mental model is enough to start making safe, incremental improvements.
