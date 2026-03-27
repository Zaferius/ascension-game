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
    statMods: { chr: -1 },
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
    baseType: 'Crossbow',
    weaponClass: 'Crossbow',
    min: 19,
    max: 27,
    stat: 'Damage',
    price: 420,
    minShopLevel: 4,
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
    drawbackChance: 0.06,
    drawbackBudget: 1,
    prefixes: ['Tempered', 'Runed', 'Gleaming', 'Blessed', 'Barbed']
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    dmgMult: 1.25,
    statBudget: 4,
    drawbackChance: 0.16,
    drawbackBudget: 1,
    prefixes: ['Nightforged', 'Stormbound', 'Bloodetched', 'Grimforged', 'Soulbound']
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    dmgMult: 1.4,
    statBudget: 6,
    drawbackChance: 0.24,
    drawbackBudget: 2,
    prefixes: ['Eclipseborn', 'Voidcarved', 'Hellforged', 'Dreadwoven', 'Starfallen']
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    dmgMult: 1.6,
    statBudget: 8,
    drawbackChance: 0.08,
    drawbackBudget: 2,
    prefixes: ['Mythforged', 'Worldrender', 'Godsbane', 'Kingslayer', 'Doomcrowned']
  }
};

const STAT_KEYS = ['str', 'vit', 'atk', 'def', 'chr', 'mag'];

