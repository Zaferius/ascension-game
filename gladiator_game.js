const $ = (id) => document.getElementById(id);
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AVATARS = ['🗿', '🦁', '💀', '👺'];
const SAVE_KEY = 'arenaV7_saves';
const ARMOR_SLOTS = ['head', 'neck', 'shoulders', 'chest', 'arms', 'shield', 'thighs', 'shins'];
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
        const baseTypes = ["Blade", "Longsword", "War Axe", "Hammer", "Mace", "Dagger", "Spear", "Halberd", "Bow", "Crossbow"];
        const baseType = baseTypes[rng(0, baseTypes.length-1)];
        const weaponClassMap = {
            Axe: ["War Axe"],
            Sword: ["Blade", "Longsword"],
            Hammer: ["Hammer", "Mace"],
            Dagger: ["Dagger"],
            Spear: ["Spear", "Halberd"],
            Bow: ["Bow", "Crossbow"]
        };
        let weaponClass = 'Weapon';
        Object.keys(weaponClassMap).forEach(cls => {
            if (weaponClassMap[cls].includes(baseType)) weaponClass = cls;
        });
        const baseMin = Math.floor((lvl * 3 + rng(2, 5)) * rarity.mult);
        const baseMax = baseMin + Math.floor((lvl * 2 + rng(3, 6)) * rarity.mult);

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        let displayName = (typeof generateItemName === 'function')
            ? generateItemName({ category: 'weapon', rarity: rarityKey, baseType })
            : `${rarity.name} ${baseType}`;

        if (rarityKey === 'legendary') {
            const escaped = baseType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`\\b${escaped}\\b`, 'i');
            displayName = displayName.replace(re, '').replace(/\s+/g, ' ').trim();
        }

        return {
            id: Date.now()+Math.random(),
            type: 'weapon',
            category: 'weapon',
            rarityKey,
            baseType,
            weaponClass,
            name: displayName,
            min: baseMin,
            max: baseMax,
            stat: 'Damage',
            rarity: rarity.color,
            price: Math.floor(baseMax * 15)
        };
    }
    static createArmor(lvl) {
        const rarity = this.getRarity();
        const slot = ARMOR_SLOTS[rng(0, ARMOR_SLOTS.length-1)];
        const slotBaseMap = {
            head:    ["Helm","War Helm","Battle Mask"],
            neck:    ["Amulet","Gorget","Collar"],
            shoulders:["Pauldrons","Mantle"],
            chest:   ["Breastplate","Chestplate","Cuirass"],
            arms:    ["Gauntlets","Bracers"],
            shield:  ["Shield","Bulwark","Aegis"],
            thighs:  ["Legplates","Tassets"],
            shins:   ["Greaves","War Boots"]
        };
        const possible = slotBaseMap[slot] || ["Armor"];
        const baseType = possible[rng(0, possible.length-1)];
        const val = Math.floor((lvl * 2 + rng(1, 5)) * rarity.mult);

        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        const displayName = (typeof generateItemName === 'function')
            ? generateItemName({ category: 'armor', rarity: rarityKey, slot, baseType })
            : `${rarity.name} ${baseType}`;

        return {
            id: Date.now()+Math.random(),
            type: 'armor',
            category: 'armor',
            rarityKey,
            slot,
            baseType,
            name: displayName,
            val: val,
            stat: 'Armor',
            rarity: rarity.color,
            price: Math.floor(val * 15)
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
        this.wins = 0; this.pts = 0;
    }
    // --- Class passives helpers ---
    getEffectiveStr() {
        let s = this.stats.str;
        if (this.class === 'Beserker') s += Math.floor(this.stats.str / 3); // +1 STR per 3 STR
        return s;
    }
    getEffectiveAtk() {
        let a = this.stats.atk;
        if (this.class === 'Warrior') a += Math.floor(this.stats.atk / 3); // +1 ATK per 3 ATK
        return a;
    }
    getEffectiveVit() {
        let v = this.stats.vit;
        if (this.class === 'Guardian') v += Math.floor(this.stats.vit / 3); // +1 VIT per 3 VIT
        return v;
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
        const slot = item.type === 'weapon' ? 'weapon' : item.slot;
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
        this.player.equip({ id:1, type:'weapon', name:'Rusty Sword', min:3, max:6, stat:'Damage', rarity:'rarity-common', price:5, weaponClass:'Sword', baseType:'Sword' });
        // Başlangıçta 9 stat puanı dağıtma panelini (creation ekranının sağ tarafı) hazırla
        this.player.pts = 9;
        this.tempCreateStats = { ...this.player.stats };
        this.renderCreateUI();
    },
    generateShopStock() {
        this.shopStock.weapon=[]; this.shopStock.armor=[];
        const lvl = this.player.level;
        for(let i=0; i<8; i++) this.shopStock.weapon.push(ItemSystem.createWeapon(lvl));
        for(let i=0; i<8; i++) this.shopStock.armor.push(ItemSystem.createArmor(lvl));
        this.sortShop(this.shopStock.weapon); this.sortShop(this.shopStock.armor);
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
            const list = type === 'weapon' ? this.shopStock.weapon : this.shopStock.armor;
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
        const strBonus = effStr - p.stats.str;
        const atkBonus = effAtk - p.stats.atk;
        const vitBonus = effVit - p.stats.vit;

        $('ui-stats').innerHTML = `
            <div class="stat-row"><span>Strength</span> <span class="text-orange">${effStr}${strBonus>0?` <small>(base ${p.stats.str} +${strBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Attack</span> <span class="text-red">${effAtk}${atkBonus>0?` <small>(base ${p.stats.atk} +${atkBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Defence</span> <span class="text-blue">${p.stats.def}</span></div>
            <div class="stat-row"><span>Vitality</span> <span class="text-green">${effVit}${vitBonus>0?` <small>(base ${p.stats.vit} +${vitBonus})</small>`:''}</span></div>
            <div class="stat-row"><span>Magicka</span> <span class="text-purple">${p.stats.mag}</span></div>
            <div class="stat-row"><span>Charisma</span> <span class="text-gold">${(p.stats.chr ?? 0)}</span></div>
            <div style="margin-top:10px; color:#fff; font-size:0.8rem; text-align:center;">Health: ${p.getMaxHp()} | <span class="text-shield">Armor: ${arm}</span></div>
            <div style="margin-top:4px; color:#ff9100; font-size:0.8rem; text-align:center;">Weapon Damage: ${dmg.min}-${dmg.max}</div>
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
        }, 0);
        
        $('ui-equip').innerHTML = html;
    },
    doUnequip(slot) { this.player.unequip(slot); this.updateHubUI(); this.saveGame(); },
    openShop(type) {
        if(this.player.wins - this.lastShopReset >= 4) this.generateShopStock();
        // remember which category is currently open so sorting works on the right list
        this.currentShopType = type;
        let list = type === 'weapon' ? this.shopStock.weapon : this.shopStock.armor;
        // if for any reason the list is empty (e.g. loaded save), regenerate shop stock once
        if(!list || list.length === 0) {
            this.generateShopStock();
            list = type === 'weapon' ? this.shopStock.weapon : this.shopStock.armor;
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
            $('list-title').innerText = (type === 'weapon') ? 'WEAPONSMITH' : 'ARMORY';
        } else {
            $('list-title').innerText = 'INVENTORY';
        }

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
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
            lines.push(`<div style="margin-top:6px; font-size:0.8rem; color:#aaa;">Rarity: ${rarityText}</div>`);
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
                const statDisplay = isWeapon
                    ? `Dmg: ${equipped.min}-${equipped.max}`
                    : `Armor: ${equipped.val}`;
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
            } else {
                const current = this.player.gear[item.slot];
                const curVal = current ? current.val : 0;
                const diff = item.val - curVal;
                diffHtml = diff > 0 ? `<span class="diff-pos">(+${diff})</span>` : (diff < 0 ? `<span class="diff-neg">(${diff})</span>` : '');
                statDisplay = `Armor: ${item.val}`;
            }

            const cls = item.type === 'weapon' ? (item.weaponClass || '').toLowerCase() : '';
            const baseLower = item.type === 'weapon' ? (item.baseType || '').toLowerCase() : '';
            const slotTag = item.type === 'armor' ? ` <span style="color:#666; font-size:0.7rem">[${item.slot}]</span>` : '';
            const isLegendaryWeapon = item.type === 'weapon' && item.rarityKey === 'legendary';
            const showTags = (mode !== 'shop');
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
            let btnState = (mode === 'shop' && this.player.gold < item.price) ? "disabled" : "";
            const btnClass = mode === 'shop' ? 'btn btn-buy' : 'btn';

            const typeLabel = getItemTypeLabel(item);

            div.innerHTML = `<div class="${item.rarity}">${nameHtml}</div><div style="font-size:0.8rem;">${item.rarity.replace('rarity-', '')}</div><div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div><div class="text-gold">${priceTxt}</div><button class="${btnClass}" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>${btnTxt}</button>`;

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
    init() {
        const p = game.player;
        this.maxHp = p.getMaxHp(); this.hp = this.maxHp;
        this.maxArmor = p.getTotalArmor(); this.armor = this.maxArmor;
        this.playerDots = [];
        this.dotResist = {};
        const s = p.level;
        const enemyName = ["Orc", "Goblin", "Bandit", "Skeleton", "Troll"][rng(0,4)];
        // Temel enemy statları
        this.enemy = { name: enemyName, lvl: s, maxHp: 100+(s*20), hp: 100+(s*20), str: 6+(s*2), atk: 5+s, def: 2+s, vit: 5+s, mag: 0 };
        // Basit enemy silahı (hasar aralığı + tür)
        const base = Math.floor(this.enemy.str * 1.2);
        const weaponMin = Math.max(3, base - 4);
        const weaponMax = base + 4;
        let weaponClass = 'Sword';
        let baseType = 'Sword';
        if (enemyName === 'Orc' || enemyName === 'Troll') { weaponClass = 'Axe'; baseType = 'Axe'; }
        else if (enemyName === 'Goblin') { weaponClass = 'Dagger'; baseType = 'Dagger'; }
        else if (enemyName === 'Skeleton') { weaponClass = 'Spear'; baseType = 'Spear'; }
        else if (enemyName === 'Bandit') { weaponClass = 'Sword'; baseType = 'Sword'; }
        // icon path haritası (player silah ikonlarıyla uyumlu)
        let iconPath = '';
        const clsLower = weaponClass.toLowerCase();
        if (clsLower === 'axe') iconPath = 'assets/weapon-icons/axe_icon.png';
        else if (clsLower === 'sword') iconPath = 'assets/weapon-icons/sword_icon.png';
        else if (clsLower === 'hammer') iconPath = 'assets/weapon-icons/hammer_icon.png';
        else if (clsLower === 'dagger') iconPath = 'assets/weapon-icons/dagger_icon.png';
        else if (clsLower === 'spear') iconPath = 'assets/weapon-icons/spear_icon.png';
        else if (clsLower === 'bow') iconPath = 'assets/weapon-icons/crossbow_icon.png';
        this.enemy.weapon = { min: weaponMin, max: weaponMax, weaponClass, baseType, iconPath };
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
        const dmgEl = $('ins-weapon-dmg');
        const typeEl = $('ins-weapon-type');
        const iconEl = $('ins-weapon-icon');
        if (w) {
            if (dmgEl) dmgEl.innerText = `${w.min}-${w.max}`;
            if (typeEl) typeEl.innerText = w.baseType || w.weaponClass || 'Weapon';
            if (iconEl) {
                if (w.iconPath) {
                    iconEl.src = w.iconPath;
                    iconEl.classList.remove('hidden');
                } else {
                    iconEl.src = '';
                    iconEl.classList.add('hidden');
                }
            }
        } else {
            if (dmgEl) dmgEl.innerText = '–';
            if (typeEl) typeEl.innerText = 'Unknown';
            if (iconEl) { iconEl.src = ''; iconEl.classList.add('hidden'); }
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
        if(el) el.innerHTML = this.log.map(t => `<div>${t}</div>`).join('');
    },
    flashBlood() {
        const v = $('blood-vignette');
        if(!v) return;
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
        this.playerDots.forEach(dot => {
            const cfg = STATUS_EFFECTS_CONFIG.effects[dot.id];
            if(!cfg) return;
            const raw = Math.floor(this.maxHp * cfg.damagePct);
            const dmg = Math.max(1, raw);
            totalDmg += dmg;
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
            let isCrit = (rng(0,100) < 5 + p.stats.atk + p.getCritBonus());
            if(isCrit) dmg = Math.floor(dmg * 1.5);
            this.takeDamage(dmg, 'enemy');
            this.showDmg(dmg, 'enemy', isCrit?'crit':'dmg');
            const label = type==='quick' ? 'Quick' : (type==='power' ? 'Power' : 'Normal');
            const critText = isCrit ? ' (CRIT)' : '';
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
            let dmg;
            if (e.weapon && typeof e.weapon.min === 'number' && typeof e.weapon.max === 'number') {
                dmg = rng(e.weapon.min, e.weapon.max);
            } else {
                dmg = Math.floor(e.str * 1.5);
            }
            this.takeDamage(dmg, 'player');
            this.showDmg(dmg, 'player', 'dmg');
            this.logMessage(`${e.name} hits you for <span class="log-dmg">${dmg}</span>.`);
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
        const rewardMult = Math.min(1.6, 1 + chr * 0.03); // each CHR = +3% rewards, max +60%
        const gold = Math.floor(baseGold * rewardMult);
        const xp = Math.floor(baseXp * rewardMult);
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
        if(type==='crit'){ el.innerHTML=`CRITICAL!<br>${val}!`; el.style.color='#ffea00'; el.style.fontSize='4rem'; }
        else if(type==='miss'){ el.innerText="DODGE"; el.style.color='#ffeb3b'; el.style.fontSize='3.5rem'; }
        else if(type==='dot'){ el.innerText=`-${val}`; el.style.color='#d500f9'; el.style.fontSize='3.2rem'; }
        else { el.innerText=val; el.style.fontSize='3.5rem'; el.style.color=(type==='heal'?'#00e676':(t==='player'?'#ff1744':'#fff')); }
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
