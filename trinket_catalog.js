// Trinket catalog for Arena Legends
// Passive accessories that can modify stats and rewards.

const MANUAL_TRINKETS = [
  {
    key: 'gladiators_token',
    name: "Gladiator's Token",
    type: 'trinket',
    category: 'trinket',
    rarityKey: 'common',
    rarity: 'rarity-common',
    baseType: 'Charm',
    stat: 'Trinket',
    price: 40,
    minShopLevel: 1,
    iconPath: 'assets/images/trinket-icons/trinket2-icon.png',
    statMods: { str: 1 },
    info: 'A simple charm carried by arena hopefuls.',
    infoColor: 'text-gold'
  }
];

// --- PROCEDURAL TRINKET GENERATOR ---

const TRINKET_RARITY_CONFIG = {
  common: {
    key: 'common',
    css: 'rarity-common',
    statBudget: 0,
    priceMult: 1.0
  },
  uncommon: {
    key: 'uncommon',
    css: 'rarity-uncommon',
    statBudget: 2,
    priceMult: 1.2
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    statBudget: 4,
    priceMult: 1.5
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    statBudget: 6,
    priceMult: 1.9
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    statBudget: 8,
    priceMult: 2.5
  }
};

const TRINKET_STAT_KEYS = ['str', 'vit', 'atk', 'def', 'chr', 'mag'];

const TRINKET_CLASS_WEIGHT_TABLE = {
  Balanced: ['str', 'vit', 'atk', 'def', 'chr', 'mag'],
  Offense: ['atk', 'atk', 'str', 'chr', 'vit'],
  Defense: ['def', 'def', 'vit', 'str'],
  Mystic: ['mag', 'mag', 'chr', 'vit'],
  Greedy: ['chr', 'chr', 'atk', 'def']
};

const TRINKET_STAT_SUFFIX = {
  str: 'of Giantblood Sigils',
  vit: 'of Unbroken Pulse',
  atk: 'of Razor Instinct',
  def: 'of Stonebound Wards',
  chr: 'of Velvet Promises',
  mag: 'of Forgotten Glyphs'
};

const TRINKET_LEGENDARY_UNIQUE_NAMES = [
  'Echoheart Talisman',
  'Crown of Broken Stars',
  'Whispercoil Sigil',
  'Oathbound Relic',
  'Veilshard Locket',
  'Grimflare Amulet',
  'Ashen Halo',
  'Oracle of the Deep',
  'Bloodthread Charm',
  'Gloomwright’s Emblem'
];

const TRINKET_BASE_TYPES = [
  { key: 'battle_charm', baseType: 'Charm', trinketClass: 'Balanced', baseBudget: 1 },
  { key: 'warrior_ring', baseType: 'Ring', trinketClass: 'Offense', baseBudget: 1 },
  { key: 'guardian_crest', baseType: 'Crest', trinketClass: 'Defense', baseBudget: 1 },
  { key: 'mystic_amulet', baseType: 'Amulet', trinketClass: 'Mystic', baseBudget: 1 },
  { key: 'luck_coin', baseType: 'Coin', trinketClass: 'Greedy', baseBudget: 1 }
];

function trinketRngInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function trinketRngChoice(arr) {
  return arr[trinketRngInt(0, arr.length - 1)];
}

function trinketAllocStats(trinketClass, budget) {
  const mods = { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
  if (budget <= 0) return mods;
  const weights = TRINKET_CLASS_WEIGHT_TABLE[trinketClass] || ['str', 'vit', 'atk', 'def', 'chr', 'mag'];
  for (let i = 0; i < budget; i++) {
    const k = weights[trinketRngInt(0, weights.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  return mods;
}

function trinketDominantStat(statMods) {
  let bestKey = 'atk';
  let bestVal = -Infinity;
  for (const key of TRINKET_STAT_KEYS) {
    const v = statMods[key] || 0;
    if (v > bestVal) {
      bestVal = v;
      bestKey = key;
    }
  }
  return bestKey;
}

function trinketPower(statMods) {
  let sum = 0;
  for (const key of TRINKET_STAT_KEYS) {
    sum += Math.abs(statMods[key] || 0);
  }
  return sum;
}

function determineTrinketMinShopLevel(power, itemLevel) {
  const score = power + itemLevel;
  if (score <= 2) return 1;
  if (score <= 4) return 2;
  if (score <= 6) return 3;
  if (score <= 8) return 4;
  if (score <= 10) return 5;
  return 6;
}

function buildTrinketName(baseType, rarityKey, statMods) {
  const rarity = TRINKET_RARITY_CONFIG[rarityKey];
  const prefixPool = rarity ? ['Tarnished', 'Engraved', 'Gilded', 'Runed', 'Blessed', 'Ancient'] : [];
  const prefix = prefixPool.length ? trinketRngChoice(prefixPool) : '';
  const dom = trinketDominantStat(statMods);
  const suffix = TRINKET_STAT_SUFFIX[dom] || 'of Fortune';
  if (rarityKey === 'legendary') {
    return trinketRngChoice(TRINKET_LEGENDARY_UNIQUE_NAMES);
  }
  if (rarityKey === 'common' || rarityKey === 'uncommon') {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  const useSuffix = trinketRngInt(0, 99) < 60; // rare/epic: bazen suffix'li, bazen sade
  if (!useSuffix) {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  return `${prefix} ${baseType} ${suffix}`.replace(/\s+/g, ' ').trim();
}

function priceFromTrinket(power, itemLevel, rarityPriceMult) {
  const base = (power + 1) * (power + 1) * 5 * rarityPriceMult * (1 + itemLevel * 0.1);
  return Math.max(1, Math.round(base));
}

function generateRandomTrinkets() {
  const out = [];
  let idx = 0;
  for (const base of TRINKET_BASE_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in TRINKET_RARITY_CONFIG) {
        const rarity = TRINKET_RARITY_CONFIG[rarityKey];
        const totalBudget = rarity.statBudget + base.baseBudget;
        const statMods = trinketAllocStats(base.trinketClass, totalBudget);
        const power = trinketPower(statMods);
        const price = priceFromTrinket(power, itemLevel, rarity.priceMult);
        const minShopLevel = determineTrinketMinShopLevel(power, itemLevel);
        const name = buildTrinketName(base.baseType, rarityKey, statMods);
        const key = `gen_${base.key}_${rarityKey}_l${itemLevel}_${idx++}`;

        out.push({
          key,
          name,
          type: 'trinket',
          category: 'trinket',
          rarityKey,
          rarity: rarity.css,
          baseType: base.baseType,
          stat: 'Trinket',
          price,
          minShopLevel,
          iconPath: 'assets/images/trinket-icons/trinket2-icon.png',
          statMods
        });
      }
    }
  }
  return out;
}

const GENERATED_TRINKETS = generateRandomTrinkets();
const TRINKETS = [...MANUAL_TRINKETS, ...GENERATED_TRINKETS];
