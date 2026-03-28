// Save/Load system — extracted from game object
// Depends on: SAVE_KEY, AVATARS, cleanLegendaryWeaponName (constants.js), Player (player.js)
// Mixed into game via: const game = { ...gameSaveLoad, ... }

const gameSaveLoad = {
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
    saveGame() {
        if (!this.player) return;
        const meta = this.loadSaveMeta();
        if (this.currentSlotIndex < 0 || this.currentSlotIndex >= 5) {
            if (meta.slots.length >= 5) return;
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
    saveGameManually() {
        this.saveGame();
        $('hub-msg').innerText = "Game Saved!";
    },
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
        if (!this.player.skills) this.player.skills = {};
        if (typeof this.player.skillPoints !== 'number') this.player.skillPoints = 0;
        if (typeof this.player.dungeonsCompleted !== 'number') this.player.dungeonsCompleted = 0;
        if (typeof this.player.deepestDungeonDepth !== 'number') this.player.deepestDungeonDepth = 0;

        // Migrate bag system — handle legacy saves (< v8) that had 3-slot potionSlots
        if (!this.player.bagCapacity || typeof this.player.bagCapacity !== 'number') {
            this.player.bagCapacity = 8;
        }
        if (!Array.isArray(this.player.bagSlots)) {
            this.player.bagSlots = new Array(this.player.bagCapacity).fill(null);
        } else {
            while (this.player.bagSlots.length < this.player.bagCapacity) {
                this.player.bagSlots.push(null);
            }
            this.player.bagSlots = this.player.bagSlots.slice(0, this.player.bagCapacity);
        }

        // Fix legendary item names in older saves
        const fixLegendaryItemName = (item) => {
            if(!item || item.type !== 'weapon' || item.rarityKey !== 'legendary') return;
            if(typeof item.name === 'string') item.name = item.name.replace(/^of\s+/i, '');
            item.name = cleanLegendaryWeaponName(item);
        };
        const fixStarterRustyBlade = (item) => {
            if (!item || item.type !== 'weapon') return;
            const key = String(item.key || '').toLowerCase();
            const name = String(item.name || '').toLowerCase();
            if (key !== 'rusty_blade' && key !== 'rusty_sword' && name !== 'rusty blade' && name !== 'rusty sword') return;
            if (!item.statMods || typeof item.statMods !== 'object') item.statMods = {};
            if (typeof item.statMods.chr !== 'number') item.statMods.chr = -1;
        };

        if(this.player.gear) {
            Object.keys(this.player.gear).forEach(slot => {
                fixLegendaryItemName(this.player.gear[slot]);
                fixStarterRustyBlade(this.player.gear[slot]);
            });
        }
        if(Array.isArray(this.player.inventory)) {
            this.player.inventory.forEach(it => {
                fixLegendaryItemName(it);
                fixStarterRustyBlade(it);
            });
        }
        if (!Array.isArray(this.player.injuries)) this.player.injuries = [];

        // Restore shop state
        this.shopStock = plain._shopStock || { weapon: [], armor: [], trinket: [] };
        this.shopFightCount = typeof plain._shopFightCount === 'number' ? plain._shopFightCount : 0;
        this.lastShopFightReset = typeof plain._lastShopFightReset === 'number' ? plain._lastShopFightReset : 0;
        this.potionStock = plain._potionStock || {};
        this.lastPotionFightReset = typeof plain._lastPotionFightReset === 'number' ? plain._lastPotionFightReset : 0;
        this.currentDungeon = null;

        const hasAnyShop = (this.shopStock.weapon && this.shopStock.weapon.length) ||
            (this.shopStock.armor && this.shopStock.armor.length) ||
            (this.shopStock.trinket && this.shopStock.trinket.length);
        if (!hasAnyShop) this.generateShopStock();

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
        const filledSlots = meta.slots
            .map((slot, index) => ({ slot, index }))
            .filter(entry => !!entry.slot);
        if (filledSlots.length === 1) {
            this.loadSlot(filledSlots[0].index, meta);
            return;
        }
        const cont = $('load-slots');
        if (!cont) return;
        cont.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const slot = meta.slots[i];
            const card = document.createElement('div');
            if (slot) {
                const avatar = slot.avatar || AVATARS[0];
                const wins = slot.wins || 0;
                const tourney = slot.tournamentsCompleted || 0;
                card.className = 'load-slot-card load-slot-filled';
                card.innerHTML = `
                    <div class="load-slot-avatar">${avatar}</div>
                    <div class="load-slot-info">
                        <div class="load-slot-name">${slot.name}</div>
                        <div class="load-slot-meta">
                            <span class="load-slot-tag">${slot.class}</span>
                            <span class="load-slot-tag load-slot-tag-level">Lvl ${slot.level || 1}</span>
                            <span class="load-slot-tag text-gold">⚔ ${wins} wins</span>
                            ${tourney > 0 ? `<span class="load-slot-tag text-gold">🏆 ${tourney}</span>` : ''}
                        </div>
                        <div class="load-slot-gold">💰 ${slot.gold || 0} gold</div>
                    </div>
                    <div class="load-slot-actions">
                        <button class="btn load-slot-btn-load" onclick="game.loadSlot(${i})">LOAD</button>
                        <button class="btn load-slot-btn-delete" onclick="game.deleteSlot(${i})">✕</button>
                    </div>
                `;
            } else {
                card.className = 'load-slot-card load-slot-empty';
                card.innerHTML = `
                    <div class="load-slot-empty-num">${i + 1}</div>
                    <div class="load-slot-empty-label">Empty Slot</div>
                `;
            }
            cont.appendChild(card);
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
};
