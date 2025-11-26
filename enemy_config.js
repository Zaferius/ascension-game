// Enemy generation config and helpers

// Core enemy templates. All balance/scaling rules live here.
const ENEMY_TEMPLATES = [
    {
        key: 'bandit',
        name: 'Bandit',
        avatarKey: 'bandit',
        // weights for STR / ATK / DEF / VIT at level 1; scaling uses these ratios
        statWeights: { str: 3, atk: 3, def: 2, vit: 2 },
        // weapon preference keyword for catalog search
        weaponClass: 'Sword'
    },
    {
        key: 'goblin',
        name: 'Goblin',
        avatarKey: 'goblin',
        statWeights: { str: 2, atk: 4, def: 1, vit: 2 },
        weaponClass: 'Dagger'
    },
    {
        key: 'marauder',
        name: 'Marauder',
        avatarKey: 'marauder',
        statWeights: { str: 4, atk: 3, def: 2, vit: 2 },
        weaponClass: 'Axe'
    },
    {
        key: 'orc',
        name: 'Orc',
        avatarKey: 'orc',
        statWeights: { str: 4, atk: 3, def: 1, vit: 2 },
        weaponClass: 'Axe'
    },
    {
        key: 'paladin',
        name: 'Paladin',
        avatarKey: 'paladin',
        statWeights: { str: 3, atk: 2, def: 4, vit: 3 },
        weaponClass: 'Hammer'
    },
    {
        key: 'skeleton',
        name: 'Skeleton',
        avatarKey: 'skeleton',
        statWeights: { str: 2, atk: 3, def: 3, vit: 1 },
        weaponClass: 'Spear'
    }
];

// Pick a random avatar key for a given enemy template.
// Supports future extension where a template may define avatarKeys: ['orc_1','orc_2',...].
function getEnemyAvatarKey(template) {
    if (!template) return '';
    // If template defines an explicit avatarKeys array, pick random from it
    if (Array.isArray(template.avatarKeys) && template.avatarKeys.length > 0) {
        const idx = Math.floor(Math.random() * template.avatarKeys.length);
        return template.avatarKeys[idx];
    }
    // Fallback: single avatarKey field or template key
    if (typeof template.avatarKey === 'string' && template.avatarKey.length) {
        return template.avatarKey;
    }
    return template.key || '';
}

// Total stat budget formula: start like player (9) and add 3 per level after 1.
function getEnemyStatBudget(level) {
    const lvl = Math.max(1, level || 1);
    return 9 + 3 * (lvl - 1);
}

// Generate STR/ATK/DEF/VIT integers from weights and total points.
function allocateEnemyStats(template, level) {
    const totalPts = getEnemyStatBudget(level);
    const w = template.statWeights || { str: 3, atk: 3, def: 2, vit: 2 };
    const wStr = Math.max(0, w.str || 0);
    const wAtk = Math.max(0, w.atk || 0);
    const wDef = Math.max(0, w.def || 0);
    const wVit = Math.max(0, w.vit || 0);
    const wSum = Math.max(1, wStr + wAtk + wDef + wVit);

    let baseStr = Math.max(0, Math.floor(totalPts * wStr / wSum));
    let baseAtk = Math.max(0, Math.floor(totalPts * wAtk / wSum));
    let baseDef = Math.max(0, Math.floor(totalPts * wDef / wSum));
    let baseVit = Math.max(0, Math.floor(totalPts * wVit / wSum));
    let curSum = baseStr + baseAtk + baseDef + baseVit;
    let rem = totalPts - curSum;

    const order = ['str','atk','vit'];
    const stats = { str: baseStr, atk: baseAtk, def: baseDef, vit: baseVit };
    let oi = 0;
    while (rem > 0) {
        const key = order[oi % order.length];
        stats[key] += 1;
        rem--;
        oi++;
    }
    return stats;
}

// Public helper: pick a random template and allocate its stats for given level.
function generateEnemyTemplateForLevel(level) {
    const lvl = Math.max(1, level || 1);
    const tpl = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
    const stats = allocateEnemyStats(tpl, lvl);
    return { template: tpl, level: lvl, stats };
}
