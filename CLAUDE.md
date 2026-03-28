# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

**Single-player:** Open `index.html` directly in a browser. No build step required.

**Multiplayer server:**
```bash
npm run multiplayer   # starts Node.js WebSocket server on port 8080
```

No linting, testing, or build tooling exists in this project.

# Instructions
Always follow these rules:
- Never rewrite entire files unless asked
- Only modify relevant parts
- Keep code clean and modular
- Never hardcode any line

## Architecture

This is a browser-based turn-based RPG. All single-player logic is client-side JS using `localStorage` for persistence. The only server-side code is the optional multiplayer WebSocket server (`server.js`).

### Script Load Order (defined in `index.html`)
1. `scripts/config/` — constants, status effects, audio, potion/injury/tournament definitions
2. `scripts/data/` — item catalogs (weapons, armor, trinkets), enemy config, skill tree
3. `scripts/core/` — Player class, ItemSystem, display helpers
4. `scripts/modules/` — save/load, shop, encounter, combat, blackjack
5. `gladiator_game.js` + `multiplayer.js` — main game object, multiplayer UI

### Central Game Object (`gladiator_game.js`)
The `game` object is the single orchestrator, built by spreading module objects:
```js
const game = { ...gameSaveLoad, ...gameShop, ...gameEncounter, player: null, /* + UI methods */ }
```
All screens and UI transitions live here. Modules export plain objects (not classes) that get merged in.

### Key Systems

| File | Role |
|---|---|
| `scripts/core/player.js` | Player class — stats, gear, XP/level, skills, injuries. Stat methods like `getEffectiveAtk()`, `getMaxHp()`, `getDmgRange()` are the source of truth for combat. |
| `scripts/modules/combat.js` | Turn-based combat engine. Reads player stat methods. Applies status effects (DOT), resolves hit/crit/dodge via RNG, awards XP/gold/loot on victory, applies injuries on defeat. |
| `scripts/modules/shop.js` | Generates shop stock per player level. Rarity ladder: Common → Legendary (5%). Legendary items get unique names from `item_name_generator.js`. |
| `scripts/modules/encounter.js` | Manages encounter difficulty selection and tournament multi-round progression (5–14 fights). Calls the same combat engine as regular fights. |
| `scripts/modules/save_load.js` | Serializes/deserializes full player object to `localStorage` key `arenaV7_saves` (max 5 slots). |
| `scripts/core/item_system.js` | `ItemSystem.createWeapon/createArmor/createTrinket()` — generates item instances from catalog templates. |
| `server.js` | Minimal Node.js + `ws` WebSocket server for multiplayer lobbies. Stores state in a `lobbies` Map. Simplified combat (no items). |

### Combat Data Flow
```
Player picks attack type (Quick/Normal/Power)
  → hit chance = base + skill bonuses − injury penalties
  → damage = weapon range + str*2 + skill multipliers
  → RNG roll → hit or miss
  → if hit: damage − armor absorption → enemy HP
  → check for DOT application (bleed/poison/burn from weapon affixes)
Enemy AI turn (same calculation, enemy stats)
  → if enemy HP ≤ 0: Victory (XP, gold, loot, possible level-up)
  → if player HP ≤ 0: Defeat (injury risk = permanent stat penalty)
```

### Item Rarity & Affixes
Weapons can roll status-effect affixes (bleed/poison/burn chance) defined in `weapon_catalog.js`. Legendary items combine a random adjective + weapon type name via `item_name_generator.js`.

### Skill Tree
Three branches in `scripts/data/skill_tree.js` tied to weapon families: Warrior (sword), Berserker (axe), Guardian (spear). Skills grant percentage-based stat scaling read via `player.getSkillEffect()`.

### Injury System
Defined in `scripts/config/injuries.js`. Post-defeat, the player risks gaining a permanent injury (e.g. broken arm = −atk). Injuries appear on the character sheet and reduce effective stats until cured.
