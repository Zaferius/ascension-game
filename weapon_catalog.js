const MANUAL_WEAPONS = [
  // --- COMMON WEAPONS ---
  {
    key: 'rusty_blade',
    name: 'Rusty Blade',
    type: 'weapon',
    category: 'weapon',
    rarityKey: 'common',
    rarity: 'rarity-common',
    baseType: 'Dagger',
    weaponClass: 'Dagger',
    min: 1,
    max: 3,
    stat: 'Damage',
    price: 3,
    minShopLevel: 1,
    statMods: {},
    info: '"better than nothing"',
    infoColor: 'text-orange'
  },
  {
    key: 'heartsear_longbow',
    name: 'Heartsear Longbow',
    type: 'weapon',
    category: 'weapon',
    rarityKey: 'legendary',
    rarity: 'rarity-legendary',
    baseType: 'Longbow',
    weaponClass: 'Bow',
    min: 19,
    max: 27,
    stat: 'Damage',
    price: 420,
    minShopLevel: 5,
    statMods: { atk: 6, chr: 4 },
    info: "'If it sings, someone dies.'",
    infoColor: 'text-purple'
  },
];

// --- PROCEDURAL DIABLO-STYLE WEAPON GENERATOR ---

const RARITY_CONFIG = {
  common: {
    key: 'common',
    css: 'rarity-common',
    dmgMult: 1.0,
    statBudget: 0,
    prefixes: ['Worn', 'Cracked', 'Honed', 'Weathered', 'Scarred']
  },
  uncommon: {
    key: 'uncommon',
    css: 'rarity-uncommon',
    dmgMult: 1.1,
    statBudget: 2,
    prefixes: ['Tempered', 'Runed', 'Gleaming', 'Blessed', 'Barbed']
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    dmgMult: 1.25,
    statBudget: 4,
    prefixes: ['Nightforged', 'Stormbound', 'Bloodetched', 'Grimforged', 'Soulbound']
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    dmgMult: 1.4,
    statBudget: 6,
    prefixes: ['Eclipseborn', 'Voidcarved', 'Hellforged', 'Dreadwoven', 'Starfallen']
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    dmgMult: 1.6,
    statBudget: 8,
    prefixes: ['Mythforged', 'Worldrender', 'Godsbane', 'Kingslayer', 'Doomcrowned']
  }
};

const STAT_KEYS = ['str', 'vit', 'atk', 'def', 'chr', 'mag'];

const CLASS_WEIGHT_TABLE = {
  Sword: ['atk', 'atk', 'atk', 'str', 'str', 'vit', 'def', 'chr'],
  Axe: ['str', 'str', 'str', 'atk', 'vit', 'def'],
  Hammer: ['str', 'str', 'def', 'def', 'vit', 'atk'],
  Spear: ['atk', 'atk', 'mag', 'mag', 'str', 'vit'],
  Dagger: ['atk', 'atk', 'atk', 'chr', 'chr', 'vit'],
  Bow: ['chr', 'chr', 'atk', 'atk', 'vit'],
  Staff: ['mag', 'mag', 'mag', 'atk', 'atk', 'vit']
};

const STAT_SUFFIX = {
  str: 'of the Mountain',
  vit: 'of Endurance',
  atk: 'of Precision',
  def: 'of the Bulwark',
  chr: 'of Whispered Deals',
  mag: 'of Arcane Echoes'
};

const LEGENDARY_UNIQUE_NAMES = [
  'The Eclipse',
  'Dawnguard',
  'Hellscream',
  'Nightreaver',
  'Soulrender',
  'Kingsbane',
  'Voidhowl',
  'Grim Oath',
  'Blood Omen',
  'Ashen Crown'
];

const BASE_WEAPON_TYPES = [
  { key: 'shortsword', baseType: 'Shortsword', weaponClass: 'Sword', baseMin: 3, baseMax: 5, scale: 1.1 },
  { key: 'longsword', baseType: 'Longsword', weaponClass: 'Sword', baseMin: 4, baseMax: 7, scale: 1.3 },
  { key: 'greatsword', baseType: 'Greatsword', weaponClass: 'Sword', baseMin: 6, baseMax: 9, scale: 1.5 },

  { key: 'hand_axe', baseType: 'Hand Axe', weaponClass: 'Axe', baseMin: 4, baseMax: 7, scale: 1.4 },
  { key: 'war_axe', baseType: 'War Axe', weaponClass: 'Axe', baseMin: 6, baseMax: 9, scale: 1.6 },

  { key: 'mace', baseType: 'Mace', weaponClass: 'Hammer', baseMin: 5, baseMax: 8, scale: 1.5 },
  { key: 'maul', baseType: 'Maul', weaponClass: 'Hammer', baseMin: 7, baseMax: 10, scale: 1.7 },

  { key: 'spear', baseType: 'Spear', weaponClass: 'Spear', baseMin: 4, baseMax: 7, scale: 1.4 },
  { key: 'pike', baseType: 'Pike', weaponClass: 'Spear', baseMin: 6, baseMax: 9, scale: 1.6 },

  { key: 'dagger', baseType: 'Dagger', weaponClass: 'Dagger', baseMin: 2, baseMax: 5, scale: 1.2 },
  { key: 'twin_daggers', baseType: 'Twin Daggers', weaponClass: 'Dagger', baseMin: 3, baseMax: 6, scale: 1.4 },

  { key: 'shortbow', baseType: 'Shortbow', weaponClass: 'Bow', baseMin: 3, baseMax: 6, scale: 1.3 },
  { key: 'longbow', baseType: 'Longbow', weaponClass: 'Bow', baseMin: 4, baseMax: 8, scale: 1.5 },

  { key: 'oak_staff', baseType: 'Oak Staff', weaponClass: 'Staff', baseMin: 3, baseMax: 6, scale: 1.3 },
  { key: 'rune_staff', baseType: 'Runed Staff', weaponClass: 'Staff', baseMin: 4, baseMax: 7, scale: 1.5 }
];

function rngInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rngChoice(arr) {
  return arr[rngInt(0, arr.length - 1)];
}

function allocStats(weaponClass, budget) {
  const mods = { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
  if (budget <= 0) return mods;
  const weights = CLASS_WEIGHT_TABLE[weaponClass] || ['atk', 'str', 'vit', 'def', 'chr', 'mag'];
  for (let i = 0; i < budget; i++) {
    const k = weights[rngInt(0, weights.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  return mods;
}

function dominantStat(statMods) {
  let bestKey = 'atk';
  let bestVal = -Infinity;
  for (const key of STAT_KEYS) {
    const v = statMods[key] || 0;
    if (v > bestVal) {
      bestVal = v;
      bestKey = key;
    }
  }
  return bestKey;
}

function computeDamage(baseMin, baseMax, itemLevel, scale, rarityMult) {
  const baseAvg = (baseMin + baseMax) / 2;
  const scaledAvg = (baseAvg + itemLevel * scale) * rarityMult;
  const min = Math.max(1, Math.floor(scaledAvg * 0.7));
  const max = Math.max(min + 1, Math.ceil(scaledAvg * 1.3));
  const avg = (min + max) / 2;
  return { min, max, avg };
}

function determineMinShopLevel(avg) {
  if (avg <= 7) return 1;
  if (avg <= 11) return 2;
  if (avg <= 15) return 3;
  if (avg <= 19) return 4;
  if (avg <= 24) return 5;
  return 6;
}

function buildName(baseType, rarityKey, statMods) {
  const rarity = RARITY_CONFIG[rarityKey];
  const prefix = rarity ? rngChoice(rarity.prefixes) : '';
  const dom = dominantStat(statMods);
  const suffix = STAT_SUFFIX[dom] || 'of Ruin';
  if (rarityKey === 'legendary') {
    return rngChoice(LEGENDARY_UNIQUE_NAMES);
  }
  if (rarityKey === 'common' || rarityKey === 'uncommon') {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  // rare / epic: bazen suffix'li, bazen sadece prefix + baseType
  const useSuffix = rngInt(0, 99) < 60; // ~%60 suffix, %40 sade isim
  if (!useSuffix) {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  return `${prefix} ${baseType} ${suffix}`.replace(/\s+/g, ' ').trim();
}

function priceFrom(avg, itemLevel, rarityMult) {
  const base = avg * avg * 0.8 * rarityMult * (1 + itemLevel * 0.1);
  return Math.max(1, Math.round(base));
}

function generateRandomWeapons() {
  const out = [];
  let idx = 0;
  for (const base of BASE_WEAPON_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in RARITY_CONFIG) {
        const rarity = RARITY_CONFIG[rarityKey];
        const dmg = computeDamage(base.baseMin, base.baseMax, itemLevel, base.scale, rarity.dmgMult);
        const statMods = allocStats(base.weaponClass, rarity.statBudget);
        const avg = dmg.avg;
        const price = priceFrom(avg, itemLevel, rarity.dmgMult);
        const minShopLevel = determineMinShopLevel(avg);
        const name = buildName(base.baseType, rarityKey, statMods);
        const key = `gen_${base.key}_${rarityKey}_l${itemLevel}_${idx++}`;

        out.push({
          key,
          name,
          type: 'weapon',
          category: 'weapon',
          rarityKey,
          rarity: rarity.css,
          baseType: base.baseType,
          weaponClass: base.weaponClass,
          min: dmg.min,
          max: dmg.max,
          stat: 'Damage',
          price,
          minShopLevel,
          statMods
        });
      }
    }
  }
  return out;
}

const GENERATED_WEAPONS = generateRandomWeapons();
const WEAPONS = [...MANUAL_WEAPONS, ...GENERATED_WEAPONS];
