// Dungeon system — extracted from encounter flow
// Depends on: $, rng, wait (constants.js)
//             POTION_DEFS (potion_defs.js), COMBAT_STORE_DEFS (combat_store_defs.js)
//             combat (combat.js)
// Mixed into game via: const game = { ...gameDungeon, ... }

const gameDungeon = {
    getDungeonDepth() {
        if (!this.player) return 1;
        return Math.max(1, Math.floor(((this.player.level || 1) + 1) / 2));
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
        const baseLevel = Math.max(1, (this.player.level || 1) + node.floor - 1 + Math.max(0, depth - 1));
        const config = {
            source: 'dungeon',
            dungeonDepth: depth,
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
            subtitle: 'A branching descent through iron, blood, and stone.',
            depth,
            floors,
            currentNodeId: floors[0][0].id,
            previousNodeId: null,
            completed: false,
            statusText: 'Cold air spills from below. Choose your first passage.'
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
        const totalRooms = (dungeon.floors || []).reduce((sum, floor) => sum + (floor ? floor.length : 0), 0);
        const clearedRooms = (dungeon.floors || []).flat().filter(node => node && node.resolved && node.type !== 'entrance').length;
        $('dungeon-run-title').innerText = dungeon.title;
        $('dungeon-run-subtitle').innerText = dungeon.completed
            ? 'The map is conquered. Gather yourself and leave with what you earned.'
            : `Depth ${dungeon.depth}. Unknown chambers lie ahead; only your path is certain.`;
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
            this._dungeonCombatPending = true;
            if (!node.encounter) node.encounter = this.createDungeonEncounterForNode(node, this.currentDungeon.depth || 1);
            if (node.encounter && !node.encounter.enemyGens) node.encounter.enemyGens = this.generateEncounterGens(node.encounter);
            const warningText = node.type === 'boss'
                ? 'A terrible presence rises in the chamber. Steel answers before thought.'
                : (node.type === 'elite'
                    ? 'A harder shape steps out of the dark. This is no ordinary fight.'
                    : 'Movement breaks the silence. Something hostile lunges from the gloom.');
            this.currentDungeon.statusText = warningText;
            node.resultText = warningText;
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
    },
    resolveCurrentDungeonCombatVictory() {
        const node = this.getCurrentDungeonNode();
        if (!this.currentDungeon || !node || node.resolved) return;
        node.resolved = true;
        node.discovered = true;
        if (node.type === 'boss') {
            this.currentDungeon.completed = true;
            this.currentDungeon.statusText = `Depth ${this.currentDungeon.depth} stands cleared.`;
            node.resultText = 'The crown chamber falls silent. Nothing else in this place can stop you now.';
        } else {
            this.currentDungeon.statusText = `${node.label} is clear. Choose your next passage.`;
            node.resultText = 'The chamber is broken open. You can press deeper into the dungeon.';
        }
    },
    finishDungeonRun() {
        if (!this.currentDungeon) {
            this.showHub();
            return;
        }
        this._dungeonCombatPending = false;
        this.currentDungeon = null;
        this.currentEncounter = null;
        this.saveGame();
        this.showHub();
    },
};
