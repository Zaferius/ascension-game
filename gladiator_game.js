const $ = (id) => document.getElementById(id);
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AVATARS = ['🗿', '🦁', '💀', '👺'];

// How many fights (win or loss) before shops fully refresh
const SHOP_REFRESH_INTERVAL = 10;
// How many fights before potion shop stock refreshes
const POTION_REFRESH_INTERVAL = 5;

// In-game portrait images for combat
const PLAYER_AVATAR_IMG = 'assets/images/ingame-avatars/player.png';
const ENEMY_AVATARS = {
    bandit:   'assets/images/ingame-avatars/bandit1.jpeg',
    goblin:   'assets/images/ingame-avatars/goblin1.jpeg',
    marauder: 'assets/images/ingame-avatars/marauder1.jpeg',
    orc:      'assets/images/ingame-avatars/orc1.jpeg',
    paladin:  'assets/images/ingame-avatars/paladin1.jpeg',
    skeleton: 'assets/images/ingame-avatars/skeleton1.jpeg'
};

const INTRO_SCRIPT = {
    textColor: '#E8E2C8',
    scenes: [
        {
            id: 'scene1',
            bg: 'assets/images/intro/intro1.jpeg',
            lines: [
                { text: 'They stripped you of your name', delay: 500,  fadeIn: 1200, hold: 2500 },
                { text: 'They took your pride, your freedom your life', delay: 400, fadeIn: 1200, hold: 2700 },
                { text: 'In the darkness, you were forgotten', delay: 400, fadeIn: 1300, hold: 2800 }
            ]
        },
        {
            id: 'scene2',
            bg: 'assets/images/intro/intro2.jpeg',
            lines: [
                { text: 'But something survived', delay: 700,  fadeIn: 1200, hold: 2400 },
                { text: 'Pain did not break you it forged you', delay: 400, fadeIn: 1200, hold: 2700 },
                { text: 'Every scar became a promise', delay: 400, fadeIn: 1300, hold: 2800 }
            ]
        },
        {
            id: 'scene3',
            bg: 'assets/images/intro/intro3.jpeg',
            lines: [
                { text: 'Now you stand again', delay: 800,  fadeIn: 1200, hold: 2300 },
                { text: 'Not to beg', delay: 300, fadeIn: 1100, hold: 2000 },
                { text: 'Not to survive', delay: 300, fadeIn: 1100, hold: 2100 },
                { text: 'But to conquer', delay: 300, fadeIn: 1300, hold: 2600 }
            ]
        }
    ],
    finalPauseMs: 1000,
    finalLines: [
        'They tried to erase you',
        'Now make them remember'
    ]
};
const SAVE_KEY = 'arenaV7_saves';
const ARMOR_SLOTS = ['head','neck','shoulders','chest','arms','shield','thighs','shins'];
const TRINKET_SLOTS = ['trinket1', 'trinket2'];
// Fixed potion definitions used by the potion shop (prices scale with player level)
const POTION_DEFS = [
    { key: 'hp_25',    type: 'potion', subType: 'hp',    percent: 25,  name: 'Health Potion (25%)',  priceFactor: 4 },
    { key: 'hp_50',    type: 'potion', subType: 'hp',    percent: 50,  name: 'Health Potion (50%)',  priceFactor: 7 },
    { key: 'hp_75',    type: 'potion', subType: 'hp',    percent: 75,  name: 'Health Potion (75%)',  priceFactor: 11 },
    { key: 'hp_100',   type: 'potion', subType: 'hp',    percent: 100, name: 'Health Potion (100%)', priceFactor: 15 },
    { key: 'arm_25',   type: 'potion', subType: 'armor', percent: 25,  name: 'Armor Potion (25%)',   priceFactor: 3 },
    { key: 'arm_50',   type: 'potion', subType: 'armor', percent: 50,  name: 'Armor Potion (50%)',   priceFactor: 6 },
    { key: 'arm_75',   type: 'potion', subType: 'armor', percent: 75,  name: 'Armor Potion (75%)',   priceFactor: 9 },
    { key: 'arm_100',  type: 'potion', subType: 'armor', percent: 100, name: 'Armor Potion (100%)',  priceFactor: 12 },
];
const BASE_STATS = {
    Warrior:  { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Beserker: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Guardian: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 }
};

const getArmorIconPath = (item) => {
    if (!item || item.type !== 'armor') return '';
    const slot = (item.slot || '').toLowerCase();
    if (slot === 'head') return 'assets/images/armor-icons/head_icon.png';
    if (slot === 'neck') return 'assets/images/armor-icons/neck_icon.png';
    if (slot === 'shoulders') return 'assets/images/armor-icons/shoulder_icon.png';
    if (slot === 'chest') return 'assets/images/armor-icons/chest_icon.png';
    if (slot === 'arms') return 'assets/images/armor-icons/arms_icon.png';
    if (slot === 'shield') return 'assets/images/armor-icons/shield_icon.png';
    if (slot === 'thighs') return 'assets/images/armor-icons/thighs_icon.png';
    if (slot === 'shins') return 'assets/images/armor-icons/shins_icon.png';
    return '';
};

const cleanLegendaryWeaponName = (item) => {
    if(!item || item.rarityKey !== 'legendary') return item ? item.name : '';
    const base = item.baseType;
    if(!base) return item.name;
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'ig');
    return item.name.replace(re, '').replace(/\s+/g, ' ').trim();
};

class ItemSystem {
    static getRarity() {
        // Tiered rarity checks per shop roll:
        // legendary = 5%, epic = 10%, rare = 15%, uncommon = 40%, common = fallback
        const common =   { name: 'Common',    color: 'rarity-common',    mult: 1.0 };
        const uncommon = { name: 'Uncommon',  color: 'rarity-uncommon',  mult: 1.3 };
        const rare =     { name: 'Rare',      color: 'rarity-rare',      mult: 1.6 };
        const epic =     { name: 'Epic',      color: 'rarity-epic',      mult: 2.2 };
        const legendary ={ name: 'Legendary', color: 'rarity-legendary', mult: 3.5 };
        // 5% legendary
        if (rng(0, 99) < 5) return legendary;
        // aksi halde 10% epic
        if (rng(0, 99) < 10) return epic;
        // aksi halde 15% rare
        if (rng(0, 99) < 15) return rare;
        // aksi halde 40% uncommon
        if (rng(0, 99) < 40) return uncommon;
        // kalan durum: common
        return common;
    }
    static createWeapon(lvl) {
        const rarity = this.getRarity();

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        const minAllowed = Math.max(1, lvl - 5);
        const maxAllowed = lvl + 10;
        let pool = (typeof WEAPONS !== 'undefined')
            ? WEAPONS.filter(w => {
                const req = w.minShopLevel || 1;
                return w.rarityKey === rarityKey && req >= minAllowed && req <= maxAllowed;
            })
            : [];
        if (pool.length === 0 && typeof WEAPONS !== 'undefined') {
            pool = WEAPONS.filter(w => {
                const req = w.minShopLevel || 1;
                return req >= minAllowed && req <= maxAllowed;
            });
        }
        if (pool.length === 0 && typeof WEAPONS !== 'undefined') pool = WEAPONS;
        if (pool.length === 0) return null;

        const template = pool[rng(0, pool.length - 1)];

        return {
            ...template,
            id: Date.now() + Math.random()
        };
    }
    static createArmor(lvl) {
        const rarity = this.getRarity();

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        const minAllowed = Math.max(1, lvl - 5);
        const maxAllowed = lvl + 10;
        let pool = (typeof ARMORS !== 'undefined')
            ? ARMORS.filter(a => {
                const req = a.minShopLevel || 1;
                return a.rarityKey === rarityKey && req >= minAllowed && req <= maxAllowed;
            })
            : [];
        if (pool.length === 0 && typeof ARMORS !== 'undefined') {
            pool = ARMORS.filter(a => {
                const req = a.minShopLevel || 1;
                return req >= minAllowed && req <= maxAllowed;
            });
        }
        if (pool.length === 0 && typeof ARMORS !== 'undefined') pool = ARMORS;
        if (pool.length === 0) return null;

        const template = pool[rng(0, pool.length - 1)];

        return {
            ...template,
            id: Date.now() + Math.random()
        };
    }
    static createTrinket(lvl) {
        const rarity = this.getRarity();

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        const minAllowed = Math.max(1, lvl - 5);
        const maxAllowed = lvl + 10;
        let pool = (typeof TRINKETS !== 'undefined')
            ? TRINKETS.filter(t => {
                const req = t.minShopLevel || 1;
                return t.rarityKey === rarityKey && req >= minAllowed && req <= maxAllowed;
            })
            : [];
        if (pool.length === 0 && typeof TRINKETS !== 'undefined') {
            pool = TRINKETS.filter(t => {
                const req = t.minShopLevel || 1;
                return req >= minAllowed && req <= maxAllowed;
            });
        }
        if (pool.length === 0 && typeof TRINKETS !== 'undefined') pool = TRINKETS;
        if (pool.length === 0) return null;

        const template = pool[rng(0, pool.length - 1)];

        return {
            ...template,
            id: Date.now() + Math.random()
        };
    }
}

class Player {
    constructor(name, cls, avatarIdx) {
        this.name = name; this.class = cls; this.avatar = AVATARS[avatarIdx];
        this.level = 1; this.xp = 0; this.xpMax = 100; this.gold = 100;
        this.stats = { ...BASE_STATS[cls] };
        this.inventory = [];
        this.gear = { weapon: null };
        ARMOR_SLOTS.forEach(s => this.gear[s] = null);
        TRINKET_SLOTS.forEach(s => this.gear[s] = null);
        this.wins = 0; this.pts = 0;
        // Combat potion slots: 3 configurable slots used per fight
        this.potionSlots = [null, null, null];
    }
    // --- Class passives + gear stat mods helpers ---
    getGearStatBonus(key) {
        let bonus = 0;
        if (!this.gear) return 0;
        Object.keys(this.gear).forEach(slot => {
            const item = this.gear[slot];
            if (!item || !item.statMods) return;
            const val = item.statMods[key];
            if (typeof val === 'number') bonus += val;
        });
        return bonus;
    }
    getEffectiveStr() {
        let s = this.stats.str + this.getGearStatBonus('str');
        if (this.class === 'Beserker') s += Math.floor(s / 3); // +1 STR per 3 STR
        return s;
    }
    getEffectiveAtk() {
        let a = this.stats.atk + this.getGearStatBonus('atk');
        if (this.class === 'Warrior') a += Math.floor(a / 3); // +1 ATK per 3 ATK
        return a;
    }
    getEffectiveVit() {
        let v = this.stats.vit + this.getGearStatBonus('vit');
        if (this.class === 'Guardian') v += Math.floor(v / 3); // +1 VIT per 3 VIT
        return v;
    }
    getEffectiveDef() {
        return this.stats.def + this.getGearStatBonus('def');
    }
    getEffectiveMag() {
        return this.stats.mag + this.getGearStatBonus('mag');
    }
    getEffectiveChr() {
        return (this.stats.chr ?? 0) + this.getGearStatBonus('chr');
    }
    getHpMultiplier() {
        return (this.class === 'Guardian') ? 1.2 : 1.0; // +20% max HP
    }
    getArmorMultiplier() {
        return (this.class === 'Guardian') ? 1.05 : 1.0; // +5% total armor
    }
    getDodgeBonus() {
        return (this.class === 'Warrior') ? 8 : 0; // +8% dodge
    }
    getCritBonus() {
        return (this.class === 'Beserker') ? 10 : 0; // +10% crit chance
    }

    getMaxHp() {
        const vit = this.getEffectiveVit();
        const lvl = this.level || 1;
        const extraVit = Math.max(0, vit - 1);
        const extraLvl = Math.max(0, lvl - 1);
        const base = 12 + (extraVit * 4) + (extraLvl * 6);
        const hp = Math.floor(base * this.getHpMultiplier());
        // Daha agresif progression için toplam HP'yi 3x ölçekle
        return Math.max(12, hp * 3);
    }
    getRegen() { return Math.floor(this.getEffectiveVit() / 2); }
    getTotalArmor() {
        let total = 0;
        ARMOR_SLOTS.forEach(s => { if(this.gear[s]) total += this.gear[s].val; });
        total = Math.floor(total * this.getArmorMultiplier());
        return total;
    }
    getDmgRange() {
        const w = this.gear.weapon;
        const strBonus = this.getEffectiveStr() * 2;
        if(w) return { min: w.min + strBonus, max: w.max + strBonus };
        return { min: 2 + strBonus, max: 4 + strBonus };
    }
    equip(item) {
        let slot;
        if (item.type === 'weapon') {
            slot = 'weapon';
        } else if (item.type === 'armor') {
            slot = item.slot;
        } else if (item.type === 'trinket') {
            // Önce boş bir trinket slotu ara, yoksa trinket1'i değiştir
            const empty = TRINKET_SLOTS.find(s => !this.gear[s]);
            slot = empty || 'trinket1';
        } else {
            return;
        }
        if(this.gear[slot]) this.inventory.push(this.gear[slot]);
        this.gear[slot] = item;
        this.inventory = this.inventory.filter(i => i.id !== item.id);
    }
    unequip(slot) {
        if(this.gear[slot]) {
            this.inventory.push(this.gear[slot]);
            this.gear[slot] = null;
        }
    }
}

