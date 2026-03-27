const MANUAL_ARMORS = [
  // --- COMMON ARMOR ---
  {
    key: 'leather_helm',
    name: 'Leather Helm',
    type: 'armor',
    category: 'armor',
    rarityKey: 'common',
    rarity: 'rarity-common',
    slot: 'head',
    baseType: 'Helm',
    val: 3,
    stat: 'Armor',
    price: 25,
    minShopLevel: 1,
    statMods: {}
  }
];

const ARMOR_RARITY_CONFIG = {
  common: {
    key: 'common',
    css: 'rarity-common',
    armorMult: 1.0,
    statBudget: 0
  },
  uncommon: {
    key: 'uncommon',
    css: 'rarity-uncommon',
    armorMult: 1.1,
    statBudget: 2,
    drawbackChance: 0.05,
    drawbackBudget: 1
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    armorMult: 1.25,
    statBudget: 4,
    drawbackChance: 0.12,
    drawbackBudget: 1
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    armorMult: 1.4,
    statBudget: 6,
    drawbackChance: 0.2,
    drawbackBudget: 2
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    armorMult: 1.6,
    statBudget: 8,
    drawbackChance: 0.07,
    drawbackBudget: 2
  }
};

const ARMOR_STAT_KEYS = ['str', 'vit', 'atk', 'def', 'chr', 'mag'];

const ARMOR_CLASS_WEIGHT_TABLE = {
  Heavy: ['vit', 'vit', 'def', 'def', 'str', 'str'],
  Medium: ['def', 'def', 'vit', 'atk', 'str', 'chr'],
  Light: ['chr', 'chr', 'atk', 'atk', 'vit', 'mag'],
  Mystic: ['mag', 'mag', 'mag', 'vit', 'def', 'chr'],
  Shield: ['def', 'def', 'def', 'vit', 'str']
};

const ARMOR_STAT_SUFFIX = {
  str: 'of Titanbound Might',
  vit: 'of Iron Resolve',
  atk: 'of Bladed Fury',
  def: 'of the Stonewall',
  chr: 'of Regal Supremacy',
  mag: 'of Eldritch Wards'
};

const ARMOR_LEGENDARY_UNIQUE_NAMES = [
  'Bulwark of the Fallen Sun',
  'Aegis of Eternal Night',
  'Lionheart Plate',
  'Warden of the Last Dawn',
  'Grimhold Carapace',
  'Shroud of the Unforgiven',
  'Cinderplate of Kings',
  'Phantombound Harness',
  'Starbreaker Battlegear',
  'Helm of the Red Monarch'
];

const ARMOR_ARCHETYPES = {
  Heavy: [
    { key: 'juggernaut', positive: ['def', 'def', 'vit'], negative: ['atk', 'chr'], drawbackLabel: 'Burdened' },
    { key: 'fortress', positive: ['def', 'str', 'vit'], negative: ['mag'], drawbackLabel: 'Unwieldy' }
  ],
  Medium: [
    { key: 'duelist', positive: ['def', 'atk', 'vit'], negative: ['chr'], drawbackLabel: 'Tense' },
    { key: 'raider', positive: ['str', 'atk', 'def'], negative: ['mag'], drawbackLabel: 'Restless' }
  ],
  Light: [
    { key: 'skirmisher', positive: ['atk', 'chr', 'vit'], negative: ['def'], drawbackLabel: 'Thin' },
    { key: 'shadow', positive: ['atk', 'chr', 'mag'], negative: ['vit'], drawbackLabel: 'Fragile' }
  ],
  Mystic: [
    { key: 'warded', positive: ['mag', 'mag', 'def'], negative: ['str'], drawbackLabel: 'Hollow' },
    { key: 'ritual', positive: ['mag', 'chr', 'vit'], negative: ['def'], drawbackLabel: 'Cursed' }
  ],
  Shield: [
    { key: 'bastion', positive: ['def', 'def', 'vit'], negative: ['atk', 'mag'], drawbackLabel: 'Heavy' },
    { key: 'wall', positive: ['def', 'str', 'def'], negative: ['chr'], drawbackLabel: 'Rigid' }
  ]
};


