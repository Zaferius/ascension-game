// Dungeon system — extracted from encounter flow
// Depends on: $, rng, wait (constants.js)
//             POTION_DEFS (potion_defs.js), COMBAT_STORE_DEFS (combat_store_defs.js)
//             combat (combat.js)
// Mixed into game via: const game = { ...gameDungeon, ... }

const gameDungeon = {
    ensureDungeonPanelState() {
        if (!this._dungeonPanelState || typeof this._dungeonPanelState !== 'object') {
            this._dungeonPanelState = { intel: false, bag: false };
        }
        if (typeof this._dungeonPanelState.intel !== 'boolean') this._dungeonPanelState.intel = false;
        if (typeof this._dungeonPanelState.bag !== 'boolean') this._dungeonPanelState.bag = false;
        return this._dungeonPanelState;
    },
    toggleDungeonPanel(panelKey) {
        const state = this.ensureDungeonPanelState();
        if (panelKey !== 'intel' && panelKey !== 'bag') return;
        state[panelKey] = !state[panelKey];
        this.applyDungeonPanelState();
    },
    applyDungeonPanelState() {
        const state = this.ensureDungeonPanelState();
        const setPanel = (key, bodyId, toggleId, label) => {
            const body = $(bodyId);
            const toggle = $(toggleId);
            const expanded = !!state[key];
            if (body) body.classList.toggle('hidden', !expanded);
            if (toggle) {
                toggle.innerText = expanded ? 'Collapse' : 'Expand';
                toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                toggle.title = `${expanded ? 'Hide' : 'Show'} ${label}`;
            }
        };
        setPanel('intel', 'dungeon-section-panel-body', 'dungeon-intel-toggle', 'Section Intel panel');
        setPanel('bag', 'dungeon-bag-panel-body', 'dungeon-bag-toggle', 'Battle Bag panel');
    },
    getDungeonKeyInventoryEntry() {
        if (!this.player || !Array.isArray(this.player.inventory)) return null;
        return this.player.inventory.find(it => it && it.type === 'consumable' && it.subType === 'dungeon_key' && (it.qty || 0) > 0) || null;
    },
    getDungeonKeyCount() {
        const entry = this.getDungeonKeyInventoryEntry();
        return entry ? Math.max(0, entry.qty || 0) : 0;
    },
    consumeDungeonKey(qty = 1) {
        if (!this.player || !Array.isArray(this.player.inventory) || qty <= 0) return false;
        const entry = this.getDungeonKeyInventoryEntry();
        if (!entry || (entry.qty || 0) < qty) return false;
        entry.qty -= qty;
        if (entry.qty <= 0) this.player.inventory.splice(this.player.inventory.indexOf(entry), 1);
        return true;
    },
    rollHiddenChestForNode(node) {
        if (!node || node.type === 'entrance' || node.type === 'boss') return null;
        if (node.hiddenChest) return node.hiddenChest;
        const chanceByType = { combat: 0.22, elite: 0.34, event: 0.2, rest: 0.14, treasure: 0.28 };
        const chestChance = chanceByType[node.type] || 0.18;
        const hasChest = Math.random() < chestChance;
        node.hiddenChest = {
            exists: hasChest,
            opened: false,
            attemptedWithoutKey: false,
            foundText: hasChest ? 'A hidden iron chest is tucked into the shadows of this chamber.' : ''
        };
        return node.hiddenChest;
    },
    resolveHiddenChestInRoom(node) {
        const chest = this.rollHiddenChestForNode(node);
        if (!chest || !chest.exists || chest.opened) return null;

        const keyCount = this.getDungeonKeyCount();
        if (keyCount <= 0) {
            chest.attemptedWithoutKey = true;
            return {
                opened: false,
                text: 'A locked iron chest blocks your reach, but you carry no key. The haul stays sealed.',
                status: 'Hidden chest found, but it is locked.'
            };
        }

        if (!this.consumeDungeonKey(1)) {
            return {
                opened: false,
                text: 'Your key ring comes up empty at the last second. The chest remains sealed.',
                status: 'Hidden chest failed to open.'
            };
        }

        chest.opened = true;
        const dungeonDepth = this.currentDungeon?.depth || 1;
        const sectionTier = this.currentDungeon?.section?.tier || 1;
        const chestGold = 28 + dungeonDepth * 14 + sectionTier * 9 + (node.floor || 0) * 8;
        this.player.gold += chestGold;
        const reward = this.getDungeonTreasureReward();
        const entries = [];
        if (reward && reward.kind === 'potion') {
            this.addPotionToInventory(reward.data, 1);
            entries.push({ kind: 'potion', name: reward.data.name });
        }
        if (reward && reward.kind === 'consumable') {
            this.addConsumableToInventory(reward.data, 1);
            entries.push({ kind: 'consumable', name: reward.data.name });
        }

        const chestBundle = {
            id: `dungeon-chest-${Date.now()}-${Math.random()}`,
            nodeId: node.id,
            nodeLabel: `${node.label} (Hidden Chest)`,
            nodeType: 'treasure',
            sectionName: this.currentDungeon?.section?.name || 'Unknown Section',
            goldTotal: chestGold,
            entries: entries.length ? entries : [{ kind: 'gold', name: `Coin Cache (+${chestGold} gold)` }]
        };
        if (this.currentDungeon) {
            if (!Array.isArray(this.currentDungeon.lootHistory)) this.currentDungeon.lootHistory = [];
            this.currentDungeon.lootHistory.unshift(chestBundle);
            this.currentDungeon.lootHistory = this.currentDungeon.lootHistory.slice(0, 6);
        }

        const rewardName = entries.length ? entries.map(e => e.name).join(', ') : 'coin cache';
        return {
            opened: true,
            text: `You unlock a hidden chest with an Iron Key and claim ${chestGold} gold${rewardName ? ` plus ${rewardName}` : ''}.`,
            status: `Hidden chest opened: +${chestGold} gold.`
        };
    },
    getDungeonDepth() {
        return this.getDungeonSectionForLevel(this.player?.level || 1).tier;
    },
    getDungeonSections() {
        return [
            { tier: 1, minLevel: 1, maxLevel: 6, name: 'The Shallows', rangeLabel: 'Lv. 1-6', theme: 'Collapsed cells, thin-blood raiders, and easy prey.', threat: 'Measured', lootBias: 'Starter gear, light curatives, loose coin.' },
            { tier: 2, minLevel: 7, maxLevel: 13, name: 'The Bloodworks', rangeLabel: 'Lv. 7-13', theme: 'Fresh butcher pits and tighter formations test weaker builds.', threat: 'Rising', lootBias: 'Uncommon steel, stronger potions, field remedies.' },
            { tier: 3, minLevel: 14, maxLevel: 20, name: 'The Iron Warrens', rangeLabel: 'Lv. 14-20', theme: 'Veteran killers hold the crossings and punish bad tempo.', threat: 'Severe', lootBias: 'Reliable armor upgrades and mid-tier trinkets.' },
            { tier: 4, minLevel: 21, maxLevel: 30, name: 'The Catacombs', rangeLabel: 'Lv. 21-30', theme: 'The dead are gone. The hunters who remain are worse.', threat: 'High', lootBias: 'Rare gear, dense coin rooms, stronger sustain drops.' },
            { tier: 5, minLevel: 31, maxLevel: 45, name: 'The Black Furnace', rangeLabel: 'Lv. 31-45', theme: 'Heat, smoke, and armored brutes grind down careless runs.', threat: 'Brutal', lootBias: 'Epic spikes, premium armor rolls, rich treasure rooms.' },
            { tier: 6, minLevel: 46, maxLevel: 60, name: 'The Howling Vault', rangeLabel: 'Lv. 46-60', theme: 'The dungeon leans into attrition and punishes empty bags.', threat: 'Lethal', lootBias: 'High-grade remedies, powerful trinkets, elite payouts.' },
            { tier: 7, minLevel: 61, maxLevel: 80, name: 'The Crown Depths', rangeLabel: 'Lv. 61-80', theme: 'Every chamber is tuned for finished builds and deep reserves.', threat: 'Mythic', lootBias: 'Endgame gear rolls, heavy gold, full-strength potions.' },
            { tier: 8, minLevel: 81, maxLevel: 100, name: 'The Abyssal Seat', rangeLabel: 'Lv. 81-100', theme: 'The last descent. Only complete gladiators keep pace here.', threat: 'Apex', lootBias: 'Best-in-slot hunting, legendary chances, boss tribute.' }
        ];
    },
    getDungeonSectionForLevel(level = 1) {
        const normalizedLevel = Math.max(1, level || 1);
        return this.getDungeonSections().find(section => normalizedLevel >= section.minLevel && normalizedLevel <= section.maxLevel)
            || this.getDungeonSections()[this.getDungeonSections().length - 1];
    },
    getDungeonSectionProgress(level = 1) {
        const section = this.getDungeonSectionForLevel(level);
        const span = Math.max(1, (section.maxLevel || section.minLevel) - section.minLevel + 1);
        const raw = ((Math.max(section.minLevel, level) - section.minLevel + 1) / span) * 100;
        return Math.max(8, Math.min(100, Math.round(raw)));
    },
    getDungeonSectionDanger(node, section) {
        if (!node) return section?.threat || 'Unknown';
        if (node.type === 'boss') return 'Boss';
        if (node.type === 'elite') return 'Elite';
        if (node.type === 'treasure') return 'Low';
        if (node.type === 'rest') return 'Recovery';
        if (node.type === 'event') return 'Unstable';
        return section?.threat || 'Measured';
    },
    getDungeonNodeTypeMeta(type) {
        const map = {
            entrance: { icon: 'G', title: 'Sunken Gate' },
            combat: { icon: '!', title: 'Unknown Chamber' },
            elite: { icon: '!!', title: 'Unknown Threat' },
            event: { icon: '?', title: 'Strange Chamber' },
            rest: { icon: '+', title: 'Quiet Chamber' },
            treasure: { icon: '$', title: 'Sealed Cache' },
            boss: { icon: 'C', title: 'Buried Crown' }
        };
        return map[type] || { icon: '?', title: 'Unknown Chamber' };
    },
    getDungeonNodeLabel(type, floor = 0, lane = 0, depth = 1) {
        const names = {
            entrance: ['Sunken Gate'],
            combat: ['Maw Corridor', 'Shattered Watch', 'Ash Hall', 'Rust Gallery', 'Blood Steps'],
            elite: ['Execution Hall', 'The Butcher Vault', 'The Iron Trial'],
            event: ['Whispering Vault', 'Mirror Chamber', 'The Hollow Altar'],
            rest: ['Ember Shrine', 'Pilgrim Niche', 'Quiet Fire'],
            treasure: ['Forgotten Cache', 'Coffer Room', 'Vault of Chains'],
            boss: [`The Buried Throne`, `Crown Pit ${depth}`, `Warden Seat ${depth}`]
        };
        const pool = names[type] || ['Unknown Chamber'];
        return pool[(floor + lane) % pool.length];
    },
    createDungeonEncounterForNode(node, depth = 1) {
        if (!this.player || !node) return null;
        const playerLevel = this.player.level || 1;
        const section = this.getDungeonSectionForLevel(playerLevel);
        const relativeLevel = Math.max(0, playerLevel - section.minLevel);
        const sectionScale = Math.floor(relativeLevel * 0.65);
        const baseLevel = Math.max(
            section.minLevel,
            Math.min(section.maxLevel + 3, section.minLevel + sectionScale + node.floor + Math.max(0, depth - 1))
        );
        const config = {
            source: 'dungeon',
            dungeonDepth: depth,
            dungeonSectionTier: section.tier,
            dungeonSectionName: section.name,
            dungeonNodeId: node.id,
            room: node.floor + 1,
            totalRooms: 5,
            canRetreat: false,
            xpEnabled: true,
            label: `DUNGEON - ${node.label.toUpperCase()}`
        };
        if (node.type === 'elite') {
            return {
                ...config,
                mode: Math.random() < 0.5 ? 'duo' : 'no_armor',
                enemyLevel: baseLevel + 1,
                secondaryEnemyLevel: baseLevel,
                rewardBonusText: 'Elite chamber rewards increased'
            };
        }
        if (node.type === 'boss') {
            return {
                ...config,
                mode: 'duel',
                enemyLevel: baseLevel + 2,
                forcedEnemyNames: [`The Ashen Warden ${depth}`],
                rewardBonusText: 'Boss chamber rewards greatly increased'
            };
        }
        return {
            ...config,
            mode: Math.random() < 0.2 ? 'no_armor' : 'duel',
            enemyLevel: baseLevel,
            rewardBonusText: 'Combat chamber rewards increased'
        };
    },
    createDungeonRun() {
        if (!this.player) return null;
        const depth = this.getDungeonDepth();
        const section = this.getDungeonSectionForLevel(this.player.level || 1);
        const floorTypes = [
            ['entrance'],
            Math.random() < 0.5 ? ['combat', 'rest'] : ['rest', 'combat'],
            ['combat', 'event', 'treasure'].sort(() => Math.random() - 0.5),
            Math.random() < 0.5 ? ['elite', 'combat'] : ['combat', 'elite'],
            ['boss']
        ];
        const floors = floorTypes.map((types, floorIndex) => {
            return types.map((type, laneIndex) => {
                const node = {
                    id: `f${floorIndex}-n${laneIndex}`,
                    floor: floorIndex,
                    lane: laneIndex,
                    type,
                    label: this.getDungeonNodeLabel(type, floorIndex, laneIndex, depth),
                    resolved: type === 'entrance',
                    discovered: type === 'entrance',
                    visited: type === 'entrance',
                    exits: [],
                    resultText: type === 'entrance' ? 'Cold air spills from below. Choose your first passage.' : ''
                };
                if (type === 'combat' || type === 'elite' || type === 'boss') {
                    const encounter = this.createDungeonEncounterForNode(node, depth);
                    node.encounter = encounter ? { ...encounter, enemyGens: this.generateEncounterGens(encounter) } : null;
                }
                return node;
            });
        });
        if (floors[0] && floors[1]) floors[0][0].exits = floors[1].map(node => node.id);
        if (floors[1] && floors[2]) {
            if (floors[1][0]) floors[1][0].exits = [floors[2][0]?.id, floors[2][1]?.id].filter(Boolean);
            if (floors[1][1]) floors[1][1].exits = [floors[2][1]?.id, floors[2][2]?.id].filter(Boolean);
        }
        if (floors[2] && floors[3]) {
            if (floors[2][0] && floors[3][0]) floors[2][0].exits = [floors[3][0].id];
            if (floors[2][1]) floors[2][1].exits = [floors[3][0]?.id, floors[3][1]?.id].filter(Boolean);
            if (floors[2][2] && floors[3][1]) floors[2][2].exits = [floors[3][1].id];
        }
        if (floors[3] && floors[4] && floors[4][0]) {
            floors[3].forEach(node => { node.exits = [floors[4][0].id]; });
        }
        return {
            title: 'THE SUNKEN GAUNTLET',
            subtitle: `Section ${section.tier} - ${section.name}`,
            depth,
            section,
            floors,
            currentNodeId: floors[0][0].id,
            previousNodeId: null,
            completed: false,
            statusText: 'Cold air spills from below. Choose your first passage.',
            lootHistory: [],
            lastLootBundle: null
        };
    },
    getDungeonNodeById(nodeId) {
        if (!this.currentDungeon || !Array.isArray(this.currentDungeon.floors)) return null;
        for (const floor of this.currentDungeon.floors) {
            const node = (floor || []).find(entry => entry.id === nodeId);
            if (node) return node;
        }
        return null;
    },
    getCurrentDungeonNode() {
        if (!this.currentDungeon) return null;
        return this.getDungeonNodeById(this.currentDungeon.currentNodeId);
    },
    getAvailableDungeonMoves() {
        const node = this.getCurrentDungeonNode();
        if (!node || !node.resolved || this.currentDungeon?.completed) return [];
        return (node.exits || [])
            .map(id => this.getDungeonNodeById(id))
            .filter(target => target && !target.visited);
    },
    showDungeonScreen() {
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(el => el.classList.add('hidden'));
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        const dungeonScreen = $('screen-dungeon');
        if (dungeonScreen) dungeonScreen.classList.remove('hidden');
        this._dungeonCombatPending = false;
        const panelState = this.ensureDungeonPanelState();
        panelState.intel = false;
        panelState.bag = false;
        this.renderDungeonScreen();
        if (typeof stopFightMusic === 'function') stopFightMusic();
        wireButtonSfx(dungeonScreen);
    },
    openDungeonMenu() {
        if (!this.player) return;
        if (!this.currentDungeon || !Array.isArray(this.currentDungeon.floors) || !this.currentDungeon.floors.length) {
            this.currentDungeon = this.createDungeonRun();
        }
        this.showDungeonScreen();
    },
    closeDungeonMenu() {
        this._dungeonCombatPending = false;
        this.clearDungeonVictoryLoot();
        this.currentDungeon = null;
        this.currentEncounter = null;
        this.saveGame();
        this.showHub();
    },
    getDungeonMoveLabel(targetNode) {
        if (!targetNode) return 'Advance';
        const laneLabels = ['Left Passage', 'Center Passage', 'Right Passage'];
        return laneLabels[targetNode.lane] || `Passage ${targetNode.lane + 1}`;
    },
    getDungeonRetreatNode() {
        if (!this.currentDungeon || !this.currentDungeon.previousNodeId) return null;
        const currentNode = this.getCurrentDungeonNode();
        if (!currentNode || currentNode.resolved) return null;
        return this.getDungeonNodeById(this.currentDungeon.previousNodeId);
    },
    formatDungeonText(text) {
        if (!text) return '';
        return String(text)
            .replace(/left passage/gi, '<span class="dungeon-accent">$&</span>')
            .replace(/center passage/gi, '<span class="dungeon-accent">$&</span>')
            .replace(/right passage/gi, '<span class="dungeon-accent">$&</span>')
            .replace(/combat/gi, '<span class="dungeon-danger">$&</span>')
            .replace(/elite/gi, '<span class="dungeon-danger">$&</span>')
            .replace(/boss/gi, '<span class="dungeon-danger">$&</span>');
    },
    getDungeonNodeFlavor(node) {
        if (!node) return 'You stand in silence.';
        const flavor = {
            entrance: 'A stone stairwell sinks beneath the arena. Damp air creeps up the steps and every sound feels swallowed by the dark.',
            combat: 'Boot prints, broken teeth, and drag marks scar the ground. Something violent passed through here not long ago.',
            elite: 'The corridor narrows into a killing ground. The walls carry old blade nicks and the hush feels deliberate.',
            event: 'The chamber is wrong in a way you cannot name. Dust hangs still and every object looks half-forgotten.',
            rest: 'The pressure eases here. The stones are warmer, the air steadier, and for one moment the dungeon loosens its grip.',
            treasure: 'Old iron bands and shattered locks litter the floor. Someone hid valuables here and trusted fear to guard them.',
            boss: 'The deepest hall opens like a buried court. The silence is heavy enough to feel like a warning.'
        };
        return flavor[node.type] || 'The chamber gives nothing away.';
    },
    getDungeonSceneText(node, dungeon, availableMoves) {
        if (!node || !dungeon) {
            return 'The descent waits in silence.';
        }
        if (!node.resolved) {
            if (node.type === 'entrance') {
                return 'You stand at the first threshold beneath Iron City. Three breaths in, the smell of wet stone and rust already clings to your lungs. The way forward is yours to choose.';
            }
            return 'You stand at the threshold of an unopened chamber. The dark beyond gives away nothing until you commit and step inside.';
        }
        const cleared = node.resultText || this.getDungeonNodeFlavor(node);
        if (dungeon.completed) {
            return `${cleared} The descent is finished. Nothing living remains to challenge you here.`;
        }
        if (!availableMoves.length) {
            return `${cleared} No further route opens from this chamber.`;
        }
        const moveText = availableMoves.map(nodeEntry => this.getDungeonMoveLabel(nodeEntry).toLowerCase()).join(', ');
        return `${cleared} From here you can continue through ${moveText}.`;
    },
    renderDungeonScreen() {
        if (!this.player || !this.currentDungeon) return;
        const dungeon = this.currentDungeon;
        const currentNode = this.getCurrentDungeonNode();
        const availableMoves = this.getAvailableDungeonMoves();
        const retreatNode = this.getDungeonRetreatNode();
        const section = dungeon.section || this.getDungeonSectionForLevel(this.player.level || 1);
        const totalRooms = (dungeon.floors || []).reduce((sum, floor) => sum + (floor ? floor.length : 0), 0);
        const clearedRooms = (dungeon.floors || []).flat().filter(node => node && node.resolved && node.type !== 'entrance').length;
        $('dungeon-run-title').innerText = dungeon.title;
        $('dungeon-run-subtitle').innerText = dungeon.completed
            ? 'The map is conquered. Gather yourself and leave with what you earned.'
            : `Section ${section.tier} - ${section.name}. Unknown chambers lie ahead; only your path is certain.`;
        $('dungeon-depth-value').innerText = dungeon.depth;
        $('dungeon-room-count').innerText = `${clearedRooms} / ${Math.max(0, totalRooms - 1)}`;
        $('dungeon-record-value').innerText = `${this.player.dungeonsCompleted || 0} clears`;
        $('dungeon-status-text').innerText = dungeon.statusText || 'Choose a passage.';
        let roomTitle = 'Unknown Chamber';
        let roomText = 'Move deeper into the dungeon to reveal what waits in each room.';
        if (currentNode) {
            roomTitle = currentNode.resolved ? currentNode.label : 'Unknown Chamber';
            roomText = this.getDungeonSceneText(currentNode, dungeon, availableMoves);
        }
        $('dungeon-room-title').innerText = roomTitle;
        $('dungeon-room-copy').innerHTML = this.formatDungeonText(roomText);
        $('dungeon-player-strip').innerHTML = `
            <div class="dungeon-player-chip"><span>Name</span><strong>${this.player.name}</strong></div>
            <div class="dungeon-player-chip"><span>Level</span><strong>${this.player.level}</strong></div>
            <div class="dungeon-player-chip"><span>HP</span><strong>${this.player.getMaxHp()}</strong></div>
            <div class="dungeon-player-chip"><span>Armor</span><strong>${this.player.getTotalArmor()}</strong></div>
        `;
        const currentDanger = this.getDungeonSectionDanger(currentNode, section);
        const recentLoot = Array.isArray(dungeon.lootHistory) ? dungeon.lootHistory.slice(0, 4) : [];
        const bagSlots = this.ensurePlayerBagState();
        const bagFreeSlots = bagSlots.filter(slot => !slot).length;
        $('dungeon-section-range').innerText = section.rangeLabel;
        $('dungeon-section-title').innerText = `Section ${section.tier} - ${section.name}`;
        $('dungeon-section-copy').innerText = section.theme;
        $('dungeon-section-threat').innerText = currentDanger;
        $('dungeon-section-loot').innerText = section.lootBias;
        $('dungeon-section-progress-fill').style.width = `${this.getDungeonSectionProgress(this.player.level || 1)}%`;
        $('dungeon-bag-meta').innerText = `${bagSlots.length - bagFreeSlots} / ${bagSlots.length} prepared`;
        $('dungeon-bag-caption').innerText = bagFreeSlots > 0
            ? `${bagFreeSlots} slot${bagFreeSlots === 1 ? '' : 's'} open for potions or remedies.`
            : 'Your battle bag is full. Free a slot to stash fresh loot.';
        $('dungeon-bag-grid').innerHTML = bagSlots.map((slot, index) => {
            if (!slot) {
                return `
                    <div class="dungeon-bag-slot is-empty" data-bag-slot-index="${index}">
                        <div class="dungeon-bag-slot-index">Slot ${index + 1}</div>
                        <div class="dungeon-bag-slot-name">Empty</div>
                        <div class="dungeon-bag-slot-copy">Ready for loot</div>
                    </div>
                `;
            }
            const icon = slot.type === 'consumable' ? (slot.icon || '[]') : 'P';
            const detail = slot.type === 'consumable'
                ? slot.name
                : `${slot.subType === 'armor' ? 'Armor' : 'Health'} ${slot.percent || 0}%`;
            return `
                <div class="dungeon-bag-slot ${slot.rarity || 'rarity-common'}" data-bag-slot-index="${index}">
                    <button class="btn btn-xs dungeon-bag-slot-clear" onclick="game.returnBagSlotToInventory(${index})">REMOVE</button>
                    <div class="dungeon-bag-slot-index">Slot ${index + 1}</div>
                    <div class="dungeon-bag-slot-name">${icon} ${detail}</div>
                    <div class="dungeon-bag-slot-copy">Packed for the next fight</div>
                </div>
            `;
        }).join('');
        this.ensurePreviewHelpers?.();
        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const buildPreviewFromItem = this._buildItemPreview;
        const movePreview = this._moveItemPreview;
        const bagGridEl = $('dungeon-bag-grid');
        if (bagGridEl && previewBox && previewBody && typeof buildPreviewFromItem === 'function' && typeof movePreview === 'function') {
            const slotCards = bagGridEl.querySelectorAll('.dungeon-bag-slot[data-bag-slot-index]');
            slotCards.forEach(card => {
                const idx = Number(card.getAttribute('data-bag-slot-index'));
                const slot = bagSlots[idx];
                if (!slot) return;
                card.onmouseenter = (ev) => {
                    const fakeItem = slot.type === 'consumable'
                        ? { type: 'consumable', rarity: slot.rarity || 'rarity-common', name: `${slot.icon || ''} ${slot.name || 'Consumable'}`.trim(), subType: slot.subType, desc: slot.desc || '' }
                        : { type: 'potion', rarity: slot.rarity || 'rarity-common', name: slot.name || 'Potion', subType: slot.subType, percent: slot.percent || 0 };
                    buildPreviewFromItem(fakeItem);
                    movePreview(ev);
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                card.onmousemove = (ev) => {
                    if (previewBox.classList.contains('visible')) movePreview(ev);
                };
                card.onmouseleave = () => {
                    previewBox.classList.remove('visible');
                };
            });
        }
        const keyCount = this.getDungeonKeyCount();
        if ($('dungeon-status-text')) {
            const baseStatus = dungeon.statusText || 'Choose a passage.';
            $('dungeon-status-text').innerText = `${baseStatus} ${keyCount > 0 ? `🗝 Keys: ${keyCount}` : '🗝 Keys: 0'}`.trim();
        }
        $('dungeon-loot-feed').innerHTML = recentLoot.length
            ? recentLoot.map(bundle => {
                const header = bundle.nodeType === 'boss' ? 'Boss cache' : (bundle.nodeType === 'elite' ? 'Elite haul' : 'Chamber spoils');
                const goldText = bundle.goldTotal ? ` - +${bundle.goldTotal} gold` : '';
                return `
                    <div class="dungeon-feed-card">
                        <div class="dungeon-feed-head"><strong>${header}</strong><span>${bundle.nodeLabel}</span></div>
                        <div class="dungeon-feed-copy">${bundle.entries.map(entry => entry.name).join(', ')}${goldText}</div>
                    </div>
                `;
            }).join('')
            : '<div class="dungeon-feed-empty">No loot secured yet. Clear combat rooms to start filling your haul log.</div>';
        const actions = [];
        if (dungeon.completed) {
            actions.push('<button class="btn btn-primary" onclick="game.finishDungeonRun()">LEAVE DUNGEON</button>');
        } else if (currentNode && !currentNode.resolved) {
            actions.push('<button class="btn btn-primary" onclick="game.enterCurrentDungeonRoom()">ENTER ROOM</button>');
            if (retreatNode) actions.push(`<button class="btn" onclick="game.returnToPreviousDungeonNode()">GO BACK</button>`);
        } else {
            if (availableMoves.length === 0 && currentNode && currentNode.type !== 'boss') {
                actions.push('<button class="btn" disabled>NO PASSAGES</button>');
            } else {
                availableMoves.forEach(target => {
                    actions.push(`<button class="btn" onclick="game.moveToDungeonNode('${target.id}')">${this.getDungeonMoveLabel(target)}</button>`);
                });
            }
        }
        if (!dungeon.completed) actions.push('<button class="btn" onclick="game.closeDungeonMenu()">ABANDON RUN</button>');
        $('dungeon-room-actions').innerHTML = actions.join('');
        this.applyDungeonPanelState();
        wireButtonSfx($('screen-dungeon'));
    },
    moveToDungeonNode(nodeId) {
        if (!this.currentDungeon || this.currentDungeon.completed) return;
        const currentNode = this.getCurrentDungeonNode();
        const targetNode = this.getDungeonNodeById(nodeId);
        if (!currentNode || !targetNode) return;
        if (!currentNode.resolved) return;
        if (!(currentNode.exits || []).includes(nodeId)) return;
        this.currentDungeon.previousNodeId = currentNode.id;
        this.currentDungeon.currentNodeId = nodeId;
        targetNode.visited = true;
        this.rollHiddenChestForNode(targetNode);
        this.currentDungeon.statusText = `You move into ${this.getDungeonMoveLabel(targetNode).toLowerCase()}.`;
        this.renderDungeonScreen();
    },
    returnToPreviousDungeonNode() {
        if (!this.currentDungeon || !this.currentDungeon.previousNodeId) return;
        const previousNode = this.getDungeonNodeById(this.currentDungeon.previousNodeId);
        if (!previousNode) return;
        this.currentDungeon.currentNodeId = previousNode.id;
        this.currentDungeon.previousNodeId = null;
        this.currentDungeon.statusText = `You step back toward ${previousNode.label}.`;
        this.renderDungeonScreen();
    },
    getDungeonTreasureReward() {
        const rewardPool = [];
        if (Array.isArray(POTION_DEFS)) {
            POTION_DEFS.forEach(def => rewardPool.push({ kind: 'potion', data: def }));
        }
        if (Array.isArray(COMBAT_STORE_DEFS)) {
            COMBAT_STORE_DEFS.forEach(def => rewardPool.push({ kind: 'consumable', data: def }));
        }
        if (!rewardPool.length) return null;
        return rewardPool[rng(0, rewardPool.length - 1)];
    },
    ensurePlayerBagState() {
        if (!this.player) return [];
        const capacity = Math.max(8, this.player.bagCapacity || 8);
        this.player.bagCapacity = capacity;
        if (!Array.isArray(this.player.bagSlots)) this.player.bagSlots = new Array(capacity).fill(null);
        while (this.player.bagSlots.length < capacity) this.player.bagSlots.push(null);
        this.player.bagSlots = this.player.bagSlots.slice(0, capacity);
        return this.player.bagSlots;
    },
    getDungeonPotionDrop(level = 1) {
        if (!Array.isArray(POTION_DEFS) || !POTION_DEFS.length) return null;
        let maxPercent = 25;
        if (level >= 9) maxPercent = 50;
        if (level >= 20) maxPercent = 75;
        if (level >= 40) maxPercent = 100;
        const pool = POTION_DEFS.filter(def => (def.percent || 0) <= maxPercent);
        return (pool.length ? pool : POTION_DEFS)[rng(0, (pool.length ? pool : POTION_DEFS).length - 1)];
    },
    getDungeonConsumableDrop() {
        if (!Array.isArray(COMBAT_STORE_DEFS) || !COMBAT_STORE_DEFS.length) return null;
        const pool = COMBAT_STORE_DEFS.filter(def => def && def.subType !== 'dungeon_key');
        const list = pool.length ? pool : COMBAT_STORE_DEFS;
        return list[rng(0, list.length - 1)];
    },
    createDungeonLootBundle(node, encounter = null) {
        if (!this.player || !node) return null;
        const playerLevel = this.player.level || 1;
        const section = this.getDungeonSectionForLevel(playerLevel);
        const encounterLevel = Math.max(1, encounter?.enemyLevel || playerLevel);
        const enemyCount = encounter?.mode === 'duo' ? 2 : 1;
        const guaranteedRolls = node.type === 'boss' ? 4 : (node.type === 'elite' ? 2 : 1);
        const totalRolls = guaranteedRolls + Math.max(0, enemyCount - 1);
        const entries = [];
        let gearGuaranteed = node.type === 'elite' || node.type === 'boss';
        const pushEntry = (entry) => { if (entry) entries.push(entry); };
        const makeGoldEntry = () => {
            const amount = 16 + encounterLevel * 7 + section.tier * 12 + node.floor * 9 + (node.type === 'boss' ? 90 : node.type === 'elite' ? 38 : 0);
            return {
                id: `dlg-${Date.now()}-${Math.random()}`,
                kind: 'gold',
                name: node.type === 'boss' ? 'Crown Tribute' : 'Coin Cache',
                amount,
                icon: '◎',
                rarity: 'rarity-common',
                note: `+${amount} gold`
            };
        };
        const makeGearEntry = (kind) => {
            let item = null;
            if (kind === 'weapon') item = ItemSystem.createWeapon(encounterLevel + (node.type === 'boss' ? 2 : 0));
            else if (kind === 'armor') item = ItemSystem.createArmor(encounterLevel + (node.type === 'elite' ? 1 : 0));
            else item = ItemSystem.createTrinket(encounterLevel + (node.type === 'boss' ? 1 : 0));
            if (!item) return null;
            return {
                id: `dlg-${Date.now()}-${Math.random()}`,
                kind,
                item,
                name: item.name,
                rarity: item.rarity || 'rarity-common',
                meta: `Lv. ${item.minLevel || item.minShopLevel || encounterLevel}`,
                note: 'Stored in inventory',
                inventoryId: item.id,
                equipped: false
            };
        };
        const chooseRandomLootKind = () => {
            const roll = rng(1, 100);
            if (roll <= 24) return 'gold';
            if (roll <= 46) return 'potion';
            if (roll <= 58) return 'consumable';
            if (roll <= 75) return 'weapon';
            if (roll <= 91) return 'armor';
            return 'trinket';
        };

        if (gearGuaranteed) {
            pushEntry(makeGearEntry(['weapon', 'armor', 'trinket'][rng(0, 2)]));
            if (node.type === 'boss') pushEntry(makeGoldEntry());
            gearGuaranteed = false;
        }

        for (let i = entries.length; i < totalRolls; i++) {
            const kind = chooseRandomLootKind();
            if (kind === 'gold') {
                pushEntry(makeGoldEntry());
            } else if (kind === 'potion') {
                const potion = this.getDungeonPotionDrop(encounterLevel);
                if (potion) {
                    pushEntry({
                        id: `dlg-${Date.now()}-${Math.random()}`,
                        kind: 'potion',
                        item: { ...potion },
                        name: potion.name,
                        rarity: 'rarity-common',
                        note: 'Stored in inventory',
                        bagAssigned: false
                    });
                }
            } else if (kind === 'consumable') {
                const consumable = this.getDungeonConsumableDrop();
                if (consumable) {
                    pushEntry({
                        id: `dlg-${Date.now()}-${Math.random()}`,
                        kind: 'consumable',
                        item: { ...consumable },
                        name: consumable.name,
                        rarity: consumable.rarity || 'rarity-common',
                        note: 'Stored in inventory',
                        bagAssigned: false
                    });
                }
            } else {
                pushEntry(makeGearEntry(kind));
            }
        }

        return {
            id: `dungeon-bundle-${Date.now()}-${Math.random()}`,
            nodeId: node.id,
            nodeLabel: node.label,
            nodeType: node.type,
            sectionName: section.name,
            goldTotal: entries.filter(entry => entry.kind === 'gold').reduce((sum, entry) => sum + (entry.amount || 0), 0),
            entries: entries.filter(Boolean)
        };
    },
    grantDungeonLootBundle(bundle) {
        if (!this.player || !bundle || !Array.isArray(bundle.entries)) return null;
        if (!Array.isArray(this.player.inventory)) this.player.inventory = [];
        bundle.entries.forEach(entry => {
            if (!entry) return;
            if (entry.kind === 'weapon' || entry.kind === 'armor' || entry.kind === 'trinket') {
                this.player.inventory.push(entry.item);
                entry.note = 'Stored in inventory';
            } else if (entry.kind === 'potion') {
                this.addPotionToInventory(entry.item, 1);
            } else if (entry.kind === 'consumable') {
                this.addConsumableToInventory(entry.item, 1);
            }
        });
        if (this.currentDungeon) {
            this.currentDungeon.lastLootBundle = bundle;
            if (!Array.isArray(this.currentDungeon.lootHistory)) this.currentDungeon.lootHistory = [];
            this.currentDungeon.lootHistory.unshift(bundle);
            this.currentDungeon.lootHistory = this.currentDungeon.lootHistory.slice(0, 6);
        }
        this.currentVictoryLoot = bundle;
        return bundle;
    },
    getDungeonVictoryLootBundle() {
        return this.currentVictoryLoot || null;
    },
    moveInventoryItemToBag(itemLike) {
        if (!this.player || !itemLike) return false;
        const slots = this.ensurePlayerBagState();
        const freeIndex = slots.findIndex(slot => !slot);
        if (freeIndex === -1) return false;
        if (itemLike.type === 'consumable') {
            const invItem = this.player.inventory.find(it => it && it.type === 'consumable' && it.subType === itemLike.subType && (it.qty || 0) >= 1);
            if (!invItem) return false;
            invItem.qty -= 1;
            if (invItem.qty <= 0) this.player.inventory.splice(this.player.inventory.indexOf(invItem), 1);
        } else {
            if (!this.consumePotionFromInventory(itemLike, 1)) return false;
        }
        slots[freeIndex] = {
            type: itemLike.type,
            subType: itemLike.subType,
            percent: itemLike.percent || 0,
            name: itemLike.name || '',
            icon: itemLike.icon || '',
            desc: itemLike.desc || '',
            rarity: itemLike.rarity || 'rarity-common',
            price: itemLike.price,
            used: false
        };
        return true;
    },
    returnBagSlotToInventory(slotIndex) {
        if (!this.player || !Array.isArray(this.player.bagSlots)) return;
        const slot = this.player.bagSlots[slotIndex];
        if (!slot) return;
        if (slot.type === 'consumable') this.addConsumableToInventory(slot, 1);
        else this.addPotionToInventory(slot, 1);
        this.player.bagSlots[slotIndex] = null;
        this.renderDungeonScreen();
        this.renderDungeonVictoryLoot();
        this.saveGame();
    },
    stashDungeonLootToBag(entryId) {
        const bundle = this.getDungeonVictoryLootBundle();
        const entry = bundle?.entries?.find(item => item.id === entryId);
        if (!entry || entry.bagAssigned || (entry.kind !== 'potion' && entry.kind !== 'consumable')) return;
        if (!this.moveInventoryItemToBag({ ...entry.item, type: entry.kind })) return;
        entry.bagAssigned = true;
        entry.note = 'Packed into battle bag';
        this.renderDungeonVictoryLoot();
        this.renderDungeonScreen();
        this.saveGame();
    },
    equipDungeonLootItem(entryId) {
        if (!this.player) return;
        const bundle = this.getDungeonVictoryLootBundle();
        const entry = bundle?.entries?.find(item => item.id === entryId);
        if (!entry || entry.equipped || !entry.item) return;
        const invItem = this.player.inventory.find(item => item && item.id === entry.item.id);
        if (!invItem) return;
        this.player.equip(invItem);
        entry.equipped = true;
        entry.note = 'Equipped now';
        this.renderDungeonVictoryLoot();
        this.renderDungeonScreen();
        this.saveGame();
    },
    clearDungeonVictoryLoot() {
        this.currentVictoryLoot = null;
        const section = $('victory-dungeon-loot');
        if (section) section.classList.add('hidden');
        const grid = $('victory-dungeon-loot-grid');
        if (grid) grid.innerHTML = '';
        const meta = $('victory-dungeon-loot-meta');
        if (meta) meta.innerText = '';
    },
    renderDungeonVictoryLoot() {
        const section = $('victory-dungeon-loot');
        const grid = $('victory-dungeon-loot-grid');
        const meta = $('victory-dungeon-loot-meta');
        const bundle = this.getDungeonVictoryLootBundle();
        if (!section || !grid || !bundle || !Array.isArray(bundle.entries) || !bundle.entries.length) {
            if (section) section.classList.add('hidden');
            if (grid) grid.innerHTML = '';
            if (meta) meta.innerText = '';
            return;
        }
        const freeSlots = this.ensurePlayerBagState().filter(slot => !slot).length;
        section.classList.remove('hidden');
        if (meta) meta.innerText = `${bundle.sectionName} haul - ${bundle.entries.length} drops - ${freeSlots} bag slots open`;
        grid.innerHTML = bundle.entries.map(entry => {
            const isGear = entry.kind === 'weapon' || entry.kind === 'armor' || entry.kind === 'trinket';
            const isBaggable = entry.kind === 'potion' || entry.kind === 'consumable';
            const noteClass = entry.equipped || entry.bagAssigned ? 'dungeon-loot-note is-active' : 'dungeon-loot-note';
            let actions = '';
            if (isGear) {
                actions = entry.equipped
                    ? '<div class="dungeon-loot-action-state">Equipped</div>'
                    : `<button class="btn btn-xs" onclick="game.equipDungeonLootItem('${entry.id}')">EQUIP NOW</button>`;
            } else if (isBaggable) {
                actions = entry.bagAssigned
                    ? '<div class="dungeon-loot-action-state">In Bag</div>'
                    : `<button class="btn btn-xs" onclick="game.stashDungeonLootToBag('${entry.id}')">STASH TO BAG</button>`;
            } else {
                actions = `<div class="dungeon-loot-action-state">${entry.note || `+${entry.amount || 0} gold`}</div>`;
            }
            return `
                <div class="dungeon-loot-card ${entry.rarity || 'rarity-common'}">
                    <div class="dungeon-loot-card-top">
                        <div>
                            <div class="dungeon-loot-kind">${entry.kind.toUpperCase()}</div>
                            <div class="dungeon-loot-name">${entry.name}</div>
                        </div>
                        <div class="dungeon-loot-value">${entry.kind === 'gold' ? `+${entry.amount}` : (entry.meta || entry.note || '')}</div>
                    </div>
                    <div class="${noteClass}">${entry.note || (entry.kind === 'gold' ? 'Added to your purse' : 'Stored in inventory')}</div>
                    <div class="dungeon-loot-actions-row">${actions}</div>
                </div>
            `;
        }).join('');
    },
    resolveDungeonUtilityRoom(node) {
        if (!this.player || !node || node.resolved) return;
        if (node.type === 'rest') {
            if (Array.isArray(this.player.injuries) && this.player.injuries.length > 0) {
                const healed = this.player.injuries.shift();
                node.resultText = `A quiet fire steadies your breath. ${healed.name} fades before the next descent.`;
                this.currentDungeon.statusText = `Rest chamber: ${healed.name} removed.`;
            } else {
                const potion = POTION_DEFS && POTION_DEFS.find(def => def.key === 'hp_50');
                if (potion) this.addPotionToInventory(potion, 1);
                node.resultText = 'You find a safe corner and recover your nerve. A useful potion is left behind.';
                this.currentDungeon.statusText = 'Rest chamber: found a healing potion.';
            }
        } else if (node.type === 'treasure') {
            const gold = 45 + ((this.currentDungeon.depth || 1) * 20) + (node.floor * 18);
            this.player.gold += gold;
            const reward = this.getDungeonTreasureReward();
            if (reward && reward.kind === 'potion') this.addPotionToInventory(reward.data, 1);
            if (reward && reward.kind === 'consumable') this.addConsumableToInventory(reward.data, 1);
            const rewardName = reward ? reward.data.name : 'loot';
            node.resultText = `A rusted cache cracks open. You claim ${gold} gold and recover ${rewardName}.`;
            this.currentDungeon.statusText = `Treasure room: +${gold} gold.`;
        } else if (node.type === 'event') {
            const roll = rng(1, 3);
            if (roll === 1) {
                const gold = 55 + ((this.currentDungeon.depth || 1) * 18);
                this.player.gold += gold;
                node.resultText = `A cracked idol spills hidden coin into the dust. You gather ${gold} gold before moving on.`;
                this.currentDungeon.statusText = `Event room: +${gold} gold.`;
            } else if (roll === 2) {
                if (Array.isArray(this.player.injuries) && this.player.injuries.length > 0) {
                    const healed = this.player.injuries.pop();
                    node.resultText = `A strange draught cools your blood. ${healed.name} loosens its grip and fades away.`;
                    this.currentDungeon.statusText = `Event room: ${healed.name} removed.`;
                } else {
                    const potion = POTION_DEFS && POTION_DEFS.find(def => def.key === 'arm_50');
                    if (potion) this.addPotionToInventory(potion, 1);
                    node.resultText = 'A shrine offers a defensive tonic. You keep it for the next hard fight.';
                    this.currentDungeon.statusText = 'Event room: found an armor potion.';
                }
            } else {
                const bandage = Array.isArray(COMBAT_STORE_DEFS) ? COMBAT_STORE_DEFS.find(def => def.subType === 'cure_bleed') : null;
                if (bandage) this.addConsumableToInventory(bandage, 1);
                node.resultText = 'A discarded satchel still holds a field remedy. You stash it for a harsher fight ahead.';
                this.currentDungeon.statusText = 'Event room: found a Bandage.';
            }
        }
        node.resolved = true;
        node.discovered = true;
        this.renderDungeonScreen();
    },
    enterCurrentDungeonRoom() {
        const node = this.getCurrentDungeonNode();
        if (!node || node.resolved || !this.currentDungeon || this._dungeonCombatPending) return;
        node.discovered = true;
        if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
            const chestResult = this.resolveHiddenChestInRoom(node);
            if (chestResult) {
                this.currentDungeon.statusText = chestResult.status;
                const priorText = node.resultText ? `${node.resultText} ` : '';
                node.resultText = `${priorText}${chestResult.text}`.trim();
            }
            this._dungeonCombatPending = true;
            if (!node.encounter) node.encounter = this.createDungeonEncounterForNode(node, this.currentDungeon.depth || 1);
            if (node.encounter && !node.encounter.enemyGens) node.encounter.enemyGens = this.generateEncounterGens(node.encounter);
            const warningText = node.type === 'boss'
                ? 'A terrible presence rises in the chamber. Steel answers before thought.'
                : (node.type === 'elite'
                    ? 'A harder shape steps out of the dark. This is no ordinary fight.'
                    : 'Movement breaks the silence. Something hostile lunges from the gloom.');
            this.currentDungeon.statusText = warningText;
            const chestPrefix = node.resultText ? `${node.resultText} ` : '';
            node.resultText = `${chestPrefix}${warningText}`.trim();
            this.renderDungeonScreen();
            const dungeonScreen = $('screen-dungeon');
            setTimeout(() => {
                if (dungeonScreen) dungeonScreen.classList.add('hidden');
                this._dungeonCombatPending = false;
                combat.init(node.encounter.mode, { ...node.encounter, canRetreat: false }, true);
            }, 650);
            return;
        }
        this.resolveDungeonUtilityRoom(node);
        const chestResult = this.resolveHiddenChestInRoom(node);
        if (chestResult) {
            const priorText = node.resultText ? `${node.resultText} ` : '';
            node.resultText = `${priorText}${chestResult.text}`.trim();
            this.currentDungeon.statusText = `${this.currentDungeon.statusText || ''} ${chestResult.status}`.trim();
            this.renderDungeonScreen();
        }
    },
    resolveCurrentDungeonCombatVictory() {
        const node = this.getCurrentDungeonNode();
        if (!this.currentDungeon || !node || node.resolved) return;
        const lootBundle = this.currentDungeon.lastLootBundle;
        const lootText = lootBundle && lootBundle.entries && lootBundle.entries.length
            ? ` You secure ${lootBundle.entries.length} loot drop${lootBundle.entries.length === 1 ? '' : 's'} from the bodies.`
            : '';
        node.resolved = true;
        node.discovered = true;
        if (node.type === 'boss') {
            this.currentDungeon.completed = true;
            this.currentDungeon.statusText = `Depth ${this.currentDungeon.depth} stands cleared.`;
            node.resultText = `The crown chamber falls silent. Nothing else in this place can stop you now.${lootText}`;
        } else {
            this.currentDungeon.statusText = `${node.label} is clear. Choose your next passage.`;
            node.resultText = `The chamber is broken open. You can press deeper into the dungeon.${lootText}`;
        }
    },
    finishDungeonRun() {
        if (!this.currentDungeon) {
            this.showHub();
            return;
        }
        this._dungeonCombatPending = false;
        this.clearDungeonVictoryLoot();
        this.currentDungeon = null;
        this.currentEncounter = null;
        this.saveGame();
        this.showHub();
    },
};
