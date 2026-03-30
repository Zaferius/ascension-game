// Shop system — extracted from game object
// Depends on: $, rng, SHOP_REFRESH_INTERVAL, POTION_REFRESH_INTERVAL, POTION_DEFS (constants/potion_defs)
//             WEAPONS, ARMORS, TRINKETS (data catalogs)
// Mixed into game via: const game = { ...gameShop, ... }

const gameShop = {
    generateShopStock() {
        this.shopStock.weapon = [];
        this.shopStock.armor = [];
        this.shopStock.trinket = [];
        const lvl = this.player.level || 1;

        const legendaryCap = 2;
        let legendaryCount = 0;
        const countsByKey = Object.create(null);
        const weaponNames = Object.create(null);

        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const canUseItem = (item) => {
            if (!item) return false;
            if (item.type === 'weapon') {
                const cleanName = String(item.name || '').trim().toLowerCase();
                if (cleanName && weaponNames[cleanName]) return false;
            }
            const key = item.key || item.id;
            if (!key) return true;
            const used = countsByKey[key] || 0;
            if (used >= 2) return false;
            if (item.rarityKey === 'legendary' && legendaryCount >= legendaryCap) return false;
            return true;
        };
        const registerItem = (bucket, item) => {
            const key = item.key || item.id;
            if (key) countsByKey[key] = (countsByKey[key] || 0) + 1;
            if (item.rarityKey === 'legendary') legendaryCount++;
            if (item.type === 'weapon') {
                const cleanName = String(item.name || '').trim().toLowerCase();
                if (cleanName) weaponNames[cleanName] = 1;
            }
            const inst = { ...item, id: Date.now() + Math.random() };
            bucket.push(inst);
        };
        const pickRandomFromPool = (pool, bucket) => {
            if (!pool || !pool.length) return false;
            const maxTries = pool.length * 3;
            for (let i = 0; i < maxTries; i++) {
                const cand = pool[Math.floor(Math.random() * pool.length)];
                if (!canUseItem(cand)) continue;
                registerItem(bucket, cand);
                return true;
            }
            return false;
        };
        const generateForCatalog = (catalog) => {
            const bucket = [];
            if (!Array.isArray(catalog) || catalog.length === 0) return bucket;
            let drawbackCount = 0;
            const drawbackCap = 5;
            const maxAllowedLevel = lvl + 5;
            const withinCap = catalog.filter(it => getItemMinLevel(it) <= maxAllowedLevel);
            const sourceAll = withinCap.length ? withinCap : catalog;

            const pickRandomBase = (pool) => {
                if (!pool || !pool.length) return null;
                const maxTries = pool.length * 3;
                for (let i = 0; i < maxTries; i++) {
                    const cand = pool[Math.floor(Math.random() * pool.length)];
                    if (cand.affixProfile && cand.affixProfile.hasDrawback && drawbackCount >= drawbackCap) continue;
                    if (!canUseItem(cand)) continue;
                    return cand;
                }
                return null;
            };
            const pushInstanceWithLevel = (base, reqLvl) => {
                if (!base) return false;
                const inst = { ...base, id: Date.now() + Math.random() };
                if (typeof inst.minLevel === 'number') inst.minLevel = reqLvl;
                else inst.minShopLevel = reqLvl;
                if (inst.affixProfile && inst.affixProfile.hasDrawback) drawbackCount++;
                registerItem(bucket, inst);
                return true;
            };

            // 6 items at player level
            let created = 0, safety = 0;
            while (created < 6 && safety < 200) {
                safety++;
                const base = pickRandomBase(sourceAll);
                if (!base) break;
                if (pushInstanceWithLevel(base, lvl)) created++;
            }
            // 4 lower-level items
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
            // 10 higher-level items
            for (let i = 0; i < 10; i++) {
                let innerSafety = 0;
                while (innerSafety < 100) {
                    innerSafety++;
                    const hiLvl = rng(lvl + 1, lvl + 5);
                    const base = pickRandomBase(sourceAll);
                    if (!base) break;
                    if (pushInstanceWithLevel(base, hiLvl)) break;
                }
            }
            return bucket;
        };

        this.shopStock.weapon  = generateForCatalog(typeof WEAPONS  !== 'undefined' ? WEAPONS  : []);
        this.shopStock.armor   = generateForCatalog(typeof ARMORS   !== 'undefined' ? ARMORS   : []);
        this.shopStock.trinket = generateForCatalog(typeof TRINKETS !== 'undefined' ? TRINKETS : []);
        this.sortShop(this.shopStock.weapon);
        this.sortShop(this.shopStock.armor);
        this.sortShop(this.shopStock.trinket);
        this.lastShopFightReset = this.shopFightCount;
        this.updateShopRefreshIndicator();
    },
    updateShopRefreshIndicator() {
        const el = $('shop-refresh-indicator');
        if (!el) return;
        const fightsSince = this.shopFightCount - this.lastShopFightReset;
        let remaining = Math.max(0, SHOP_REFRESH_INTERVAL - fightsSince);
        el.innerHTML = `Shop refreshes in <span class="shop-refresh-count">${remaining}</span> ${remaining === 1 ? 'fight' : 'fights'}`;
    },
    generatePotionStock() {
        if (!this.player) return;
        const lvl = this.player.level || 1;
        this.potionStock = {};
        POTION_DEFS.forEach(def => {
            const qty = rng(1, 10);
            const price = Math.max(6, Math.floor(def.priceFactor * (0.75 + lvl * 0.65)));
            this.potionStock[def.key] = { key: def.key, qty, price, tpl: { ...def } };
        });
        this.lastPotionFightReset = this.shopFightCount;
    },
    updatePotionRefreshIndicator() {
        const el = $('shop-refresh-indicator');
        if (!el) return;
        const fightsSince = this.shopFightCount - this.lastPotionFightReset;
        let remaining = Math.max(0, POTION_REFRESH_INTERVAL - fightsSince);
        el.innerHTML = `Potions refresh in <span class="shop-refresh-count">${remaining}</span> ${remaining === 1 ? 'fight' : 'fights'}`;
    },
    addPotionToInventory(potionLike, qty = 1) {
        if (!this.player || !potionLike || qty <= 0) return;
        if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
        const inv = this.player.inventory;
        const { subType, percent = 0, name = '' } = potionLike;
        const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && (it.percent || 0) === percent && it.name === name);
        if (existing) {
            existing.qty = (existing.qty || 0) + qty;
        } else {
            inv.push({ id: Date.now() + Math.random(), type: 'potion', subType, percent, name, price: potionLike.price, qty, rarity: potionLike.rarity || 'rarity-common' });
        }
    },
    consumePotionFromInventory(potionLike, qty = 1) {
        if (!this.player || !potionLike || qty <= 0 || !Array.isArray(this.player.inventory)) return false;
        const inv = this.player.inventory;
        const { subType, percent = 0, name = '' } = potionLike;
        const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && (it.percent || 0) === percent && it.name === name && (it.qty || 0) >= qty);
        if (!existing) return false;
        existing.qty = (existing.qty || 0) - qty;
        if (existing.qty <= 0) inv.splice(inv.indexOf(existing), 1);
        return true;
    },
    sortShop(arr) {
        const rarityRank = (item) => {
            const r = item.rarity || '';
            if (r.includes('legendary')) return 4;
            if (r.includes('epic')) return 3;
            if (r.includes('rare')) return 2;
            if (r.includes('uncommon')) return 1;
            return 0;
        };
        const statVal = (item) => {
            if (item.type === 'weapon') return (item.max ?? item.min ?? 0);
            if (item.type === 'armor') return (item.val ?? 0);
            return 0;
        };
        const levelVal = (item) => {
            if (!item) return 0;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const typeVal = (item) => {
            if (!item) return '';
            if (item.type === 'weapon') return (item.weaponClass || item.baseType || 'weapon').toLowerCase();
            if (item.type === 'armor') return (item.slot || 'armor').toLowerCase();
            return '';
        };
        const dir = this.shopSortOrder === 'desc' ? -1 : 1;
        arr.sort((a,b) => {
            let av, bv;
            if (this.shopSortKey === 'rarity')      { av = rarityRank(a); bv = rarityRank(b); }
            else if (this.shopSortKey === 'stat')   { av = statVal(a);    bv = statVal(b); }
            else if (this.shopSortKey === 'type')   { av = typeVal(a);    bv = typeVal(b); }
            else if (this.shopSortKey === 'level')  { av = levelVal(a);   bv = levelVal(b); }
            else                                    { av = a.price ?? 0;  bv = b.price ?? 0; }
            if (av === bv) return 0;
            return av < bv ? -1 * dir : 1 * dir;
        });
    },
    toggleSort(key = 'price') {
        if (this.shopSortKey === key) {
            this.shopSortOrder = (this.shopSortOrder === 'desc') ? 'asc' : 'desc';
        } else {
            this.shopSortKey = key;
            this.shopSortOrder = 'desc';
        }
        const mode = this.currentListMode || 'shop';
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
            else if (type === 'potion') list = this.getFilteredSellItems();
            else list = this.shopStock.weapon;
            this.sortShop(list);
            this.renderList(list, 'shop');
            $('shop-gold').innerText = this.player.gold;
        } else if (mode === 'inv' && this.player) {
            const list = this.player.inventory;
            this.sortShop(list);
            this.renderList(list, 'inv');
            $('shop-gold').innerText = this.player.gold;
        }
    },
    getTradeModeLabel(mode) {
        return mode === 'sell' ? 'Sell' : 'Buy';
    },
    getAdjustedBuyPrice(item) {
        if (!this.player || !item) return item?.price || 0;
        const chr = this.player.getShopEffectiveChr();
        const discount = Math.min(0.35, chr * 0.01);
        const base = typeof item.price === 'number' ? item.price : 0;
        return Math.max(1, Math.round(base * (1 - discount)));
    },
    getFilteredSellItems() {
        if (!this.player || !Array.isArray(this.player.inventory)) return [];
        const type = this.currentShopType || 'weapon';
        return this.player.inventory.filter(item => {
            if (!item) return false;
            if (type === 'potion') return item.type === 'potion';
            return item.type === type;
        });
    },
    getSellPrice(item) {
        if (!item) return 0;
        const sellBonus = this.player ? this.player.getSellMultiplierBonus() : 0;
        if (item.type === 'potion') {
            const def = POTION_DEFS.find(p => p.subType === item.subType && p.percent === (item.percent || 0));
            const basePrice = typeof item.price === 'number' ? item.price : (def ? Math.max(6, Math.floor(def.priceFactor * (0.75 + (this.player?.level || 1) * 0.65))) : 8);
            return Math.max(1, Math.floor(basePrice * (0.5 + sellBonus)));
        }
        const minLvl = typeof item.minLevel === 'number' ? item.minLevel : (typeof item.minShopLevel === 'number' ? item.minShopLevel : 1);
        const basePrice = typeof item.price === 'number' ? item.price : Math.max(10, minLvl * 12);
        return Math.max(1, Math.floor(basePrice * (0.45 + sellBonus)));
    },
    sellItem(item) {
        if (!this.player || !item || !Array.isArray(this.player.inventory)) return;
        const inv = this.player.inventory;
        const sellPrice = this.getSellPrice(item);
        if (item.type === 'potion') {
            const existing = inv.find(it => it && it.type === 'potion' && it.subType === item.subType && (it.percent || 0) === (item.percent || 0) && it.name === item.name);
            if (!existing) return;
            existing.qty = (existing.qty || 0) - 1;
            if (existing.qty <= 0) inv.splice(inv.indexOf(existing), 1);
        } else {
            const idx = inv.indexOf(item);
            if (idx === -1) return;
            inv.splice(idx, 1);
        }
        this.player.gold += sellPrice;
        $('shop-gold').innerText = this.player.gold;
        if (this.currentShopType === 'potion' && this.currentTradeMode === 'buy') this.renderPotionShop();
        else this.renderList([], 'shop');
        this.updateHubUI();
        this.saveGame();
    },
    toggleTradeMode() {
        const inShop = this.currentListMode === 'shop' || this.currentListMode === 'potion';
        if (!inShop) return;
        this.currentTradeMode = this.currentTradeMode === 'buy' ? 'sell' : 'buy';
        if (this.currentShopType === 'potion') this.renderPotionShop();
        else this.renderList([], 'shop');
        if (this.player) $('shop-gold').innerText = this.player.gold;
    },
    updateTradeToggleUI() {
        const btn = $('btn-trade-toggle');
        if (!btn) return;
        const inShop = this.currentListMode === 'shop' || this.currentListMode === 'potion';
        if (!inShop) { btn.classList.add('hidden'); return; }
        btn.classList.remove('hidden');
        const nextMode = this.currentTradeMode === 'buy' ? 'sell' : 'buy';
        btn.textContent = this.getTradeModeLabel(nextMode);
        btn.classList.toggle('btn-primary', this.currentTradeMode === 'sell');
    },
    openShop(type) {
        if ((this.shopFightCount - this.lastShopFightReset) >= SHOP_REFRESH_INTERVAL) this.generateShopStock();
        this.currentShopType = type;
        this.currentTradeMode = 'buy';
        let list;
        if (type === 'weapon') list = this.shopStock.weapon;
        else if (type === 'armor') list = this.shopStock.armor;
        else if (type === 'trinket') list = this.shopStock.trinket;
        else list = this.shopStock.weapon;
        if(!list || list.length === 0) {
            this.generateShopStock();
            if (type === 'weapon') list = this.shopStock.weapon;
            else if (type === 'armor') list = this.shopStock.armor;
            else if (type === 'trinket') list = this.shopStock.trinket;
        }
        this.sortShop(list);
        $('screen-hub').classList.add('hidden');
        $('screen-list').classList.remove('hidden');
        this.renderList(list, 'shop');
        $('shop-gold').innerText = this.player.gold;
        this.updateTradeToggleUI();
        this.updateShopRefreshIndicator();
        wireButtonSfx($('screen-list'));
    },
    addConsumableToInventory(def, qty = 1) {
        if (!this.player || !def || qty <= 0) return;
        if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
        const inv = this.player.inventory;
        const existing = inv.find(it => it && it.type === 'consumable' && it.subType === def.subType);
        if (existing) {
            existing.qty = (existing.qty || 0) + qty;
        } else {
            inv.push({ id: Date.now() + Math.random(), type: 'consumable', subType: def.subType, name: def.name, icon: def.icon, desc: def.desc, price: def.price, qty, rarity: def.rarity || 'rarity-common' });
        }
    },
    openCombatStore() {
        if (!this.player) return;
        this.currentShopType = 'consumable';
        this.currentTradeMode = 'buy';
        this.currentListMode = 'combat-store';
        $('screen-hub').classList.add('hidden');
        $('screen-list').classList.remove('hidden');
        this.renderCombatStore();
        $('shop-gold').innerText = this.player.gold;
        this.updateTradeToggleUI();
        wireButtonSfx($('screen-list'));
    },
    renderCombatStore() {
        const cont = $('list-container');
        const titleEl = $('list-title');
        const headerExtra = $('list-header-extra');
        game.ensurePreviewHelpers();
        const previewBox = $('shop-preview');
        const buildPreviewFromItem = game._buildItemPreview;
        const movePreview = game._moveItemPreview;
        const bindPreview = (el, item) => {
            if (!el || !previewBox || typeof buildPreviewFromItem !== 'function' || typeof movePreview !== 'function') return;
            el.onmouseenter = (ev) => {
                buildPreviewFromItem(item);
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
        if (!cont || !titleEl) return;
        const listPanel = document.querySelector('.list-panel');
        if (listPanel) listPanel.classList.remove('list-panel--inv');
        titleEl.innerText = 'COMBAT STORE';
        const subtitleEl = $('list-title-sub');
        if (subtitleEl) subtitleEl.innerText = 'Potions, cures, and utility supplies. Dungeon keys can unlock hidden treasure chests during descent.';
        if (headerExtra) headerExtra.innerHTML = '';
        cont.innerHTML = '';

        // Hide potion slot card (not relevant here)
        const slotCard = $('inv-bag-card');
        if (slotCard) { slotCard.classList.add('hidden'); slotCard.innerHTML = ''; }

        if (!Array.isArray(COMBAT_STORE_DEFS) || COMBAT_STORE_DEFS.length === 0) {
            cont.innerHTML = '<div style="text-align:center;padding:20px;color:#555;">No items available.</div>';
            return;
        }

        // --- Potions ---
        const potionHeader = document.createElement('div');
        potionHeader.className = 'combat-store-section-header';
        potionHeader.textContent = 'POTIONS';
        cont.appendChild(potionHeader);

        if ((this.shopFightCount - this.lastPotionFightReset) >= POTION_REFRESH_INTERVAL || !this.potionStock || Object.keys(this.potionStock).length === 0) {
            this.generatePotionStock();
        }

        const potionEntries = Object.values(this.potionStock || {});
        if (!potionEntries.length) {
            const emptyPotions = document.createElement('div');
            emptyPotions.className = 'combat-store-bag-info';
            emptyPotions.innerHTML = '<span>No potions available.</span>';
            cont.appendChild(emptyPotions);
        } else {
            potionEntries.forEach(entry => {
                const { tpl, qty } = entry;
                const buyPrice = this.getAdjustedBuyPrice({ price: entry.price });
                const canAfford = this.player.gold >= buyPrice;
                const inStock = qty > 0;
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <div class="item-main-wrap">
                        <div class="item-card-icon">🧪</div>
                        <div class="item-main">
                            <div class="item-main-name rarity-common">${tpl.name} <span class="potion-stock-count">x ${qty}</span></div>
                            <div class="item-main-sub">Restores ${tpl.percent}% ${tpl.subType === 'armor' ? 'armor' : 'health'} in combat.</div>
                        </div>
                    </div>
                    <div><span class="item-chip">Potion</span></div>
                    <div><span class="item-chip">${tpl.subType === 'armor' ? 'Armor' : 'Health'}</span></div>
                    <div class="item-level"><span class="item-chip">${tpl.percent}%</span></div>
                    <div class="item-price"><span class="text-gold">${buyPrice}</span></div>
                    <div class="item-action"><button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${(canAfford && inStock) ? '' : 'disabled'}>Buy</button></div>
                `;

                const btn = row.querySelector('button');
                if (btn && canAfford && inStock) {
                    btn.onclick = () => {
                        if (!this.player || this.player.gold < buyPrice || entry.qty <= 0) return;
                        this.player.gold -= buyPrice;
                        entry.qty -= 1;
                        this.addPotionToInventory({
                            type: 'potion',
                            subType: tpl.subType,
                            percent: tpl.percent,
                            name: tpl.name,
                            price: buyPrice,
                            rarity: 'rarity-common'
                        }, 1);
                        this.updateHubUI();
                        this.saveGame();
                        this.renderCombatStore();
                        $('shop-gold').innerText = this.player.gold;
                    };
                }

                bindPreview(row, {
                    type: 'potion',
                    rarity: 'rarity-common',
                    name: tpl.name,
                    subType: tpl.subType,
                    percent: tpl.percent,
                    price: buyPrice
                });
                cont.appendChild(row);
            });
        }

        // --- Cure Consumables ---
        const cureHeader = document.createElement('div');
        cureHeader.className = 'combat-store-section-header';
        cureHeader.textContent = 'STATUS CURES';
        cont.appendChild(cureHeader);

        const defs = Array.isArray(COMBAT_STORE_DEFS) ? COMBAT_STORE_DEFS : [];
        const cureDefs = defs.filter(def => def && def.subType !== 'dungeon_key');
        const utilityDefs = defs.filter(def => def && def.subType === 'dungeon_key');

        cureDefs.forEach(def => {
            const buyPrice = this.getAdjustedBuyPrice(def);
            const canAfford = this.player.gold >= buyPrice;
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <div class="item-main-wrap">
                    <div class="item-card-icon" style="font-size:1.6rem; display:flex; align-items:center; justify-content:center;">${def.icon}</div>
                    <div class="item-main">
                        <div class="item-main-name rarity-common">${def.name}</div>
                        <div class="item-main-sub">${def.desc}</div>
                    </div>
                </div>
                <div><span class="item-chip">Consumable</span></div>
                <div><span class="item-chip">Cure</span></div>
                <div class="item-level"><span class="item-chip">Single Use</span></div>
                <div class="item-price"><span class="text-gold">${buyPrice}</span></div>
                <div class="item-action"><button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${canAfford ? '' : 'disabled'}>Buy</button></div>
            `;
            const btn = row.querySelector('button');
            if (btn && canAfford) {
                btn.onclick = () => {
                    if (!this.player || this.player.gold < buyPrice) return;
                    this.player.gold -= buyPrice;
                    $('shop-gold').innerText = this.player.gold;
                    this.addConsumableToInventory(def, 1);
                    this.updateHubUI();
                    this.saveGame();
                    this.renderCombatStore();
                    $('shop-gold').innerText = this.player.gold;
                };
            }
            bindPreview(row, def);
            cont.appendChild(row);
        });

        if (utilityDefs.length) {
            const utilityHeader = document.createElement('div');
            utilityHeader.className = 'combat-store-section-header';
            utilityHeader.textContent = 'DUNGEON UTILITY';
            cont.appendChild(utilityHeader);

            utilityDefs.forEach(def => {
                const buyPrice = this.getAdjustedBuyPrice(def);
                const canAfford = this.player.gold >= buyPrice;
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `
                    <div class="item-main-wrap">
                        <div class="item-card-icon" style="font-size:1.6rem; display:flex; align-items:center; justify-content:center;">${def.icon || '🧰'}</div>
                        <div class="item-main">
                            <div class="item-main-name ${def.rarity || 'rarity-common'}">${def.name}</div>
                            <div class="item-main-sub">${def.desc || ''}</div>
                        </div>
                    </div>
                    <div><span class="item-chip">Consumable</span></div>
                    <div><span class="item-chip">Key Item</span></div>
                    <div class="item-level"><span class="item-chip">Dungeon Use</span></div>
                    <div class="item-price"><span class="text-gold">${buyPrice}</span></div>
                    <div class="item-action"><button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${canAfford ? '' : 'disabled'}>Buy</button></div>
                `;
                const btn = row.querySelector('button');
                if (btn && canAfford) {
                    btn.onclick = () => {
                        if (!this.player || this.player.gold < buyPrice) return;
                        this.player.gold -= buyPrice;
                        $('shop-gold').innerText = this.player.gold;
                        this.addConsumableToInventory(def, 1);
                        this.updateHubUI();
                        this.saveGame();
                        this.renderCombatStore();
                        $('shop-gold').innerText = this.player.gold;
                    };
                }
                bindPreview(row, def);
                cont.appendChild(row);
            });
        }

        // --- Bag Upgrades ---
        const upgradeHeader = document.createElement('div');
        upgradeHeader.className = 'combat-store-section-header';
        upgradeHeader.textContent = 'BAG UPGRADES';
        cont.appendChild(upgradeHeader);

        const currentCap = this.player.bagCapacity || 8;

        const bagInfoRow = document.createElement('div');
        bagInfoRow.className = 'combat-store-bag-info';
        bagInfoRow.innerHTML = `<span>🎒 Current Bag: <strong>${currentCap} slots</strong></span>`;
        cont.appendChild(bagInfoRow);

        const upgradeTiers = typeof BAG_UPGRADE_TIERS !== 'undefined' ? BAG_UPGRADE_TIERS : [];
        upgradeTiers.forEach(tier => {
            const alreadyOwned = currentCap >= tier.toSlots;
            const isNext = !alreadyOwned && (currentCap === tier.toSlots - 2 || (tier.toSlots === 10 && currentCap <= 8));
            const canBuy = isNext && this.player.gold >= tier.price;

            const row = document.createElement('div');
            row.className = `item-row${alreadyOwned ? ' combat-store-owned' : ''}`;
            row.innerHTML = `
                <div class="item-main-wrap">
                    <div class="item-card-icon" style="font-size:1.6rem; display:flex; align-items:center; justify-content:center;">🎒</div>
                    <div class="item-main">
                        <div class="item-main-name rarity-uncommon">${tier.label}</div>
                        <div class="item-main-sub">${tier.desc}</div>
                    </div>
                </div>
                <div><span class="item-chip">Upgrade</span></div>
                <div><span class="item-chip">${tier.toSlots} slots</span></div>
                <div class="item-level"><span class="item-chip">Permanent</span></div>
                <div class="item-price"><span class="text-gold">${alreadyOwned ? '—' : tier.price}</span></div>
                <div class="item-action">
                    ${alreadyOwned
                        ? '<span class="item-chip" style="color:#4caf50;">✓ Owned</span>'
                        : `<button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${(isNext && canBuy) ? '' : 'disabled'}>${isNext ? 'Buy' : 'Locked'}</button>`
                    }
                </div>
            `;
            if (!alreadyOwned && isNext) {
                const btn = row.querySelector('button');
                if (btn && canBuy) {
                    btn.onclick = () => {
                        if (!this.player || this.player.gold < tier.price) return;
                        this.player.gold -= tier.price;
                        this.player.bagCapacity = tier.toSlots;
                        // Extend bagSlots array
                        if (!Array.isArray(this.player.bagSlots)) this.player.bagSlots = [];
                        while (this.player.bagSlots.length < tier.toSlots) this.player.bagSlots.push(null);
                        this.updateHubUI();
                        this.saveGame();
                        this.renderCombatStore();
                        $('shop-gold').innerText = this.player.gold;
                    };
                }
            }
            bindPreview(row, {
                type: 'bag_upgrade',
                rarity: alreadyOwned ? 'rarity-common' : 'rarity-uncommon',
                name: tier.label,
                desc: tier.desc,
                toSlots: tier.toSlots,
                minLevel: 1,
                info: alreadyOwned
                    ? `Already unlocked. Current capacity covers ${tier.toSlots} slots.`
                    : (isNext ? 'Next available upgrade tier.' : 'Unlock the previous tier first.'),
                infoColor: alreadyOwned ? 'text-green' : (isNext ? 'text-gold' : 'text-red')
            });
            cont.appendChild(row);
        });
    },
    openMagicShop() {
        if (!this.player) return;
        this.currentShopType = 'magic';
        this.currentTradeMode = 'buy';
        this.currentListMode = 'magic-shop';
        $('screen-hub').classList.add('hidden');
        $('screen-list').classList.remove('hidden');
        this.renderMagicShop();
        $('shop-gold').innerText = this.player.gold;
        this.updateTradeToggleUI();
        wireButtonSfx($('screen-list'));
    },
    renderMagicShop() {
        const cont = $('list-container');
        const titleEl = $('list-title');
        const headerExtra = $('list-header-extra');
        game.ensurePreviewHelpers();
        const previewBox = $('shop-preview');
        const buildPreviewFromItem = game._buildItemPreview;
        const movePreview = game._moveItemPreview;
        const bindPreview = (el, item) => {
            if (!el || !previewBox || typeof buildPreviewFromItem !== 'function' || typeof movePreview !== 'function') return;
            el.onmouseenter = (ev) => {
                buildPreviewFromItem(item);
                movePreview(ev);
                previewBox.classList.remove('hidden');
                previewBox.classList.add('visible');
            };
            el.onmousemove = movePreview;
            el.onmouseleave = () => {
                previewBox.classList.remove('visible');
            };
        };
        if (!cont || !titleEl) return;
        const listPanel = document.querySelector('.list-panel');
        if (listPanel) listPanel.classList.remove('list-panel--inv');
        titleEl.innerText = 'MAGIC SHOP';
        const subtitleEl = $('list-title-sub');
        if (subtitleEl) subtitleEl.innerText = 'Buy and upgrade spells. Higher tiers unlock at higher levels.';
        if (headerExtra) {
            headerExtra.innerHTML = `<div style="color:#9f8fc2; font-size:0.84rem;">Unlocked: <span class="text-purple">${(this.player.spellsUnlocked || []).length}</span> / ${(typeof SPELL_LIBRARY !== 'undefined' && Array.isArray(SPELL_LIBRARY)) ? SPELL_LIBRARY.length : 0}</div>`;
        }

        const spells = (typeof SPELL_LIBRARY !== 'undefined' && Array.isArray(SPELL_LIBRARY)) ? SPELL_LIBRARY : [];
        if (spells.length === 0) {
            cont.innerHTML = `<div style="text-align:center; padding:22px; color:#a79ad8;">No spells configured.</div>`;
            return;
        }

        cont.innerHTML = '';
        spells.forEach((spell) => {
            const unlocked = Array.isArray(this.player.spellsUnlocked) && this.player.spellsUnlocked.includes(spell.id);
            const price = this.getAdjustedBuyPrice({ price: spell.price || 120 });
            const requiredLevel = spell.requiredLevel || 1;
            const playerLevel = this.player.level || 1;
            const levelOk = playerLevel >= requiredLevel;
            const canBuy = !unlocked && levelOk && this.player.gold >= price;
            const dmgRange = (typeof getSpellDisplayDamageRange === 'function')
                ? getSpellDisplayDamageRange(spell, this.player.getEffectiveMag ? this.player.getEffectiveMag() : (this.player.stats?.mag || 1))
                : { min: 0, max: 0 };
            const dmgText = spell.type === 'cleanse'
                ? 'Cleanse'
                : (dmgRange.min === dmgRange.max ? `${dmgRange.min}` : `${dmgRange.min}-${dmgRange.max}`);
            const row = document.createElement('div');
            row.className = `item-row${unlocked ? ' combat-store-owned' : ''}`;
            row.innerHTML = `
                <div class="item-main-wrap">
                    <div class="item-card-icon" style="font-size:1.6rem; display:flex; align-items:center; justify-content:center;">✨</div>
                    <div class="item-main">
                        <div class="item-main-name rarity-epic">${spell.name}</div>
                        <div class="item-main-sub">${spell.description}</div>
                    </div>
                </div>
                <div><span class="item-chip">Spell</span></div>
                <div><span class="item-chip">${String(spell.roman || spell.rank || '').trim() || spell.type}</span></div>
                <div class="item-level"><span class="item-chip">Lvl ${requiredLevel}</span></div>
                <div class="item-price"><span class="text-gold">${unlocked ? '—' : price}</span></div>
                <div class="item-action">
                    ${unlocked
                        ? '<span class="item-chip" style="color:#4caf50;">✓ Learned</span>'
                        : `<button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${canBuy ? '' : 'disabled'}>${levelOk ? 'Learn' : 'Locked'}</button>`
                    }
                </div>
            `;

            if (!unlocked) {
                const btn = row.querySelector('button');
                if (btn && canBuy) {
                    btn.onclick = () => {
                        if (!this.player) return;
                        if (!Array.isArray(this.player.spellsUnlocked)) this.player.spellsUnlocked = ['fireball_1'];
                        if (this.player.spellsUnlocked.includes(spell.id)) return;
                        if ((this.player.level || 1) < requiredLevel) return;
                        const latestPrice = this.getAdjustedBuyPrice({ price: spell.price || 120 });
                        if (this.player.gold < latestPrice) return;
                        this.player.gold -= latestPrice;
                        this.player.spellsUnlocked.push(spell.id);
                        this.saveGame();
                        this.updateHubUI();
                        $('shop-gold').innerText = this.player.gold;
                        this.renderMagicShop();
                    };
                }
            }

            bindPreview(row, {
                type: 'weapon',
                rarity: unlocked ? 'rarity-uncommon' : 'rarity-epic',
                weaponClass: 'Spell Tome',
                name: `${spell.name} Tome`,
                min: Math.max(0, dmgRange.min),
                max: Math.max(0, dmgRange.max),
                desc: `${spell.description} Cooldown: ${spell.cooldown || 0} turns.`,
                minLevel: requiredLevel,
                statMods: { mag: Math.max(1, Math.floor((spell.rank || 1))) },
                info: unlocked
                    ? `Learned. ${spell.type === 'cleanse' ? 'Cleanses one DOT.' : `Expected impact: ${dmgText}`}`
                    : `Unlocks at level ${requiredLevel}. ${spell.type === 'cleanse' ? 'Utility: cleanse effect.' : `Expected impact: ${dmgText}`}`,
                infoColor: unlocked ? 'text-green' : (levelOk ? 'text-purple' : 'text-red')
            });

            cont.appendChild(row);
        });
    },
    openPotionShop() {
        // Legacy entry point kept for compatibility; potions now live in Combat Store.
        if (!this.player) return;
        this.openCombatStore();
    },
};
