// Encounter & Tournament system — extracted from game object
// Depends on: $, rng, ARMOR_SLOTS (constants.js)
//             TOURNAMENT_TIERS, MAX_TOURNAMENT_TIER (tournaments.js)
//             generateEnemyTemplateForLevel (enemy_config.js)
//             combat (combat.js)
// Mixed into game via: const game = { ...gameEncounter, ... }

const gameEncounter = {
    rollEncounterEnemyLevel(baseLevel, offset = 0) {
        const referenceLevel = Math.max(1, baseLevel || this.player?.level || 1);
        const appliedOffset = Math.max(-2, Math.min(2, offset || 0));
        const variance = rng(-2, 2);
        return Math.max(1, referenceLevel + variance + appliedOffset);
    },
    getUnlockedTournamentTier() {
        if (!this.player) return 0;
        return Math.min(MAX_TOURNAMENT_TIER, Math.floor((this.player.level || 1) / 3));
    },
    isTournamentAvailable() {
        if (!this.player) return false;
        return this.getUnlockedTournamentTier() > (this.player.tournamentsCompleted || 0);
    },
    getNextTournamentTier() {
        return Math.max(1, (this.player?.tournamentsCompleted || 0) + 1);
    },
    getTournamentTierMeta(tier) {
        return TOURNAMENT_TIERS.find(entry => entry.tier === tier) || TOURNAMENT_TIERS[TOURNAMENT_TIERS.length - 1];
    },
    createTournamentRounds(tier) {
        const baseLevel = Math.max(1, (this.player?.level || 1) + tier - 1);
        const totalRounds = Math.min(5 + Math.floor(tier / 2), 14);
        const tierMeta = this.getTournamentTierMeta(tier);
        return Array.from({ length: totalRounds }, (_, i) => {
            const duoRounds = Math.min(1 + Math.floor(tier / 5), 4);
            const isDuoRound = i >= totalRounds - duoRounds;
            const isFinal = i === totalRounds - 1;
            const enemyNames = isFinal && Array.isArray(tierMeta.final)
                ? tierMeta.final.slice(0, isDuoRound && tier >= 2 ? 2 : 1)
                : null;
            return {
                source: 'tournament',
                tournamentTier: tier,
                tournamentName: tierMeta.name,
                tournamentTheme: tierMeta.theme,
                round: i + 1,
                totalRounds,
                label: `${tierMeta.name.toUpperCase()} - ROUND ${i + 1}`,
                mode: isDuoRound && tier >= 2 ? 'duo' : 'duel',
                canRetreat: false,
                xpEnabled: false,
                enemyLevel: baseLevel + i,
                secondaryEnemyLevel: baseLevel + Math.max(0, i),
                rewardBonusText: isFinal ? 'Final tournament payout on victory' : 'Advance to the next round',
                forcedEnemyNames: enemyNames
            };
        });
    },
    generateEncounterGens(config) {
        if (!this.player || !config) return [];
        const enemyCount = config.mode === 'duo' ? 2 : 1;
        const enemyGens = [];
        const usedNames = new Set();
        const allowVariance = config.source !== 'tournament' && !config.fixedLevels;
        const generator = (config.source === 'dungeon' && typeof generateDungeonEnemyTemplateForLevel === 'function')
            ? generateDungeonEnemyTemplateForLevel
            : generateEnemyTemplateForLevel;
        for (let i = 0; i < enemyCount; i++) {
            const configuredBaseLevel = i === 1
                ? (config.secondaryEnemyLevel || Math.max(1, (config.enemyLevel || this.player.level) - 1))
                : (config.enemyLevel || this.player.level);
            const lvl = allowVariance
                ? this.rollEncounterEnemyLevel(configuredBaseLevel, i === 1 ? -1 : 0)
                : Math.max(1, configuredBaseLevel);
            const gen = generator(lvl, usedNames);
            if (gen && Array.isArray(config.forcedEnemyNames) && config.forcedEnemyNames[i]) gen.displayName = config.forcedEnemyNames[i];
            enemyGens.push(gen);
        }
        return enemyGens;
    },
    openTournamentMenu() {
        if (!this.player) return;
        if ((this.player.tournamentsCompleted || 0) >= MAX_TOURNAMENT_TIER) {
            $('hub-msg').innerText = 'You have conquered every Iron City Tournament tier.';
            return;
        }
        if (!this.isTournamentAvailable()) {
            const nextLevel = Math.max(((this.player.tournamentsCompleted || 0) + 1) * 3, 3);
            $('hub-msg').innerText = `Next tournament unlocks at level ${nextLevel}.`;
            return;
        }
        const tier = this.getNextTournamentTier();
        const rounds = this.createTournamentRounds(tier).map(round => ({ ...round, enemyGens: this.generateEncounterGens(round) }));
        this.currentTournament = { tier, rounds, index: 0 };
        this.renderTournamentMenu();
        const modal = $('modal-tournament');
        if (modal) {
            modal.classList.remove('hidden');
            wireButtonSfx(modal);
        }
    },
    closeTournamentMenu() {
        const modal = $('modal-tournament');
        if (modal) modal.classList.add('hidden');
        this.currentTournament = null;
    },
    renderTournamentMenu() {
        if (!this.currentTournament || !this.player) return;
        const tier = this.currentTournament.tier;
        const rounds = this.currentTournament.rounds;
        const tierMeta = this.getTournamentTierMeta(tier);
        $('tournament-title').innerText = tierMeta.name;
        $('tournament-subtitle').innerText = tierMeta.theme;
        $('tournament-summary').innerHTML = `
            <div class="stat-row"><span>Tournament Tier</span><span class="text-gold">${tier}</span></div>
            <div class="stat-row"><span>Required Level</span><span class="text-red">${tier * 3}</span></div>
            <div class="stat-row"><span>Total Rounds</span><span>${rounds.length}</span></div>
            <div class="stat-row"><span>Final Reward</span><span class="text-gold">Champion payout + trophy title</span></div>
            <div class="stat-row"><span>Retreat</span><span class="text-red">Disabled</span></div>
        `;
        $('tournament-roster').innerHTML = rounds.map((round, idx) => {
            const isChampionRound = Array.isArray(round.forcedEnemyNames) && round.forcedEnemyNames.length > 0;
            const nameParts = (round.enemyGens || []).map((gen, gi) => {
                const name = gen?.displayName || gen?.template?.name || 'Bandit';
                const isChampion = isChampionRound && gen?.displayName;
                return isChampion ? `<span class="tournament-champion-name">${name}</span>` : name;
            });
            const nameHtml = nameParts.join(round.mode === 'duo' ? ' + ' : '');
            return `<div class="encounter-roster-line"><div class="stat-row"><span>Round ${idx + 1}</span><span>${round.mode === 'duo' ? '1v2' : '1v1'}</span></div><div style="font-size:1rem;">${nameHtml}</div><div style="color:#9898a1; font-size:0.84rem; margin-top:4px;">Level ${round.enemyLevel}${round.mode === 'duo' ? ` / ${round.secondaryEnemyLevel}` : ''}</div></div>`;
        }).join('');
        $('tournament-progress').innerHTML = rounds.map((round, idx) => {
            const isChampionRound = Array.isArray(round.forcedEnemyNames) && round.forcedEnemyNames.length > 0;
            const nameParts = (round.enemyGens || []).map(gen => {
                const name = gen?.displayName || gen?.template?.name || 'Bandit';
                return (isChampionRound && gen?.displayName) ? `<span class="tournament-champion-name">${name}</span>` : name;
            });
            const nameHtml = nameParts.join(round.mode === 'duo' ? ' + ' : '');
            return `<div class="tournament-round-chip${idx === rounds.length - 1 ? ' is-final' : ''}"><strong>Round ${idx + 1}</strong><span>${nameHtml}</span></div>`;
        }).join('');
    },
    startTournamentRun() {
        if (!this.currentTournament || !this.currentTournament.rounds.length) return;
        const modal = $('modal-tournament');
        if (modal) modal.classList.add('hidden');
        this.prepareEncounter({ ...this.currentTournament.rounds[0], canRetreat: false });
    },
    getEncounterEnemyPreview({ tpl, displayName, stats, lvl, mode }) {
        const name = displayName || (tpl ? tpl.name : 'Bandit');
        const enemy = { name, lvl, str: stats.str, atk: stats.atk, def: stats.def, vit: stats.vit };
        const maxHp = combat.getEnemyMaxHp(enemy);
        const maxArmor = mode === 'no_armor' ? 0 : Math.max(0, Math.floor(enemy.def * 1.2 + enemy.vit * 0.8 + lvl * 2));
        const dmg = combat.getEnemyDmgRange(enemy);
        return { name, lvl, maxHp, maxArmor, dmg };
    },
    prepareEncounter(config) {
        if (!this.player || !config) return;
        const enemyGens = Array.isArray(config.enemyGens) ? config.enemyGens : this.generateEncounterGens(config);
        this.currentEncounter = { ...config, enemyGens };
        this.renderEncounterPreview();
        const modal = $('modal-encounter');
        if (modal) {
            modal.classList.remove('hidden');
            wireButtonSfx(modal);
        }
    },
    renderEncounterPreview() {
        if (!this.player || !this.currentEncounter) return;
        const cfg = this.currentEncounter;
        $('encounter-title').innerText = cfg.label || 'ARENA MATCHUP';
        $('encounter-subtitle').innerText = cfg.source === 'tournament'
            ? `${cfg.tournamentTheme} Round ${cfg.round}/${cfg.totalRounds}.`
            : (cfg.source === 'dungeon'
                ? `Dungeon Depth ${cfg.dungeonDepth} - Room ${cfg.room}/${cfg.totalRooms}.`
                : 'Study the matchup before you commit.');
        const retreatBtn = $('btn-encounter-retreat');
        const closeBtn = $('encounter-close');
        if (retreatBtn) {
            retreatBtn.style.display = cfg.canRetreat ? 'inline-flex' : 'none';
            retreatBtn.disabled = !cfg.canRetreat;
        }
        if (closeBtn) closeBtn.style.display = cfg.canRetreat ? 'block' : 'none';
        const p = this.player;
        const dmg = p.getDmgRange();
        const enemyPreviews = (cfg.enemyGens || []).map(gen => this.getEncounterEnemyPreview({ tpl: gen?.template, displayName: gen?.displayName, stats: gen?.stats || { str: 5, atk: 5, def: 3, vit: 3 }, lvl: gen?.level || cfg.enemyLevel || p.level, mode: cfg.mode }));
        const maxEnemyHp    = enemyPreviews.length ? Math.max(...enemyPreviews.map(preview => preview.maxHp))  : 0;
        const maxEnemyArmor = enemyPreviews.length ? Math.max(...enemyPreviews.map(preview => preview.maxArmor)) : 0;
        const maxEnemyDmg   = enemyPreviews.length ? Math.max(...enemyPreviews.map(preview => preview.dmg.max)) : 0;
        $('encounter-player-summary').innerHTML = `
            <div class="stat-row"><span>Name</span><span>${p.name}</span></div>
            <div class="stat-row"><span>Level</span><span class="text-red">${p.level}</span></div>
            <div class="stat-row"><span>Health</span><span class="text-red">${p.getMaxHp()}</span></div>
            <div class="stat-row"><span>Armor</span><span class="text-shield">${cfg.mode === 'no_armor' ? 0 : p.getTotalArmor()}</span></div>
            <div class="stat-row"><span>Melee Damage</span><span class="text-orange">${dmg.min}-${dmg.max}</span></div>
            <div class="stat-row"><span>Format</span><span>${cfg.mode === 'duo' ? '1v2' : (cfg.mode === 'no_armor' ? 'No Armor, No Escape' : '1v1')}</span></div>
        `;
        $('encounter-enemy-summary').innerHTML = enemyPreviews.map((preview, idx) => `
            <div class="encounter-enemy-card${idx > 0 ? ' encounter-enemy-card-split' : ''}">
                <div class="stat-row"><span>Enemy ${idx + 1}</span><span>${preview.name}</span></div>
                <div class="stat-row"><span>Level</span><span class="text-red">${preview.lvl}</span></div>
                <div class="stat-row"><span>Health</span><span class="text-red">${preview.maxHp}</span></div>
                <div class="stat-row"><span>Armor</span><span class="text-shield">${preview.maxArmor}</span></div>
                <div class="stat-row"><span>Damage</span><span class="text-orange">${preview.dmg.min}-${preview.dmg.max}</span></div>
            </div>
        `).join('') + `<div class="encounter-reward-note">${cfg.rewardBonusText || ''}</div>`;
        $('encounter-vs-strip').innerHTML = `
            <div class="encounter-vs-card"><div class="encounter-vs-label">Health</div><div class="encounter-vs-values"><span class="encounter-vs-player">${p.getMaxHp()}</span><span class="encounter-vs-sep">vs</span><span class="encounter-vs-enemy">${maxEnemyHp}</span></div></div>
            <div class="encounter-vs-card"><div class="encounter-vs-label">Armor</div><div class="encounter-vs-values"><span class="encounter-vs-player">${cfg.mode === 'no_armor' ? 0 : p.getTotalArmor()}</span><span class="encounter-vs-sep">vs</span><span class="encounter-vs-enemy">${maxEnemyArmor}</span></div></div>
            <div class="encounter-vs-card"><div class="encounter-vs-label">Damage</div><div class="encounter-vs-values"><span class="encounter-vs-player">${dmg.max}</span><span class="encounter-vs-sep">vs</span><span class="encounter-vs-enemy">${maxEnemyDmg}</span></div></div>
        `;
    },
    cancelEncounterPreview() {
        const modal = $('modal-encounter');
        if (modal) modal.classList.add('hidden');
        if (!this.currentEncounter || (this.currentEncounter.source !== 'tournament' && this.currentEncounter.source !== 'dungeon')) this.currentEncounter = null;
    },
    async confirmEncounterPreview() {
        if (!this.currentEncounter) return;
        const container = $('game-container');
        if (container) container.classList.add('screen-fade-active');
        await wait(220);
        const modal = $('modal-encounter');
        if (modal) modal.classList.add('hidden');
        combat.init(this.currentEncounter.mode, this.currentEncounter, true);
    },
    selectPitMode(mode) {
        this.currentPitMode = mode === 'no_armor' ? 'no_armor' : (mode === 'duo' ? 'duo' : 'duel');
        this.closePitMenu();
        this.prepareEncounter({
            source: 'pit',
            label: this.currentPitMode === 'no_armor' ? 'NO ARMOR, NO ESCAPE' : (this.currentPitMode === 'duo' ? 'THE PIT - 1v2' : 'THE PIT - 1v1'),
            mode: this.currentPitMode,
            canRetreat: this.currentPitMode !== 'no_armor',
            xpEnabled: !this.isTournamentAvailable(),
            rewardBonusText: this.currentPitMode === 'no_armor' ? '+35% Gold / XP' : (this.currentPitMode === 'duo' ? '+75% Gold / XP' : (this.isTournamentAvailable() ? 'Gold Only - tournament awaits' : 'Base Gold / XP'))
        });
    },
    openPitMenu() {
        const modal = $('modal-pit');
        if (!modal) return;
        modal.classList.remove('hidden');
        wireButtonSfx(modal);
    },
    closePitMenu() {
        const modal = $('modal-pit');
        if (modal) modal.classList.add('hidden');
    },
    resolveFightInjuries(fightContext) {
        if (!this.player) return;
        if (!Array.isArray(this.player.injuries)) this.player.injuries = [];
        this.player.injuries = this.player.injuries
            .map(injury => ({ ...injury, remainingFights: (injury.remainingFights || 0) - 1 }))
            .filter(injury => injury.remainingFights > 0);
        if (!fightContext) return;
        const currentCount = this.player.injuries.length;
        if (currentCount >= 2) return;
        let chance = 0;
        chance += Math.min(0.18, (fightContext.playerHpDamageTaken || 0) / 260);
        chance += Math.min(0.12, (fightContext.criticalHitsTaken || 0) * 0.05);
        if (fightContext.mode === 'duo') chance += 0.08;
        if (fightContext.mode === 'no_armor') chance += 0.1;
        if (fightContext.context && fightContext.context.source === 'tournament') chance += 0.06;
        if (fightContext.defeat) chance += 0.08;
        if (Math.random() > chance) return;
        const activeIds = new Set(this.player.injuries.map(i => i.id));
        const pool = INJURY_LIBRARY.filter(injury => !activeIds.has(injury.id));
        if (!pool.length) return;
        const picked = { ...pool[Math.floor(Math.random() * pool.length)] };
        picked.remainingFights = picked.duration;
        picked.source = (fightContext.lastEnemyName || 'Arena Trauma');
        this.player.injuries.push(picked);
        const msg = `Health Status updated: ${picked.name} (${picked.summary}) for ${picked.remainingFights} fights.`;
        const hubMsg = $('hub-msg');
        if (hubMsg) hubMsg.innerText = msg;
    },
};
