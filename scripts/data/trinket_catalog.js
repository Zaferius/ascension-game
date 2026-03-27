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
    priceMult: 1.2,
    drawbackChance: 0.06,
    drawbackBudget: 1
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    statBudget: 4,
    priceMult: 1.5,
    drawbackChance: 0.15,
    drawbackBudget: 1
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    statBudget: 6,
    priceMult: 1.9,
    drawbackChance: 0.24,
    drawbackBudget: 2
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    statBudget: 8,
    priceMult: 2.5,
    drawbackChance: 0.1,
    drawbackBudget: 2
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

const TRINKET_ARCHETYPES = {
  Balanced: [
    { key: 'duelist', positive: ['str', 'atk', 'vit'], negative: ['def', 'mag'], drawbackLabel: 'Restless' },
    { key: 'mercantile', positive: ['chr', 'atk', 'vit'], negative: ['def'], drawbackLabel: 'Greedy' }
  ],
  Offense: [
    { key: 'glass', positive: ['atk', 'atk', 'str'], negative: ['def', 'vit'], drawbackLabel: 'Fragile' },
    { key: 'blood', positive: ['atk', 'str', 'chr'], negative: ['mag'], drawbackLabel: 'Bloodbound' }
  ],
  Defense: [
    { key: 'fortified', positive: ['def', 'vit', 'def'], negative: ['atk'], drawbackLabel: 'Heavy' },
    { key: 'bastion', positive: ['def', 'vit', 'str'], negative: ['chr'], drawbackLabel: 'Rigid' }
  ],
  Mystic: [
    { key: 'oracle', positive: ['mag', 'mag', 'chr'], negative: ['def', 'str'], drawbackLabel: 'Hollow' },
    { key: 'hexed', positive: ['mag', 'atk', 'chr'], negative: ['vit'], drawbackLabel: 'Hexed' }
  ],
  Greedy: [
    { key: 'broker', positive: ['chr', 'chr', 'atk'], negative: ['def', 'vit'], drawbackLabel: 'Shady' },
    { key: 'fortune', positive: ['chr', 'mag', 'atk'], negative: ['str'], drawbackLabel: 'Fickle' }
  ]
};

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

function ensureTrinketMods() {
  return { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
}

function trinketAllocStats(trinketClass, budget, rarityKey) {
  const mods = ensureTrinketMods();
  const rarity = TRINKET_RARITY_CONFIG[rarityKey] || TRINKET_RARITY_CONFIG.common;
  const weights = TRINKET_CLASS_WEIGHT_TABLE[trinketClass] || ['str', 'vit', 'atk', 'def', 'chr', 'mag'];
  const archetypes = TRINKET_ARCHETYPES[trinketClass] || [];
  const profile = archetypes.length ? { ...trinketRngChoice(archetypes) } : { key: 'balanced', positive: [], negative: [], drawbackLabel: '' };
  for (let i = 0; i < budget; i++) {
    const source = profile.positive && profile.positive.length && trinketRngInt(0, 99) < 65 ? profile.positive : weights;
    const k = source[trinketRngInt(0, source.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  let hasDrawback = false;
  const drawbackBudget = rarity.drawbackBudget || 0;
  if (drawbackBudget > 0 && trinketRngInt(0, 999) < Math.floor((rarity.drawbackChance || 0) * 1000)) {
    hasDrawback = true;
    const negativePool = (profile.negative && profile.negative.length) ? profile.negative : TRINKET_STAT_KEYS.filter(k => (mods[k] || 0) <= 0);
    for (let i = 0; i < drawbackBudget; i++) {
      const k = negativePool[trinketRngInt(0, negativePool.length - 1)];
      mods[k] = (mods[k] || 0) - 1;
    }
  }
  return { mods, profile: { ...profile, hasDrawback } };
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

function trinketDominantNegative(statMods) {
  const negatives = TRINKET_STAT_KEYS.filter(key => (statMods[key] || 0) < 0);
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

function trinketPower(statMods) {
  let sum = 0;
  for (const key of TRINKET_STAT_KEYS) {
    sum += Math.abs(statMods[key] || 0);
  }
  return sum;
}

function determineTrinketMinShopLevel(power, itemLevel) {
  const score = power + itemLevel;
  let bucket;
  if (score <= 2) bucket = 1;
  else if (score <= 4) bucket = 2;
  else if (score <= 6) bucket = 3;
  else if (score <= 8) bucket = 4;
  else if (score <= 10) bucket = 5;
  else bucket = 6;
  return [1, 2, 4, 6, 9, 12][bucket - 1];
}

function buildTrinketName(baseType, rarityKey, statMods, profile) {
  const rarity = TRINKET_RARITY_CONFIG[rarityKey];
  const prefixPool = rarity ? ['Tarnished', 'Engraved', 'Gilded', 'Runed', 'Blessed', 'Ancient'] : [];
  let prefix = prefixPool.length ? trinketRngChoice(prefixPool) : '';
  const dom = trinketDominantStat(statMods);
  const suffix = TRINKET_STAT_SUFFIX[dom] || 'of Fortune';
  const drawbackDom = trinketDominantNegative(statMods);
  if (profile && profile.hasDrawback && profile.drawbackLabel && rarityKey !== 'legendary' && trinketRngInt(0, 99) < 70) {
    prefix = `${profile.drawbackLabel} ${prefix}`.trim();
  }
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

function trinketAdjustedPrice(price, statMods) {
  const positive = TRINKET_STAT_KEYS.reduce((sum, key) => sum + Math.max(0, statMods[key] || 0), 0);
  const negative = TRINKET_STAT_KEYS.reduce((sum, key) => sum + Math.abs(Math.min(0, statMods[key] || 0)), 0);
  const mult = 1 + positive * 0.05 - negative * 0.025;
  return Math.max(1, Math.round(price * Math.max(0.8, mult)));
}

function generateRandomTrinkets() {
  const out = [];
  let idx = 0;
  for (const base of TRINKET_BASE_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in TRINKET_RARITY_CONFIG) {
        const rarity = TRINKET_RARITY_CONFIG[rarityKey];
        const totalBudget = rarity.statBudget + base.baseBudget;
        const statRoll = trinketAllocStats(base.trinketClass, totalBudget, rarityKey);
        const statMods = statRoll.mods;
        const power = trinketPower(statMods);
        const price = trinketAdjustedPrice(priceFromTrinket(power, itemLevel, rarity.priceMult), statMods);
        const minShopLevel = determineTrinketMinShopLevel(power, itemLevel);
        const name = buildTrinketName(base.baseType, rarityKey, statMods, statRoll.profile);
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
          statMods,
          affixProfile: statRoll.profile,
          info: statRoll.profile.hasDrawback ? 'A charm that grants, then takes.' : undefined,
          infoColor: statRoll.profile.hasDrawback ? 'text-red' : undefined
        });
      }
    }
  }
  return out;
}

const GENERATED_TRINKETS = generateRandomTrinkets();
const TRINKETS = [...MANUAL_TRINKETS, ...GENERATED_TRINKETS];