const ARMOR_BASE_TYPES = [
  { key: 'cloth_hood', slot: 'head', baseType: 'Hood', armorClass: 'Light', baseVal: 2, scale: 0.9 },
  { key: 'leather_cap', slot: 'head', baseType: 'Cap', armorClass: 'Medium', baseVal: 3, scale: 1.0 },
  { key: 'iron_helm', slot: 'head', baseType: 'Helm', armorClass: 'Heavy', baseVal: 4, scale: 1.2 },

  { key: 'padded_vest', slot: 'chest', baseType: 'Vest', armorClass: 'Light', baseVal: 3, scale: 1.2 },
  { key: 'leather_armor', slot: 'chest', baseType: 'Leather Armor', armorClass: 'Medium', baseVal: 4, scale: 1.4 },
  { key: 'plate_cuirass', slot: 'chest', baseType: 'Cuirass', armorClass: 'Heavy', baseVal: 6, scale: 1.6 },

  { key: 'cloth_wrappings', slot: 'arms', baseType: 'Wrappings', armorClass: 'Light', baseVal: 2, scale: 0.9 },
  { key: 'leather_bracers', slot: 'arms', baseType: 'Bracers', armorClass: 'Medium', baseVal: 3, scale: 1.1 },
  { key: 'iron_gauntlets', slot: 'arms', baseType: 'Gauntlets', armorClass: 'Heavy', baseVal: 4, scale: 1.3 },

  { key: 'simple_greaves', slot: 'shins', baseType: 'Greaves', armorClass: 'Medium', baseVal: 3, scale: 1.1 },
  { key: 'reinforced_greaves', slot: 'shins', baseType: 'Greaves', armorClass: 'Heavy', baseVal: 5, scale: 1.4 },

  { key: 'cloth_mantle', slot: 'shoulders', baseType: 'Mantle', armorClass: 'Light', baseVal: 2, scale: 1.0 },
  { key: 'metal_pauldron', slot: 'shoulders', baseType: 'Pauldrons', armorClass: 'Medium', baseVal: 3, scale: 1.2 },

  { key: 'buckler', slot: 'shield', baseType: 'Buckler', armorClass: 'Shield', baseVal: 4, scale: 1.3 },
  { key: 'tower_shield', slot: 'shield', baseType: 'Shield', armorClass: 'Shield', baseVal: 6, scale: 1.6 }
];

function armorRngInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function armorRngChoice(arr) {
  return arr[armorRngInt(0, arr.length - 1)];
}

