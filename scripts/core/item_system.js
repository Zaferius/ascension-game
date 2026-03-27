// ItemSystem — creates item instances from the loaded catalogs
// Depends on: WEAPONS, ARMORS, TRINKETS (from scripts/data/), rng (from scripts/config/constants.js)

class ItemSystem {
    static getRarity() {
        const common =   { name: 'Common',    color: 'rarity-common',    mult: 1.0 };
        const uncommon = { name: 'Uncommon',  color: 'rarity-uncommon',  mult: 1.3 };
        const rare =     { name: 'Rare',      color: 'rarity-rare',      mult: 1.6 };
        const epic =     { name: 'Epic',      color: 'rarity-epic',      mult: 2.2 };
        const legendary ={ name: 'Legendary', color: 'rarity-legendary', mult: 3.5 };
        if (rng(0, 99) < 5)  return legendary;
        if (rng(0, 99) < 10) return epic;
        if (rng(0, 99) < 15) return rare;
        if (rng(0, 99) < 40) return uncommon;
        return common;
    }

    static _rarityKey(rarity) {
        if (rarity.color === 'rarity-uncommon')  return 'uncommon';
        if (rarity.color === 'rarity-rare')      return 'rare';
        if (rarity.color === 'rarity-epic')      return 'epic';
        if (rarity.color === 'rarity-legendary') return 'legendary';
        return 'common';
    }

    static _pickFromCatalog(catalog, lvl, rarityKey) {
        if (!Array.isArray(catalog) || catalog.length === 0) return null;
        const minAllowed = Math.max(1, lvl - 5);
        const maxAllowed = lvl + 10;
        let pool = catalog.filter(w => {
            const req = w.minShopLevel || 1;
            return w.rarityKey === rarityKey && req >= minAllowed && req <= maxAllowed;
        });
        if (pool.length === 0) {
            pool = catalog.filter(w => {
                const req = w.minShopLevel || 1;
                return req >= minAllowed && req <= maxAllowed;
            });
        }
        if (pool.length === 0) pool = catalog;
        if (pool.length === 0) return null;
        return pool[rng(0, pool.length - 1)];
    }

    static createItem(lvl, type) {
        const rarity = this.getRarity();
        const rarityKey = this._rarityKey(rarity);
        let catalog;
        if (type === 'weapon')  catalog = typeof WEAPONS  !== 'undefined' ? WEAPONS  : [];
        else if (type === 'armor')   catalog = typeof ARMORS   !== 'undefined' ? ARMORS   : [];
        else if (type === 'trinket') catalog = typeof TRINKETS !== 'undefined' ? TRINKETS : [];
        else return null;
        const template = this._pickFromCatalog(catalog, lvl, rarityKey);
        if (!template) return null;
        return { ...template, id: Date.now() + Math.random() };
    }

    static createWeapon(lvl)  { return this.createItem(lvl, 'weapon');  }
    static createArmor(lvl)   { return this.createItem(lvl, 'armor');   }
    static createTrinket(lvl) { return this.createItem(lvl, 'trinket'); }
}
