const $ = (id) => document.getElementById(id);
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AVATARS = ['🗿', '🦁', '💀', '👺'];
const SAVE_KEY = 'arenaV7_saves';
const ARMOR_SLOTS = ['head', 'neck', 'shoulders', 'chest', 'arms', 'shield', 'thighs', 'shins'];
const TRINKET_SLOTS = ['trinket1', 'trinket2'];
const BASE_STATS = {
    Warrior:  { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Beserker: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Guardian: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 }
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
        let r = rng(0, 100);
        if (r < 40) return { name: 'Common', color: 'rarity-common', mult: 1.0 };
        if (r < 70) return { name: 'Uncommon', color: 'rarity-uncommon', mult: 1.3 };
        if (r < 85) return { name: 'Rare', color: 'rarity-rare', mult: 1.6 };
        if (r < 95) return { name: 'Epic', color: 'rarity-epic', mult: 2.2 };
        return { name: 'Legendary', color: 'rarity-legendary', mult: 3.5 };
    }
    static createWeapon(lvl) {
        const rarity = this.getRarity();

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        // Filter weapons from global catalog (item_catalogs.js) by rarityKey and minShopLevel.
        let pool = (typeof WEAPONS !== 'undefined')
            ? WEAPONS.filter(w => w.rarityKey === rarityKey && (w.minShopLevel || 1) <= lvl)
            : [];
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

        let pool = (typeof ARMORS !== 'undefined')
            ? ARMORS.filter(a => a.rarityKey === rarityKey && (a.minShopLevel || 1) <= lvl)
            : [];
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

        let pool = (typeof TRINKETS !== 'undefined')
            ? TRINKETS.filter(t => t.rarityKey === rarityKey && (t.minShopLevel || 1) <= lvl)
            : [];
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
        const base = 100 + (vit * 10) + (this.level * 5);
        return Math.floor(base * this.getHpMultiplier());
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
    player: null, selectedAvatar: 0, shopStock: { weapon: [], armor: [] }, lastShopReset: 0, shopSortOrder: 'desc', shopSortKey: 'price', currentShopType: 'weapon',
    saveSlots: [], lastSlot: -1, currentSlotIndex: -1,

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
    newGameView() {
        if (!this.ensureSlotForNewPlayer()) return;
        $('screen-start').classList.add('hidden'); $('screen-creation').classList.remove('hidden');
        // creation ekranına girerken varsayılan karakter + stat panelini hemen hazırla
        this.createCharacter();
    },
    createCharacter() {
        const name = $('inp-name').value || "Gladiator";
        const cls = $('inp-class').value;
        this.player = new Player(name, cls, this.selectedAvatar);
        const rustTemplate = (typeof getWeaponTemplateByKey === 'function')
            ? getWeaponTemplateByKey('rusty_sword')
            : (typeof WEAPONS !== 'undefined' ? WEAPONS.find(w => w.key === 'rusty_sword') : null);
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
        const lvl = this.player.level;
        for(let i=0; i<8; i++) this.shopStock.weapon.push(ItemSystem.createWeapon(lvl));
        for(let i=0; i<8; i++) this.shopStock.armor.push(ItemSystem.createArmor(lvl));
        for(let i=0; i<6; i++) {
            const t = ItemSystem.createTrinket(lvl);
            if (t) this.shopStock.trinket.push(t);
        }
        this.sortShop(this.shopStock.weapon);
        this.sortShop(this.shopStock.armor);
        this.sortShop(this.shopStock.trinket);
        this.lastShopReset = this.player.wins;
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
    toggleSort(key = 'price') {
        // change key or flip order if same key
        if (this.shopSortKey === key) {
            this.shopSortOrder = (this.shopSortOrder === 'desc') ? 'asc' : 'desc';
        } else {
            this.shopSortKey = key;
            this.shopSortOrder = 'desc';
        }
        const mode = this.currentListMode || 'shop';
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
        document.querySelectorAll('.menu-screen, .hidden').forEach(e => { if(!e.classList.contains('modal-overlay')) e.classList.add('hidden'); });
        $('screen-combat').classList.add('hidden'); $('screen-hub').classList.remove('hidden'); this.updateHubUI();
    },
    openStatsHelp() {
        const m = $('modal-stats');
        if(m) m.classList.remove('hidden');
    },
    closeStatsHelp() {
        const m = $('modal-stats');
        if(m) m.classList.add('hidden');
    },
    openArmorPanel() {
        const p = this.player;
        const list = $('armor-list');
        const summary = $('armor-summary');
        const totalEl = $('armor-total');
        if(!p || !list || !summary || !totalEl) return;
        list.innerHTML = '';
        const totalArmor = p.getTotalArmor();
        const equippedCount = ARMOR_SLOTS.filter(s => p.gear[s]).length;
        summary.innerText = `Equipped armor pieces: ${equippedCount}/${ARMOR_SLOTS.length}`;
        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const buildPreview = (item, slot) => {
            if (!item || !previewBody) return;
            const rarityText = (item.rarity || '').replace('rarity-','');
            let lines = [];
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            const val = (typeof item.val === 'number') ? item.val : 0;
            lines.push(`<div><span class="text-shield">Armor:</span> ${val}</div>`);
            if (slot) lines.push(`<div><span class="text-blue">Slot:</span> ${slot}</div>`);
            lines.push(`<div style="margin-top:6px; font-size:0.8rem; color:#aaa;">Rarity: ${rarityText}</div>`);
            previewBody.innerHTML = lines.join('');

            // Update armor icon in tooltip for armor panel
            if (previewIcon) {
                const iconPath = getArmorIconPath(item);
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
        ARMOR_SLOTS.forEach(slot => {
            const item = p.gear[slot];
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.marginBottom = '6px';
            const title = slot.charAt(0).toUpperCase()+slot.slice(1);
            let rightHtml;
            if(item) {
                const val = (typeof item.val === 'number') ? ` (+${item.val})` : '';
                rightHtml = `<span class="${item.rarity}">${item.name}</span><span style="color:#888; font-size:0.8rem;">${val}</span>`;
            } else {
                rightHtml = `<span style="color:#444;">-</span>`;
            }
            row.innerHTML = `<span>${title}</span><span>${rightHtml}</span>`;
            if (item && previewBox && previewBody) {
                row.onmouseenter = (ev) => {
                    buildPreview(item, slot);
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
            list.appendChild(row);
        });
        totalEl.innerText = totalArmor;
        $('modal-armor').classList.remove('hidden');
    },
    closeArmorPanel() { $('modal-armor').classList.add('hidden'); },
    goToMainMenu() {
        // Hide all main screens
        document.querySelectorAll('.menu-screen').forEach(e => e.classList.add('hidden'));
        // Hide combat screen explicitly
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        // Hide all modals
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
        // Show start screen
        const start = $('screen-start');
        if (start) start.classList.remove('hidden');
    },
    updateHubUI() {
        const p = this.player;
        $('ui-name').innerText = p.name; $('ui-lvl').innerText = p.level; $('ui-gold').innerText = p.gold; $('ui-avatar').innerText = p.avatar;
        const dmg = p.getDmgRange(); const arm = p.getTotalArmor();

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
            <div class="stat-row"><span>Strength</span> <span class="text-orange">${effStr}${strBonus>0?` <small>(base ${p.stats.str} +${strBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('str',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('str',1)">+</button></span></div>
            <div class="stat-row"><span>Attack</span> <span class="text-red">${effAtk}${atkBonus>0?` <small>(base ${p.stats.atk} +${atkBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('atk',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('atk',1)">+</button></span></div>
            <div class="stat-row"><span>Defence</span> <span class="text-blue">${effDef}${defBonus>0?` <small>(base ${p.stats.def} +${defBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('def',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('def',1)">+</button></span></div>
            <div class="stat-row"><span>Vitality</span> <span class="text-green">${effVit}${vitBonus>0?` <small>(base ${p.stats.vit} +${vitBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('vit',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('vit',1)">+</button></span></div>
            <div class="stat-row"><span>Magicka</span> <span class="text-purple">${effMag}${magBonus>0?` <small>(base ${p.stats.mag} +${magBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('mag',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('mag',1)">+</button></span></div>
            <div class="stat-row"><span>Charisma</span> <span class="text-gold">${effChr}${chrBonus>0?` <small>(base ${chrBase} +${chrBonus})</small>`:''} <button class="btn-xs" onclick="game.debugModStat('chr',-1)">-</button><button class="btn-xs" onclick="game.debugModStat('chr',1)">+</button></span></div>
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
                    const baseLower = (item.baseType || '').toLowerCase();
                    const isLegendary = item.rarityKey === 'legendary';
                    const baseName = isLegendary ? cleanLegendaryWeaponName(item) : item.name;
                    let tags = '';
                    if(isLegendary) {
                        const parts = [];
                        if(baseLower) parts.push(`[${baseLower}]`);
                        if (parts.length) tags = ` <span style="color:#888; font-size:0.75rem;">${parts.join(' ')}</span>`;
                    }
                    // Hub'daki Melee Weapon satırı için isim span'ine id ver (tooltip hedefi)
                    const spanId = (slot === 'weapon') ? 'hub-weapon-name' : '';
                    const idAttr = spanId ? ` id="${spanId}"` : '';
                    display = `<span${idAttr} class="${item.rarity}">${baseName}${tags}</span>${dmgText}`;
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
        // Attach click handler and hub weapon tooltip after injecting HTML
        setTimeout(() => {
            const btn = document.querySelector('#ui-equip .stat-row button');
            if(btn) btn.onclick = () => game.openArmorPanel();

            const wName = $('hub-weapon-name');
            const weapon = p.gear.weapon;
            const previewBox = $('shop-preview');
            const previewBody = $('shop-preview-body');
            const previewIcon = $('shop-preview-icon');
            if (wName && weapon && previewBox && previewBody) {
                const buildPreview = () => {
                    const rarityText = (weapon.rarity || '').replace('rarity-','');
                    let lines = [];
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${weapon.rarity}">${weapon.name}</div>`);
                    lines.push(`<div><span class="text-orange">Damage:</span> ${weapon.min}-${weapon.max}</div>`);
                    if (weapon.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${weapon.baseType}</div>`);
                    lines.push(`<div style="margin-top:6px; font-size:0.8rem; color:#aaa;">Rarity: ${rarityText}</div>`);
                    previewBody.innerHTML = lines.join('');

                    // Update weapon type icon for hub equipped weapon
                    if (previewIcon && typeof getWeaponIconPath === 'function') {
                        const iconPath = getWeaponIconPath(weapon);
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
                    buildPreview();
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

            // Hub trinket tooltips (use same preview box)
            const setupTrinketHover = (elId, trinket) => {
                const el = $(elId);
                if (!el || !trinket || !previewBox || !previewBody) return;
                const buildPreview = () => {
                    const rarityText = (trinket.rarity || '').replace('rarity-','');
                    const lines = [];
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${trinket.rarity}">${trinket.name}</div>`);
                    if (trinket.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${trinket.baseType}</div>`);
                    if (trinket.statMods) {
                        Object.entries(trinket.statMods).forEach(([k,v]) => {
                            lines.push(`<div><span class="text-gold">${k.toUpperCase()}:</span> ${v >= 0 ? '+' : ''}${v}</div>`);
                        });
                    }
                    if (typeof trinket.goldBonus === 'number') {
                        lines.push(`<div><span class="text-gold">Gold Bonus:</span> +${Math.round(trinket.goldBonus*100)}%</div>`);
                    }
                    if (typeof trinket.xpBonus === 'number') {
                        lines.push(`<div><span class="text-purple">XP Bonus:</span> +${Math.round(trinket.xpBonus*100)}%</div>`);
                    }
                    const rarityLabel = rarityText || 'unknown';
                    lines.push(`<div style="margin-top:6px; font-size:0.8rem; color:#aaa;">Rarity: ${rarityLabel}</div>`);
                    if (trinket.info) {
                        const infoClass = trinket.infoColor || 'text-gold';
                        lines.push(`<div style="margin-top:6px; font-size:0.8rem;" class="${infoClass}">${trinket.info}</div>`);
                    }
                    previewBody.innerHTML = lines.join('');

                    // Handle item type icon (weapon / armor)
                    if (previewIcon) {
                        if (trinket.iconPath) {
                            previewIcon.src = trinket.iconPath;
                            previewIcon.classList.remove('hidden');
                        } else {
                            previewIcon.src = '';
                            previewIcon.classList.add('hidden');
                        }
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

            setupTrinketHover('hub-trinket1-name', p.gear.trinket1);
            setupTrinketHover('hub-trinket2-name', p.gear.trinket2);
        }, 0);
        
        $('ui-equip').innerHTML = html;
    },
    doUnequip(slot) { this.player.unequip(slot); this.updateHubUI(); this.saveGame(); },
    openShop(type) {
        if(this.player.wins - this.lastShopReset >= 4) this.generateShopStock();
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
    },
    openInventory() {
        $('screen-hub').classList.add('hidden'); $('screen-list').classList.remove('hidden');
        this.renderList(this.player.inventory, 'inv'); $('shop-gold').innerText = this.player.gold;
    },
    renderList(items, mode) {
        this.currentListMode = mode;
        const cont = $('list-container'); cont.innerHTML = '';
        if (mode === 'shop') {
            const type = this.currentShopType || 'weapon';
            let title = 'SHOP';
            if (type === 'weapon') title = 'WEAPONSMITH';
            else if (type === 'armor') title = 'ARMORY';
            else if (type === 'trinket') title = 'TRINKET SHOP';
            $('list-title').innerText = title;
        } else {
            $('list-title').innerText = 'INVENTORY';
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
                if (item.weaponClass) return item.weaponClass;
                if (item.baseType) return item.baseType;
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
            const minLvl = getItemMinLevel(item);
            let lines = [];
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            if (item.type === 'weapon') {
                lines.push(`<div><span class="text-orange">Damage:</span> ${item.min}-${item.max}</div>`);
                if (item.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${item.baseType}</div>`);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                lines.push(`<div><span class="text-shield">Armor:</span> ${val}</div>`);
                if (item.slot) lines.push(`<div><span class="text-blue">Slot:</span> ${item.slot}</div>`);
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

            // Handle item type icon (weapon / armor)
            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') {
                    iconPath = getWeaponIconPath(item);
                } else if (item.type === 'armor') {
                    iconPath = getArmorIconPath(item);
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
                let statDisplay;
                if (isWeapon) {
                    statDisplay = `Dmg: ${equipped.min}-${equipped.max}`;
                } else if (equipped.type === 'armor') {
                    statDisplay = `Armor: ${equipped.val}`;
                } else if (equipped.type === 'trinket') {
                    statDisplay = 'Trinket';
                } else {
                    statDisplay = '';
                }
                const slotTag = !isWeapon ? ` <span style="color:#666; font-size:0.7rem">[${slot}]</span>` : '';
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `<div class="${equipped.rarity}">${baseName}${nameSuffix}${slotTag}</div><div style="font-size:0.8rem;">${equipped.rarity.replace('rarity-','')}</div><div style="font-size:0.8rem; color:#ccc;">${statDisplay}</div><div class="text-gold">-</div><button class="btn" style="padding:5px 10px; font-size:0.8rem;">Unequip</button>`;
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

        if(items.length === 0 && cont.children.length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">Empty</div>'; return; }

        items.forEach((item, idx) => {
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
            }

            const cls = item.type === 'weapon' ? (item.weaponClass || '').toLowerCase() : '';
            const baseLower = item.type === 'weapon' ? (item.baseType || '').toLowerCase() : '';
            const slotTag = item.type === 'armor' ? ` <span style="color:#666; font-size:0.7rem">[${item.slot}]</span>` : '';
            const isLegendaryWeapon = item.type === 'weapon' && item.rarityKey === 'legendary';
            const showTags = (mode !== 'shop');
            const minLvl = getItemMinLevel(item);
            const lvlOk = !this.player || (this.player.level >= minLvl);
            let nameHtml;
            if(isLegendaryWeapon) {
                const baseName = cleanLegendaryWeaponName(item);
                const parts = [];
                if(baseLower) parts.push(`[${baseLower}]`);
                const tags = (showTags && parts.length)
                    ? ` <span style="color:#666; font-size:0.7rem">${parts.join(' ')}</span>`
                    : '';
                nameHtml = `${baseName}${tags}`;
            } else {
                const classTag = (item.type === 'weapon' && cls && showTags)
                    ? ` <span style="color:#666; font-size:0.7rem">[${cls}]</span>`
                    : '';
                const slotPart = (item.type === 'armor' && showTags) ? slotTag : '';
                nameHtml = `${item.name}${slotPart}${classTag}`;
            }
            const btnTxt = mode === 'shop' ? `Buy` : 'Equip';
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
                        this.player.inventory.push(item);
                        items.splice(idx, 1);
                        this.renderList(items, mode);
                        $('shop-gold').innerText = this.player.gold;
                    }
                } else {
                    this.player.equip(item);
                    this.renderList(this.player.inventory, mode);
                }
            };
            cont.appendChild(div);
        });
    },
    saveGame() {
        if (!this.player) return;
        const meta = this.loadSaveMeta();
        if (this.currentSlotIndex < 0 || this.currentSlotIndex >= 5) {
            if (meta.slots.length >= 5) return; // cannot save more
            this.currentSlotIndex = meta.slots.length;
        }
        meta.slots[this.currentSlotIndex] = this.player;
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
    triggerLevelUp() { this.player.pts = 3; this.tempStats = {...this.player.stats}; $('modal-levelup').classList.remove('hidden'); this.renderLvlUI(); },
    renderLvlUI() { 
        const c = $('stat-allocator'); c.innerHTML=''; 
        ['str','atk','def','vit','mag','chr'].forEach(k=>{ 
            const d=document.createElement('div'); d.style.display='flex'; d.style.justifyContent='space-between'; d.style.marginBottom='10px';
            d.innerHTML=`<span>${k.toUpperCase()} <span class="text-blue">${this.tempStats[k]}</span></span><div><button class="btn" onclick="game.modStat('${k}',-1)">-</button><button class="btn" onclick="game.modStat('${k}',1)">+</button></div>`; c.appendChild(d);
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
        this.showHub();
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
    playerDots: [], // active DOT effects on player
    dotResist: {},  // per-combat resistance per DOT id (0-1)
    log: [],        // recent combat log lines
    getEnemyMaxHp(e) {
        // Player HP: 100 + VIT*10 + lvl*5 (sonra Guardian çarpanı)
        // Enemy için biraz daha düşük bir versiyon kullanalım
        const vit = e.vit || 0;
        const lvl = e.lvl || 1;
        return 90 + (vit * 8) + (lvl * 4);
    },
    getEnemyDmgRange(e) {
        // Player damage: weapon.min/max + STR*2
        // Enemy için hafif daha zayıf: weapon.min/max + floor(STR * 1.5)
        const str = e.str || 0;
        const strBonus = Math.floor(str * 1.5);
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
        const s = p.level;
        const enemyName = ["Orc", "Goblin", "Bandit", "Skeleton", "Troll"][rng(0,4)];

        // Düşman statlarını seviye ile orantılı hesapla
        // Basit kural: toplam STR+ATK+DEF+VIT = 9 + (level - 1) * 3
        const totalPts = 9 + 3 * Math.max(0, s - 1);
        // Temel ağırlıklar (farklı düşman tipleri için ufak varyasyon)
        let wStr = 3, wAtk = 3, wDef = 1, wVit = 2;
        if (enemyName === 'Orc' || enemyName === 'Troll') { wStr = 4; wAtk = 3; wDef = 1; wVit = 2; }
        else if (enemyName === 'Goblin') { wStr = 2; wAtk = 4; wDef = 1; wVit = 2; }
        else if (enemyName === 'Skeleton') { wStr = 2; wAtk = 3; wDef = 3; wVit = 1; }
        else if (enemyName === 'Bandit') { wStr = 3; wAtk = 3; wDef = 2; wVit = 2; }

        const wSum = wStr + wAtk + wDef + wVit;
        // Toplam puanı ağırlıklara göre bölüştür
        let baseStr = Math.max(0, Math.floor(totalPts * wStr / wSum));
        let baseAtk = Math.max(0, Math.floor(totalPts * wAtk / wSum));
        let baseDef = Math.max(0, Math.floor(totalPts * wDef / wSum));
        let baseVit = Math.max(0, Math.floor(totalPts * wVit / wSum));
        let curSum = baseStr + baseAtk + baseDef + baseVit;
        let rem = totalPts - curSum;
        // Kalan puanları STR/ATK/VIT'e dağıt
        const order = ['str','atk','vit'];
        const stats = { str: baseStr, atk: baseAtk, def: baseDef, vit: baseVit };
        let oi = 0;
        while (rem > 0) {
            const key = order[oi % order.length];
            stats[key] += 1;
            rem--;
            oi++;
        }

        // Temel enemy statları (HP formülü şimdilik eskisi gibi kalsın)
        this.enemy = {
            name: enemyName,
            lvl: s,
            maxHp: 0,
            hp: 0,
            str: stats.str,
            atk: stats.atk,
            def: stats.def,
            vit: stats.vit,
            mag: 0
        };

        // Enemy silahını merkezi WEAPONS kataloğundan seç
        let desiredClass = 'Sword';
        if (enemyName === 'Orc' || enemyName === 'Troll') desiredClass = 'Axe';
        else if (enemyName === 'Goblin') desiredClass = 'Dagger';
        else if (enemyName === 'Skeleton') desiredClass = 'Spear';
        else if (enemyName === 'Bandit') desiredClass = 'Sword';

        let enemyWeapon = null;
        if (typeof WEAPONS !== 'undefined') {
            let pool = WEAPONS.filter(w => {
                const cls = (w.weaponClass || w.baseType || '').toLowerCase();
                const want = desiredClass.toLowerCase();
                const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                return cls.includes(want) && lvlReq <= s;
            });
            if (pool.length === 0) {
                pool = WEAPONS.filter(w => {
                    const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                    return lvlReq <= s;
                });
            }
            if (pool.length > 0) {
                const tpl = pool[rng(0, pool.length - 1)];
                enemyWeapon = { ...tpl };
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
    updateUI() {
        const e = this.enemy;
        $('c-enemy-name').innerText = e.name; $('c-enemy-lvl').innerText = `Lvl ${e.lvl}`;
        $('c-enemy-hp').style.width = (e.hp/e.maxHp)*100 + '%'; $('c-enemy-hp-text').innerText = `${Math.max(0,e.hp)}/${e.maxHp}`;

        $('c-player-name').innerText = game.player.name;
        $('c-player-hp').style.width = (this.hp/this.maxHp)*100 + '%'; $('c-player-hp-text').innerText = `${Math.max(0,this.hp)}/${this.maxHp}`;
        const armPct = this.maxArmor > 0 ? (this.armor/this.maxArmor)*100 : 0;
        $('c-player-arm').style.width = armPct + '%'; $('c-player-arm-text').innerText = `${Math.max(0,this.armor)}/${this.maxArmor}`;
        $('c-regen').innerText = game.player.getRegen();
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
            $('hit-quick').innerText = Math.min(99, hit+15) + "%"; $('hit-normal').innerText = Math.min(99, hit) + "%"; $('hit-power').innerText = Math.min(99, hit-20) + "%";
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
    calcHit(atk, def) { return Math.max(10, Math.min(99, 80 + (atk - def) * 2)); },
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
            // Aktif DOT tiplerine göre renkli vignette göster
            this.flashDotVignette({ hasPoison, hasBurn, hasBleed });
            this.showDmg(totalDmg, 'player', 'dot');
            this.logMessage(`Damage over time effects deal <span class="log-dmg">${totalDmg}</span> damage to you.`);
            // DOT'tan ölme durumu: hemen yenilgi ekranını tetikle
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
            if(this.armor > 0) { if(this.armor >= amount) { this.armor -= amount; rem = 0; } else { rem = amount - this.armor; this.armor = 0; } }
            this.hp -= rem; if(this.hp < 0) this.hp = 0;
            if(rem > 0) this.flashBlood();
        } else {
            this.enemy.hp -= amount;
            if (this.enemy.hp < 0) this.enemy.hp = 0;
        }
    },
    async playerAttack(type) {
        // Prevent spamming attack buttons while an action is in progress
        if(this.turn !== 'player' || this.actionLock) return;
        // remove focus highlight from whichever button was clicked
        const active = document.activeElement; if(active && typeof active.blur === 'function') active.blur();
        // visually dim and lock the action buttons until this action resolves
        const acts = $('combat-actions');
        acts.style.opacity = '0.8';
        acts.style.pointerEvents = 'none';
        this.actionLock = true;
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

        if(rng(0,100) <= hit+bonus) {
            const range = p.getDmgRange();
            const baseDmg = rng(range.min, range.max);
            let dmg = Math.floor(baseDmg * mod);

            // Kritik ve Disastrous Hit hesapla
            const critChance = 5 + p.stats.atk + p.getCritBonus();
            let isCrit = false;
            let isDisastrous = false;

            if (rng(0,100) < critChance) {
                isCrit = true;
                let critDmg = Math.floor(dmg * 1.5); // normal crit

                if (type === 'power') {
                    // Oyuncu için Disastrous şansı (örnek: %6)
                    const disastrousChancePlayer = 6;
                    if (rng(0,100) < disastrousChancePlayer) {
                        isDisastrous = true;
                        // normal crit hasarının 4 katı
                        dmg = Math.floor(critDmg * 4);
                    } else {
                        dmg = critDmg;
                    }
                } else {
                    dmg = critDmg;
                }
            }

            this.takeDamage(dmg, 'enemy');
            this.showDmg(dmg, 'enemy', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));
            const label = type==='quick' ? 'Quick' : (type==='power' ? 'Power' : 'Normal');
            let critText = '';
            if (isDisastrous) critText = ' (DISASTROUS HIT!)';
            else if (isCrit) critText = ' (CRIT)';
            this.logMessage(`You use ${label} Attack and hit ${e.name} for <span class="log-dmg">${dmg}</span>.${critText}`);
            const c=$('game-container'); c.classList.add(shake); setTimeout(()=>c.classList.remove(shake),500);
        } else {
            this.showDmg("DODGE", 'enemy', 'miss');
            this.logMessage(`Your attack misses ${e.name}.`);
        }
        this.updateUI();
        if(e.hp <= 0) { await wait(1000); this.win(); this.actionLock = false; } else { await wait(800); this.setTurn('enemy'); this.actionLock = false; }
    },
    async runEnemyTurn() {
        $('enemy-think').style.display = 'block'; await wait(1500); $('enemy-think').style.display = 'none';
        const p = game.player; const e = this.enemy;
        let hit = this.calcHit(e.atk, p.stats.def);
        hit = Math.max(10, Math.min(99, hit - p.getDodgeBonus()));
        if(rng(0,100) <= hit) {
            const erange = this.getEnemyDmgRange(e);
            let dmg = rng(erange.min, erange.max);

            // Düşman kritik ve Disastrous Hit
            const critChanceEnemy = 5 + e.atk;
            let isCrit = false;
            let isDisastrous = false;

            if (rng(0,100) < critChanceEnemy) {
                isCrit = true;
                let critDmg = Math.floor(dmg * 1.5);

                // Düşman için daha düşük Disastrous şansı (örnek: %3)
                const disastrousChanceEnemy = 3;
                if (rng(0,100) < disastrousChanceEnemy) {
                    isDisastrous = true;
                    dmg = Math.floor(critDmg * 4);
                } else {
                    dmg = critDmg;
                }
            }

            this.takeDamage(dmg, 'player');
            this.showDmg(dmg, 'player', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));

            let extra = '';
            if (isDisastrous) extra = ' (DISASTROUS HIT!)';
            else if (isCrit) extra = ' (CRIT)';

            this.logMessage(`${e.name} hits you for <span class="log-dmg">${dmg}</span>.${extra}`);
            // chance to apply DOTs based on enemy type, reduced by per-effect resistance
            if(typeof STATUS_EFFECTS_CONFIG !== 'undefined') {
                const defs = STATUS_EFFECTS_CONFIG.enemies[e.name];
                if(defs && Array.isArray(defs)) {
                    defs.forEach(def => {
                        const baseChance = def.chance || 0;
                        const resist = this.dotResist && this.dotResist[def.effect] ? this.dotResist[def.effect] : 0;
                        const effectiveChance = baseChance * (1 - resist);
                        if(Math.random() <= effectiveChance) this.applyDot(def.effect);
                    });
                }
            }
            const c=$('game-container'); c.classList.add('shake-sm'); setTimeout(()=>c.classList.remove('shake-sm'),300);
        } else {
            this.showDmg("DODGE", 'player', 'miss');
            this.logMessage(`${e.name}'s attack misses you.`);
        }
        this.updateUI();
        if(this.hp <= 0) { await wait(1000); game.handlePlayerDeath(); }
        else { await wait(500); this.setTurn('player'); }
    },
    win() {
        const p = game.player; p.wins++; 
        // ensure enemy HP bar visibly drains to 0 before victory
        if (this.enemy && this.enemy.hp > 0) this.enemy.hp = 0;
        this.updateUI();
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
        p.gold += gold; p.xp += xp;
        $('modal-victory').classList.remove('hidden');
        this.animateVal('vic-gold',0,gold,1000); this.animateVal('vic-xp',0,xp,1000);
        // update XP labels around the bar
        $('vic-xp-gain').innerText = xp;
        $('vic-xp-text').innerText = `${p.xp}/${p.xpMax}`;
        setTimeout(()=>{ const pct=Math.min(100,(p.xp/p.xpMax)*100); $('vic-xp-bar').style.width=pct+'%'; },100);
        game.saveGame();
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
    const before = this.player.gold || 0;
    const lost = Math.floor(before * 0.4);
    this.player.gold = Math.max(0, before - lost);
    const lostEl = $('death-gold-lost');
    const remEl = $('death-gold-remaining');
    if (lostEl) lostEl.innerText = lost;
    if (remEl) remEl.innerText = this.player.gold;
    const m = $('modal-death');
    if (m) m.classList.remove('hidden');
    this.saveGame();
};

game.handleDeathContinue = function() {
    const m = $('modal-death');
    if (m) m.classList.add('hidden');
    this.showHub();
};

game.initSaves();

// expose main objects to global scope for inline HTML handlers
window.game = game;
window.combat = combat;
window.blackjack = blackjack;