function ensureArmorMods() {
  return { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
}

function armorAllocStats(armorClass, budget, rarityKey) {
  const mods = ensureArmorMods();
  const rarity = ARMOR_RARITY_CONFIG[rarityKey] || ARMOR_RARITY_CONFIG.common;
  const weights = ARMOR_CLASS_WEIGHT_TABLE[armorClass] || ['vit', 'def', 'str', 'atk', 'chr', 'mag'];
  const archetypes = ARMOR_ARCHETYPES[armorClass] || [];
  const profile = archetypes.length ? { ...armorRngChoice(archetypes) } : { key: 'balanced', positive: [], negative: [], drawbackLabel: '' };
  for (let i = 0; i < budget; i++) {
    const source = profile.positive && profile.positive.length && armorRngInt(0, 99) < 65 ? profile.positive : weights;
    const k = source[armorRngInt(0, source.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  let hasDrawback = false;
  const drawbackBudget = rarity.drawbackBudget || 0;
  if (drawbackBudget > 0 && armorRngInt(0, 999) < Math.floor((rarity.drawbackChance || 0) * 1000)) {
    hasDrawback = true;
    const negativePool = (profile.negative && profile.negative.length) ? profile.negative : ARMOR_STAT_KEYS.filter(k => (mods[k] || 0) <= 0);
    for (let i = 0; i < drawbackBudget; i++) {
      const k = negativePool[armorRngInt(0, negativePool.length - 1)];
      mods[k] = (mods[k] || 0) - 1;
    }
  }
  return { mods, profile: { ...profile, hasDrawback } };
}

function armorDominantStat(statMods) {
  let bestKey = 'def';
  let bestVal = -Infinity;
  for (const key of ARMOR_STAT_KEYS) {
    const v = statMods[key] || 0;
    if (v > bestVal) {
      bestVal = v;
      bestKey = key;
    }
  }
  return bestKey;
}

function armorDominantNegative(statMods) {
  const negatives = ARMOR_STAT_KEYS.filter(key => (statMods[key] || 0) < 0);
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

function computeArmorValue(baseVal, itemLevel, scale, rarityMult) {
  const scaled = (baseVal + itemLevel * scale) * rarityMult;
  const val = Math.max(1, Math.round(scaled));
  return { val, avg: val };
}

function determineArmorMinShopLevel(avg) {
  let bucket;
  if (avg <= 5) bucket = 1;
  else if (avg <= 8) bucket = 2;
  else if (avg <= 11) bucket = 3;
  else if (avg <= 14) bucket = 4;
  else if (avg <= 17) bucket = 5;
  else bucket = 6;
  return [1, 2, 4, 6, 9, 12][bucket - 1];
}

function buildArmorName(baseType, rarityKey, statMods, profile) {
  const rarity = ARMOR_RARITY_CONFIG[rarityKey];
  const prefixPool = rarity ? ['Worn', 'Sturdy', 'Reinforced', 'Runed', 'Blessed', 'Ancient'] : [];
  let prefix = prefixPool.length ? armorRngChoice(prefixPool) : '';
  const dom = armorDominantStat(statMods);
  const suffix = ARMOR_STAT_SUFFIX[dom] || 'of Bastion';
  const drawbackDom = armorDominantNegative(statMods);
  if (profile && profile.hasDrawback && profile.drawbackLabel && rarityKey !== 'legendary' && armorRngInt(0, 99) < 70) {
    prefix = `${profile.drawbackLabel} ${prefix}`.trim();
  }
  if (rarityKey === 'legendary') {
    return armorRngChoice(ARMOR_LEGENDARY_UNIQUE_NAMES);
  }
  if (rarityKey === 'common' || rarityKey === 'uncommon') {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  const useSuffix = armorRngInt(0, 99) < 60;
  if (!useSuffix) {
    return `${prefix} ${baseType}`.replace(/\s+/g, ' ').trim();
  }
  return `${prefix} ${baseType} ${suffix}`.replace(/\s+/g, ' ').trim();
}

function priceFromArmor(avg, itemLevel, rarityMult) {
  const base = avg * avg * 0.7 * rarityMult * (1 + itemLevel * 0.08);
  return Math.max(1, Math.round(base));
}

function armorAdjustedPrice(price, statMods) {
  const positive = ARMOR_STAT_KEYS.reduce((sum, key) => sum + Math.max(0, statMods[key] || 0), 0);
  const negative = ARMOR_STAT_KEYS.reduce((sum, key) => sum + Math.abs(Math.min(0, statMods[key] || 0)), 0);
  const mult = 1 + positive * 0.05 - negative * 0.025;
  return Math.max(1, Math.round(price * Math.max(0.8, mult)));
}

function generateRandomArmors() {
  const out = [];
  let idx = 0;
  for (const base of ARMOR_BASE_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in ARMOR_RARITY_CONFIG) {
        const rarity = ARMOR_RARITY_CONFIG[rarityKey];
        const armor = computeArmorValue(base.baseVal, itemLevel, base.scale, rarity.armorMult);
        const statRoll = armorAllocStats(base.armorClass, rarity.statBudget, rarityKey);
        const statMods = statRoll.mods;
        const avg = armor.avg;
        const price = armorAdjustedPrice(priceFromArmor(avg, itemLevel, rarity.armorMult), statMods);
        const minShopLevel = determineArmorMinShopLevel(avg);
        const name = buildArmorName(base.baseType, rarityKey, statMods, statRoll.profile);
        const key = `gen_${base.key}_${rarityKey}_l${itemLevel}_${idx++}`;

        out.push({
          key,
          name,
          type: 'armor',
          category: 'armor',
          rarityKey,
          rarity: rarity.css,
          slot: base.slot,
          baseType: base.baseType,
          val: armor.val,
          stat: 'Armor',
          price,
          minShopLevel,
          statMods,
          affixProfile: statRoll.profile,
          info: statRoll.profile.hasDrawback ? 'Protection comes with a sacrifice.' : undefined,
          infoColor: statRoll.profile.hasDrawback ? 'text-red' : undefined
        });
      }
    }
  }
  return out;
}

const GENERATED_ARMORS = generateRandomArmors();
const ARMORS = [...MANUAL_ARMORS, ...GENERATED_ARMORS];
