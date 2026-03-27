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
    openPotionShop() {
        if (!this.player) return;
        this.currentShopType = 'potion';
        this.currentTradeMode = 'buy';
        this.currentListMode = 'potion';
        if ((this.shopFightCount - this.lastPotionFightReset) >= POTION_REFRESH_INTERVAL || !this.potionStock || Object.keys(this.potionStock).length === 0) {
            this.generatePotionStock();
        }
        $('screen-hub').classList.add('hidden');
        $('screen-list').classList.remove('hidden');
        this.renderPotionShop();
        $('shop-gold').innerText = this.player.gold;
        this.updateTradeToggleUI();
        this.updatePotionRefreshIndicator();
        wireButtonSfx($('screen-list'));
    },
};
