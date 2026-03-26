const WEAPON_FAMILY_MAP = {
  sword: 'sword',
  shortsword: 'sword',
  longsword: 'sword',
  greatsword: 'sword',
  blade: 'sword',
  axe: 'axe',
  handaxe: 'axe',
  waraxe: 'axe',
  hammer: 'axe',
  mace: 'axe',
  maul: 'axe',
  dagger: 'dagger',
  spear: 'spear',
  pike: 'spear',
  halberd: 'spear',
  staff: 'spear',
  bow: 'crossbow',
  shortbow: 'crossbow',
  longbow: 'crossbow',
  crossbow: 'crossbow'
};

function normalizeWeaponFamily(itemOrName) {
  const raw = typeof itemOrName === 'string'
    ? itemOrName
    : (itemOrName?.weaponClass || itemOrName?.baseType || '');
  const key = String(raw).toLowerCase().replace(/[^a-z]/g, '');
  return WEAPON_FAMILY_MAP[key] || 'sword';
}

function formatWeaponFamily(itemOrName) {
  const family = normalizeWeaponFamily(itemOrName);
  if (family === 'crossbow') return 'Crossbow';
  return family.charAt(0).toUpperCase() + family.slice(1);
}

const SKILL_TREE = [
  { id: 'battle_focus', name: 'Battle Focus', branch: 'combat', tier: 1, maxRank: 3, description: '+3 Attack per rank.', effects: { atkFlat: 3 } },
  { id: 'executioner', name: 'Executioner', branch: 'combat', tier: 2, maxRank: 2, requires: ['battle_focus'], description: '+6% crit chance per rank.', effects: { critChance: 6 } },
  { id: 'killer_instinct', name: 'Killer Instinct', branch: 'combat', tier: 3, maxRank: 2, requires: ['executioner'], description: '+4 Attack per rank and +6 hit chance.', effects: { atkFlat: 4, hitChance: 6 } },
  { id: 'thick_hide', name: 'Thick Hide', branch: 'survival', tier: 1, maxRank: 3, description: '+8% armor value per rank.', effects: { armorMult: 0.08 } },
  { id: 'second_wind', name: 'Second Wind', branch: 'survival', tier: 2, maxRank: 3, requires: ['thick_hide'], description: '+1 regen per turn per rank.', effects: { regenFlat: 1 } },
  { id: 'last_stand', name: 'Last Stand', branch: 'survival', tier: 3, maxRank: 2, requires: ['second_wind'], description: '+12 max health per rank.', effects: { hpFlat: 12 } },
  { id: 'crowd_favorite', name: 'Crowd Favorite', branch: 'utility', tier: 1, maxRank: 3, description: '+5% gold and XP rewards per rank.', effects: { rewardMult: 0.05 } },
  { id: 'merchant_eye', name: 'Merchant Eye', branch: 'utility', tier: 2, maxRank: 2, requires: ['crowd_favorite'], description: '+5 Charisma for shop pricing only per rank.', effects: { shopChr: 5 } },
  { id: 'scavenger', name: 'Scavenger', branch: 'utility', tier: 3, maxRank: 2, requires: ['merchant_eye'], description: '+5% sell value per rank.', effects: { sellMult: 0.05 } },
  { id: 'hemorrhage', name: 'Hemorrhage', branch: 'affliction', tier: 1, maxRank: 3, description: 'Bleed weapons gain +10% chance and +1 DOT damage per rank.', effects: { dotChance_bleed: 0.1, dotDamage_bleed: 1 } },
  { id: 'venomcraft', name: 'Venomcraft', branch: 'affliction', tier: 1, maxRank: 3, description: 'Poison weapons gain +10% chance and +1 DOT damage per rank.', effects: { dotChance_poison: 0.1, dotDamage_poison: 1 } },
  { id: 'ember_discipline', name: 'Ember Discipline', branch: 'affliction', tier: 1, maxRank: 3, description: 'Burn weapons gain +10% chance and +1 DOT damage per rank.', effects: { dotChance_burn: 0.1, dotDamage_burn: 1 } },
  { id: 'cruel_edge', name: 'Cruel Edge', branch: 'affliction', tier: 2, maxRank: 2, requires: ['hemorrhage', 'venomcraft', 'ember_discipline'], description: '+8% damage against afflicted targets per rank.', effects: { afflictedDamageMult: 0.08 } },
  { id: 'sword_mastery', name: 'Sword Mastery', branch: 'sword', tier: 1, maxRank: 4, description: '+8% Sword damage per rank.', effects: { weaponDamageMult_sword: 0.08 } },
  { id: 'riposte', name: 'Riposte', branch: 'sword', tier: 2, maxRank: 2, requires: ['sword_mastery'], description: '+4 Attack and +4 Defence per rank while using swords.', effects: { atkWhile_sword: 4, defWhile_sword: 4 } },
  { id: 'sunder', name: 'Sunder', branch: 'sword', tier: 3, maxRank: 2, requires: ['riposte'], description: '+10% armor shred per rank while using swords.', effects: { armorShredWhile_sword: 0.1 } },
  { id: 'axe_mastery', name: 'Axe Mastery', branch: 'axe', tier: 1, maxRank: 4, description: '+10% Axe damage per rank.', effects: { weaponDamageMult_axe: 0.1 } },
  { id: 'cleaver', name: 'Cleaver', branch: 'axe', tier: 2, maxRank: 2, requires: ['axe_mastery'], description: '+8% crit chance per rank while using axes.', effects: { critWhile_axe: 8 } },
  { id: 'massacre', name: 'Massacre', branch: 'axe', tier: 3, maxRank: 2, requires: ['cleaver'], description: '+10% bleed chance per rank while using axes.', effects: { dotChance_bleed: 0.1 } },
  { id: 'dagger_mastery', name: 'Dagger Mastery', branch: 'dagger', tier: 1, maxRank: 4, description: '+7% Dagger damage per rank.', effects: { weaponDamageMult_dagger: 0.07 } },
  { id: 'shadow_hand', name: 'Shadow Hand', branch: 'dagger', tier: 2, maxRank: 2, requires: ['dagger_mastery'], description: '+6 hit chance and +4 dodge per rank while using daggers.', effects: { hitWhile_dagger: 6, dodgeWhile_dagger: 4 } },
  { id: 'venom_fang', name: 'Venom Fang', branch: 'dagger', tier: 3, maxRank: 2, requires: ['shadow_hand'], description: '+10% poison chance per rank while using daggers.', effects: { dotChance_poison: 0.1 } },
  { id: 'spear_mastery', name: 'Spear Mastery', branch: 'spear', tier: 1, maxRank: 4, description: '+8% Spear damage per rank.', effects: { weaponDamageMult_spear: 0.08 } },
  { id: 'impaler', name: 'Impaler', branch: 'spear', tier: 2, maxRank: 2, requires: ['spear_mastery'], description: '+10% armor shred per rank while using spears.', effects: { armorShredWhile_spear: 0.1 } },
  { id: 'reach', name: 'Reach', branch: 'spear', tier: 3, maxRank: 2, requires: ['impaler'], description: '+8 hit chance per rank while using spears.', effects: { hitWhile_spear: 8 } },
  { id: 'crossbow_mastery', name: 'Crossbow Mastery', branch: 'crossbow', tier: 1, maxRank: 4, description: '+8% Crossbow damage per rank.', effects: { weaponDamageMult_crossbow: 0.08 } },
  { id: 'deadeye', name: 'Deadeye', branch: 'crossbow', tier: 2, maxRank: 2, requires: ['crossbow_mastery'], description: '+10 hit chance per rank while using crossbows.', effects: { hitWhile_crossbow: 10 } },
  { id: 'puncture', name: 'Puncture', branch: 'crossbow', tier: 3, maxRank: 2, requires: ['deadeye'], description: '+10% armor shred per rank while using crossbows.', effects: { armorShredWhile_crossbow: 0.1 } }
];

const SKILL_BRANCHES = [
  { key: 'combat', name: 'Combat Core', icon: '⚔', description: 'Universal arena instincts and finishing power.' },
  { key: 'survival', name: 'Survival', icon: '🛡', description: 'Health, armor, grit, and staying power.' },
  { key: 'utility', name: 'Utility', icon: '✦', description: 'Rewards, economy, and long-run efficiency.' },
  { key: 'affliction', name: 'Affliction', icon: '☣', description: 'Bleed, poison, burn, and punishment scaling.' },
  { key: 'sword', name: 'Sword', icon: '🗡', description: 'Precision, control, and disciplined cuts.' },
  { key: 'axe', name: 'Axe', icon: '🪓', description: 'Heavy momentum, crits, and savage impact.' },
  { key: 'dagger', name: 'Dagger', icon: '✦', description: 'Speed, poison, and evasive striking.' },
  { key: 'spear', name: 'Spear', icon: '⚐', description: 'Reach, puncture, and disciplined spacing.' },
  { key: 'crossbow', name: 'Crossbow', icon: '➶', description: 'Ranged precision and armor-breaking shots.' }
];