const game = {
    player: null, selectedAvatar: 0, shopStock: { weapon: [], armor: [], trinket: [] }, shopSortOrder: 'desc', shopSortKey: 'price', currentShopType: 'weapon', codexFilter: 'weapon',
    // Potion shop state
    potionStock: {},
    saveSlots: [], lastSlot: -1, currentSlotIndex: -1,
    // total fights played (win or loss)
    shopFightCount: 0,
    // fight counter value when shop was last regenerated
    lastShopFightReset: 0,
    // fight counter value when potion shop was last regenerated
    lastPotionFightReset: 0,

    selectAvatar(idx) { this.selectedAvatar = idx; document.querySelectorAll('.avatar-option').forEach((el, i) => el.classList.toggle('selected', i === idx)); },
    // --- SAVE SYSTEM HELPERS (MULTI-SLOT, MAX 5) ---
    loadSaveMeta() {
        const raw = localStorage.getItem(SAVE_KEY);
        let meta;
        if (raw) {
            try { meta = JSON.parse(raw); } catch { meta = null; }
        }
        if (!meta || !Array.isArray(meta.slots)) {
            meta = { slots: [], lastSlot: -1 };
        }
        // migrate old single save if present
        const legacy = localStorage.getItem('arenaV7');
        if (legacy && meta.slots.length === 0) {
            try {
                const plain = JSON.parse(legacy);
                meta.slots.push(plain);
                meta.lastSlot = 0;
                localStorage.removeItem('arenaV7');
                localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
            } catch {}
        }
        return meta;
    },
    writeSaveMeta(meta) {
        if (!meta || !Array.isArray(meta.slots)) return;
        localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
    },
    initSaves() {
        const meta = this.loadSaveMeta();
        this.saveSlots = meta.slots;
        this.lastSlot = (typeof meta.lastSlot === 'number') ? meta.lastSlot : -1;
        const hasAny = this.saveSlots.length > 0;
        const btn = $('btn-continue');
        if (btn) btn.style.display = hasAny ? 'inline-block' : 'none';
    },
    ensureSlotForNewPlayer() {
        const meta = this.loadSaveMeta();
        if (meta.slots.length >= 5) {
            alert('You already have 5 gladiators. Please delete one from the Load menu before creating a new one.');
            return false;
        }
        this.currentSlotIndex = meta.slots.length;
        this.saveSlots = meta.slots;
        this.lastSlot = this.currentSlotIndex;
        this.writeSaveMeta({ slots: this.saveSlots, lastSlot: this.lastSlot });
        return true;
    },
    async newGameView() {
        if (!this.ensureSlotForNewPlayer()) return;
        const introScreen = $('screen-intro');
        const startScreen = $('screen-start');
        const skipBtn = $('intro-skip-button');
        this._introCancelled = false;
        if (skipBtn) {
            skipBtn.onclick = () => {
                this._introCancelled = true;
                this.finishNewGameIntro();
            };
        }
        if (startScreen) startScreen.classList.add('hidden');
        if (introScreen) introScreen.classList.remove('hidden');
        await this.playIntroSequence(true);
        if (!this._introCancelled) {
            this.finishNewGameIntro();
        }
    },
    createCharacter() {
        const name = $('inp-name').value || "Gladiator";
        const cls = $('inp-class').value;
        this.player = new Player(name, cls, this.selectedAvatar);
        const rustTemplate = (typeof getWeaponTemplateByKey === 'function')
            ? (getWeaponTemplateByKey('rusty_blade') || getWeaponTemplateByKey('rusty_sword'))
            : (typeof WEAPONS !== 'undefined'
                ? (
                    WEAPONS.find(w => w.key === 'rusty_blade')
                    || WEAPONS.find(w => w.key === 'rusty_sword')
                    || WEAPONS.find(w => w.type === 'weapon' && w.rarityKey === 'common' && w.weaponClass === 'Sword' && w.minShopLevel === 1)
                  )
                : null);
        if (rustTemplate) {
            this.player.equip({ ...rustTemplate, id: Date.now() + Math.random() });
        }
        // Başlangıçta 9 stat puanı dağıtma panelini (creation ekranının sağ tarafı) hazırla
        this.player.pts = 9;
        this.tempCreateStats = { ...this.player.stats };
        this.renderCreateUI();
    },
    generateShopStock() {
        this.shopStock.weapon = [];
        this.shopStock.armor = [];
        this.shopStock.trinket = [];
        const lvl = this.player.level || 1;

        // Global legendary cap and duplicate tracking across the whole shop
        const legendaryCap = 2;
        let legendaryCount = 0;
        const countsByKey = Object.create(null);

        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };

        const canUseItem = (item) => {
            if (!item) return false;
            const key = item.key || item.id;
            if (!key) return true;
            const used = countsByKey[key] || 0;
            if (used >= 2) return false; // en fazla 2 kopya
            if (item.rarityKey === 'legendary' && legendaryCount >= legendaryCap) return false;
            return true;
        };

        const registerItem = (bucket, item) => {
            const key = item.key || item.id;
            if (key) countsByKey[key] = (countsByKey[key] || 0) + 1;
            if (item.rarityKey === 'legendary') legendaryCount++;
            // Katalog item'ından shop instance'ı üret
            const inst = { ...item, id: Date.now() + Math.random() };
            bucket.push(inst);
        };

        const pickRandomFromPool = (pool, bucket) => {
            if (!pool || !pool.length) return false;
            const maxTries = pool.length * 3;
            for (let i = 0; i < maxTries; i++) {
                const idx = Math.floor(Math.random() * pool.length);
                const cand = pool[idx];
                if (!canUseItem(cand)) continue;
                registerItem(bucket, cand);
                return true;
            }
            return false;
        };

        const fillFromPools = (bucket, targetCount, pools) => {
            let remaining = targetCount;
            let safety = 0;
            while (remaining > 0 && safety < 1000) {
                safety++;
                let placed = false;
                for (let i = 0; i < pools.length && !placed; i++) {
                    const pool = pools[i];
                    if (!pool || !pool.length) continue;
                    if (pickRandomFromPool(pool, bucket)) {
                        remaining--;
                        placed = true;
                    }
                }
                if (!placed) break;
            }
        };

        const generateForCatalog = (catalog) => {
            const bucket = [];
            if (!Array.isArray(catalog) || catalog.length === 0) return bucket;

            const maxAllowedLevel = lvl + 5;
            const withinCap = catalog.filter(it => getItemMinLevel(it) <= maxAllowedLevel);
            const sourceAll = withinCap.length ? withinCap : catalog;

            const pickRandomBase = (pool) => {
                if (!pool || !pool.length) return null;
                const maxTries = pool.length * 3;
                for (let i = 0; i < maxTries; i++) {
                    const cand = pool[Math.floor(Math.random() * pool.length)];
                    if (!canUseItem(cand)) continue;
                    return cand;
                }
                return null;
            };

            const pushInstanceWithLevel = (base, reqLvl) => {
                if (!base) return false;
                // Katalog item'ını kopyala ve bu shop instance'ına requiredLevel yaz
                const inst = { ...base, id: Date.now() + Math.random() };
                if (typeof inst.minLevel === 'number') inst.minLevel = reqLvl;
                else inst.minShopLevel = reqLvl;
                registerItem(bucket, inst);
                return true;
            };

            // 1) 6 adet tam player level'inde item
            let created = 0;
            let safety = 0;
            while (created < 6 && safety < 200) {
                safety++;
                const base = pickRandomBase(sourceAll);
                if (!base) break;
                if (pushInstanceWithLevel(base, lvl)) created++;
            }

            // 2) 4 adet düşük level item (< lvl), her biri için ayrı random level
            if (lvl > 1) {
                for (let i = 0; i < 4; i++) {
                    let innerSafety = 0;
                    while (innerSafety < 100) {
                        innerSafety++;
                        const lowLvl = rng(1, Math.max(1, lvl - 1));
                        const pool = sourceAll.filter(it => getItemMinLevel(it) <= maxAllowedLevel);
                        const base = pickRandomBase(pool);
                        if (!base) break;
                        if (pushInstanceWithLevel(base, lowLvl)) break;
                    }
                }
            }

            // 3) 10 adet yüksek level item (> lvl, en fazla lvl+5), her biri için ayrı random level
            for (let i = 0; i < 10; i++) {
                let innerSafety = 0;
                while (innerSafety < 100) {
                    innerSafety++;
                    const hiLvl = rng(lvl + 1, lvl + 5);
                    const pool = sourceAll;
                    const base = pickRandomBase(pool);
                    if (!base) break;
                    if (pushInstanceWithLevel(base, hiLvl)) break;
                }
            }

            return bucket;
        };

        // Kataloglardan level kurallarına uygun shop listelerini üret
        this.shopStock.weapon = generateForCatalog(typeof WEAPONS !== 'undefined' ? WEAPONS : []);
        this.shopStock.armor = generateForCatalog(typeof ARMORS !== 'undefined' ? ARMORS : []);
        this.shopStock.trinket = generateForCatalog(typeof TRINKETS !== 'undefined' ? TRINKETS : []);

        // Varsayılan olarak kategori içi sıralamayı koru
        this.sortShop(this.shopStock.weapon);
        this.sortShop(this.shopStock.armor);
        this.sortShop(this.shopStock.trinket);
        // mark current fight counter as last refresh point
        this.lastShopFightReset = this.shopFightCount;
        this.updateShopRefreshIndicator();
    },
    updateShopRefreshIndicator() {
        const el = $('shop-refresh-indicator');
        if (!el) return;
        const fightsSince = this.shopFightCount - this.lastShopFightReset;
        let remaining = SHOP_REFRESH_INTERVAL - fightsSince;
        if (remaining < 0) remaining = 0;
        const label = remaining === 1 ? 'fight' : 'fights';
        el.innerHTML = `Shop refreshes in <span class="shop-refresh-count">${remaining}</span> ${label}`;
    },
    generatePotionStock() {
        if (!this.player) return;
        const lvl = this.player.level || 1;
        this.potionStock = {};
        POTION_DEFS.forEach(def => {
            const qty = rng(1, 10);
            const price = def.priceFactor * lvl;
            this.potionStock[def.key] = {
                key: def.key,
                qty,
                price,
                tpl: { ...def }
            };
        });
        this.lastPotionFightReset = this.shopFightCount;
    },
    updatePotionRefreshIndicator() {
        const el = $('shop-refresh-indicator');
        if (!el) return;
        const fightsSince = this.shopFightCount - this.lastPotionFightReset;
        let remaining = POTION_REFRESH_INTERVAL - fightsSince;
        if (remaining < 0) remaining = 0;
        const label = remaining === 1 ? 'fight' : 'fights';
        el.innerHTML = `Potions refresh in <span class="shop-refresh-count">${remaining}</span> ${label}`;
    },
    addTestGold(amount = 100) {
        if(!this.player) return;
        this.player.gold += amount;
        this.updateHubUI();
        this.saveGame();
    },
    sortShop(arr) {
        // Helper for rarity rank
        const rarityRank = (item) => {
            const r = item.rarity || '';
            if (r.includes('legendary')) return 4;
            if (r.includes('epic')) return 3;
            if (r.includes('rare')) return 2;
            if (r.includes('uncommon')) return 1;
            return 0; // common or unknown
        };
        // Helper for main stat (used for stats sorting)
        const statVal = (item) => {
            if (item.type === 'weapon') return (item.max ?? item.min ?? 0);
            if (item.type === 'armor') return (item.val ?? 0);
            return 0;
        };
        const levelVal = (item) => {
            if (!item) return 0;
            // shop/catalog tarafında kullandığımız min level bilgisi
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const typeVal = (item) => {
            if (!item) return '';
            if (item.type === 'weapon') {
                if (item.weaponClass) return item.weaponClass.toLowerCase();
                if (item.baseType) return item.baseType.toLowerCase();
                return 'weapon';
            }
            if (item.type === 'armor') {
                if (item.slot) return item.slot.toLowerCase();
                return 'armor';
            }
            return '';
        };
        const dir = this.shopSortOrder === 'desc' ? -1 : 1;
        arr.sort((a,b) => {
            let av, bv;
            if (this.shopSortKey === 'rarity') {
                av = rarityRank(a); bv = rarityRank(b);
            } else if (this.shopSortKey === 'stat') {
                av = statVal(a); bv = statVal(b);
            } else if (this.shopSortKey === 'type') {
                av = typeVal(a); bv = typeVal(b);
            } else if (this.shopSortKey === 'level') {
                av = levelVal(a); bv = levelVal(b);
            } else { // price
                av = a.price ?? 0; bv = b.price ?? 0;
            }
            if (av === bv) return 0;
            return av < bv ? -1 * dir : 1 * dir;
        });
    },
    goToMainMenu() {
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        const introScreen = $('screen-intro');
        if (introScreen) introScreen.classList.add('hidden');
        const creationScreen = $('screen-creation');
        if (creationScreen) creationScreen.classList.add('hidden');
        const startScreen = $('screen-start');
        if (startScreen) startScreen.classList.remove('hidden');
        if (typeof stopFightMusic === 'function') stopFightMusic();
        if (typeof wireButtonSfx === 'function' && startScreen) wireButtonSfx(startScreen);
    },
    toggleSort(key = 'price') {
        // change key or flip order if same key
        if (this.shopSortKey === key) {
            this.shopSortOrder = (this.shopSortOrder === 'desc') ? 'asc' : 'desc';
        } else {
            this.shopSortKey = key;
            this.shopSortOrder = 'desc';
        }
        const mode = this.currentListMode || 'shop';
        // Potion shop: sort potionStock entries and re-render potion shop
        if (mode === 'potion') {
            this.renderPotionShop();
            if (this.player) $('shop-gold').innerText = this.player.gold;
            return;
        }
        if (mode === 'shop') {
            const type = this.currentShopType || 'weapon';
            let list;
            if (type === 'weapon') list = this.shopStock.weapon;
            else if (type === 'armor') list = this.shopStock.armor;
            else if (type === 'trinket') list = this.shopStock.trinket;
            else list = this.shopStock.weapon;
            this.sortShop(list);
            this.renderList(list, 'shop'); $('shop-gold').innerText = this.player.gold;
        } else if (mode === 'inv' && this.player) {
            const list = this.player.inventory;
            this.sortShop(list);
            this.renderList(list, 'inv'); $('shop-gold').innerText = this.player.gold;
        }
    },
    showHub() {
        // Hide all menu screens except hub, stop combat music, refresh hub UI
        // (non-modal overlays stay controlled by their own logic)
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        const hubScreen = $('screen-hub');
        if (hubScreen) hubScreen.classList.remove('hidden');
        this.updateHubUI();
        if (typeof stopFightMusic === 'function') stopFightMusic();
        wireButtonSfx($('screen-hub'));
    },
    async playIntroSequence(forNewGame = false) {
        const introScreen = $('screen-intro');
        const bg = $('intro-background');
        const img = $('intro-image');
        const txt = $('intro-text');
        if (!introScreen || !bg || !img || !txt) return;
        const bass = new Audio('assets/audio/ui/deep_bass_hit.ogg');
        const setOpacity = (o) => {
            introScreen.style.opacity = String(o);
        };
        introScreen.style.background = '#000';
        setOpacity(1);
        const showLine = async (content, opts) => {
            txt.style.opacity = '0';
            txt.style.color = '#bbbbbb';
            txt.style.textShadow = '';
            txt.innerText = content;
            if (opts && opts.delay) await wait(opts.delay);
            try { bass.currentTime = 0; bass.play(); } catch {}
            const fadeInMs = (opts && opts.fadeIn) || 1200;
            const holdMs = (opts && opts.hold) || 2200;
            const start = performance.now();
            return new Promise(resolve => {
                const stepIn = (t) => {
                    const p = Math.min(1, (t - start) / fadeInMs);
                    txt.style.opacity = String(p);
                    if (p < 1) {
                        requestAnimationFrame(stepIn);
                    } else {
                        setTimeout(resolve, holdMs);
                    }
                };
                requestAnimationFrame(stepIn);
            });
        };
        for (const scene of INTRO_SCRIPT.scenes) {
            img.src = scene.bg;
            img.style.opacity = '0';
            txt.style.textShadow = '';
            // fade in scene image
            {
                const fadeMs = 800;
                const start = performance.now();
                await new Promise(resolve => {
                    const step = (t) => {
                        const p = Math.min(1, (t - start) / fadeMs);
                        img.style.opacity = String(p);
                        if (p < 1 && !this._introCancelled) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    requestAnimationFrame(step);
                });
            }
            for (const line of scene.lines) {
                if (this._introCancelled) return;
                await showLine(line.text, line);
            }
            // fade out image + text between scenes
            {
                const fadeMs = 700;
                const start = performance.now();
                await new Promise(resolve => {
                    const step = (t) => {
                        const p = Math.min(1, (t - start) / fadeMs);
                        const o = 1 - p;
                        img.style.opacity = String(o);
                        txt.style.opacity = String(o);
                        if (p < 1 && !this._introCancelled) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    requestAnimationFrame(step);
                });
            }
        }
        // final section: pure black, centered quote
        img.src = '';
        img.style.opacity = '0';
        await wait(INTRO_SCRIPT.finalPauseMs);
        const overlay = $('intro-overlay');
        if (overlay) {
            overlay.style.top = '0';
            overlay.style.bottom = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
        }
        txt.style.textShadow = '0 0 26px #7A1A1A';
        txt.style.textAlign = 'center';
        for (let i = 0; i < INTRO_SCRIPT.finalLines.length; i++) {
            const line = INTRO_SCRIPT.finalLines[i];
            if (i === INTRO_SCRIPT.finalLines.length - 1) {
                txt.style.fontSize = '1.6rem';
                txt.style.textShadow = '0 0 26px #7A1A1A';
            } else {
                txt.style.fontSize = '1.4rem';
                txt.style.textShadow = '0 0 18px #7A1A1A';
            }
            await showLine(line, { delay: i === 0 ? 1000 : 400, fadeIn: 1800, hold: 2600 });
        }
        // slow fadeout of whole intro before creation fades in
        {
            const fadeMs = 1200;
            const start = performance.now();
            await new Promise(resolve => {
                const step = (t) => {
                    const p = Math.min(1, (t - start) / fadeMs);
                    setOpacity(1 - p);
                    if (p < 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
            introScreen.style.opacity = '';
        }
    },
    finishNewGameIntro() {
        const introScreen = $('screen-intro');
        if (introScreen) introScreen.classList.add('hidden');
        $('screen-creation').classList.remove('hidden');
        this.createCharacter();
    },
    updateHubUI() {
        const p = this.player;
        $('ui-name').innerText = p.name; $('ui-lvl').innerText = p.level; $('ui-gold').innerText = p.gold;
        const avatarImg = $('ui-avatar');
        if (avatarImg) avatarImg.src = PLAYER_AVATAR_IMG;
        // Hub XP bar under level label
        const xpNow = typeof p.xp === 'number' ? p.xp : 0;
        const xpMax = typeof p.xpMax === 'number' && p.xpMax > 0 ? p.xpMax : 100;
        const xpPct = Math.max(0, Math.min(100, Math.round((xpNow / xpMax) * 100)));
        const xpFill = $('hub-xp-fill');
        const xpText = $('hub-xp-text');
        if (xpFill) xpFill.style.width = xpPct + '%';
        if (xpText) xpText.innerText = `${xpNow} / ${xpMax} XP`;
        const dmg = p.getDmgRange(); const arm = p.getTotalArmor();

        // Hub ekranı görünürken buton SFX wiring'ini tazele
        wireButtonSfx($('screen-hub'));

        const effStr = p.getEffectiveStr();
        const effAtk = p.getEffectiveAtk();
        const effVit = p.getEffectiveVit();
        const effDef = p.getEffectiveDef();
        const effMag = p.getEffectiveMag();
        const effChr = p.getEffectiveChr();
        const strBonus = effStr - p.stats.str;
        const atkBonus = effAtk - p.stats.atk;
        const vitBonus = effVit - p.stats.vit;
        const defBonus = effDef - p.stats.def;
        const magBonus = effMag - p.stats.mag;
        const chrBase = (p.stats.chr ?? 0);
        const chrBonus = effChr - chrBase;

        $('ui-stats').innerHTML = `
            <div class="stat-row"><span>Strength</span> <span class="text-orange">${effStr}${strBonus>0?` <small>(base ${p.stats.str} +${strBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Attack</span> <span class="text-red">${effAtk}${atkBonus>0?` <small>(base ${p.stats.atk} +${atkBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Defence</span> <span class="text-blue">${effDef}${defBonus>0?` <small>(base ${p.stats.def} +${defBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Vitality</span> <span class="text-green">${effVit}${vitBonus>0?` <small>(base ${p.stats.vit} +${vitBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Magicka</span> <span class="text-purple">${effMag}${magBonus>0?` <small>(base ${p.stats.mag} +${magBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Charisma</span> <span class="text-gold">${effChr}${chrBonus>0?` <small>(base ${chrBase} +${chrBonus})</small>`:''}</span></div>
            <div style="margin-top:10px; color:#fff; font-size:0.8rem; text-align:center;">Health: ${p.getMaxHp()} | <span class="text-shield">Armor: ${arm}</span></div>
            <div style="margin-top:4px; color:#ff9100; font-size:0.8rem; text-align:center;">Melee Damage: ${dmg.min}-${dmg.max}</div>
        `;

        // Equipment Lists
        const renderSlot = (slot, title) => {
            const item = p.gear[slot];
            let display;
            if(item) {
                if(item.type === 'weapon') {
                    const dmgText = (typeof item.min === 'number' && typeof item.max === 'number') ? ` <span style="color:#888; font-size:0.8rem;">(${item.min}-${item.max})</span>` : '';
                    const isLegendary = item.rarityKey === 'legendary';
                    const baseName = isLegendary ? cleanLegendaryWeaponName(item) : item.name;
                    // Hub'daki Melee Weapon satırı için isim span'ine id ver (tooltip hedefi)
                    const spanId = (slot === 'weapon') ? 'hub-weapon-name' : '';
                    const idAttr = spanId ? ` id="${spanId}"` : '';
                    display = `<span${idAttr} class="${item.rarity}">${baseName}</span>${dmgText}`;
                } else if (item.type === 'trinket') {
                    const spanId = (slot === 'trinket1') ? 'hub-trinket1-name' : (slot === 'trinket2') ? 'hub-trinket2-name' : '';
                    const idAttr = spanId ? ` id="${spanId}"` : '';
                    display = `<span${idAttr} class="${item.rarity}">${item.name}</span>`;
                } else {
                    const valText = (typeof item.val === 'number') ? ` <span style="color:#888; font-size:0.8rem;">(+${item.val})</span>` : '';
                    display = `<span class="${item.rarity}">${item.name}</span>${valText}`;
                }
            } else {
                display = `<span style="color:#444">-</span>`;
            }
            return `<div class="stat-row"><span>${title}</span> <span>${display}</span></div>`;
        };

        let html = `<div class="eq-header">WEAPONS</div>`;
        html += renderSlot('weapon', 'Melee Weapon');
        
        // Armor section: compact summary + big icon button
        const equippedCount = ARMOR_SLOTS.filter(s => p.gear[s]).length;
        html += `<div class="eq-header">ARMOR</div>`;
        html += `
            <div class="stat-row">
                <span>Armor Pieces</span>
                <span>
                    ${equippedCount}/${ARMOR_SLOTS.length}
                    <button class="btn" style="padding:4px 10px; font-size:0.7rem; margin-left:8px;">🛡 VIEW</button>
                </span>
            </div>
        `;

        // Trinkets section (2 slot)
        html += `<div class="eq-header">TRINKETS</div>`;
        html += renderSlot('trinket1', 'Trinket 1');
        html += renderSlot('trinket2', 'Trinket 2');
        $('ui-equip').innerHTML = html;

        // Attach armor panel button + hub weapon / trinket tooltips after injecting HTML
        const btn = document.querySelector('#ui-equip .stat-row button');
        if(btn) btn.onclick = () => game.openArmorPanel();

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');

        const wireWeaponHover = () => {
            const wName = $('hub-weapon-name');
            const weapon = p.gear.weapon;
            if (!wName || !weapon || !previewBox || !previewBody) return;
            const movePreview = (ev) => {
                const rect = $('game-container').getBoundingClientRect();
                const offsetX = 28, offsetY = 25;
                let x = ev.clientX - rect.left + offsetX;
                let y = ev.clientY - rect.top + offsetY;
                const maxX = rect.width - 340;
                const maxY = rect.height - 160;
                x = Math.max(10, Math.min(maxX, x));
                y = Math.max(10, Math.min(maxY, y));
                previewBox.style.left = x + 'px';
                previewBox.style.top = y + 'px';
            };
            wName.onmouseenter = (ev) => {
                buildPreviewFromItem(weapon);
                movePreview(ev);
                previewBox.classList.remove('hidden');
                previewBox.classList.add('visible');
            };
            wName.onmousemove = (ev) => {
                if (previewBox.classList.contains('visible')) movePreview(ev);
            };
            wName.onmouseleave = () => {
                previewBox.classList.remove('visible');
            };
        }
        const setupTrinketHover = (elId, trinket) => {
            const el = $(elId);
            if (!el || !trinket || !previewBox || !previewBody) return;
            const buildPreview = () => {
                const rarityText = (trinket.rarity || '').replace('rarity-','');
                const lines = [];
                lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${trinket.rarity}">${trinket.name}</div>`);
                if (trinket.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${trinket.baseType}</div>`);

                // İnsan okunur stat satırları (+1 Strength, +2 Attack, ...)
                if (trinket.statMods) {
                    const statCfg = {
                        str: { label: 'Strength', cls: 'text-orange' },
                        atk: { label: 'Attack',   cls: 'text-red' },
                        def: { label: 'Defence',  cls: 'text-blue' },
                        vit: { label: 'Vitality', cls: 'text-green' },
                        mag: { label: 'Magicka',  cls: 'text-purple' },
                        chr: { label: 'Charisma', cls: 'text-gold' }
                    };
                    Object.entries(trinket.statMods).forEach(([k,v]) => {
                        if (!v) return; // 0 statları gösterme
                        const cfg = statCfg[k] || { label: k.toUpperCase(), cls: 'text-gold' };
                        const sign = v > 0 ? '+' : '';
                        lines.push(`<div class="${cfg.cls}">${sign}${v} ${cfg.label}</div>`);
                    });
                }
                if (typeof trinket.goldBonus === 'number') {
                    lines.push(`<div><span class="text-gold">Gold Bonus:</span> +${Math.round(trinket.goldBonus*100)}%</div>`);
                }
                if (typeof trinket.xpBonus === 'number') {
                    lines.push(`<div><span class="text-purple">XP Bonus:</span> +${Math.round(trinket.xpBonus*100)}%</div>`);
                }
                const rarityLabel = rarityText || 'common';
                const minLvl = (typeof trinket.minLevel === 'number')
                    ? trinket.minLevel
                    : (typeof trinket.minShopLevel === 'number' ? trinket.minShopLevel : 1);
                lines.push(`
                    <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                        <span>Rarity: ${rarityLabel}</span>
                        <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                    </div>
                `);
                if (trinket.info) {
                    const infoClass = trinket.infoColor || 'text-gold';
                    lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${trinket.info}</div>`);
                }
                previewBody.innerHTML = lines.join('');

                if (previewIcon) {
                    // Hub trinket tooltip: always use the shared trinket icon
                    previewIcon.src = trinket.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                    previewIcon.classList.remove('hidden');
                }
            };
            const movePreview = (ev) => {
                const rect = $('game-container').getBoundingClientRect();
                const offsetX = 28, offsetY = 25;
                let x = ev.clientX - rect.left + offsetX;
                let y = ev.clientY - rect.top + offsetY;
                const maxX = rect.width - 340;
                const maxY = rect.height - 160;
                x = Math.max(10, Math.min(maxX, x));
                y = Math.max(10, Math.min(maxY, y));
                previewBox.style.left = x + 'px';
                previewBox.style.top = y + 'px';
            };

            el.onmouseenter = (ev) => {
                buildPreview();
                movePreview(ev);
                previewBox.classList.remove('hidden');
                previewBox.classList.add('visible');
            };
            el.onmousemove = (ev) => {
                if (previewBox.classList.contains('visible')) movePreview(ev);
            };
            el.onmouseleave = () => {
                previewBox.classList.remove('visible');
            };
        };

        wireWeaponHover();
        setupTrinketHover('hub-trinket1-name', p.gear.trinket1);
        setupTrinketHover('hub-trinket2-name', p.gear.trinket2);
        // Hub'a döndüğümüzde de shop sayaç bilgisini tazele
        this.updateShopRefreshIndicator();
    },
    doUnequip(slot) { this.player.unequip(slot); this.updateHubUI(); this.saveGame(); },
    openShop(type) {
        // Refresh all shop stock only if at least SHOP_REFRESH_INTERVAL fights have passed since last reset
        if ((this.shopFightCount - this.lastShopFightReset) >= SHOP_REFRESH_INTERVAL) {
            this.generateShopStock();
        }
        // remember which category is currently open so sorting works on the right list
        this.currentShopType = type;
        let list;
        if (type === 'weapon') list = this.shopStock.weapon;
        else if (type === 'armor') list = this.shopStock.armor;
        else if (type === 'trinket') list = this.shopStock.trinket;
        else list = this.shopStock.weapon;
        // if for any reason the list is empty (e.g. loaded save), regenerate shop stock once
        if(!list || list.length === 0) {
            this.generateShopStock();
            if (type === 'weapon') list = this.shopStock.weapon;
            else if (type === 'armor') list = this.shopStock.armor;
            else if (type === 'trinket') list = this.shopStock.trinket;
        }
        this.sortShop(list);
        $('screen-hub').classList.add('hidden'); $('screen-list').classList.remove('hidden');
        this.renderList(list, 'shop'); $('shop-gold').innerText = this.player.gold;
        // Normal shop açıldığında standart shop refresh bilgisini göster
        this.updateShopRefreshIndicator();
        wireButtonSfx($('screen-list'));
    },
    openPotionShop() {
        if (!this.player) return;
        // Track that we're in potion shop mode so sorting works on the correct list
        this.currentListMode = 'potion';
        // Refresh potion stock if needed or if empty
        if ((this.shopFightCount - this.lastPotionFightReset) >= POTION_REFRESH_INTERVAL || !this.potionStock || Object.keys(this.potionStock).length === 0) {
            this.generatePotionStock();
        }
        $('screen-hub').classList.add('hidden'); $('screen-list').classList.remove('hidden');
        this.renderPotionShop();
        $('shop-gold').innerText = this.player.gold;
        this.updatePotionRefreshIndicator();
        wireButtonSfx($('screen-list'));
    },
    openInventory() {
        $('screen-hub').classList.add('hidden'); $('screen-list').classList.remove('hidden');
        this.currentInvFilter = this.currentInvFilter || 'all';
        this.renderList(this.player.inventory, 'inv'); $('shop-gold').innerText = this.player.gold;
        wireButtonSfx($('screen-list'));
    },
    openCodex(type = 'weapon') {
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const codexScreen = $('screen-codex');
        if (codexScreen) codexScreen.classList.remove('hidden');
        this.codexFilter = type;
        const root = $('codex-filters');
        if (root) {
            root.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-primary');
                if (btn.dataset.filter === type) btn.classList.add('btn-primary');
            });
        }
        this.renderCodex();
        if (typeof wireButtonSfx === 'function' && codexScreen) wireButtonSfx(codexScreen);
    },
    setCodexFilter(type) {
        this.codexFilter = type;
        const root = $('codex-filters');
        if (root) {
            root.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-primary');
                if (btn.dataset.filter === type) btn.classList.add('btn-primary');
            });
        }
        this.renderCodex();
    },
    renderCodex() {
        const cont = $('codex-container');
        if (!cont) return;
        cont.innerHTML = '';
        let pool = [];
        if (this.codexFilter === 'weapon') {
            pool = (typeof WEAPONS !== 'undefined') ? WEAPONS : [];
        } else if (this.codexFilter === 'armor') {
            pool = (typeof ARMORS !== 'undefined') ? ARMORS : [];
        } else if (this.codexFilter === 'trinket') {
            pool = (typeof TRINKETS !== 'undefined') ? TRINKETS : [];
        }
        if (!pool || pool.length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No items found.</div>';
            return;
        }
        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const getItemTypeLabel = (item) => {
            if (!item) return '';
            if (item.type === 'weapon') {
                if (item.baseType) return item.baseType;
                if (item.weaponClass) return item.weaponClass;
                return 'Weapon';
            }
            if (item.type === 'armor') {
                if (item.slot) return item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
                return 'Armor';
            }
            if (item.type === 'trinket') {
                return 'Trinket';
            }
            return '';
        };
        const getWeaponIconPath = (item) => {
            if (!item || item.type !== 'weapon') return '';
            const cls = (item.weaponClass || '').toLowerCase();
            const baseLower = (item.baseType || '').toLowerCase();
            // Map weaponClass / baseType to specific icon filenames
            if (cls === 'axe' || baseLower.includes('axe')) return 'assets/weapon-icons/axe_icon.png';
            if (cls === 'sword' || baseLower.includes('blade') || baseLower.includes('sword')) return 'assets/weapon-icons/sword_icon.png';
            if (cls === 'hammer' || baseLower.includes('hammer') || baseLower.includes('mace')) return 'assets/weapon-icons/hammer_icon.png';
            if (cls === 'dagger' || baseLower.includes('dagger')) return 'assets/weapon-icons/dagger_icon.png';
            if (cls === 'spear' || baseLower.includes('spear') || baseLower.includes('halberd')) return 'assets/weapon-icons/spear_icon.png';
            if (cls === 'bow' || baseLower.includes('bow') || baseLower.includes('crossbow')) return 'assets/weapon-icons/crossbow_icon.png';
            return '';
        };
        const getArmorIconPath = (item) => {
            if (!item || item.type !== 'armor') return '';
            const slot = (item.slot || '').toLowerCase();
            if (slot === 'head') return 'assets/images/armor-icons/head_icon.png';
            if (slot === 'neck') return 'assets/images/armor-icons/neck_icon.png';
            if (slot === 'shoulders') return 'assets/images/armor-icons/shoulder_icon.png';
            if (slot === 'chest') return 'assets/images/armor-icons/chest_icon.png';
            if (slot === 'arms') return 'assets/images/armor-icons/arms_icon.png';
            if (slot === 'shield') return 'assets/images/armor-icons/shield_icon.png';
            if (slot === 'thighs') return 'assets/images/armor-icons/thighs_icon.png';
            if (slot === 'shins') return 'assets/images/armor-icons/shins_icon.png';
            return '';
        };
        const buildPreviewFromItem = (item) => {
            if (!item || !previewBody) return;
            const rarityText = (item.rarity || '').replace('rarity-', '');
            const minLvl = getItemMinLevel(item);
            let lines = [];
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            if (item.type === 'weapon') {
                if (typeof item.min === 'number' && typeof item.max === 'number') {
                    lines.push(`<div><span class="text-orange">Damage:</span> ${item.min}-${item.max}</div>`);
                }
                if (item.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${item.baseType}</div>`);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                lines.push(`<div><span class="text-shield">Armor:</span> ${val}</div>`);
                if (item.slot) lines.push(`<div><span class="text-blue">Slot:</span> ${item.slot}</div>`);
            } else if (item.type === 'trinket') {
                if (item.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${item.baseType}</div>`);
            }
            if (item.statMods) {
                const map = [
                    { key: 'str', label: 'Strength', cls: 'text-orange' },
                    { key: 'atk', label: 'Attack',   cls: 'text-red' },
                    { key: 'def', label: 'Defence',  cls: 'text-blue' },
                    { key: 'vit', label: 'Vitality', cls: 'text-green' },
                    { key: 'mag', label: 'Magicka',  cls: 'text-purple' },
                    { key: 'chr', label: 'Charisma', cls: 'text-gold' }
                ];
                const modLines = [];
                map.forEach(({key,label,cls}) => {
                    const v = item.statMods[key];
                    if (typeof v === 'number' && v !== 0) {
                        const sign = v > 0 ? '+' : '';
                        modLines.push(`<div class="${cls}">${sign}${v} ${label}</div>`);
                    }
                });
                if (modLines.length) {
                    lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                    lines = lines.concat(modLines);
                    lines.push('</div>');
                }
            }
            lines.push(`
                <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                    <span>Rarity: ${rarityText}</span>
                    <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                </div>
            `);
            if (item.info) {
                const infoClass = item.infoColor || 'text-gold';
                lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${item.info}</div>`);
            }
            previewBody.innerHTML = lines.join('');

            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') {
                    iconPath = getWeaponIconPath(item);
                } else if (item.type === 'armor') {
                    iconPath = getArmorIconPath(item);
                } else if (item.type === 'trinket') {
                    // Trinket katalogunda gelen ikon yolunu kullan, yoksa varsayılan bir trinket ikonu göster
                    iconPath = item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                }
                if (iconPath) {
                    previewIcon.src = iconPath;
                    previewIcon.classList.remove('hidden');
                } else {
                    previewIcon.src = '';
                    previewIcon.classList.add('hidden');
                }
            }
        };
        const movePreview = (ev) => {
            if (!previewBox) return;
            const rect = $('game-container').getBoundingClientRect();
            const offsetX = 28, offsetY = 25;
            let x = ev.clientX - rect.left + offsetX;
            let y = ev.clientY - rect.top + offsetY;
            const maxX = rect.width - 340;
            const maxY = rect.height - 160;
            x = Math.max(10, Math.min(maxX, x));
            y = Math.max(10, Math.min(maxY, y));
            previewBox.style.left = x + 'px';
            previewBox.style.top = y + 'px';
        };

        // Expose universal tooltip helpers so other parts (potion shop, slots) reuse exactly the same behavior
        this._buildItemPreview = buildPreviewFromItem;
        this._moveItemPreview = movePreview;
        pool.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            const minLvl = getItemMinLevel(item);
            const typeLabel = getItemTypeLabel(item);
            const rarityText = (item.rarity || '').replace('rarity-', '');
            const lvlHtml = `<span style="color:#ccc;">${minLvl}</span>`;
            const priceTxt = typeof item.price === 'number' ? item.price : '-';
            row.innerHTML = `
                <div class="${item.rarity}">${item.name}</div>
                <div style="font-size:0.8rem;">${rarityText}</div>
                <div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div>
                <div style="font-size:0.8rem; color:#ccc;">${lvlHtml}</div>
                <div class="text-gold">${priceTxt}</div>
                <div style="font-size:0.8rem; color:#666;">-</div>
            `;
            if (previewBox && previewBody) {
                row.onmouseenter = (ev) => {
                    buildPreviewFromItem(item);
                    movePreview(ev);
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                row.onmousemove = (ev) => {
                    if (previewBox.classList.contains('visible')) movePreview(ev);
                };
                row.onmouseleave = () => {
                    previewBox.classList.remove('visible');
                };
            }
            cont.appendChild(row);
        });
    },
    renderPotionShop() {
        const cont = $('list-container');
        const titleEl = $('list-title');
        const headerExtra = $('list-header-extra');
        if (!cont || !titleEl) return;
        titleEl.innerText = 'POTION SHOP';
        if (headerExtra) headerExtra.innerHTML = '';
        cont.innerHTML = '';

        // Potion shop açıkken inventory'ye özel potion slot kartını gizle
        const slotCard = $('inv-potion-slots-card');
        if (slotCard) {
            slotCard.classList.add('hidden');
            slotCard.innerHTML = '';
        }

        if (!this.potionStock || Object.keys(this.potionStock).length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No potions available.</div>';
            return;
        }

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const movePreview = (ev) => {
            if (!previewBox) return;
            const rect = $('game-container').getBoundingClientRect();
            const offsetX = 28, offsetY = 25;
            let x = ev.clientX - rect.left + offsetX;
            let y = ev.clientY - rect.top + offsetY;
            const maxX = rect.width - 340;
            const maxY = rect.height - 160;
            x = Math.max(10, Math.min(maxX, x));
            y = Math.max(10, Math.min(maxY, y));
            previewBox.style.left = x + 'px';
            previewBox.style.top = y + 'px';
        };

        // Sort potion entries according to current shopSortKey/shopSortOrder
        const dir = this.shopSortOrder === 'desc' ? -1 : 1;
        const entries = Object.values(this.potionStock).sort((a, b) => {
            const pa = a.price ?? 0;
            const pb = b.price ?? 0;
            const ta = (a.tpl && a.tpl.subType) || '';
            const tb = (b.tpl && b.tpl.subType) || '';
            const la = (a.tpl && a.tpl.percent) || 0;
            const lb = (b.tpl && b.tpl.percent) || 0;
            let av, bv;
            if (this.shopSortKey === 'price') {
                av = pa; bv = pb;
            } else if (this.shopSortKey === 'type') {
                // hp vs armor
                av = ta; bv = tb;
            } else if (this.shopSortKey === 'level') {
                // use potion strength as a pseudo-level for sorting
                av = la; bv = lb;
            } else {
                // rarity or unknown: all potions are common, fall back to name
                av = (a.tpl && a.tpl.name) || '';
                bv = (b.tpl && b.tpl.name) || '';
            }
            if (av === bv) return 0;
            return av < bv ? -1 * dir : 1 * dir;
        });

        entries.forEach(entry => {
            const { tpl, qty, price } = entry;
            const row = document.createElement('div');
            row.className = 'item-row';
            const typeLabel = tpl.subType === 'hp' ? 'Health' : 'Armor';
            const percentText = `${tpl.percent}%`;
            const disabled = qty <= 0 || this.player.gold < price;
            const btnState = disabled ? 'disabled' : '';
            row.innerHTML = `
                <div class="rarity-common">${tpl.name} <span class="potion-stock-count">x ${qty}</span></div>
                <div style="font-size:0.8rem;">Potion</div>
                <div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div>
                <div style="font-size:0.8rem; color:#ccc;">${percentText}</div>
                <div class="text-gold">${price}</div>
                <button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>Buy</button>
            `;
            // Tooltip for potions in the potion shop – same layout as universal potion tooltip
            if (previewBox && previewBody) {
                row.onmouseenter = (ev) => {
                    const typeLabel = tpl.subType === 'armor' ? 'Armor' : 'Health';
                    const pct = tpl.percent || 0;
                    const rarityText = 'common';
                    const minLvl = 1;
                    const lines = [];
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="rarity-common">${tpl.name}</div>`);
                    lines.push(`<div><span class="text-green">Type:</span> Potion</div>`);
                    lines.push(`<div><span class="text-blue">Effect:</span> Restore ${pct}% ${typeLabel}</div>`);
                    lines.push(`
                        <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                            <span>Rarity: ${rarityText}</span>
                            <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                        </div>
                    `);
                    previewBody.innerHTML = lines.join('');
                    if (previewIcon) {
                        previewIcon.src = 'assets/images/potion-icons/potion-icon.png';
                        previewIcon.classList.remove('hidden');
                    }
                    movePreview(ev);
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                row.onmousemove = (ev) => {
                    if (previewBox.classList.contains('visible')) movePreview(ev);
                };
                row.onmouseleave = () => {
                    previewBox.classList.remove('visible');
                };
            }
            const btn = row.querySelector('button');
            if (btn && !disabled) {
                btn.onclick = () => {
                    if (entry.qty <= 0 || this.player.gold < entry.price) return;
                    this.player.gold -= entry.price;
                    entry.qty -= 1;
                    // Stack potions in inventory instead of creating separate rows
                    if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
                    const inv = this.player.inventory;
                    const existing = inv.find(it => it && it.type === 'potion' && it.subType === tpl.subType && it.percent === tpl.percent && it.name === tpl.name);
                    if (existing) {
                        existing.qty = (existing.qty || 1) + 1;
                    } else {
                        const item = {
                            id: Date.now() + Math.random(),
                            type: 'potion',
                            subType: tpl.subType,
                            percent: tpl.percent,
                            name: tpl.name,
                            price: entry.price,
                            qty: 1,
                            rarity: 'rarity-common'
                        };
                        inv.push(item);
                    }
                    // Re-render potion shop row / list
                    this.renderPotionShop();
                    $('shop-gold').innerText = this.player.gold;
                    this.updateHubUI();
                };
            }
            cont.appendChild(row);
        });
    },
    renderList(items, mode) {
        this.currentListMode = mode;
        const cont = $('list-container'); cont.innerHTML = '';
        const header = $('list-header-extra');
        if (header) header.innerHTML = '';
        if (mode === 'shop') {
            const type = this.currentShopType || 'weapon';
            let title = 'SHOP';
            if (type === 'weapon') title = 'WEAPONSMITH';
            else if (type === 'armor') title = 'ARMORY';
            else if (type === 'trinket') title = 'TRINKET SHOP';
            $('list-title').innerText = title;
        } else {
            $('list-title').innerText = 'INVENTORY';
            // Inventory filter buttons: All / Weapons / Armors / Trinkets
            const f = document.createElement('div');
            f.id = 'inv-filters';
            f.style.display = 'flex';
            f.style.gap = '8px';
            f.style.marginBottom = '8px';
            const makeBtn = (id, label) => {
                const b = document.createElement('button');
                b.className = 'btn btn-xs';
                b.textContent = label;
                b.dataset.filter = id;
                if (this.currentInvFilter === id) b.classList.add('btn-primary');
                b.onclick = () => {
                    this.currentInvFilter = id;
                    this.renderList(this.player.inventory, 'inv');
                };
                return b;
            };
            f.appendChild(makeBtn('all', 'All'));
            f.appendChild(makeBtn('weapon', 'Weapons'));
            f.appendChild(makeBtn('armor', 'Armors'));
            f.appendChild(makeBtn('trinket', 'Trinkets'));
            f.appendChild(makeBtn('potion', 'Potions'));
            if (header) {
                header.appendChild(f);
            }
        }

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const getItemTypeLabel = (item) => {
            if (!item) return '';
            if (item.type === 'weapon') {
                // Always show a textual weapon type for the TYPE column
                if (item.baseType) return item.baseType;
                if (item.weaponClass) return item.weaponClass;
                return 'Weapon';
            }
            if (item.type === 'armor') {
                if (item.slot) return item.slot.charAt(0).toUpperCase() + item.slot.slice(1);
                return 'Armor';
            }
            if (item.type === 'trinket') {
                return 'Trinket';
            }
            return '';
        };
        const getWeaponIconPath = (item) => {
            if (!item || item.type !== 'weapon') return '';
            const cls = (item.weaponClass || '').toLowerCase();
            const baseLower = (item.baseType || '').toLowerCase();
            // Map weaponClass / baseType to specific icon filenames
            if (cls === 'axe' || baseLower.includes('axe')) return 'assets/weapon-icons/axe_icon.png';
            if (cls === 'sword' || baseLower.includes('blade') || baseLower.includes('sword')) return 'assets/weapon-icons/sword_icon.png';
            if (cls === 'hammer' || baseLower.includes('hammer') || baseLower.includes('mace')) return 'assets/weapon-icons/hammer_icon.png';
            if (cls === 'dagger' || baseLower.includes('dagger')) return 'assets/weapon-icons/dagger_icon.png';
            if (cls === 'spear' || baseLower.includes('spear') || baseLower.includes('halberd')) return 'assets/weapon-icons/spear_icon.png';
            if (cls === 'bow' || baseLower.includes('bow') || baseLower.includes('crossbow')) return 'assets/weapon-icons/crossbow_icon.png';
            return '';
        };
        const getArmorIconPath = (item) => {
            if (!item || item.type !== 'armor') return '';
            const slot = (item.slot || '').toLowerCase();
            if (slot === 'head') return 'assets/images/armor-icons/head_icon.png';
            if (slot === 'neck') return 'assets/images/armor-icons/neck_icon.png';
            if (slot === 'shoulders') return 'assets/images/armor-icons/shoulder_icon.png';
            if (slot === 'chest') return 'assets/images/armor-icons/chest_icon.png';
            if (slot === 'arms') return 'assets/images/armor-icons/arms_icon.png';
            if (slot === 'shield') return 'assets/images/armor-icons/shield_icon.png';
            if (slot === 'thighs') return 'assets/images/armor-icons/thighs_icon.png';
            if (slot === 'shins') return 'assets/images/armor-icons/shins_icon.png';
            return '';
        };
        const buildPreviewFromItem = (item) => {
            if (!item || !previewBody) return;
            const rarityText = (item.rarity || '').replace('rarity-','');
            const minLvl = (item.type === 'potion') ? 1 : getItemMinLevel(item);
            let lines = [];
            // Title (name)
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            // Core stats
            if (item.type === 'weapon') {
                let dmgLine = `${item.min}-${item.max}`;
                const equipped = this.player && this.player.gear ? this.player.gear.weapon : null;
                if (equipped && typeof equipped.min === 'number' && typeof equipped.max === 'number') {
                    const curAvg = (equipped.min + equipped.max) / 2;
                    const newAvg = (item.min + item.max) / 2;
                    const diff = Math.round(newAvg - curAvg);
                    if (diff !== 0) {
                        const sign = diff > 0 ? '+' : '';
                        const diffCls = diff > 0 ? 'text-green' : 'text-red';
                        dmgLine += ` <span class="${diffCls}" style="font-size:0.85rem;">(${sign}${diff})</span>`;
                    }
                }
                lines.push(`<div><span class="text-orange">Damage:</span> ${dmgLine}</div>`);
                if (item.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${item.baseType}</div>`);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                lines.push(`<div><span class="text-shield">Armor:</span> ${val}</div>`);
                if (item.slot) lines.push(`<div><span class="text-blue">Slot:</span> ${item.slot}</div>`);
            } else if (item.type === 'trinket') {
                if (item.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${item.baseType}</div>`);
            } else if (item.type === 'potion') {
                const typeLabel = item.subType === 'armor' ? 'Armor' : 'Health';
                const pct = item.percent || 0;
                lines.push(`<div><span class="text-green">Type:</span> Potion</div>`);
                lines.push(`<div><span class="text-blue">Effect:</span> Restore ${pct}% ${typeLabel}</div>`);
            }
            // Stat buffs / debuffs from statMods
            if (item.statMods) {
                const map = [
                    { key: 'str', label: 'Strength', cls: 'text-orange' },
                    { key: 'atk', label: 'Attack',   cls: 'text-red' },
                    { key: 'def', label: 'Defence',  cls: 'text-blue' },
                    { key: 'vit', label: 'Vitality', cls: 'text-green' },
                    { key: 'mag', label: 'Magicka',  cls: 'text-purple' },
                    { key: 'chr', label: 'Charisma', cls: 'text-gold' }
                ];
                const modLines = [];
                map.forEach(({key,label,cls}) => {
                    const v = item.statMods[key];
                    if (typeof v === 'number' && v !== 0) {
                        const sign = v > 0 ? '+' : '';
                        modLines.push(`<div class="${cls}">${sign}${v} ${label}</div>`);
                    }
                });
                if (modLines.length) {
                    lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                    lines = lines.concat(modLines);
                    lines.push('</div>');
                }
            }
            // Rarity + Level satırı (sağ altta Lvl X)
            lines.push(`
                <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                    <span>Rarity: ${rarityText}</span>
                    <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                </div>
            `);

            // Optional lore/info line from catalog (info + infoColor)
            if (item.info) {
                const infoClass = item.infoColor || 'text-gold';
                lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${item.info}</div>`);
            }
            previewBody.innerHTML = lines.join('');

            // Handle item type icon (weapon / armor / trinket / potion)
            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') {
                    iconPath = getWeaponIconPath(item);
                } else if (item.type === 'armor') {
                    iconPath = getArmorIconPath(item);
                } else if (item.type === 'trinket') {
                    // All trinkets share the same icon for now
                    iconPath = item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                } else if (item.type === 'potion') {
                    iconPath = 'assets/images/potion-icons/potion-icon.png';
                }
                if (iconPath) {
                    previewIcon.src = iconPath;
                    previewIcon.classList.remove('hidden');
                } else {
                    previewIcon.src = '';
                    previewIcon.classList.add('hidden');
                }
            }
        };
        const movePreview = (ev) => {
            if (!previewBox) return;
            const rect = $('game-container').getBoundingClientRect();
            const offsetX = 28, offsetY = 25;
            let x = ev.clientX - rect.left + offsetX;
            let y = ev.clientY - rect.top + offsetY;
            const maxX = rect.width - 340;
            const maxY = rect.height - 160;
            x = Math.max(10, Math.min(maxX, x));
            y = Math.max(10, Math.min(maxY, y));
            previewBox.style.left = x + 'px';
            previewBox.style.top = y + 'px';
        };

        // In inventory view, show equipped items at the top with Unequip buttons
        if(mode === 'inv') {
            const addEquippedRow = (slot, title) => {
                const equipped = this.player.gear[slot];
                if(!equipped) return;
                const isWeapon = equipped.type === 'weapon';
                const baseLower = (equipped.baseType || '').toLowerCase();
                const isLegendary = isWeapon && equipped.rarityKey === 'legendary';
                const baseName = isLegendary ? cleanLegendaryWeaponName(equipped) : equipped.name;
                let nameSuffix = '';
                if(isWeapon && isLegendary) {
                    const parts = [];
                    if(baseLower) parts.push(`[${baseLower}]`);
                    if (parts.length) nameSuffix = ` <span style="color:#666; font-size:0.75rem;">${parts.join(' ')}</span>`;
                }
                const typeLabel = getItemTypeLabel(equipped);
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <div class="${equipped.rarity}">${baseName}${nameSuffix}</div>
                    <div style="font-size:0.8rem;">${equipped.rarity.replace('rarity-','')}</div>
                    <div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div>
                    <div style="font-size:0.8rem; color:#ccc;">-</div>
                    <div class="text-gold">-</div>
                    <button class="btn" style="padding:5px 10px; font-size:0.8rem;">Unequip</button>`;
                row.querySelector('button').onclick = () => {
                    this.doUnequip(slot);
                    this.renderList(this.player.inventory, mode);
                };
                if (previewBox && previewBody) {
                    row.onmouseenter = (ev) => {
                        buildPreviewFromItem(equipped);
                        movePreview(ev);
                        previewBox.classList.remove('hidden');
                        previewBox.classList.add('visible');
                    };
                    row.onmousemove = (ev) => {
                        if (previewBox.classList.contains('visible')) movePreview(ev);
                    };
                    row.onmouseleave = () => {
                        previewBox.classList.remove('visible');
                    };
                }
                cont.appendChild(row);
            };

            addEquippedRow('weapon', 'Melee Weapon');
            ARMOR_SLOTS.forEach(s => addEquippedRow(s, s.charAt(0).toUpperCase()+s.slice(1)));
            TRINKET_SLOTS.forEach(s => addEquippedRow(s, s.charAt(0).toUpperCase()+s.slice(1)));
        }

        // Apply inventory filter when in inventory mode
        let listItems = items;
        if (mode === 'inv' && this.currentInvFilter && this.currentInvFilter !== 'all') {
            listItems = items.filter(it => it.type === this.currentInvFilter);
        }

        if(listItems.length === 0 && cont.children.length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">Empty</div>';
        }

        listItems.forEach((item, idx) => {
            const div = document.createElement('div'); div.className = 'item-row';
            let diffHtml = '', statDisplay = '';
            
            if(item.type === 'weapon') {
                const current = this.player.gear.weapon;
                const curMax = current ? current.max : 0;
                const diff = item.max - curMax;
                diffHtml = diff > 0 ? `<span class="diff-pos">(+${diff})</span>` : (diff < 0 ? `<span class="diff-neg">(${diff})</span>` : '');
                statDisplay = `Dmg: ${item.min}-${item.max}`;
            } else if (item.type === 'armor') {
                const current = this.player.gear[item.slot];
                const curVal = current ? current.val : 0;
                const diff = item.val - curVal;
                diffHtml = diff > 0 ? `<span class="diff-pos">(+${diff})</span>` : (diff < 0 ? `<span class="diff-neg">(${diff})</span>` : '');
                statDisplay = `Armor: ${item.val}`;
            } else if (item.type === 'trinket') {
                // Trinketlerde düz stat gösterimi yok, tooltipten okunacak
                statDisplay = 'Trinket';
            } else if (item.type === 'potion') {
                const typeLabel = item.subType === 'armor' ? 'Armor' : 'HP';
                statDisplay = `${typeLabel} ${item.percent || 0}%`;
            }

            const cls = item.type === 'weapon' ? (item.weaponClass || '').toLowerCase() : '';
            const baseLower = item.type === 'weapon' ? (item.baseType || '').toLowerCase() : '';
            const isLegendaryWeapon = item.type === 'weapon' && item.rarityKey === 'legendary';
            const minLvl = getItemMinLevel(item);
            const lvlOk = !this.player || (this.player.level >= minLvl);
            let nameHtml;
            if(isLegendaryWeapon) {
                const baseName = cleanLegendaryWeaponName(item);
                nameHtml = `${baseName}`;
            } else {
                nameHtml = `${item.name}`;
            }
            // Potions: show stack count as "Name x N" in inventory, with glowing counter
            if (mode === 'inv' && item.type === 'potion') {
                const qty = item.qty || 1;
                nameHtml = `${item.name} <span class="potion-stock-count">x ${qty}</span>`;
            }
            let btnTxt;
            if (mode === 'shop') btnTxt = 'Buy';
            else if (item.type === 'potion') btnTxt = 'Equip';
            else btnTxt = 'Equip';
            const priceTxt = mode === 'shop' ? `${item.price}` : '-';
            let btnState = "";
            if (mode === 'shop') {
                if (!lvlOk || this.player.gold < item.price) btnState = "disabled";
            }
            const btnClass = mode === 'shop' ? 'btn btn-buy' : 'btn';

            const typeLabel = getItemTypeLabel(item);

            const lvlColor = lvlOk ? '#ccc' : '#f44336';
            const lvlHtml = `<span style="color:${lvlColor};">${minLvl}</span>`;

            div.innerHTML = `
                <div class="${item.rarity}">${nameHtml}</div>
                <div style="font-size:0.8rem;">${item.rarity.replace('rarity-','')}</div>
                <div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div>
                <div style="font-size:0.8rem; color:${lvlColor};">${lvlHtml}</div>
                <div class="text-gold">${priceTxt}</div>
                <button class="${btnClass}" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>${btnTxt}</button>
            `;

            // Hover tooltip for all items (shop or inventory)
            if (previewBox && previewBody) {
                div.onmouseenter = (ev) => {
                    buildPreviewFromItem(item);
                    movePreview(ev);
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                div.onmousemove = (ev) => {
                    if (previewBox.classList.contains('visible')) movePreview(ev);
                };
                div.onmouseleave = () => {
                    previewBox.classList.remove('visible');
                };
            }
            
            div.querySelector('button').onclick = () => {
                if(mode === 'shop') {
                    if(this.player.gold >= item.price) {
                        this.player.gold -= item.price;
                        // Auto-equip if corresponding slot is empty
                        const p = this.player;
                        let autoEquipped = false;
                        if (item.type === 'weapon' && !p.gear.weapon) {
                            p.equip(item);
                            autoEquipped = true;
                        } else if (item.type === 'armor' && !p.gear[item.slot]) {
                            p.equip(item);
                            autoEquipped = true;
                        } else if (item.type === 'trinket' && !p.gear.trinket1 && !p.gear.trinket2) {
                            p.equip(item);
                            autoEquipped = true;
                        }
                        if (!autoEquipped) {
                            this.player.inventory.push(item);
                        }
                        items.splice(idx, 1);
                        this.renderList(items, mode);
                        $('shop-gold').innerText = this.player.gold;
                        this.updateHubUI();
                    }
                } else {
                    // Inventory actions
                    if (item.type === 'potion') {
                        if (!this.player) return;
                        if (!Array.isArray(this.player.potionSlots)) {
                            this.player.potionSlots = [null, null, null];
                        }
                        const slots = this.player.potionSlots;
                        const freeIndex = slots.findIndex(s => !s);
                        if (freeIndex === -1) {
                            alert('All potion slots are filled.');
                            return;
                        }

                        // Sadece konfigurasyon: tip/percent/name bilgisini slota yaz
                        slots[freeIndex] = {
                            subType: item.subType,
                            percent: item.percent,
                            name: item.name
                        };

                        this.renderList(this.player.inventory, mode);
                    } else {
                        this.player.equip(item);
                        this.renderList(this.player.inventory, mode);
                        this.updateHubUI();
                    }
                }
            };
            cont.appendChild(div);
        });

        // Inventory-specific: fill external Potion Slots card (bottom-left of screen-list)
        const slotCard = $('inv-potion-slots-card');
        if (slotCard) {
            if (mode !== 'inv') {
                slotCard.classList.add('hidden');
                slotCard.innerHTML = '';
            } else {
                slotCard.classList.remove('hidden');
                slotCard.innerHTML = '';

                const title = document.createElement('div');
                title.textContent = 'Potion Slots';
                title.className = 'potion-card-title';
                slotCard.appendChild(title);

                const slotsArr = (this.player && Array.isArray(this.player.potionSlots)) ? this.player.potionSlots : [null, null, null];
                const makeSlotRow = (idx) => {
                    const row = document.createElement('div');
                    row.className = 'potion-card-row';

                    const info = document.createElement('div');
                    const slot = slotsArr[idx] || null;
                    let label = `Slot ${idx+1}`;
                    let detail = '';
                    if (!slot) {
                        detail = 'Empty';
                    } else {
                        const typeLabel = slot.subType === 'armor' ? 'Armor' : 'HP';
                        detail = `${typeLabel} ${slot.percent || 0}%`;
                    }
                    info.innerHTML = `<div class="potion-card-slot-label">${label}</div><div class="potion-card-slot-detail">${detail}</div>`;
                    row.appendChild(info);

                    const btn = document.createElement('button');
                    btn.className = 'btn btn-xs';
                    btn.textContent = 'Clear';
                    if (!slot) {
                        btn.disabled = true;
                    } else {
                        btn.onclick = () => {
                            if (!this.player || !Array.isArray(this.player.potionSlots)) return;
                            // Return one charge of this potion back to inventory stack
                            if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
                            const inv = this.player.inventory;
                            const subType = slot.subType;
                            const percent = slot.percent || 0;
                            const name = slot.name || '';
                            const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && it.percent === percent && it.name === name);
                            if (existing) {
                                existing.qty = (existing.qty || 1) + 1;
                            } else {
                                inv.push({
                                    id: Date.now() + Math.random(),
                                    type: 'potion',
                                    subType,
                                    percent,
                                    name,
                                    qty: 1,
                                    rarity: 'rarity-common'
                                });
                            }
                            this.player.potionSlots[idx] = null;
                            this.renderList(this.player.inventory, 'inv');
                        };
                    }
                    row.appendChild(btn);

                    // Tooltip for potion slots using the global preview box
                    if (slot && previewBox && previewBody) {
                        row.onmouseenter = (ev) => {
                            const fakeItem = {
                                type: 'potion',
                                rarity: 'rarity-common',
                                name: slot.name || detail,
                                subType: slot.subType,
                                percent: slot.percent || 0
                            };
                            buildPreviewFromItem(fakeItem);
                            movePreview(ev);
                            previewBox.classList.remove('hidden');
                            previewBox.classList.add('visible');
                        };
                        row.onmousemove = (ev) => {
                            if (previewBox.classList.contains('visible')) movePreview(ev);
                        };
                        row.onmouseleave = () => {
                            previewBox.classList.remove('visible');
                        };
                    }
                    return row;
                };

                slotCard.appendChild(makeSlotRow(0));
                slotCard.appendChild(makeSlotRow(1));
                slotCard.appendChild(makeSlotRow(2));
            }
        }
    },
    saveGame() {
        if (!this.player) return;
        const meta = this.loadSaveMeta();
        if (this.currentSlotIndex < 0 || this.currentSlotIndex >= 5) {
            if (meta.slots.length >= 5) return; // cannot save more
            this.currentSlotIndex = meta.slots.length;
        }
        const slotData = {
            ...this.player,
            _shopStock: this.shopStock,
            _shopFightCount: this.shopFightCount,
            _lastShopFightReset: this.lastShopFightReset,
            _potionStock: this.potionStock,
            _lastPotionFightReset: this.lastPotionFightReset,
        };
        meta.slots[this.currentSlotIndex] = slotData;
        meta.lastSlot = this.currentSlotIndex;
        this.saveSlots = meta.slots;
        this.lastSlot = meta.lastSlot;
        this.writeSaveMeta(meta);
    },
    saveGameManually() { this.saveGame(); $('hub-msg').innerText = "Game Saved!"; },
    loadLastGame() {
        const meta = this.loadSaveMeta();
        const idx = (typeof meta.lastSlot === 'number') ? meta.lastSlot : -1;
        if (idx < 0 || !meta.slots[idx]) { alert('No save found.'); return; }
        this.loadSlot(idx, meta);
    },
    loadSlot(index, metaIn = null) {
        const meta = metaIn || this.loadSaveMeta();
        const plain = meta.slots[index];
        if (!plain) { alert('Empty slot.'); return; }

        const avatarIdx = Math.max(0, AVATARS.indexOf(plain.avatar));
        this.player = new Player(plain.name, plain.class, avatarIdx >= 0 ? avatarIdx : 0);
        Object.assign(this.player, plain);

        // Normalize potionSlots for older saves / bad data
        if (!Array.isArray(this.player.potionSlots)) {
            this.player.potionSlots = [null, null, null];
        } else if (this.player.potionSlots.length !== 3) {
            const slots = this.player.potionSlots;
            this.player.potionSlots = [slots[0] || null, slots[1] || null, slots[2] || null];
        }

        // Eski kayıtlardaki legendary silah isimlerini normalize et
        const fixLegendaryItemName = (item) => {
            if(!item || item.type !== 'weapon' || item.rarityKey !== 'legendary') return;
            // Baştaki 'Of ' / 'of ' temizle
            if(typeof item.name === 'string') {
                item.name = item.name.replace(/^of\s+/i, '');
            }
            // Base type kelimesini isimden çıkar
            item.name = cleanLegendaryWeaponName(item);
        };

        // Gear
        if(this.player.gear) {
            Object.keys(this.player.gear).forEach(slot => {
                fixLegendaryItemName(this.player.gear[slot]);
            });
        }
        // Inventory
        if(Array.isArray(this.player.inventory)) {
            this.player.inventory.forEach(it => fixLegendaryItemName(it));
        }

        // Shop state'ini kayıttan geri yükle (yoksa defaultla)
        if (plain._shopStock) {
            this.shopStock = plain._shopStock;
        } else {
            this.shopStock = { weapon: [], armor: [], trinket: [] };
        }
        this.shopFightCount = typeof plain._shopFightCount === 'number' ? plain._shopFightCount : 0;
        this.lastShopFightReset = typeof plain._lastShopFightReset === 'number' ? plain._lastShopFightReset : 0;
        // Potion shop state (stok + son refresh)
        if (plain._potionStock) {
            this.potionStock = plain._potionStock;
        } else {
            this.potionStock = {};
        }
        this.lastPotionFightReset = typeof plain._lastPotionFightReset === 'number' ? plain._lastPotionFightReset : 0;
        // Eğer herhangi bir sebeple shop listeleri boşsa, bir kez generate et
        const hasAnyShop = (this.shopStock.weapon && this.shopStock.weapon.length) ||
            (this.shopStock.armor && this.shopStock.armor.length) ||
            (this.shopStock.trinket && this.shopStock.trinket.length);
        if (!hasAnyShop) {
            this.generateShopStock();
        }

        this.currentSlotIndex = index;
        this.lastSlot = index;
        this.writeSaveMeta({ slots: meta.slots, lastSlot: index });
        this.showHub();
        this.closeLoadMenu();
    },
    openLoadMenu() {
        const meta = this.loadSaveMeta();
        this.saveSlots = meta.slots;
        this.lastSlot = meta.lastSlot;
        const cont = $('load-slots');
        if (!cont) return;
        cont.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = meta.slots[i];
            const row = document.createElement('div');
            row.className = 'stat-row';
            if (slot) {
                const avatar = slot.avatar || AVATARS[0];
                row.innerHTML = `
                    <span>${i+1}. <span style="margin-right:6px;">${avatar}</span> ${slot.name} <span style="color:#888; font-size:0.8rem;">(${slot.class})</span></span>
                    <span>
                        <span style="margin-right:8px;">Lvl ${slot.level || 1}</span>
                        <span class="text-gold" style="margin-right:8px;">💰 ${slot.gold || 0}</span>
                        <button class="btn" style="padding:4px 10px; font-size:0.75rem; margin-right:4px;" onclick="game.loadSlot(${i})">LOAD</button>
                        <button class="btn" style="padding:4px 8px; font-size:0.7rem; background:#3b0d0d; border-color:#5c1010;" onclick="game.deleteSlot(${i})">DELETE</button>
                    </span>
                `;
            } else {
                row.innerHTML = `
                    <span>${i+1}. <span style="color:#555;">Empty Slot</span></span>
                    <span style="color:#666; font-size:0.8rem;">Create from Start Menu</span>
                `;
            }
            cont.appendChild(row);
        }
        const m = $('modal-load');
        if (m) m.classList.remove('hidden');
    },
    closeLoadMenu() {
        const m = $('modal-load');
        if (m) m.classList.add('hidden');
    },
    deleteSlot(index) {
        const meta = this.loadSaveMeta();
        if (!meta.slots[index]) return;
        if (!confirm('Delete this gladiator? This cannot be undone.')) return;
        meta.slots.splice(index, 1);
        if (meta.slots.length > 5) meta.slots.length = 5;
        if (meta.lastSlot === index) {
            meta.lastSlot = meta.slots.length ? 0 : -1;
        } else if (meta.lastSlot > index) {
            meta.lastSlot -= 1;
        }
        this.writeSaveMeta(meta);
        this.saveSlots = meta.slots;
        this.lastSlot = meta.lastSlot;
        if (this.currentSlotIndex === index) {
            this.currentSlotIndex = -1;
            this.player = null;
        } else if (this.currentSlotIndex > index) {
            this.currentSlotIndex -= 1;
        }
        this.openLoadMenu();
    },
    openStatsHelp() {
        const m = $('modal-stats');
        if (!m) return;
        m.classList.remove('hidden');
        if (typeof wireButtonSfx === 'function') wireButtonSfx(m);
    },
    closeStatsHelp() {
        const m = $('modal-stats');
        if (m) m.classList.add('hidden');
    },
    openArmorPanel() {
        if (!this.player) return;
        const m = $('modal-armor');
        if (!m) return;
        m.classList.remove('hidden');
        const listEl = $('armor-list');
        const summaryEl = $('armor-summary');
        const totalEl = $('armor-total');
        if (!listEl) return;
        const p = this.player;
        let equippedCount = 0;
        let totalArmor = 0;
        const rows = [];
        ARMOR_SLOTS.forEach(slot => {
            const item = p.gear[slot];
            const label = slot.charAt(0).toUpperCase() + slot.slice(1);
            if (item) {
                const val = (typeof item.val === 'number') ? item.val : 0;
                if (val > 0) totalArmor += val;
                equippedCount++;
                const valText = val ? ` <span style="color:#888; font-size:0.8rem;">(+${val})</span>` : '';
                rows.push(`<div class="stat-row"><span>${label}</span><span><span class="${item.rarity}">${item.name}</span>${valText}</span></div>`);
            } else {
                rows.push(`<div class="stat-row"><span>${label}</span><span style="color:#555;">Empty</span></div>`);
            }
        });
        listEl.innerHTML = rows.join('');
        if (summaryEl) {
            summaryEl.innerText = `Equipped armor pieces: ${equippedCount}/${ARMOR_SLOTS.length}`;
        }
        if (totalEl) {
            totalEl.innerText = totalArmor;
        }
        if (typeof wireButtonSfx === 'function') wireButtonSfx(m);
    },
    closeArmorPanel() {
        const m = $('modal-armor');
        if (m) m.classList.add('hidden');
    },
    triggerLevelUp() { this.player.pts = 3; this.tempStats = {...this.player.stats}; $('modal-levelup').classList.remove('hidden'); this.renderLvlUI(); },
    renderLvlUI() { 
        const c = $('stat-allocator'); c.innerHTML=''; 
        ['str','atk','def','vit','mag','chr'].forEach(k=>{ 
            const d=document.createElement('div'); d.style.display='flex'; d.style.justifyContent='space-between'; d.style.marginBottom='10px';
            d.innerHTML=`<span>${k.toUpperCase()} <span class="text-blue">${this.tempStats[k]}</span></span><div><button class="btn" onclick="game.modStat('${k}',-1)">-</button><button class="btn" onclick="game.modStat('${k}',1)">+</button></div>`; c.appendChild(d);
        // ... (rest of the code remains the same)
        }); 
        $('lvl-pts').innerText = this.player.pts; 
        const btn=$('btn-lvl-confirm'); btn.disabled = (this.player.pts !== 0); btn.style.background=(this.player.pts===0)?'var(--accent-green)':'#222';
    },
    modStat(k,v) { if(v>0 && this.player.pts>0){this.tempStats[k]++; this.player.pts--;} else if(v<0 && this.tempStats[k]>this.player.stats[k]){this.tempStats[k]--; this.player.pts++;} this.renderLvlUI(); },
    confirmLevelUp() { this.player.stats={...this.tempStats}; $('modal-levelup').classList.add('hidden'); this.saveGame(); this.showHub(); },
    renderCreateUI() {
        const c = $('create-allocator'); if(!c) return; c.innerHTML = '';
        const base = BASE_STATS[this.player.class];
        const LABELS = {
            str: 'Strength',
            atk: 'Attack',
            def: 'Defence',
            vit: 'Vitality',
            mag: 'Magic',
            chr: 'Charisma'
        };
        ['str','atk','def','vit','mag','chr'].forEach(k => {
            const d = document.createElement('div');
            d.style.display = 'flex';
            d.style.justifyContent = 'space-between';
            d.style.alignItems = 'center';
            d.style.marginBottom = '4px';
            const label = LABELS[k] || k.toUpperCase();
            d.innerHTML = `
                <span style="font-size:0.9rem; flex:1; text-align:left;">${label}</span>
                <span class="text-blue" style="width:32px; text-align:center;">${this.tempCreateStats[k]}</span>
                <div style="display:inline-flex; gap:4px; margin-left:4px;">
                    <button class="btn" style="padding:4px 10px; font-size:0.8rem; margin:0; min-width:0;" onclick="game.modCreateStat('${k}',-1)">-</button>
                    <button class="btn" style="padding:4px 10px; font-size:0.8rem; margin:0; min-width:0;" onclick="game.modCreateStat('${k}',1)">+</button>
                </div>
            `;
            c.appendChild(d);
        });
        $('create-pts').innerText = this.player.pts;
        const btn = $('btn-create-confirm');
        if(btn) {
            btn.disabled = (this.player.pts !== 0);
            btn.style.background = (this.player.pts === 0) ? 'var(--accent-green)' : '#222';
        }
    },
    modCreateStat(k, delta) {
        const base = BASE_STATS[this.player.class];
        if(delta > 0 && this.player.pts > 0) {
            this.tempCreateStats[k]++;
            this.player.pts--;
        } else if(delta < 0 && this.tempCreateStats[k] > base[k]) {
            this.tempCreateStats[k]--;
            this.player.pts++;
        }
        this.renderCreateUI();
    },
    confirmCreationStats() {
        if (!this.player) return;
        this.player.stats = { ...this.tempCreateStats };
        this.player.pts = 0;
        this.generateShopStock();
        game.showHub();
        this.saveGame();
    },
    closeVictory() { $('modal-victory').classList.add('hidden'); $('vic-xp-bar').style.width='0%'; if(this.player.xp >= this.player.xpMax) { this.player.xp -= this.player.xpMax; this.player.xpMax=Math.floor(this.player.xpMax*1.5); this.player.level++; this.triggerLevelUp(); } else { this.showHub(); } }
};

// --- BLACKJACK ---
const blackjack = {
    deck: [], playerHand: [], dealerHand: [], bet: 0, active: false,
    open() {
        // fully reset state each time we open blackjack
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.bet = 0;
        this.active = false;
        $('modal-gamble').classList.remove('hidden');
        $('bj-setup').classList.remove('hidden');
        $('bj-game').classList.add('hidden');
        $('bj-controls').classList.add('hidden');
        $('bj-reset').classList.add('hidden');
        $('bj-msg').innerText = "";
        $('player-hand').innerHTML = '';
        $('dealer-hand').innerHTML = '';
        $('player-score').innerText = '';
        $('dealer-score').innerText = '';
        $('bj-gold').innerText = game.player.gold;
        const res = $('bj-result-overlay'); if(res) res.classList.add('hidden');
    },
    close() { $('modal-gamble').classList.add('hidden'); game.updateHubUI(); }, 
    
    createDeck() { const s=['♠','♥','♣','♦'], v=['2','3','4','5','6','7','8','9','10','J','Q','K','A']; this.deck=[]; s.forEach(st=>v.forEach(vl=>this.deck.push({suit:st, val:vl}))); this.deck.sort(()=>Math.random()-0.5); },
    getVal(c) { if(['J','Q','K'].includes(c.val))return 10; if(c.val==='A')return 11; return parseInt(c.val); },
    calc(hand) { let sum=0, aces=0; hand.forEach(c=>{ sum+=this.getVal(c); if(c.val==='A')aces++; }); while(sum>21 && aces>0){sum-=10; aces--;} return sum; },
    deal() {
        const b = parseInt($('bj-bet').value); if(isNaN(b) || b<=0 || b>game.player.gold) { alert("Invalid bet"); return; }
        this.bet = b; game.player.gold -= b; $('bj-gold').innerText = game.player.gold;
        this.createDeck(); this.playerHand=[this.deck.pop(), this.deck.pop()]; this.dealerHand=[this.deck.pop(), this.deck.pop()];
        this.active = true;
        $('bj-setup').classList.add('hidden'); $('bj-game').classList.remove('hidden'); $('bj-controls').classList.remove('hidden'); $('bj-reset').classList.add('hidden'); $('bj-msg').innerText="";
        this.render(false);
        if(this.calc(this.playerHand)===21) this.end();
    },
    hit() { this.playerHand.push(this.deck.pop()); this.render(false); if(this.calc(this.playerHand)>21) this.end(); },
    stand() {
        // Oyuncu stand dedikten sonra önce dealer elini tamamlasın,
        // kartlar ve skorlar ekranda görünsün, ardından sonuç overlay'i yavaşça gelsin.
        this.active = false;
        while (this.calc(this.dealerHand) < 17) this.dealerHand.push(this.deck.pop());
        this.end();
    },
    end() {
        this.active = false;
        // Tüm kartları ve gerçek skorları göster
        this.render(true);
        // Hit/Stand kontrollerini kapat, tekrar oyna butonunu aç
        $('bj-controls').classList.add('hidden');
        $('bj-reset').classList.remove('hidden');

        const p = this.calc(this.playerHand), d = this.calc(this.dealerHand);
        let win = false, push = false;
        if (p > 21) win = false;
        else if (d > 21) win = true;
        else if (p > d) win = true;
        else if (p === d) push = true;

        let text = "PUSH"; let color = "#ffffff";
        if (push) {
            game.player.gold += this.bet;
        } else if (win) {
            text = "YOU WIN"; color = "#00e676"; game.player.gold += (this.bet * 2);
        } else {
            text = "DEALER WINS"; color = "#ff1744";
        }

        const ov = $('bj-result-overlay');
        const lbl = $('bj-result-text');
        if (ov && lbl) {
            lbl.innerText = text;
            lbl.style.color = color;
            // Önce overlay'i görünür hale getir ama opaklığı 0 iken, sonra kısa bir gecikmeyle fade-in
            ov.classList.remove('hidden');
            ov.classList.remove('visible');
            setTimeout(() => {
                ov.classList.add('visible');
            }, 700); // kartları ve skorları görebilmek için küçük gecikme
        }
        game.saveGame();
    },
    render(show) {
        const draw = (hand, hideFirst, animateLast) => hand.map((c,i) => {
            if(hideFirst && i===0) return `<div class="bj-card" style="background:#222; color:#222;">?</div>`;
            const anim = (animateLast && i === hand.length-1) ? 'bj-anim' : '';
            return `<div class="bj-card ${['♥','♦'].includes(c.suit)?'red':''} ${anim}">${c.val}${c.suit}</div>`;
        }).join('');

        const animatePlayer = this.playerHand.length > 2; // after initial deal, only new player cards animate
        const animateDealer = (!show && this.dealerHand.length > 2); // dealer hits face-down until reveal

        $('player-hand').innerHTML = draw(this.playerHand, false, animatePlayer);
        $('player-score').innerText = this.calc(this.playerHand);
        $('dealer-hand').innerHTML = draw(this.dealerHand, !show, animateDealer);
        $('dealer-score').innerText = show ? this.calc(this.dealerHand) : "?";
    },
    reset() { this.open(); }
};

// --- COMBAT ENGINE ---
const combat = {
    hp: 0, maxHp: 0, armor: 0, maxArmor: 0, enemy: null, turn: 'player', actionLock: false,
    enemyActing: false, // guard to prevent overlapping enemy turns
    playerDots: [], // active DOT effects on player
    dotResist: {},  // per-combat resistance per DOT id (0-1)
    log: [],        // recent combat log lines
    potionSlots: [null, null, null], // active potions brought into this fight
    getEnemyMaxHp(e) {
        const vit = e.vit || 0;
        const lvl = e.lvl || 1;
        const extraVit = Math.max(0, vit - 1);
        const extraLvl = Math.max(0, lvl - 1);
        const base = 12 + (extraVit * 4) + (extraLvl * 6);
        const hp = Math.floor(base * 0.9);
        // Player ile tutarlı olacak şekilde düşman HP'sini de 3x ölçekle
        return Math.max(12, hp * 3);
    },
    getEnemyDmgRange(e) {
        // Player damage: weapon.min/max + STR*2
        // Enemy için daha zayıf: enemy weapon biraz kısılmış + floor(STR * 1.0)
        const str = e.str || 0;
        const strBonus = Math.floor(str * 1.0);
        const w = e.weapon;
        if (w && typeof w.min === 'number' && typeof w.max === 'number') {
            return {
                min: Math.max(1, w.min + strBonus),
                max: Math.max(1, w.max + strBonus)
            };
        }
        return {
            min: Math.max(1, 2 + strBonus),
            max: Math.max(1, 4 + strBonus)
        };
    },
    init() {
        const p = game.player;
        this.maxHp = p.getMaxHp(); this.hp = this.maxHp;
        this.maxArmor = p.getTotalArmor(); this.armor = this.maxArmor;
        this.playerDots = [];
        this.dotResist = {};

        // Prepare combat potion slots for this fight:
        // player.potionSlots sadece konfigurasyon tutar; gerçek potlar
        // her dövüş başında envanterden çekilir ve dövüş sonunda
        // kullanılmayanlar envantere iade edilir.
        this.potionSlots = [null, null, null];
        if (p && Array.isArray(p.potionSlots)) {
            if (!Array.isArray(p.inventory)) p.inventory = [];
            const inv = p.inventory;
            this.potionSlots = p.potionSlots.map(slot => {
                if (!slot) return null;
                const subType = slot.subType;
                const percent = slot.percent || 0;
                const name = slot.name || '';
                // Envanterden uygun tipi bul ve bu dövüş icin 1 adet tüket
                const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && (it.percent || 0) === percent && it.name === name && (it.qty || 0) > 0);
                if (!existing) {
                    // Bu dövüş icin stoğun yok, slot boş kalır
                    return null;
                }
                existing.qty = (existing.qty || 0) - 1;
                if (existing.qty <= 0) {
                    const idx = inv.indexOf(existing);
                    if (idx !== -1) inv.splice(idx, 1);
                }
                return {
                    subType,
                    percent,
                    name,
                    used: false
                };
            });
        }
        // Yeni dövüşe girerken önceki fight'tan kalan UI izlerini temizle
        const dmgEl = $('dmg-overlay');
        if (dmgEl) {
            dmgEl.innerText = '';
            dmgEl.className = 'dmg-text';
        }
        const logEl = $('combat-log');
        if (logEl) {
            logEl.innerHTML = '';
            logEl.classList.remove('expanded');
        }
        // Enemy template + stats from enemy_config.js
        const enemyGen = (typeof generateEnemyTemplateForLevel === 'function')
            ? generateEnemyTemplateForLevel(p.level)
            : null;
        const tpl = enemyGen ? enemyGen.template : null;
        const eStats = enemyGen ? enemyGen.stats : { str: 5, atk: 5, def: 3, vit: 3 };
        const s = enemyGen ? enemyGen.level : p.level;
        const enemyName = tpl ? tpl.name : 'Bandit';

        // Combat portraits: player + enemy
        const playerAvatarEl = $('c-player-avatar');
        if (playerAvatarEl) {
            playerAvatarEl.src = PLAYER_AVATAR_IMG;
        }
        const enemyAvatarEl = $('c-enemy-avatar');
        if (enemyAvatarEl) {
            const avatarKey = (typeof getEnemyAvatarKey === 'function')
                ? getEnemyAvatarKey(tpl)
                : (tpl && tpl.avatarKey ? tpl.avatarKey : (enemyName || '').toLowerCase());
            enemyAvatarEl.src = ENEMY_AVATARS[avatarKey] || '';
        }

        // Yeni dövüşte enemy death cross efektini sıfırla
        const cross = $('enemy-death-cross');
        if (cross) {
            cross.classList.remove('enemy-death-cross-anim');
            cross.style.opacity = '0';
        }
        // Player death cross efektini de sıfırla
        const pCross = $('player-death-cross');
        if (pCross) {
            pCross.classList.remove('player-death-cross-anim');
            pCross.style.opacity = '0';
        }

        // Temel enemy statları (HP formülü şimdilik eskisi gibi kalsın)
        this.enemy = {
            name: enemyName,
            lvl: s,
            maxHp: 0,
            hp: 0,
            str: eStats.str,
            atk: eStats.atk,
            def: eStats.def,
            vit: eStats.vit,
            mag: 0,
            armor: 0,
            maxArmor: 0
        };

        // Enemy silahını merkezi WEAPONS kataloğundan seç
        let desiredClass = (tpl && tpl.weaponClass) ? tpl.weaponClass : 'Sword';

        let enemyWeapon = null;
        if (typeof WEAPONS !== 'undefined') {
            // Düşman her zaman kendi level'inin en tepesindeki silahı kullanmasın diye,
            // level-5 ile level arasında rastgele bir "tavan seviye" seçiyoruz.
            const minCap = Math.max(1, s - 5);
            const levelCap = rng(minCap, s);

            let pool = WEAPONS.filter(w => {
                const cls = (w.weaponClass || w.baseType || '').toLowerCase();
                const want = desiredClass.toLowerCase();
                const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                return cls.includes(want) && lvlReq <= levelCap;
            });
            if (pool.length === 0) {
                pool = WEAPONS.filter(w => {
                    const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                    return lvlReq <= levelCap;
                });
            }
            if (pool.length > 0) {
                const tpl = pool[rng(0, pool.length - 1)];
                enemyWeapon = { ...tpl };
                // Enemy, player ile aynı silah şablonunu kullanıyor ama biraz zayıflatılmış versiyonuyla
                const scale = 0.8;
                if (typeof enemyWeapon.min === 'number') {
                    enemyWeapon.min = Math.max(1, Math.floor(enemyWeapon.min * scale));
                }
                if (typeof enemyWeapon.max === 'number') {
                    enemyWeapon.max = Math.max(enemyWeapon.min, Math.floor(enemyWeapon.max * scale));
                }
            }
        }

        if (!enemyWeapon) {
            // Fallback: önceki basit STR tabanlı silah hesaplaması
            const base = Math.floor(this.enemy.str * 1.2);
            const weaponMin = Math.max(3, base - 4);
            const weaponMax = base + 4;
            let weaponClass = desiredClass;
            let baseType = desiredClass;
            let iconPath = '';
            const clsLower = weaponClass.toLowerCase();
            if (clsLower === 'axe') iconPath = 'assets/weapon-icons/axe_icon.png';
            else if (clsLower === 'sword') iconPath = 'assets/weapon-icons/sword_icon.png';
            else if (clsLower === 'hammer') iconPath = 'assets/weapon-icons/hammer_icon.png';
            else if (clsLower === 'dagger') iconPath = 'assets/weapon-icons/dagger_icon.png';
            else if (clsLower === 'spear') iconPath = 'assets/weapon-icons/spear_icon.png';
            else if (clsLower === 'bow') iconPath = 'assets/weapon-icons/crossbow_icon.png';
            enemyWeapon = { min: weaponMin, max: weaponMax, weaponClass, baseType, iconPath };
        }

        // icon path haritası (player silah ikonlarıyla uyumlu) – katalog itemlerinde eksikse buradan doldur
        if (!enemyWeapon.iconPath) {
            const cls = (enemyWeapon.weaponClass || enemyWeapon.baseType || '').toLowerCase();
            let iconPath = '';
            if (cls.includes('axe')) iconPath = 'assets/weapon-icons/axe_icon.png';
            else if (cls.includes('sword') || cls.includes('blade')) iconPath = 'assets/weapon-icons/sword_icon.png';
            else if (cls.includes('hammer') || cls.includes('mace')) iconPath = 'assets/weapon-icons/hammer_icon.png';
            else if (cls.includes('dagger')) iconPath = 'assets/weapon-icons/dagger_icon.png';
            else if (cls.includes('spear') || cls.includes('halberd') || cls.includes('lance')) iconPath = 'assets/weapon-icons/spear_icon.png';
            else if (cls.includes('bow') || cls.includes('crossbow')) iconPath = 'assets/weapon-icons/crossbow_icon.png';
            enemyWeapon.iconPath = iconPath;
        }

        this.enemy.weapon = enemyWeapon;

        // Silahın statMods değerlerini enemy statlarına ekle (STR/ATK/DEF/VIT)
        if (enemyWeapon && enemyWeapon.statMods) {
            const m = enemyWeapon.statMods;
            if (typeof m.str === 'number') this.enemy.str += m.str;
            if (typeof m.atk === 'number') this.enemy.atk += m.atk;
            if (typeof m.def === 'number') this.enemy.def += m.def;
            if (typeof m.vit === 'number') this.enemy.vit += m.vit;
        }

        // Enemy'nin gerçek max HP'sini (silah buff'lı VIT + level'e göre) ayarla
        this.enemy.maxHp = this.getEnemyMaxHp(this.enemy);
        this.enemy.hp = this.enemy.maxHp;

        // Enemy armor: level ve DEF/VIT'e göre basit bir değer
        const baseArm = Math.max(0, Math.floor(this.enemy.def * 1.2 + this.enemy.vit * 0.8 + s * 2));
        this.enemy.maxArmor = baseArm;
        this.enemy.armor = baseArm;
        if (typeof playFightMusic === 'function') playFightMusic();
        $('screen-hub').classList.add('hidden'); $('screen-combat').classList.remove('hidden'); $('enemy-think').style.display='none';
        this.log = [];
        this.logMessage(`${this.enemy.name} enters the arena!`);
        this.updateUI();
        // Yazı-tura: her arenada ilk saldıran taraf rastgele belirlensin, sonucu mor log ile göster
        const firstIsPlayer = Math.random() < 0.5;
        const tossMsg = firstIsPlayer
            ? '<span style="color:#d500f9;">You win the toss and act first.</span>'
            : `<span style="color:#d500f9;">${this.enemy.name} wins the toss and acts first.</span>`;
        this.logMessage(tossMsg);
        setTimeout(() => {
            this.setTurn(firstIsPlayer ? 'player' : 'enemy');
        }, 1500);
    },
    inspectEnemy() {
        $('modal-inspect').classList.remove('hidden');
        const e = this.enemy;
        $('ins-name').innerText = e.name;
        $('ins-lvl').innerText = e.lvl;
        $('ins-str').innerText = e.str;
        $('ins-atk').innerText = e.atk;
        $('ins-def').innerText = e.def;
        $('ins-vit').innerText = e.vit;
        $('ins-mag').innerText = e.mag;

        // Enemy için açıklama metni: player'ın özel quote'unu override et
        const descEl = $('ins-desc');
        if (descEl) {
            descEl.innerText = 'A dangerous foe.';
        }

        const w = e.weapon || null;
        const nameEl = $('ins-weapon-name');
        const rangeEl = $('ins-weapon-range');
        if (w) {
            if (nameEl) nameEl.innerText = w.name || (w.baseType || 'Weapon');
            // Inspect Damage Range: STR bonuslu efektif aralığı göster
            if (rangeEl) {
                const erange = this.getEnemyDmgRange(e);
                rangeEl.innerText = `${erange.min}-${erange.max}`;
            }

            // Inspect ekranındaki silah ismine tooltip bağla
            if (nameEl) {
                const previewBox = $('shop-preview');
                const previewBody = $('shop-preview-body');
                const previewIcon = $('shop-preview-icon');
                nameEl.onmouseenter = (ev) => {
                    if (!previewBox || !previewBody) return;
                    // Basit tooltip: shop/inventory ile aynı stil
                    let lines = [];
                    const rarityText = (w.rarity || '').replace('rarity-','');
                    const minLvl = (typeof w.minLevel === 'number') ? w.minLevel : (typeof w.minShopLevel === 'number' ? w.minShopLevel : 1);
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${w.rarity || ''}">${w.name || (w.baseType || 'Weapon')}</div>`);
                    if (typeof w.min === 'number' && typeof w.max === 'number') {
                        lines.push(`<div><span class="text-orange">Damage:</span> ${w.min}-${w.max}</div>`);
                    }
                    if (w.baseType) {
                        lines.push(`<div><span class="text-blue">Type:</span> ${w.baseType}</div>`);
                    }
                    if (w.statMods) {
                        const map = [
                            { key: 'str', label: 'Strength', cls: 'text-orange' },
                            { key: 'atk', label: 'Attack',   cls: 'text-red' },
                            { key: 'def', label: 'Defence',  cls: 'text-blue' },
                            { key: 'vit', label: 'Vitality', cls: 'text-green' },
                            { key: 'mag', label: 'Magicka',  cls: 'text-purple' },
                            { key: 'chr', label: 'Charisma', cls: 'text-gold' }
                        ];
                        const modLines = [];
                        map.forEach(({key,label,cls}) => {
                            const v = w.statMods[key];
                            if (typeof v === 'number' && v !== 0) {
                                const sign = v > 0 ? '+' : '';
                                modLines.push(`<div class="${cls}">${sign}${v} ${label}</div>`);
                            }
                        });
                        if (modLines.length) {
                            lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                            lines = lines.concat(modLines);
                            lines.push('</div>');
                        }
                    }
                    lines.push(`
                        <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                            <span>Rarity: ${rarityText}</span>
                            <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                        </div>
                    `);
                    if (w.info) {
                        const infoClass = w.infoColor || 'text-gold';
                        lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${w.info}</div>`);
                    }
                    previewBody.innerHTML = lines.join('');

                    if (previewIcon) {
                        if (w.iconPath) {
                            previewIcon.src = w.iconPath;
                            previewIcon.classList.remove('hidden');
                        } else {
                            previewIcon.src = '';
                            previewIcon.classList.add('hidden');
                        }
                    }

                    const rect = $('game-container').getBoundingClientRect();
                    const offsetX = 20, offsetY = 10;
                    let x = ev.clientX - rect.left + offsetX;
                    let y = ev.clientY - rect.top + offsetY;
                    const maxX = rect.width - 340;
                    const maxY = rect.height - 160;
                    x = Math.max(10, Math.min(maxX, x));
                    y = Math.max(10, Math.min(maxY, y));
                    previewBox.style.left = x + 'px';
                    previewBox.style.top = y + 'px';
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                nameEl.onmouseleave = () => {
                    const previewBox = $('shop-preview');
                    if (previewBox) previewBox.classList.remove('visible');
                };
            }
        } else {
            if (nameEl) nameEl.innerText = '–';
            if (rangeEl) rangeEl.innerText = '-';
        }
    },
    inspectPlayer() {
        const p = game.player;
        if (!p) return;

        $('modal-inspect').classList.remove('hidden');

        // Etkin statlar (gear + class bonuslar dahil)
        const effStr = p.getEffectiveStr();
        const effAtk = p.getEffectiveAtk();
        const effDef = p.getEffectiveDef();
        const effVit = p.getEffectiveVit();
        const effMag = p.getEffectiveMag();

        $('ins-name').innerText = p.name;
        $('ins-lvl').innerText = p.level || 1;
        $('ins-str').innerText = effStr;
        $('ins-atk').innerText = effAtk;
        $('ins-def').innerText = effDef;
        $('ins-vit').innerText = effVit;
        $('ins-mag').innerText = effMag;

        const w = p.gear && p.gear.weapon ? p.gear.weapon : null;
        const nameEl = $('ins-weapon-name');
        const rangeEl = $('ins-weapon-range');
        const descEl = $('ins-desc');

        // Melee damage aralığı ve max değeri (STR bonuslu)
        if (rangeEl) {
            const range = p.getDmgRange();
            const min = range.min;
            const max = range.max;
            rangeEl.innerText = `${min}-${max} (Max: ${max})`;
        }

        if (descEl) {
            descEl.innerText = '"take a good look, you may never see it again..."';
        }

        if (w) {
            if (nameEl) nameEl.innerText = w.name || (w.baseType || 'Weapon');

            // Player silahı için de basit tooltip kullan
            if (nameEl) {
                const previewBox = $('shop-preview');
                const previewBody = $('shop-preview-body');
                const previewIcon = $('shop-preview-icon');
                nameEl.onmouseenter = (ev) => {
                    if (!previewBox || !previewBody) return;
                    let lines = [];
                    const rarityText = (w.rarity || '').replace('rarity-','');
                    const minLvl = (typeof w.minLevel === 'number') ? w.minLevel : (typeof w.minShopLevel === 'number' ? w.minShopLevel : 1);
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${w.rarity || ''}">${w.name || (w.baseType || 'Weapon')}</div>`);
                    if (typeof w.min === 'number' && typeof w.max === 'number') {
                        lines.push(`<div><span class="text-orange">Damage:</span> ${w.min}-${w.max}</div>`);
                    }
                    if (w.baseType) {
                        lines.push(`<div><span class="text-blue">Type:</span> ${w.baseType}</div>`);
                    }
                    if (w.statMods) {
                        const map = [
                            { key: 'str', label: 'Strength', cls: 'text-orange' },
                            { key: 'atk', label: 'Attack',   cls: 'text-red' },
                            { key: 'def', label: 'Defence',  cls: 'text-blue' },
                            { key: 'vit', label: 'Vitality', cls: 'text-green' },
                            { key: 'mag', label: 'Magicka',  cls: 'text-purple' },
                            { key: 'chr', label: 'Charisma', cls: 'text-gold' }
                        ];
                        const modLines = [];
                        map.forEach(({key,label,cls}) => {
                            const v = w.statMods[key];
                            if (typeof v === 'number' && v !== 0) {
                                const sign = v > 0 ? '+' : '';
                                modLines.push(`<div class="${cls}">${sign}${v} ${label}</div>`);
                            }
                        });
                        if (modLines.length) {
                            lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                            lines = lines.concat(modLines);
                            lines.push('</div>');
                        }
                    }
                    lines.push(`
                        <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                            <span>Rarity: ${rarityText}</span>
                            <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                        </div>
                    `);
                    if (w.info) {
                        const infoClass = w.infoColor || 'text-gold';
                        lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${w.info}</div>`);
                    }
                    previewBody.innerHTML = lines.join('');
                    const rect = $('game-container').getBoundingClientRect();
                    const offsetX = 28, offsetY = 25;
                    let x = ev.clientX - rect.left + offsetX;
                    let y = ev.clientY - rect.top + offsetY;
                    const maxX = rect.width - 340;
                    const maxY = rect.height - 160;
                    x = Math.max(10, Math.min(maxX, x));
                    y = Math.max(10, Math.min(maxY, y));
                    previewBox.style.left = x + 'px';
                    previewBox.style.top = y + 'px';
                    if (previewIcon) previewIcon.classList.add('hidden');
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                nameEl.onmousemove = (ev) => {
                    const previewBox = $('shop-preview');
                    if (!previewBox || !previewBox.classList.contains('visible')) return;
                    const rect = $('game-container').getBoundingClientRect();
                    const offsetX = 28, offsetY = 25;
                    let x = ev.clientX - rect.left + offsetX;
                    let y = ev.clientY - rect.top + offsetY;
                    const maxX = rect.width - 340;
                    const maxY = rect.height - 160;
                    x = Math.max(10, Math.min(maxX, x));
                    y = Math.max(10, Math.min(maxY, y));
                    previewBox.style.left = x + 'px';
                    previewBox.style.top = y + 'px';
                };
                nameEl.onmouseleave = () => {
                    const previewBox = $('shop-preview');
                    if (!previewBox) return;
                    previewBox.classList.remove('visible');
                };
            }
        } else {
            if (nameEl) nameEl.innerText = 'Unarmed';
        }
    },
    openBag() {
        // Sadece oyuncu turundayken ve aksiyon kilit değilken Bag açılabilsin
        if (this.turn !== 'player' || this.actionLock) return;
        const modal = $('modal-bag');
        const list = $('bag-list');
        if (!modal || !list) return;

        list.innerHTML = '';

        const slots = this.potionSlots || [];
        const hasAny = slots.some(s => s && !s.used);
        if (!hasAny) {
            list.innerHTML = '<p style="color:#aaa; font-size:0.9rem;">No active potions in your slots.</p>';
        } else {
            slots.forEach((slot, idx) => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                let label = `Slot ${idx + 1}: `;
                if (!slot) {
                    label += 'Empty';
                } else if (slot.used) {
                    label += 'Used';
                } else {
                    const typeLabel = slot.subType === 'armor' ? 'Armor' : 'HP';
                    label += `${typeLabel} ${slot.percent || 0}%`;
                }
                row.innerHTML = `
                    <span>${label}</span>
                    <span>
                        <button class="btn btn-xs" data-slot="${idx}">Use</button>
                    </span>
                `;
                const btn = row.querySelector('button');
                if (!slot || slot.used) {
                    if (btn) btn.disabled = true;
                } else if (btn) {
                    btn.onclick = () => this.usePotionSlot(idx);
                }
                list.appendChild(row);
            });
        }

        modal.classList.remove('hidden');
    },
    closeBag() {
        const modal = $('modal-bag');
        if (modal) modal.classList.add('hidden');
    },
    usePotionSlot(index) {
        if (this.turn !== 'player' || this.actionLock) return;
        if (!this.potionSlots || index < 0 || index >= this.potionSlots.length) return;
        const slot = this.potionSlots[index];
        if (!slot || slot.used) return;

        const acts = $('combat-actions');
        if (acts) {
            acts.style.opacity = '0.8';
            acts.style.pointerEvents = 'none';
        }
        this.actionLock = true;

        const type = slot.subType === 'armor' ? 'armor' : 'hp';
        if (type === 'hp') {
            const pct = (slot.percent || 0) / 100;
            const heal = Math.max(1, Math.floor(this.maxHp * pct));
            this.hp = Math.min(this.maxHp, this.hp + heal);
            this.showDmg(heal, 'player', 'heal');
            this.logMessage(`You drink a health potion and heal ${heal} HP.`);
        } else {
            // Armor potion: eğer armor tamamen bitmişse (0 veya altı), pot boşa gider
            if (this.armor <= 0) {
                this.logMessage('Armor is broken!');
            } else {
                const pct = (slot.percent || 0) / 100;
                const gain = Math.max(1, Math.floor(this.maxArmor * pct));
                const before = this.armor;
                this.armor = Math.min(this.maxArmor, this.armor + gain);
                const actual = this.armor - before;
                if (actual > 0) {
                    this.logMessage(`You drink an armor potion and restore ${actual} Armor.`);
                } else {
                    this.logMessage('Your armor is already at maximum.');
                }
            }
        }

        slot.used = true;
        this.updateUI();
        this.closeBag();

        setTimeout(() => {
            this.setTurn('enemy');
            this.actionLock = false;
            if (acts) {
                acts.style.opacity = '1';
                acts.style.pointerEvents = 'auto';
            }
        }, 300);
    },
    returnUnusedPotions() {
        if (!game.player || !Array.isArray(this.potionSlots)) return;
        const p = game.player;
        if (!Array.isArray(p.inventory)) p.inventory = [];
        const inv = p.inventory;
        this.potionSlots.forEach((slot) => {
            if (!slot) return;
            const subType = slot.subType;
            const percent = slot.percent || 0;
            const name = slot.name || '';

            // Sadece KULLANILMAYAN slotları envantere iade et
            if (!slot.used) {
                const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && (it.percent || 0) === percent && it.name === name);
                if (existing) {
                    existing.qty = (existing.qty || 1) + 1;
                } else {
                    inv.push({
                        id: Date.now() + Math.random(),
                        type: 'potion',
                        subType,
                        percent,
                        name,
                        qty: 1,
                        rarity: 'rarity-common'
                    });
                }
            }
        });

        // Combat state için slotları sıfırla; player.potionSlots konfigurasyonu korunur
        this.potionSlots = [null, null, null];
    },
    updateUI() {
        const e = this.enemy;
        $('c-enemy-name').innerText = e.name; $('c-enemy-lvl').innerText = `Lvl ${e.lvl}`;
        $('c-enemy-hp').style.width = (e.hp/e.maxHp)*100 + '%'; $('c-enemy-hp-text').innerText = `${Math.max(0,e.hp)}/${e.maxHp}`;
        const enemyArmPct = e.maxArmor > 0 ? (e.armor / e.maxArmor) * 100 : 0;
        $('c-enemy-arm').style.width = enemyArmPct + '%'; $('c-enemy-arm-text').innerText = `${Math.max(0, e.armor)}/${e.maxArmor}`;
        const p = game.player;
        const nameEl = $('c-player-name-text');
        const lvlEl = $('c-player-lvl');
        if (nameEl) nameEl.innerText = p.name;
        if (lvlEl) lvlEl.innerText = `Lvl ${p.level || 1}`;
        $('c-player-hp').style.width = (this.hp/this.maxHp)*100 + '%'; $('c-player-hp-text').innerText = `${Math.max(0,this.hp)}/${this.maxHp}`;
        const armPct = this.maxArmor > 0 ? (this.armor/this.maxArmor)*100 : 0;
        $('c-player-arm').style.width = armPct + '%'; $('c-player-arm-text').innerText = `${Math.max(0,this.armor)}/${this.maxArmor}`;
        // render status icons for active DOTs
        const iconContainer = $('status-icons');
        if(iconContainer) {
            if(!this.playerDots || this.playerDots.length === 0) {
                iconContainer.innerHTML = '';
            } else {
                const parts = this.playerDots.map(dot => {
                    const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[dot.id]) ? STATUS_EFFECTS_CONFIG.effects[dot.id] : null;
                    const icon = cfg ? cfg.icon : '●';
                    const label = cfg ? cfg.label : dot.id;
                    const color = cfg ? cfg.color : '#fff';
                    return `<span class="status-badge" style="color:${color};">${icon} ${label} (${dot.remaining})</span>`;
                }).join(' ');
                iconContainer.innerHTML = parts;
            }
        }
        // render resist buff icons for DOTs
        const resistCont = $('resist-icons');
        if(resistCont) {
            const keys = this.dotResist ? Object.keys(this.dotResist).filter(k => (this.dotResist[k] || 0) > 0) : [];
            if(keys.length === 0) {
                resistCont.innerHTML = '';
            } else {
                const parts = keys.map(id => {
                    const val = this.dotResist[id] || 0;
                    const pct = Math.round(val * 100);
                    const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[id]) ? STATUS_EFFECTS_CONFIG.effects[id] : null;
                    const label = cfg ? cfg.label : id;
                    return `<span class="resist-badge">🛡 ${label} RES ${pct}%</span>`;
                }).join(' ');
                resistCont.innerHTML = parts;
            }
        }

        if(this.turn === 'player') {
            const hit = this.calcHit(game.player.stats.atk, e.def);
            const q = Math.max(5, Math.min(99, hit + 15));
            const n = Math.max(5, Math.min(99, hit));
            const p = Math.max(5, Math.min(99, hit - 20));
            $('hit-quick').innerText = q + "%"; $('hit-normal').innerText = n + "%"; $('hit-power').innerText = p + "%";
        }
    },
    logMessage(msg) {
        if(!this.log) this.log = [];
        this.log.push(msg);
        if(this.log.length > 4) this.log.shift();
        const el = $('combat-log');
        if(el) {
            // Son 3-4 satırı küçük kutuda göster
            const recent = this.log.slice(-4);
            el.innerHTML = recent.map(t => `<div>${t}</div>`).join('');
        }
    },
    toggleLogExpand() {
        const el = $('combat-log');
        if(!el) return;
        el.classList.toggle('expanded');
    },
    flashBlood() {
        const v = $('blood-vignette');
        if(!v) return;
        // Normal darbe için varsayılan kırmızı vignette arka planını kullan
        v.style.background = '';
        v.classList.remove('show');
        void v.offsetWidth;
        v.classList.add('show');
        setTimeout(() => {
            v.classList.remove('show');
        }, 220);
    },
    flashDotVignette(effects) {
        // effects: { hasPoison, hasBurn, hasBleed }
        const v = $('blood-vignette');
        if(!v) return;

        let bg = '';
        if (effects && effects.hasBleed) {
            // Kırmızı (bleed)
            bg = 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(255,0,0,0.18) 70%, rgba(120,0,0,0.8) 100%)';
        } else if (effects && effects.hasBurn) {
            // Turuncu (burn)
            bg = 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(255,140,0,0.18) 70%, rgba(180,70,0,0.8) 100%)';
        } else if (effects && effects.hasPoison) {
            // Açık yeşil (poison)
            bg = 'radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(120,255,120,0.18) 70%, rgba(0,120,0,0.8) 100%)';
        }

        if (!bg) return;

        v.style.background = bg;
        v.classList.remove('show');
        void v.offsetWidth;
        v.classList.add('show');
        setTimeout(() => {
            v.classList.remove('show');
        }, 220);
    },
    calcHit(atk, def) {
        // Base değeri daha da düşük, ATK-DEF farkına göre hit % hesapla
        // Alt sınır: hiçbir zaman %5'in altına düşmesin
        const base = 55 + (atk - def) * 5;
        return Math.max(5, Math.min(99, base));
    },
    setTurn(who) {
        this.turn = who; const ind = $('turn-indicator'); const acts = $('combat-actions');
        if(who === 'player') {
            ind.innerText = "PLAYER TURN"; ind.className = "text-green";
            // Önce butonları kilitle, DOT ve regen çözülsün, sonra oyuncu hareket etsin
            acts.style.opacity = '0.5'; acts.style.pointerEvents = 'none';

            const hasDots = this.playerDots && this.playerDots.length > 0;
            const delay = hasDots ? 1000 : 0;

            setTimeout(() => {
                let diedFromDot = false;
                if (hasDots) {
                    diedFromDot = this.applyDotTick();
                }

                // DOT'tan öldüyse, yenilgi ekranı içinde zaten tur biter, buton açma
                if (diedFromDot || this.hp <= 0) return;

                if(this.hp < this.maxHp) {
                    this.hp = Math.min(this.maxHp, this.hp + game.player.getRegen());
                }
                this.updateUI();

                // DOT ve regen çözüldükten sonra oyuncu artık hareket edebilir
                acts.style.opacity = '1';
                acts.style.pointerEvents = 'auto';
            }, delay);
        } else {
            ind.innerText = "ENEMY TURN"; ind.className = "text-red"; acts.style.opacity = '0.5'; acts.style.pointerEvents = 'none';

            // Düşman turu başında, Vitality statına göre can yenilesin
            const e = this.enemy;
            if (e && e.hp > 0 && e.hp < e.maxHp && typeof e.vit === 'number') {
                const enemyRegen = Math.floor(e.vit / 2);
                if (enemyRegen > 0) {
                    e.hp = Math.min(e.maxHp, e.hp + enemyRegen);
                    this.logMessage(`${e.name} regenerates <span class="log-heal">${enemyRegen}</span> HP.`);
                    this.updateUI();
                }
            }

            // İleride düşmana DOT eklendiğinde burada da benzer şekilde DOT önce, aksiyon sonra çözülebilir
            this.runEnemyTurn();
        }
    },
    applyDot(dotId) {
        if(typeof STATUS_EFFECTS_CONFIG === 'undefined') return;
        const cfg = STATUS_EFFECTS_CONFIG.effects[dotId];
        if(!cfg) return;
        const existing = this.playerDots.find(d => d.id === dotId);
        if(existing) {
            existing.remaining = cfg.duration;
        } else {
            this.playerDots.push({ id: dotId, remaining: cfg.duration });
        }
    },
    applyDotTick() {
        if(!this.playerDots || this.playerDots.length === 0) return false;
        if(typeof STATUS_EFFECTS_CONFIG === 'undefined') return false;
        let totalDmg = 0;
        const nextDots = [];
        let hasPoison = false;
        let hasBurn = false;
        let hasBleed = false;
        this.playerDots.forEach(dot => {
            const cfg = STATUS_EFFECTS_CONFIG.effects[dot.id];
            if(!cfg) return;
            const raw = Math.floor(this.maxHp * cfg.damagePct);
            const dmg = Math.max(1, raw);
            totalDmg += dmg;
            if (dot.id === 'poison') hasPoison = true;
            if (dot.id === 'burn') hasBurn = true;
            if (dot.id === 'bleed') hasBleed = true;
            dot.remaining -= 1;
            if(dot.remaining > 0) {
                nextDots.push(dot);
            } else {
                // DOT bitti: bu efekt icin %40 resist kazan
                const prev = this.dotResist[dot.id] || 0;
                this.dotResist[dot.id] = Math.min(0.9, prev + 0.4);
            }
        });
        this.playerDots = nextDots;
        if(totalDmg > 0) {
            this.takeDamage(totalDmg, 'player');
            // HP barını güncelle
            this.updateUI();
            // Aktif DOT tiplerine göre renkli vignette göster
            this.flashDotVignette({ hasPoison, hasBurn, hasBleed });
            this.showDmg(totalDmg, 'player', 'dot');
            this.logMessage(`Damage over time effects deal <span class="log-dmg">${totalDmg}</span> damage to you.`);
            // DOT'tan ölme durumu: HP barı sıfırlandığı anda death cross + gecikmeli defeat ekranı
            if(this.hp <= 0) {
                game.handlePlayerDeath();
                return true;
            }
        }
        return false;
    },
    takeDamage(amount, target) {
        if(target === 'player') {
            let rem = amount;
            const armorBefore = this.armor || 0;
            if(this.armor > 0) {
                if(this.armor >= amount) {
                    this.armor -= amount;
                    rem = 0;
                } else {
                    rem = amount - this.armor;
                    this.armor = 0;
                }
            }
            const armorDmg = Math.min(armorBefore, amount);
            const hpDmg = rem;
            this.hp -= hpDmg; if(this.hp < 0) this.hp = 0;
            if(armorDmg > 0) playSfx('armorHit');
            if(hpDmg > 0) {
                this.flashBlood();
                playSfx('hpHit');
            }
        } else {
            const e = this.enemy;
            if (!e) return;
            let rem = amount;
            const armorBefore = e.armor || 0;
            if (e.armor > 0) {
                if (e.armor >= amount) {
                    e.armor -= amount;
                    rem = 0;
                } else {
                    rem = amount - e.armor;
                    e.armor = 0;
                }
            }
            const armorDmg = Math.min(armorBefore, amount);
            const hpDmg = rem;
            e.hp -= hpDmg;
            if (e.hp < 0) e.hp = 0;
            if(armorDmg > 0) playSfx('armorHit');
            if(hpDmg > 0) playSfx('hpHit');
        }
    },
    async playCollisionAnimation(type, result) {
        const playerWrap = document.querySelector('.combat-avatar-player');
        const enemyWrap = document.querySelector('.combat-avatar-enemy');
        if (!playerWrap || !enemyWrap) {
            if (result && typeof result.apply === 'function') result.apply();
            return;
        }
        const origPlayerTransition = playerWrap.style.transition;
        const origEnemyTransition = enemyWrap.style.transition;
        playerWrap.style.transition = 'transform 0.18s ease-out';
        enemyWrap.style.transition = 'transform 0.18s ease-out';

        const pRect = playerWrap.getBoundingClientRect();
        const eRect = enemyWrap.getBoundingClientRect();
        const pCenterY = pRect.top + pRect.height / 2;
        const eCenterY = eRect.top + eRect.height / 2;
        const midY = (pCenterY + eCenterY) / 2;
        const pOffsetY = midY - pCenterY;
        const eOffsetY = midY - eCenterY;

        let pOffsetX = 0;
        let eOffsetX = 0;

        // 1) Y ekseninde hizalanma
        playerWrap.style.transform = `translate(${pOffsetX}px, ${pOffsetY}px)`;
        enemyWrap.style.transform = `translate(${eOffsetX}px, ${eOffsetY}px)`;
        await wait(200);

        // 2) X ekseninde çarpışma: aradaki mesafeyi oranlara böl (attacker daha çok ilerler)
        const pRect2 = playerWrap.getBoundingClientRect();
        const eRect2 = enemyWrap.getBoundingClientRect();
        const pCenterX = pRect2.left + pRect2.width / 2;
        const eCenterX = eRect2.left + eRect2.width / 2;
        const distX = eCenterX - pCenterX;
        const attackerFrac = 0.8;
        const defenderFrac = 0.3;
        let playerMoveX = 0;
        let enemyMoveX = 0;
        if (type === 'enemy') {
            enemyMoveX = -attackerFrac * distX;
            playerMoveX =  defenderFrac * distX;
        } else {
            playerMoveX =  attackerFrac * distX;
            enemyMoveX = -defenderFrac * distX;
        }
        pOffsetX += playerMoveX;
        eOffsetX += enemyMoveX;
        playerWrap.style.transform = `translate(${pOffsetX}px, ${pOffsetY}px)`;
        enemyWrap.style.transform = `translate(${eOffsetX}px, ${eOffsetY}px)`;
        await wait(120);

        // 3) Çarpışma anında sonucu uygula (hit/miss + damage)
        if (result && typeof result.apply === 'function') {
            result.apply();
        }

        // 4) Avatarları eski pozisyonlarına geri kaydır
        playerWrap.style.transform = 'translate(0px, 0px)';
        enemyWrap.style.transform = 'translate(0px, 0px)';
        await wait(150);
        playerWrap.style.transition = origPlayerTransition;
        enemyWrap.style.transition = origEnemyTransition;
    },
    async playDodgeAnimation(attacker, result) {
        const playerWrap = document.querySelector('.combat-avatar-player');
        const enemyWrap = document.querySelector('.combat-avatar-enemy');
        if (!playerWrap || !enemyWrap) {
            if (result && typeof result.apply === 'function') result.apply();
            return;
        }

        const origPlayerTransition = playerWrap.style.transition;
        const origEnemyTransition = enemyWrap.style.transition;
        playerWrap.style.transition = 'transform 0.18s ease-out';
        enemyWrap.style.transition = 'transform 0.18s ease-out';

        const pRect = playerWrap.getBoundingClientRect();
        const eRect = enemyWrap.getBoundingClientRect();
        const pCenterY = pRect.top + pRect.height / 2;
        const eCenterY = eRect.top + eRect.height / 2;
        const midY = (pCenterY + eCenterY) / 2;
        const pOffsetY = midY - pCenterY;
        const eOffsetY = midY - eCenterY;

        let pOffsetX = 0;
        let eOffsetX = 0;

        // 1) Y ekseninde hizalanma (hafif)
        playerWrap.style.transform = `translate(${pOffsetX}px, ${pOffsetY}px)`;
        enemyWrap.style.transform = `translate(${eOffsetX}px, ${eOffsetY}px)`;
        await wait(160);

        // 2) Saldıran yine ileri doğru hamle yapsın, savunan sadece yukarı/aşağı kaçsın
        const pCenterX = pRect.left + pRect.width / 2;
        const eCenterX = eRect.left + eRect.width / 2;
        const distX = eCenterX - pCenterX;
        const attackerFrac = 0.7; // saldıran yine güçlü biçimde öne gelsin
        const dodgeY = (Math.random() < 0.5 ? -1 : 1) * 22; // savunan için küçük yukarı/aşağı kaçış

        // Çarpışma anındaki dodge hareketi başlarken sesi çal
        playSfx('dodge');

        if (attacker === 'enemy') {
            // Enemy öne atılır, player sadece Y ekseninde kaçıyor gibi
            eOffsetX -= attackerFrac * distX;
            playerWrap.style.transform = `translate(${pOffsetX}px, ${pOffsetY + dodgeY}px)`;
            enemyWrap.style.transform = `translate(${eOffsetX}px, ${eOffsetY}px)`;
        } else {
            // Player öne atılır, enemy sadece Y ekseninde kaçıyor gibi
            pOffsetX += attackerFrac * distX;
            playerWrap.style.transform = `translate(${pOffsetX}px, ${pOffsetY}px)`;
            enemyWrap.style.transform = `translate(${eOffsetX}px, ${eOffsetY + dodgeY}px)`;
        }

        await wait(140);

        if (result && typeof result.apply === 'function') {
            result.apply();
        }

        // 3) Avatarları eski konumlarına döndür
        playerWrap.style.transform = 'translate(0px, 0px)';
        enemyWrap.style.transform = 'translate(0px, 0px)';
        await wait(140);
        playerWrap.style.transition = origPlayerTransition;
        enemyWrap.style.transition = origEnemyTransition;
    },
    async playerAttack(type) {
        if (this.turn !== 'player' || this.actionLock) return;
        this.actionLock = true;
        const active = document.activeElement; if (active && typeof active.blur === 'function') active.blur();
        const acts = $('combat-actions');
        acts.style.opacity = '0.8';
        acts.style.pointerEvents = 'none';
        const p = game.player; const e = this.enemy;
        if(type === 'heal') {
            const heal = Math.floor(this.maxHp * 0.4); this.hp = Math.min(this.maxHp, this.hp + heal);
            this.showDmg(heal, 'player', 'heal');
            this.logMessage(`You drink a potion and heal ${heal} HP.`);
            this.updateUI(); this.setTurn('enemy'); this.actionLock = false; return;
        }
        let hit = this.calcHit(p.getEffectiveAtk(), e.def);
        let mod = 1, bonus = 0, shake = 'shake-md';
        if(type==='quick'){ bonus=15; mod=0.7; shake='shake-sm'; }
        if(type==='power'){ bonus=-20; mod=1.5; shake='shake-lg'; }
        const effectiveHit = Math.max(5, Math.min(99, hit + bonus));
        const roll = rng(0,100);
        const didHit = roll <= effectiveHit;

        const attackResult = {
            apply: () => {
                if (didHit) {
                    const range = p.getDmgRange();
                    const baseDmg = rng(range.min, range.max);
                    let dmg = Math.floor(baseDmg * mod);
                    const critChance = 5 + p.stats.atk + p.getCritBonus();
                    let isCrit = false;
                    let isDisastrous = false;
                    if (type === 'power') {
                        const disastrousChancePlayer = 6;
                        if (rng(0,100) < disastrousChancePlayer) {
                            isDisastrous = true;
                            const critLike = Math.floor(dmg * 1.5);
                            dmg = Math.floor(critLike * 4);
                        } else if (rng(0,100) < critChance) {
                            isCrit = true;
                            dmg = Math.floor(dmg * 1.5);
                        }
                    } else {
                        if (rng(0,100) < critChance) {
                            isCrit = true;
                            dmg = Math.floor(dmg * 1.5);
                        }
                    }
                    this.takeDamage(dmg, 'enemy');
                    this.showDmg(dmg, 'enemy', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));
                    const label = type==='quick' ? 'Quick' : (type==='power' ? 'Power' : 'Normal');
                    let critText = '';
                    if (isDisastrous) critText = ' (DISASTROUS HIT!)';
                    else if (isCrit) critText = ' (CRIT)';
                    this.logMessage(`You use ${label} Attack and hit ${e.name} for <span class="log-dmg">${dmg}</span>.${critText}`);
                    const c = $('game-container');
                    const pWrap = document.querySelector('.combat-avatar-player');
                    const eWrap = document.querySelector('.combat-avatar-enemy');
                    if (c && pWrap && eWrap) {
                        const pRect = pWrap.getBoundingClientRect();
                        const eRect = eWrap.getBoundingClientRect();
                        const pCenterX = pRect.left + pRect.width / 2;
                        const pCenterY = pRect.top + pRect.height / 2;
                        const eCenterX = eRect.left + eRect.width / 2;
                        const eCenterY = eRect.top + eRect.height / 2;
                        const impactX = (pCenterX + eCenterX) / 2;
                        const impactY = (pCenterY + eCenterY) / 2;
                        const contRect = c.getBoundingClientRect();
                        c.style.setProperty('--impact-x', `${impactX - contRect.left}px`);
                        c.style.setProperty('--impact-y', `${impactY - contRect.top}px`);
                        c.classList.add(shake);
                        c.classList.add('hit-impact');
                        setTimeout(()=>{
                            c.classList.remove(shake);
                            c.classList.remove('hit-impact');
                        },500);
                    }
                    if (e.hp <= 0) {
                        const cross = $('enemy-death-cross');
                        if (cross) {
                            cross.classList.remove('enemy-death-cross-anim');
                            void cross.offsetWidth;
                            cross.classList.add('enemy-death-cross-anim');
                        }
                    }
                } else {
                    this.showDmg("DODGE", 'enemy', 'miss');
                    this.logMessage(`Your attack misses ${e.name}.`);
                }
                this.updateUI();
            }
        };

        if (didHit) {
            await this.playCollisionAnimation(type, attackResult);
        } else {
            await this.playDodgeAnimation('player', attackResult);
        }

        if(e.hp <= 0) {
            this.win();
            this.actionLock = false;
        } else {
            await wait(800);
            this.setTurn('enemy');
            this.actionLock = false;
        }
    },
    async runEnemyTurn() {
        if (this.enemyActing) return;
        this.enemyActing = true;
        $('enemy-think').style.display = 'block'; await wait(1500); $('enemy-think').style.display = 'none';
        const p = game.player; const e = this.enemy;
        let hit = this.calcHit(e.atk, p.stats.def);
        hit = Math.max(5, Math.min(99, hit - p.getDodgeBonus()));
        const roll = rng(0,100);
        const didHit = roll <= hit;

        const attackResult = {
            apply: () => {
                if (didHit) {
                    const erange = this.getEnemyDmgRange(e);
                    let dmg = rng(erange.min, erange.max);
                    const critChanceEnemy = 5 + e.atk;
                    let isCrit = false;
                    let isDisastrous = false;
                    const disastrousChanceEnemy = 3;
                    if (rng(0,100) < disastrousChanceEnemy) {
                        isDisastrous = true;
                        const critLike = Math.floor(dmg * 1.5);
                        dmg = Math.floor(critLike * 4);
                    } else if (rng(0,100) < critChanceEnemy) {
                        isCrit = true;
                        dmg = Math.floor(dmg * 1.5);
                    }
                    this.takeDamage(dmg, 'player');
                    this.showDmg(dmg, 'player', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));
                    let extra = '';
                    if (isDisastrous) extra = ' (DISASTROUS HIT!)';
                    else if (isCrit) extra = ' (CRIT)';
                    this.logMessage(`${e.name} hits you for <span class="log-dmg">${dmg}</span>.${extra}`);
                    const c = $('game-container');
                    const pWrap = document.querySelector('.combat-avatar-player');
                    const eWrap = document.querySelector('.combat-avatar-enemy');
                    if (c && pWrap && eWrap) {
                        const pRect = pWrap.getBoundingClientRect();
                        const eRect = eWrap.getBoundingClientRect();
                        const pCenterX = pRect.left + pRect.width / 2;
                        const pCenterY = pRect.top + pRect.height / 2;
                        const eCenterX = eRect.left + eRect.width / 2;
                        const eCenterY = eRect.top + eRect.height / 2;
                        const impactX = (pCenterX + eCenterX) / 2;
                        const impactY = (pCenterY + eCenterY) / 2;
                        const contRect = c.getBoundingClientRect();
                        c.style.setProperty('--impact-x', `${impactX - contRect.left}px`);
                        c.style.setProperty('--impact-y', `${impactY - contRect.top}px`);
                        c.classList.add('shake-sm');
                        c.classList.add('hit-impact');
                        setTimeout(()=>{
                            c.classList.remove('shake-sm');
                            c.classList.remove('hit-impact');
                        },400);
                    }
                    if (this.hp <= 0 && typeof game.handlePlayerDeath === 'function') {
                        game.handlePlayerDeath();
                    }
                } else {
                    this.showDmg("DODGE", 'player', 'miss');
                    this.logMessage(`${e.name}'s attack misses you.`);
                }
                this.updateUI();
            }
        };

        if (didHit) {
            await this.playCollisionAnimation('enemy', attackResult);
        } else {
            await this.playDodgeAnimation('enemy', attackResult);
        }

        if(this.hp > 0) {
            await wait(500);
            this.setTurn('player');
        }
        this.enemyActing = false;
    },
    win() {
        const p = game.player; p.wins++; 
        // ensure enemy HP bar visibly drains to 0 before victory
        if (this.enemy && this.enemy.hp > 0) this.enemy.hp = 0;
        // Önce HP/armor barlarını 0'a güncelle
        this.updateUI();
        // Sonra enemy avatar üzerinde death cross efektini tetikle
        const cross = $('enemy-death-cross');
        if (cross) {
            cross.classList.remove('enemy-death-cross-anim');
            void cross.offsetWidth; // force reflow to restart animation
            cross.classList.add('enemy-death-cross-anim');
        }
        const baseGold = 20 + (this.enemy.lvl * 10); const baseXp = 50 + (this.enemy.lvl * 15);
        const chr = p.stats.chr || 0;
        let rewardMult = 1 + chr * 0.03; // each CHR = +3%

        // Trinketlerden gelen ekstra gold/xp çarpanları
        let goldBonus = 0;
        let xpBonus = 0;
        if (p.gear) {
            TRINKET_SLOTS.forEach(slot => {
                const t = p.gear[slot];
                if (!t) return;
                if (typeof t.goldBonus === 'number') goldBonus += t.goldBonus;
                if (typeof t.xpBonus === 'number') xpBonus += t.xpBonus;
            });
        }

        const goldMult = Math.min(2.0, rewardMult + goldBonus); // toplam max +100%
        const xpMult = Math.min(2.0, rewardMult + xpBonus);

        const gold = Math.floor(baseGold * goldMult);
        const xp = Math.floor(baseXp * xpMult);
        // Victory ekranını X animasyonundan ~2.5sn sonra göster
        setTimeout(() => {
            p.gold += gold; p.xp += xp;
            // Dövüş bittiğinde kullanılmayan potları envantere geri döndür
            this.returnUnusedPotions();
            $('modal-victory').classList.remove('hidden');
            this.animateVal('vic-gold',0,gold,1000); this.animateVal('vic-xp',0,xp,1000);
            // update XP labels around the bar
            $('vic-xp-gain').innerText = xp;
            $('vic-xp-text').innerText = `${p.xp}/${p.xpMax}`;
            setTimeout(()=>{ const pct=Math.min(100,(p.xp/p.xpMax)*100); $('vic-xp-bar').style.width=pct+'%'; },100);
            // Every victory counts as a fight for shop refresh logic
            game.shopFightCount = (game.shopFightCount || 0) + 1;
            game.updateShopRefreshIndicator();
            game.saveGame();
        }, 2500);
    },
    animateVal(id,s,e,d){ let obj=$(id),r=e-s,st=new Date().getTime(),et=st+d; let t=setInterval(()=>{ let n=new Date().getTime(),rem=Math.max((et-n)/d,0),v=Math.round(e-(rem*r)); obj.innerHTML=v; if(v==e)clearInterval(t); },20); },
    showDmg(val,t,type) {
        const el=$('dmg-overlay'); 

        if(type==='disastrous'){
            el.innerHTML = `DISASTROUS HIT!<br>${val}!`;
            el.style.color = '#ff9100';
            el.style.fontSize = '5rem';
        }
        else if(type==='crit'){
            el.innerHTML = `CRITICAL!<br>${val}!`;
            el.style.color = '#ffea00';
            el.style.fontSize = '4rem';
        }
        else if(type==='miss'){
            el.innerText = "DODGE";
            el.style.color = '#ffeb3b';
            el.style.fontSize = '3.5rem';
        }
        else if(type==='dot'){
            // DOT hasarında pozitif sayı göster (eksi yok)
            el.innerText = `${val}`;
            el.style.color = '#d500f9';
            el.style.fontSize = '3.2rem';
        }
        else {
            el.innerText = val;
            el.style.fontSize = '3.5rem';
            el.style.color = (type==='heal' ? '#00e676' : (t==='player' ? '#ff1744' : '#fff'));
        }

        el.classList.remove('anim-gravity'); void el.offsetWidth; el.classList.add('anim-gravity');
    }
};

game.handlePlayerDeath = function() {
    if (!this.player) return;
    // Aynı ölüm sekansında birden fazla tetiklenmesini engelle
    if (this._deathInProgress) return;
    this._deathInProgress = true;

    const before = this.player.gold || 0;
    const lost = Math.floor(before * 0.4);
    this.player.gold = Math.max(0, before - lost);
    const lostEl = $('death-gold-lost');
    const remEl = $('death-gold-remaining');
    if (lostEl) lostEl.innerText = lost;
    if (remEl) remEl.innerText = this.player.gold;

    // Player avatar üzerindeki death cross animasyonunu tetikle
    const cross = $('player-death-cross');
    if (cross) {
        cross.classList.remove('player-death-cross-anim');
        void cross.offsetWidth;
        cross.classList.add('player-death-cross-anim');
    }

    // Ölümde de kullanılmayan combat potlarını envantere iade et
    if (window.combat && typeof combat.returnUnusedPotions === 'function') {
        combat.returnUnusedPotions();
    }

    // Death ekranını X efektinden ~2.5sn sonra göster
    setTimeout(() => {
        const m = $('modal-death');
        if (m) m.classList.remove('hidden');
        // Death also counts as a fight for shop refresh logic
        this.shopFightCount = (this.shopFightCount || 0) + 1;
        this.updateShopRefreshIndicator();
        this.saveGame();
    }, 1000);
};

game.handleDeathContinue = function() {
    const m = $('modal-death');
    if (m) m.classList.add('hidden');
    this._deathInProgress = false;
    this.showHub();
};

game.initSaves();

// expose main objects to global scope for inline HTML handlers
window.game = game;
window.combat = combat;
window.blackjack = blackjack;
