const $ = (id) => document.getElementById(id);
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const AVATARS = ['🗿', '🦁', '💀', '👺'];
const ARMOR_SLOTS = ['head', 'neck', 'shoulders', 'chest', 'arms', 'shield', 'thighs', 'shins'];
const BASE_STATS = {
    Warrior:  { str: 6, atk: 6, def: 5, vit: 6, mag: 1, chr: 2 },
    Beserker: { str: 9, atk: 7, def: 2, vit: 5, mag: 0, chr: 1 },
    Guardian: { str: 4, atk: 4, def: 9, vit: 7, mag: 2, chr: 3 }
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
        const baseMin = Math.floor((lvl * 3 + rng(2, 5)) * rarity.mult);
        const baseMax = baseMin + Math.floor((lvl * 2 + rng(3, 6)) * rarity.mult);

        // map visual rarity color -> logical rarity string for name generator
        let rarityKey = 'common';
        if (rarity.color === 'rarity-uncommon') rarityKey = 'uncommon';
        else if (rarity.color === 'rarity-rare') rarityKey = 'rare';
        else if (rarity.color === 'rarity-epic') rarityKey = 'epic';
        else if (rarity.color === 'rarity-legendary') rarityKey = 'legendary';

        const displayName = (typeof generateItemName === 'function')
            ? generateItemName({ category: 'weapon', rarity: rarityKey, baseType })
            : `${rarity.name} ${baseType}`;

        return {
            id: Date.now()+Math.random(),
            type: 'weapon',
            category: 'weapon',
            rarityKey,
            baseType,
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
    getMaxHp() { return 100 + (this.stats.vit * 10) + (this.level * 5); }
    getRegen() { return Math.floor(this.stats.vit / 2); }
    getTotalArmor() { let total = 0; ARMOR_SLOTS.forEach(s => { if(this.gear[s]) total += this.gear[s].val; }); return total; }
    getDmgRange() {
        const w = this.gear.weapon;
        const strBonus = this.stats.str * 2;
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

    selectAvatar(idx) { this.selectedAvatar = idx; document.querySelectorAll('.avatar-option').forEach((el, i) => el.classList.toggle('selected', i === idx)); },
    newGameView() { $('screen-start').classList.add('hidden'); $('screen-creation').classList.remove('hidden'); },
    createCharacter() {
        this.player = new Player($('inp-name').value || "Gladiator", $('inp-class').value, this.selectedAvatar);
        this.player.equip({ id:1, type:'weapon', name:'Rusty Sword', min:3, max:6, stat:'Damage', rarity:'rarity-common', price:5 });
        this.generateShopStock(); this.showHub(); this.saveGame();
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
        const dir = this.shopSortOrder === 'desc' ? -1 : 1;
        arr.sort((a,b) => {
            let av, bv;
            if (this.shopSortKey === 'rarity') {
                av = rarityRank(a); bv = rarityRank(b);
            } else if (this.shopSortKey === 'stat') {
                av = statVal(a); bv = statVal(b);
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
        const type = this.currentShopType || 'weapon';
        const list = type === 'weapon' ? this.shopStock.weapon : this.shopStock.armor;
        this.sortShop(list);
        this.renderList(list, 'shop'); $('shop-gold').innerText = this.player.gold;
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
            list.appendChild(row);
        });
        totalEl.innerText = totalArmor;
        $('modal-armor').classList.remove('hidden');
    },
    closeArmorPanel() { $('modal-armor').classList.add('hidden'); },
    updateHubUI() {
        const p = this.player;
        $('ui-name').innerText = p.name; $('ui-lvl').innerText = p.level; $('ui-gold').innerText = p.gold; $('ui-avatar').innerText = p.avatar;
        const dmg = p.getDmgRange(); const arm = p.getTotalArmor();

        $('ui-stats').innerHTML = `
            <div class="stat-row"><span>STR</span> <span class="text-orange">${p.stats.str} <small>(Dmg: ${dmg.min}-${dmg.max})</small></span></div>
            <div class="stat-row"><span>ATK</span> <span class="text-red">${p.stats.atk}</span></div>
            <div class="stat-row"><span>DEF</span> <span class="text-blue">${p.stats.def}</span></div>
            <div class="stat-row"><span>VIT</span> <span class="text-green">${p.stats.vit}</span></div>
            <div class="stat-row"><span>MAG</span> <span class="text-purple">${p.stats.mag}</span></div>
            <div class="stat-row"><span>CHR</span> <span class="text-gold">${(p.stats.chr ?? 0)}</span></div>
            <div style="margin-top:10px; color:#fff; font-size:0.8rem; text-align:center;">Health: ${p.getMaxHp()} | <span class="text-shield">Armor: ${arm}</span></div>
        `;
        
        // Equipment Lists
        const renderSlot = (slot, title) => {
            const item = p.gear[slot];
            let display;
            if(item) {
                if(item.type === 'weapon') {
                    const dmgText = (typeof item.min === 'number' && typeof item.max === 'number') ? ` <span style="color:#888; font-size:0.8rem;">(${item.min}-${item.max})</span>` : '';
                    display = `<span class="${item.rarity}">${item.name}</span>${dmgText}`;
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
        // Attach click handler after injecting HTML
        setTimeout(() => {
            const btn = document.querySelector('#ui-equip .stat-row button');
            if(btn) btn.onclick = () => game.openArmorPanel();
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
        const cont = $('list-container'); cont.innerHTML = '';
        $('list-title').innerText = mode === 'shop' ? "SHOP" : "INVENTORY";

        // In inventory view, show equipped items at the top with Unequip buttons
        if(mode === 'inv') {
            const addEquippedRow = (slot, title) => {
                const equipped = this.player.gear[slot];
                if(!equipped) return;
                const isWeapon = equipped.type === 'weapon';
                const statDisplay = isWeapon
                    ? `Dmg: ${equipped.min}-${equipped.max}`
                    : `Armor: ${equipped.val}`;
                const slotTag = !isWeapon ? ` <span style="color:#666; font-size:0.7rem">[${slot}]</span>` : '';
                const row = document.createElement('div');
                row.className = 'item-row';
                row.innerHTML = `<div class="${equipped.rarity}">${title}: ${equipped.name}${slotTag}</div><div style="font-size:0.8rem;">${equipped.rarity.replace('rarity-','')}</div><div style="font-size:0.8rem; color:#ccc;">${statDisplay}</div><div class="text-gold">-</div><button class="btn" style="padding:5px 10px; font-size:0.8rem;">Unequip</button>`;
                row.querySelector('button').onclick = () => {
                    this.doUnequip(slot);
                    this.renderList(this.player.inventory, mode);
                };
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

            const slotTag = item.type === 'armor' ? ` <span style="color:#666; font-size:0.7rem">[${item.slot}]</span>` : '';
            const btnTxt = mode === 'shop' ? `Buy` : 'Equip';
            const priceTxt = mode === 'shop' ? `${item.price}` : '-';
            let btnState = (mode === 'shop' && this.player.gold < item.price) ? "disabled" : "";

            div.innerHTML = `<div class="${item.rarity}">${item.name}${slotTag}</div><div style="font-size:0.8rem;">${item.rarity.replace('rarity-', '')}</div><div style="font-size:0.8rem; color:#ccc;">${statDisplay} ${diffHtml}</div><div class="text-gold">${priceTxt}</div><button class="btn" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>${btnTxt}</button>`;
            
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
    saveGame() { localStorage.setItem('arenaV7', JSON.stringify(this.player)); },
    saveGameManually() { this.saveGame(); $('hub-msg').innerText = "Game Saved!"; },
    loadGame() {
        const data = localStorage.getItem('arenaV7');
        if(data) {
            const plain = JSON.parse(data);
            this.player = new Player(plain.name, plain.class, 0);
            Object.assign(this.player, plain);
            this.showHub();
        } else alert("No save found.");
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
    stand() { this.active=false; while(this.calc(this.dealerHand)<17) this.dealerHand.push(this.deck.pop()); this.end(); },
    end() {
        this.active=false; this.render(true); $('bj-controls').classList.add('hidden'); $('bj-reset').classList.remove('hidden');
        const p=this.calc(this.playerHand), d=this.calc(this.dealerHand);
        let win=false, push=false;
        if(p>21) win=false; else if(d>21) win=true; else if(p>d) win=true; else if(p===d) push=true;
        
        let text = "PUSH"; let color = "#ffffff";
        if(push) { game.player.gold+=this.bet; }
        else if(win) { text="YOU WIN"; color="#00e676"; game.player.gold+=(this.bet*2); }
        else { text="DEALER WINS"; color="#ff1744"; }
        // show result in overlay instead of shifting layout
        const ov = $('bj-result-overlay'); const lbl = $('bj-result-text');
        if(ov && lbl) {
            lbl.innerText = text;
            lbl.style.color = color;
            ov.classList.remove('hidden');
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
    init() {
        const p = game.player;
        this.maxHp = p.getMaxHp(); this.hp = this.maxHp;
        this.maxArmor = p.getTotalArmor(); this.armor = this.maxArmor;
        this.playerDots = [];
        this.dotResist = {};
        const s = p.level;
        this.enemy = { name: ["Orc", "Goblin", "Bandit", "Skeleton", "Troll"][rng(0,4)], lvl: s, maxHp: 100+(s*20), hp: 100+(s*20), str: 6+(s*2), atk: 5+s, def: 2+s, vit: 5+s, mag: 0 };
        $('screen-hub').classList.add('hidden'); $('screen-combat').classList.remove('hidden'); $('enemy-think').style.display='none';
        this.updateUI(); this.setTurn('player');
    },
    inspectEnemy() {
        $('modal-inspect').classList.remove('hidden'); $('ins-name').innerText = this.enemy.name;
        $('ins-lvl').innerText = this.enemy.lvl; $('ins-str').innerText = this.enemy.str; $('ins-atk').innerText = this.enemy.atk; $('ins-def').innerText = this.enemy.def; $('ins-vit').innerText = this.enemy.vit; $('ins-mag').innerText = this.enemy.mag;
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
    calcHit(atk, def) { return Math.max(10, Math.min(99, 80 + (atk - def) * 2)); },
    setTurn(who) {
        this.turn = who; const ind = $('turn-indicator'); const acts = $('combat-actions');
        if(who === 'player') {
            ind.innerText = "PLAYER TURN"; ind.className = "text-green"; acts.style.opacity = '1'; acts.style.pointerEvents = 'auto';
            // apply DOT damage at the start of player's turn
            this.applyDotTick();
            if(this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + game.player.getRegen()); }
            this.updateUI();
        } else {
            ind.innerText = "ENEMY TURN"; ind.className = "text-red"; acts.style.opacity = '0.5'; acts.style.pointerEvents = 'none';
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
        if(!this.playerDots || this.playerDots.length === 0) return;
        if(typeof STATUS_EFFECTS_CONFIG === 'undefined') return;
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
        }
    },
    takeDamage(amount, target) {
        if(target === 'player') {
            let rem = amount;
            if(this.armor > 0) { if(this.armor >= amount) { this.armor -= amount; rem = 0; } else { rem = amount - this.armor; this.armor = 0; } }
            this.hp -= rem; if(this.hp < 0) this.hp = 0;
        } else { this.enemy.hp -= amount; }
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
            this.showDmg(heal, 'player', 'heal'); this.updateUI(); this.setTurn('enemy'); this.actionLock = false; return;
        }
        let hit = this.calcHit(p.stats.atk, e.def);
        let mod = 1, bonus = 0, shake = 'shake-md';
        if(type==='quick'){ bonus=15; mod=0.7; shake='shake-sm'; }
        if(type==='power'){ bonus=-20; mod=1.5; shake='shake-lg'; }

        if(rng(0,100) <= hit+bonus) {
            const range = p.getDmgRange();
            const baseDmg = rng(range.min, range.max);
            let dmg = Math.floor(baseDmg * mod);
            let isCrit = (rng(0,100) < 5 + p.stats.atk);
            if(isCrit) dmg = Math.floor(dmg * 1.5);
            this.takeDamage(dmg, 'enemy');
            this.showDmg(dmg, 'enemy', isCrit?'crit':'dmg');
            const c=$('game-container'); c.classList.add(shake); setTimeout(()=>c.classList.remove(shake),500);
        } else { this.showDmg("DODGE", 'enemy', 'miss'); }
        this.updateUI();
        if(e.hp <= 0) { await wait(1000); this.win(); this.actionLock = false; } else { await wait(800); this.setTurn('enemy'); this.actionLock = false; }
    },
    async runEnemyTurn() {
        $('enemy-think').style.display = 'block'; await wait(1500); $('enemy-think').style.display = 'none';
        const p = game.player; const e = this.enemy;
        let hit = this.calcHit(e.atk, p.stats.def);
        if(rng(0,100) <= hit) {
            let dmg = Math.floor(e.str * 1.5);
            this.takeDamage(dmg, 'player');
            this.showDmg(dmg, 'player', 'dmg');
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
        } else { this.showDmg("DODGE", 'player', 'miss'); }
        this.updateUI();
        if(this.hp <= 0) { await wait(1000); alert("DEFEAT!"); game.player.gold=Math.floor(game.player.gold*0.9); game.saveGame(); game.showHub(); }
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

if(!localStorage.getItem('arenaV7')) $('btn-continue').style.display='none';