const CLASS_WEIGHT_TABLE = {
  Sword: ['atk', 'atk', 'atk', 'str', 'str', 'vit', 'def', 'chr'],
  Axe: ['str', 'str', 'str', 'atk', 'vit', 'def'],
  Spear: ['atk', 'atk', 'mag', 'mag', 'str', 'vit'],
  Dagger: ['atk', 'atk', 'atk', 'chr', 'chr', 'vit'],
  Crossbow: ['chr', 'chr', 'atk', 'atk', 'vit']
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

const LEGENDARY_WEAPON_ARCHETYPES = [
  { name: 'The Eclipse', weaponClass: 'Axe', baseType: 'War Axe', statMods: { str: 4, atk: 3, def: 1 }, dotAffix: { effect: 'bleed', chance: 0.12, duration: 3, baseDamage: 5, scale: { str: 0.45, atk: 0.2 }, prefix: 'Barbed' } },
  { name: 'Dawnguard', weaponClass: 'Sword', baseType: 'Longsword', statMods: { atk: 4, def: 3, vit: 2 }, dotAffix: null },
  { name: 'Hellscream', weaponClass: 'Axe', baseType: 'War Axe', statMods: { str: 5, atk: 2, chr: -1 }, dotAffix: { effect: 'burn', chance: 0.1, duration: 2, baseDamage: 5, scale: { atk: 0.18, mag: 0.18 }, prefix: 'Emberforged' } },
  { name: 'Nightreaver', weaponClass: 'Dagger', baseType: 'Twin Daggers', statMods: { atk: 4, chr: 2, def: -1 }, dotAffix: { effect: 'poison', chance: 0.14, duration: 3, baseDamage: 4, scale: { atk: 0.26, chr: 0.16 }, prefix: 'Venomous' } },
  { name: 'Soulrender', weaponClass: 'Sword', baseType: 'Shortsword', statMods: { atk: 4, mag: 3, vit: -1 }, dotAffix: { effect: 'burn', chance: 0.1, duration: 2, baseDamage: 5, scale: { mag: 0.3, atk: 0.12 }, prefix: 'Emberforged' } },
  { name: 'Kingsbane', weaponClass: 'Spear', baseType: 'Pike', statMods: { atk: 4, def: 2, chr: 2 }, dotAffix: null },
  { name: 'Voidhowl', weaponClass: 'Crossbow', baseType: 'Arbalest', statMods: { atk: 4, chr: 3, def: -1 }, dotAffix: { effect: 'poison', chance: 0.12, duration: 3, baseDamage: 4, scale: { atk: 0.24, chr: 0.18 }, prefix: 'Venomous' } },
  { name: 'Grim Oath', weaponClass: 'Sword', baseType: 'Longsword', statMods: { def: 4, vit: 3, atk: 2 }, dotAffix: null },
  { name: 'Blood Omen', weaponClass: 'Dagger', baseType: 'Dagger', statMods: { atk: 5, str: 2, vit: -1 }, dotAffix: { effect: 'bleed', chance: 0.12, duration: 3, baseDamage: 4, scale: { str: 0.35, atk: 0.22 }, prefix: 'Barbed' } },
  { name: 'Ashen Crown', weaponClass: 'Crossbow', baseType: 'Crossbow', statMods: { chr: 4, atk: 3, def: 1 }, dotAffix: null }
];

const WEAPON_DOT_AFFIXES = {
  bleed: {
    id: 'bleed',
    prefix: 'Barbed',
    chanceByRarity: { uncommon: 0.06, rare: 0.12, epic: 0.18, legendary: 0.14 },
    duration: 3,
    baseDamage: 4,
    scale: { str: 0.45, atk: 0.25 },
    allowedClasses: ['Sword', 'Axe', 'Dagger', 'Spear']
  },
  poison: {
    id: 'poison',
    prefix: 'Venomous',
    chanceByRarity: { uncommon: 0.06, rare: 0.12, epic: 0.18, legendary: 0.14 },
    duration: 3,
    baseDamage: 3,
    scale: { atk: 0.3, chr: 0.18, mag: 0.12 },
    allowedClasses: ['Dagger', 'Crossbow', 'Spear']
  },
  burn: {
    id: 'burn',
    prefix: 'Emberforged',
    chanceByRarity: { uncommon: 0.05, rare: 0.1, epic: 0.15, legendary: 0.12 },
    duration: 2,
    baseDamage: 5,
    scale: { mag: 0.4, atk: 0.16 },
    allowedClasses: ['Sword', 'Axe', 'Crossbow']
  }
};

const WEAPON_ARCHETYPES = {
  Sword: [
    { key: 'duelist', positive: ['atk', 'atk', 'str'], negative: ['def', 'mag'], drawbackLabel: 'Reckless' },
    { key: 'bulwark', positive: ['def', 'atk', 'vit'], negative: ['chr'], drawbackLabel: 'Burdened' }
  ],
  Axe: [
    { key: 'glass_cannon', positive: ['str', 'str', 'atk'], negative: ['def', 'chr'], drawbackLabel: 'Wild' },
    { key: 'executioner', positive: ['str', 'atk', 'vit'], negative: ['mag'], drawbackLabel: 'Bloodbound' }
  ],
  Spear: [
    { key: 'lancer', positive: ['atk', 'atk', 'mag'], negative: ['def'], drawbackLabel: 'Thin' },
    { key: 'hex_pike', positive: ['mag', 'atk', 'chr'], negative: ['vit'], drawbackLabel: 'Cursed' }
  ],
  Dagger: [
    { key: 'assassin', positive: ['atk', 'atk', 'chr'], negative: ['def', 'vit'], drawbackLabel: 'Fragile' },
    { key: 'gambler', positive: ['chr', 'atk', 'str'], negative: ['def'], drawbackLabel: 'Greedy' }
  ],
  Crossbow: [
    { key: 'sniper', positive: ['chr', 'atk', 'atk'], negative: ['def', 'vit'], drawbackLabel: 'Exposed' },
    { key: 'raider', positive: ['atk', 'chr', 'vit'], negative: ['def'], drawbackLabel: 'Loose' }
  ]
};

const BASE_WEAPON_TYPES = [
  { key: 'shortsword', baseType: 'Shortsword', weaponClass: 'Sword', baseMin: 3, baseMax: 5, scale: 1.1 },
  { key: 'longsword', baseType: 'Longsword', weaponClass: 'Sword', baseMin: 4, baseMax: 7, scale: 1.3 },

  { key: 'hand_axe', baseType: 'Hand Axe', weaponClass: 'Axe', baseMin: 4, baseMax: 7, scale: 1.4 },
  { key: 'war_axe', baseType: 'War Axe', weaponClass: 'Axe', baseMin: 6, baseMax: 9, scale: 1.6 },

  { key: 'spear', baseType: 'Spear', weaponClass: 'Spear', baseMin: 4, baseMax: 7, scale: 1.4 },
  { key: 'pike', baseType: 'Pike', weaponClass: 'Spear', baseMin: 6, baseMax: 9, scale: 1.6 },

  { key: 'dagger', baseType: 'Dagger', weaponClass: 'Dagger', baseMin: 2, baseMax: 5, scale: 1.2 },
  { key: 'twin_daggers', baseType: 'Twin Daggers', weaponClass: 'Dagger', baseMin: 3, baseMax: 6, scale: 1.4 },

  { key: 'crossbow', baseType: 'Crossbow', weaponClass: 'Crossbow', baseMin: 3, baseMax: 6, scale: 1.3 },
  { key: 'arbalest', baseType: 'Arbalest', weaponClass: 'Crossbow', baseMin: 4, baseMax: 8, scale: 1.5 }
];

function rngInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rngChoice(arr) {
  return arr[rngInt(0, arr.length - 1)];
}

function ensureWeaponMods() {
  return { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
}

function weaponPositiveStatPool(statMods) {
  return STAT_KEYS.filter(key => (statMods[key] || 0) > 0);
}

function weaponNegativeStatPool(statMods) {
  return STAT_KEYS.filter(key => (statMods[key] || 0) < 0);
}

function allocStats(weaponClass, budget, rarityKey) {
  const mods = ensureWeaponMods();
  const rarity = RARITY_CONFIG[rarityKey] || RARITY_CONFIG.common;
  const weights = CLASS_WEIGHT_TABLE[weaponClass] || ['atk', 'str', 'vit', 'def', 'chr', 'mag'];
  const archetypes = WEAPON_ARCHETYPES[weaponClass] || [];
  const profile = archetypes.length ? { ...rngChoice(archetypes) } : { key: 'balanced', positive: [], negative: [], drawbackLabel: '' };
  for (let i = 0; i < budget; i++) {
    const source = profile.positive && profile.positive.length && rngInt(0, 99) < 65 ? profile.positive : weights;
    const k = source[rngInt(0, source.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  let hasDrawback = false;
  const drawbackBudget = rarity.drawbackBudget || 0;
  if (drawbackBudget > 0 && rngInt(0, 999) < Math.floor((rarity.drawbackChance || 0) * 1000)) {
    hasDrawback = true;
    const negativePool = (profile.negative && profile.negative.length) ? profile.negative : STAT_KEYS.filter(k => !weaponPositiveStatPool(mods).includes(k));
    const steps = Math.max(1, drawbackBudget);
    for (let i = 0; i < steps; i++) {
      const k = negativePool[rngInt(0, negativePool.length - 1)];
      mods[k] = (mods[k] || 0) - 1;
    }
  }
  return { mods, profile: { ...profile, hasDrawback } };
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

function dominantNegativeStat(statMods) {
  const negatives = weaponNegativeStatPool(statMods);
  if (!negatives.length) return null;
  let worstKey = negatives[0];
  let worstVal = 0;
  for (const key of negatives) {
    const v = statMods[key] || 0;
    if (v < worstVal) {
      worstVal = v;
      worstKey = key;
    }
  }
  return worstKey;
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
  let bucket;
  if (avg <= 7) bucket = 1;
  else if (avg <= 11) bucket = 2;
  else if (avg <= 15) bucket = 3;
  else if (avg <= 19) bucket = 4;
  else if (avg <= 24) bucket = 5;
  else bucket = 6;
  return [1, 2, 4, 6, 9, 12][bucket - 1];
}


function buildName(baseType, rarityKey, statMods, profile) {
  const rarity = RARITY_CONFIG[rarityKey];
  let prefix = rarity ? rngChoice(rarity.prefixes) : '';
  const dom = dominantStat(statMods);
  const suffix = STAT_SUFFIX[dom] || 'of Ruin';
  const cursedSuffix = dominantNegativeStat(statMods);
  if (profile && profile.hasDrawback && profile.drawbackLabel && rarityKey !== 'legendary' && rngInt(0, 99) < 70) {
    prefix = `${profile.drawbackLabel} ${prefix}`.trim();
  }
  if (rarityKey === 'legendary') return (profile && profile.legendaryName) || rngChoice(LEGENDARY_UNIQUE_NAMES);
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

function weaponTradeoffAdjustedPrice(price, statMods) {
  const positive = weaponPositiveStatPool(statMods).reduce((sum, key) => sum + Math.max(0, statMods[key] || 0), 0);
  const negative = weaponNegativeStatPool(statMods).reduce((sum, key) => sum + Math.abs(statMods[key] || 0), 0);
  const mult = 1 + positive * 0.05 - negative * 0.025;
  return Math.max(1, Math.round(price * Math.max(0.8, mult)));
}

function rollWeaponDotAffix(weaponClass, rarityKey) {
  const affixes = Object.values(WEAPON_DOT_AFFIXES).filter(cfg => cfg.allowedClasses.includes(weaponClass));
  if (!affixes.length) return null;
  const pool = affixes.filter(cfg => (cfg.chanceByRarity[rarityKey] || 0) > 0);
  if (!pool.length) return null;
  const picked = rngChoice(pool);
  const chance = picked.chanceByRarity[rarityKey] || 0;
  if (rngInt(0, 999) >= Math.floor(chance * 1000)) return null;
  return {
    effect: picked.id,
    chance,
    duration: picked.duration,
    baseDamage: picked.baseDamage,
    scale: { ...picked.scale },
    prefix: picked.prefix
  };
}

function generateRandomWeapons() {
  const out = [];
  let idx = 0;

  // Non-legendary: normal loop
  for (const base of BASE_WEAPON_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in RARITY_CONFIG) {
        if (rarityKey === 'legendary') continue; // handled separately below
        const rarity = RARITY_CONFIG[rarityKey];
        const dmg = computeDamage(base.baseMin, base.baseMax, itemLevel, base.scale, rarity.dmgMult);
        const statRoll = allocStats(base.weaponClass, rarity.statBudget, rarityKey);
        const statMods = statRoll.mods;
        const avg = dmg.avg;
        const dotAffix = rollWeaponDotAffix(base.weaponClass, rarityKey);
        const basePrice = priceFrom(avg, itemLevel, rarity.dmgMult);
        const price = weaponTradeoffAdjustedPrice(Math.round(basePrice * (dotAffix ? 1.12 : 1)), statMods);
        const minShopLevel = determineMinShopLevel(avg);
        const name = buildName(base.baseType, rarityKey, statMods, statRoll.profile);
        const key = `gen_${base.key}_${rarityKey}_l${itemLevel}_${idx++}`;
        const finalName = dotAffix && rngInt(0, 99) < 70
          ? `${dotAffix.prefix} ${name}`.replace(/\s+/g, ' ').trim()
          : name;
        out.push({
          key, name: finalName, type: 'weapon', category: 'weapon',
          rarityKey, rarity: rarity.css,
          baseType: base.baseType, weaponClass: base.weaponClass,
          min: dmg.min, max: dmg.max, stat: 'Damage',
          price, minShopLevel, statMods,
          affixProfile: statRoll.profile, dotAffix,
          info: statRoll.profile.hasDrawback ? 'Power traded for a hidden cost.' : undefined,
          infoColor: statRoll.profile.hasDrawback ? 'text-red' : undefined
        });
      }
    }
  }

  // Legendary: each archetype appears at every level 4–10, always same type + stats, only damage scales
  const legendaryRarity = RARITY_CONFIG.legendary;
  for (const arch of LEGENDARY_WEAPON_ARCHETYPES) {
    const matchingBase = BASE_WEAPON_TYPES.find(b => b.baseType === arch.baseType)
                      || BASE_WEAPON_TYPES.find(b => b.weaponClass === arch.weaponClass);
    if (!matchingBase) continue;
    for (let itemLevel = 4; itemLevel <= 10; itemLevel++) {
      const dmg = computeDamage(matchingBase.baseMin, matchingBase.baseMax, itemLevel, matchingBase.scale, legendaryRarity.dmgMult);
      const statMods = { ...arch.statMods };
      const avg = dmg.avg;
      const dotAffix = arch.dotAffix ? { ...arch.dotAffix } : null;
      const basePrice = priceFrom(avg, itemLevel, legendaryRarity.dmgMult);
      const price = weaponTradeoffAdjustedPrice(Math.round(basePrice * (dotAffix ? 1.12 : 1)), statMods);
      const minShopLevel = Math.max(4, determineMinShopLevel(avg));
      const key = `gen_legendary_${arch.name.replace(/\s+/g, '_').toLowerCase()}_l${itemLevel}_${idx++}`;
      out.push({
        key, name: arch.name, type: 'weapon', category: 'weapon',
        rarityKey: 'legendary', rarity: legendaryRarity.css,
        baseType: arch.baseType, weaponClass: arch.weaponClass,
        min: dmg.min, max: dmg.max, stat: 'Damage',
        price, minShopLevel, statMods,
        affixProfile: { key: 'legendary_fixed', hasDrawback: Object.values(statMods).some(v => v < 0), drawbackLabel: '', legendaryName: arch.name },
        dotAffix,
        info: Object.values(statMods).some(v => v < 0) ? 'Power traded for a hidden cost.' : undefined,
        infoColor: Object.values(statMods).some(v => v < 0) ? 'text-red' : undefined
      });
    }
  }

  return out;
}

const GENERATED_WEAPONS = generateRandomWeapons();
const WEAPONS = [...MANUAL_WEAPONS, ...GENERATED_WEAPONS];
