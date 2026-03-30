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
    },
    {
        key: 'rat',
        name: 'Plague Rat',
        avatarKey: 'rat',
        statWeights: { str: 1, atk: 4, def: 1, vit: 2 },
        weaponClass: 'Dagger'
    },
    {
        key: 'hound',
        name: 'Dungeon Hound',
        avatarKey: 'hound',
        statWeights: { str: 3, atk: 4, def: 1, vit: 2 },
        weaponClass: 'Axe'
    },
    {
        key: 'thief',
        name: 'Tunnel Thief',
        avatarKey: 'thief',
        statWeights: { str: 2, atk: 4, def: 2, vit: 2 },
        weaponClass: 'Dagger'
    }
];

const ENEMY_NAME_PREFIXES = {
    bandit: ['Ragpicker', 'Dusthand', 'Knifebrow', 'Grimhook', 'Blackveil', 'Rustfinger', 'Crowhand', 'Ashcloak'],
    goblin: ['Blackfang', 'Skulk', 'Crooktooth', 'Ratbite', 'Slymaw', 'Murkclaw', 'Snaggle', 'Filthgrin'],
    marauder: ['Grimmaw', 'Bloodhide', 'Stonefist', 'Ravager', 'Ironscar', 'Dreadhook', 'Skullbrand', 'Warclaw'],
    orc: ['Ironjaw', 'Bloodtusk', 'Skullsplitter', 'Grudgeborn', 'Goremaw', 'Warfang', 'Stonejaw', 'Grimtusk'],
    paladin: ['Ashveil', 'Oathscar', 'Hollowbrand', 'Cindervow', 'Graveshield', 'Duskward', 'Palecrest', 'Blackvigil'],
    skeleton: ['Bonegrin', 'Graveshard', 'Ashbone', 'Hollowjaw', 'Dreadrattle', 'Cryptfang', 'Bleakskull', 'Rattlebrand'],
    rat: ['Sewerfang', 'Carriontooth', 'Filthtail', 'Moldbite', 'Scabclaw', 'Blightwhisker', 'Ruinmaw', 'Rotsnout'],
    hound: ['Ashfang', 'Chainmaw', 'Pitfang', 'Rendhide', 'Bonejaw', 'Gorepelt', 'Rustfang', 'Rimehowl'],
    thief: ['Quickhand', 'Grinshade', 'Lockjaw', 'Dustcloak', 'Rookfinger', 'Nightpalm', 'Coinknife', 'Skulkscar']
};

const DUNGEON_ENEMY_POOL = [
    { key: 'rat', weight: 30 },
    { key: 'hound', weight: 24 },
    { key: 'goblin', weight: 18 },
    { key: 'skeleton', weight: 14 },
    { key: 'orc', weight: 8 },
    { key: 'thief', weight: 4 },
    { key: 'bandit', weight: 2 }
];

function pickTemplateByWeightedPool(pool = []) {
    if (!Array.isArray(pool) || !pool.length) return null;
    const totalWeight = pool.reduce((sum, entry) => sum + Math.max(0, entry.weight || 0), 0);
    if (totalWeight <= 0) return null;
    let roll = Math.random() * totalWeight;
    for (const entry of pool) {
        const w = Math.max(0, entry.weight || 0);
        if (roll < w) {
            const found = ENEMY_TEMPLATES.find(t => t.key === entry.key);
            return found || null;
        }
        roll -= w;
    }
    const fallback = pool[pool.length - 1];
    return ENEMY_TEMPLATES.find(t => t.key === fallback.key) || null;
}

const ENEMY_STAT_TITLES = {
    str: ['the Brutal', 'the Crusher', 'the Savage', 'the Butcher'],
    atk: ['the Swift', 'the Precise', 'the Quickhand', 'the Deadeye'],
    def: ['the Unbroken', 'the Stalwart', 'the Ironwall', 'the Guarded'],
    vit: ['the Relentless', 'the Enduring', 'the Tireless', 'the Thick-Blooded']
};

const ENEMY_HYBRID_TITLES = [
    { keys: ['str', 'def'], titles: ['the Juggernaut', 'the Iron Beast'] },
    { keys: ['atk', 'vit'], titles: ['the Relentless', 'the Pit Wolf'] },
    { keys: ['atk', 'def'], titles: ['the Duelist', 'the Arena Fang'] },
    { keys: ['str', 'atk'], titles: ['the Ravager', 'the Reaper'] }
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

function pickEnemyDominantKeys(stats) {
    const entries = Object.entries(stats || {}).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 2).map(entry => entry[0]);
}

function generateEnemyDisplayName(template, stats, usedNames = new Set()) {
    const key = template && template.key ? template.key : 'bandit';
    const prefixPool = ENEMY_NAME_PREFIXES[key] || ['Grimhand', 'Blackscar', 'Ashfang'];
    const [primary, secondary] = pickEnemyDominantKeys(stats);
    let titlePool = ENEMY_STAT_TITLES[primary] || ['the Pitborn'];
    const hybrid = ENEMY_HYBRID_TITLES.find(entry => entry.keys.includes(primary) && entry.keys.includes(secondary));
    if (hybrid && Math.random() < 0.55) titlePool = hybrid.titles;
    const maxTries = 24;
    for (let i = 0; i < maxTries; i++) {
        const candidate = `${prefixPool[Math.floor(Math.random() * prefixPool.length)]} ${titlePool[Math.floor(Math.random() * titlePool.length)]}`;
        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
    }
    const fallback = `${prefixPool[0]} ${titlePool[0]}`;
    usedNames.add(fallback);
    return fallback;
}

// Public helper: pick a random template and allocate its stats for given level.
function generateEnemyTemplateForLevel(level, usedNames) {
    const lvl = Math.max(1, level || 1);
    const tpl = ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
    const stats = allocateEnemyStats(tpl, lvl);
    const displayName = generateEnemyDisplayName(tpl, stats, usedNames instanceof Set ? usedNames : new Set());
    return { template: tpl, level: lvl, stats, displayName };
}

function generateDungeonEnemyTemplateForLevel(level, usedNames) {
    const lvl = Math.max(1, level || 1);
    const tpl = pickTemplateByWeightedPool(DUNGEON_ENEMY_POOL)
        || ENEMY_TEMPLATES[Math.floor(Math.random() * ENEMY_TEMPLATES.length)];
    const stats = allocateEnemyStats(tpl, lvl);
    const displayName = generateEnemyDisplayName(tpl, stats, usedNames instanceof Set ? usedNames : new Set());
    return { template: tpl, level: lvl, stats, displayName };
}
