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
    statBudget: 2
  },
  rare: {
    key: 'rare',
    css: 'rarity-rare',
    armorMult: 1.25,
    statBudget: 4
  },
  epic: {
    key: 'epic',
    css: 'rarity-epic',
    armorMult: 1.4,
    statBudget: 6
  },
  legendary: {
    key: 'legendary',
    css: 'rarity-legendary',
    armorMult: 1.6,
    statBudget: 8
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

function armorAllocStats(armorClass, budget) {
  const mods = { str: 0, vit: 0, atk: 0, def: 0, chr: 0, mag: 0 };
  if (budget <= 0) return mods;
  const weights = ARMOR_CLASS_WEIGHT_TABLE[armorClass] || ['vit', 'def', 'str', 'atk', 'chr', 'mag'];
  for (let i = 0; i < budget; i++) {
    const k = weights[armorRngInt(0, weights.length - 1)];
    mods[k] = (mods[k] || 0) + 1;
  }
  return mods;
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

function computeArmorValue(baseVal, itemLevel, scale, rarityMult) {
  const scaled = (baseVal + itemLevel * scale) * rarityMult;
  const val = Math.max(1, Math.round(scaled));
  return { val, avg: val };
}

function determineArmorMinShopLevel(avg) {
  if (avg <= 5) return 1;
  if (avg <= 8) return 2;
  if (avg <= 11) return 3;
  if (avg <= 14) return 4;
  if (avg <= 17) return 5;
  return 6;
}

function buildArmorName(baseType, rarityKey, statMods) {
  const rarity = ARMOR_RARITY_CONFIG[rarityKey];
  const prefixPool = rarity ? ['Worn', 'Sturdy', 'Reinforced', 'Runed', 'Blessed', 'Ancient'] : [];
  const prefix = prefixPool.length ? armorRngChoice(prefixPool) : '';
  const dom = armorDominantStat(statMods);
  const suffix = ARMOR_STAT_SUFFIX[dom] || 'of Bastion';
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

function generateRandomArmors() {
  const out = [];
  let idx = 0;
  for (const base of ARMOR_BASE_TYPES) {
    for (let itemLevel = 1; itemLevel <= 10; itemLevel++) {
      for (const rarityKey in ARMOR_RARITY_CONFIG) {
        const rarity = ARMOR_RARITY_CONFIG[rarityKey];
        const armor = computeArmorValue(base.baseVal, itemLevel, base.scale, rarity.armorMult);
        const statMods = armorAllocStats(base.armorClass, rarity.statBudget);
        const avg = armor.avg;
        const price = priceFromArmor(avg, itemLevel, rarity.armorMult);
        const minShopLevel = determineArmorMinShopLevel(avg);
        const name = buildArmorName(base.baseType, rarityKey, statMods);
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
          statMods
        });
      }
    }
  }
  return out;
}

const GENERATED_ARMORS = generateRandomArmors();
const ARMORS = [...MANUAL_ARMORS, ...GENERATED_ARMORS];