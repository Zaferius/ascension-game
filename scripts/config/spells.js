// Spell definitions (tiered, cooldown-only)
// Loaded before data/core/modules and consumed by combat.js + shop.js

const SPELL_ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const SPELL_LEVEL_REQ_BY_TIER = [1, 4, 8, 12, 16];

const SPELL_BASES = [
    {
        family: 'fireball',
        name: 'Fireball',
        description: 'Launch a volatile orb of flame for direct magic damage.',
        type: 'damage',
        targetType: 'enemy',
        basePower: 12,
        scaling: 2.0,
        cooldowns: [3, 3, 2, 2, 2],
        priceBase: 120,
        statusEffect: { id: 'burn', chance: 0.16, damageBase: 3, damageScale: 0.24, duration: 2 }
    },
    {
        family: 'poison_cloud',
        name: 'Poison Cloud',
        description: 'Engulf the target in toxic fumes that apply Poison over time.',
        type: 'dot',
        targetType: 'enemy',
        basePower: 0,
        scaling: 0,
        cooldowns: [3, 3, 3, 2, 2],
        priceBase: 140,
        dot: { id: 'poison', damageBase: 4, damageScale: 0.28, duration: 3 }
    },
    {
        family: 'blood_hex',
        name: 'Blood Hex',
        description: 'Curse the target with a bleeding hex.',
        type: 'dot',
        targetType: 'enemy',
        basePower: 0,
        scaling: 0,
        cooldowns: [3, 3, 3, 2, 2],
        priceBase: 150,
        dot: { id: 'bleed', damageBase: 4, damageScale: 0.27, duration: 3 }
    },
    {
        family: 'arcane_shield',
        name: 'Arcane Shield',
        description: 'Conjure a protective barrier and restore Armor.',
        type: 'shield',
        targetType: 'self',
        basePower: 10,
        scaling: 1.5,
        cooldowns: [4, 4, 3, 3, 3],
        priceBase: 130
    },
    {
        family: 'cleanse',
        name: 'Cleanse',
        description: 'Purge one harmful DOT effect from yourself.',
        type: 'cleanse',
        targetType: 'self',
        basePower: 0,
        scaling: 0,
        cooldowns: [4, 4, 3, 3, 2],
        priceBase: 110
    },
    {
        family: 'thunder_strike',
        name: 'Thunder Strike',
        description: 'A violent burst spell with heavy impact and long reset.',
        type: 'damage',
        targetType: 'enemy',
        basePower: 18,
        scaling: 2.6,
        cooldowns: [5, 5, 4, 4, 3],
        priceBase: 220
    }
];

function buildSpellTier(base, tierIndex) {
    const tier = tierIndex + 1;
    const roman = SPELL_ROMAN[tierIndex] || String(tier);
    const powerMult = 1 + (tierIndex * 0.28);
    const scaleMult = 1 + (tierIndex * 0.16);
    const levelReq = SPELL_LEVEL_REQ_BY_TIER[tierIndex] || 1;
    const dot = base.dot
        ? {
            ...base.dot,
            damageBase: Math.max(1, Math.floor(base.dot.damageBase * powerMult)),
            damageScale: Number((base.dot.damageScale * scaleMult).toFixed(3))
        }
        : null;
    const statusEffect = base.statusEffect
        ? {
            ...base.statusEffect,
            chance: Math.min(0.55, (base.statusEffect.chance || 0) + tierIndex * 0.05),
            damageBase: Math.max(1, Math.floor((base.statusEffect.damageBase || 2) * powerMult)),
            damageScale: Number((((base.statusEffect.damageScale || 0.2) * scaleMult)).toFixed(3))
        }
        : null;
    return {
        id: `${base.family}_${tier}`,
        family: base.family,
        rank: tier,
        roman,
        name: `${base.name} ${roman}`,
        description: base.description,
        type: base.type,
        targetType: base.targetType,
        basePower: Math.max(0, Math.floor((base.basePower || 0) * powerMult)),
        scaling: Number(((base.scaling || 0) * scaleMult).toFixed(3)),
        dot,
        statusEffect,
        cooldown: (base.cooldowns && typeof base.cooldowns[tierIndex] === 'number') ? base.cooldowns[tierIndex] : 3,
        requiredLevel: levelReq,
        price: Math.max(20, Math.floor((base.priceBase || 100) * (1 + tierIndex * 0.65))),
        unlockCondition: { level: levelReq }
    };
}

const SPELL_LIBRARY = SPELL_BASES.flatMap((base) => (
    SPELL_ROMAN.map((_, tierIndex) => buildSpellTier(base, tierIndex))
));

function getSpellDisplayDamageRange(spell, effectiveMag = 1) {
    if (!spell) return { min: 0, max: 0 };
    const mag = Math.max(1, Math.floor(effectiveMag || 1));
    if (spell.type === 'dot') {
        const dot = spell.dot || {};
        const val = Math.max(1, Math.floor((dot.damageBase || 1) + mag * (dot.damageScale || 0.2)));
        return { min: val, max: val };
    }
    if (spell.type === 'shield') {
        const val = Math.max(1, Math.floor((spell.basePower || 0) + mag * (spell.scaling || 0)));
        return { min: val, max: val };
    }
    if (spell.type === 'cleanse') {
        return { min: 0, max: 0 };
    }
    const core = Math.max(1, Math.floor((spell.basePower || 0) + mag * (spell.scaling || 0)));
    return { min: Math.max(1, Math.floor(core * 0.9)), max: Math.max(1, Math.floor(core * 1.1)) };
}

