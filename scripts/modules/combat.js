// Combat engine — moved to this module from gladiator_game.js
// Depends on: $, rng, wait, WEAPONS, ENEMY_AVATARS, PLAYER_AVATAR_IMG, STATUS_EFFECTS_CONFIG, TRINKET_SLOTS (constants/config)
//             game (gladiator_game.js), Player (player.js), playSfx, playFightMusic (audio.js)
//             getEnemyAvatarKey (enemy_config.js), generateEnemyTemplateForLevel (enemy_config.js)
//             getDisplayItemType, getDisplayWeaponFamily, STATUS_TOAST_COLORS (display_helpers.js)

// --- COMBAT ENGINE ---
const combat = {
    hp: 0, maxHp: 0, armor: 0, maxArmor: 0, enemy: null, turn: 'player', actionLock: false,
    enemies: [], activeEnemyIndex: 0,
    targetSelectionActive: false, pendingAttackType: null,
    hoverTargetIndex: null,
    spellCooldowns: {},
    enemyActing: false, // guard to prevent overlapping enemy turns
    playerDots: [], // active DOT effects on player
    dotResist: {},  // per-combat resistance per DOT id (0-1)
    log: [],        // recent combat log lines
    bagSlots: [null, null, null], // active potions brought into this fight
    twirlFrames: [
        'assets/vfx/twirl/twirl_01.png',
        'assets/vfx/twirl/twirl_02.png',
        'assets/vfx/twirl/twirl_03.png'
    ],
    twirlInterval: null,
    twirlTimeout: null,
    twirlCleanupTimeout: null,
    twirlFrameIndex: 0,
    _lagTimers: {},
    _lastBarPct: {},
    mode: 'duel',
    injuryRisk: 0,
    criticalHitsTaken: 0,
    playerHpDamageTaken: 0,
    lastEnemyName: '',
    getLivingEnemies() {
        return Array.isArray(this.enemies) ? this.enemies.filter(e => e && e.hp > 0) : [];
    },
    syncActiveEnemy() {
        if (!Array.isArray(this.enemies) || this.enemies.length === 0) {
            this.enemy = null;
            this.activeEnemyIndex = 0;
            return null;
        }
        const current = this.enemies[this.activeEnemyIndex];
        if (!current || current.hp <= 0) {
            const nextIdx = this.enemies.findIndex(e => e && e.hp > 0);
            this.activeEnemyIndex = nextIdx === -1 ? 0 : nextIdx;
        }
        this.enemy = this.enemies[this.activeEnemyIndex] || this.enemies[0] || null;
        return this.enemy;
    },
    setActiveEnemy(index = 0) {
        if (!Array.isArray(this.enemies) || !this.enemies[index] || this.enemies[index].hp <= 0) return;
        this.activeEnemyIndex = index;
        this.hoverTargetIndex = null;
        this.syncActiveEnemy();
        this.updateEnemyTargetUI();
        if (this.targetSelectionActive && this.turn === 'player' && this.pendingAttackType) {
            const pending = this.pendingAttackType;
            this.targetSelectionActive = false;
            this.pendingAttackType = null;
            if (String(pending).startsWith('spell:')) {
                this.castSpell(String(pending).slice(6), index);
            } else {
                this.playerAttack(pending, index);
            }
        }
    },
    previewTarget(index = 0) {
        if (!this.targetSelectionActive) return;
        if (!Array.isArray(this.enemies) || !this.enemies[index] || this.enemies[index].hp <= 0) return;
        this.hoverTargetIndex = index;
        this.updateEnemyTargetUI();
        this.updateUI();
    },
    clearTargetPreview() {
        if (!this.targetSelectionActive) return;
        this.hoverTargetIndex = null;
        this.updateEnemyTargetUI();
        this.updateUI();
    },
    updateEnemyTargetUI() {
        const avatar1 = document.querySelector('.combat-avatar-enemy:not(.combat-avatar-enemy-2)');
        const avatar2 = $('combat-avatar-enemy-2');
        const unit1 = document.querySelector('.enemy-unit:not(.enemy-unit-2)');
        const unit2 = $('enemy-unit-2');
        const btn1 = $('enemy-target-btn-1');
        const btn2 = $('enemy-target-btn-2');
        [avatar1, avatar2, unit1, unit2].forEach(el => el && el.classList.remove('is-targeted'));
        if (this.activeEnemyIndex === 0) {
            if (avatar1) avatar1.classList.add('is-targeted');
            if (unit1) unit1.classList.add('is-targeted');
        } else {
            if (avatar2) avatar2.classList.add('is-targeted');
            if (unit2) unit2.classList.add('is-targeted');
        }
        [avatar1, avatar2, unit1, unit2].forEach(el => el && el.classList.toggle('is-selecting-target', this.targetSelectionActive));
        if (btn1) {
            const show1 = this.mode === 'duo' && this.targetSelectionActive && !!(this.enemies[0] && this.enemies[0].hp > 0);
            btn1.classList.toggle('hidden', !show1);
            btn1.classList.toggle('is-active', show1 && ((this.hoverTargetIndex ?? this.activeEnemyIndex) === 0));
        }
        if (btn2) {
            const show2 = this.mode === 'duo' && this.targetSelectionActive && !!(this.enemies[1] && this.enemies[1].hp > 0);
            btn2.classList.toggle('hidden', !show2);
            btn2.classList.toggle('is-active', show2 && ((this.hoverTargetIndex ?? this.activeEnemyIndex) === 1));
        }
        const targetPrompt = $('combat-target-prompt');
        if (targetPrompt) {
            const isSpell = this.pendingAttackType && String(this.pendingAttackType).startsWith('spell:');
            targetPrompt.classList.toggle('hidden', !this.targetSelectionActive);
            targetPrompt.innerText = isSpell ? 'CHOOSE SPELL TARGET' : 'CHOOSE ENEMY';
        }
    },
    buildEnemyCombatant(enemyGen, mode) {
        const p = game.player;
        const tpl = enemyGen ? enemyGen.template : null;
        const eStats = enemyGen ? enemyGen.stats : { str: 5, atk: 5, def: 3, vit: 3 };
        const s = enemyGen ? enemyGen.level : p.level;
        const enemyName = (enemyGen && enemyGen.displayName) ? enemyGen.displayName : (tpl ? tpl.name : 'Bandit');
        const enemy = {
            name: enemyName,
            templateKey: tpl && tpl.key ? tpl.key : String(enemyName || '').toLowerCase(),
            lvl: s,
            maxHp: 0,
            hp: 0,
            str: eStats.str,
            atk: eStats.atk,
            def: eStats.def,
            vit: eStats.vit,
            mag: 0,
            armor: 0,
            maxArmor: 0,
            dots: [],
            dotResist: {}
        };
        let desiredClass = (tpl && tpl.weaponClass) ? tpl.weaponClass : 'Sword';
        let enemyWeapon = null;
        if (typeof WEAPONS !== 'undefined') {
            const minCap = Math.max(1, s - 5);
            const levelCap = rng(minCap, s);
            let pool = WEAPONS.filter(w => {
                const cls = (w.weaponClass || w.baseType || '').toLowerCase();
                const want = desiredClass.toLowerCase();
                const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                return cls.includes(want) && lvlReq <= levelCap;
            });
            if (pool.length === 0) {
                pool = WEAPONS.filter(w => {
                    const lvlReq = (typeof w.minShopLevel === 'number') ? w.minShopLevel : 1;
                    return lvlReq <= levelCap;
                });
            }
            if (pool.length > 0) {
                const tplWeapon = pool[rng(0, pool.length - 1)];
                enemyWeapon = { ...tplWeapon };
                const scale = 0.8;
                if (typeof enemyWeapon.min === 'number') enemyWeapon.min = Math.max(1, Math.floor(enemyWeapon.min * scale));
                if (typeof enemyWeapon.max === 'number') enemyWeapon.max = Math.max(enemyWeapon.min, Math.floor(enemyWeapon.max * scale));
            }
        }
        if (!enemyWeapon) {
            const base = Math.floor(enemy.str * 1.2);
            const weaponMin = Math.max(3, base - 4);
            const weaponMax = base + 4;
            let iconPath = '';
            const clsLower = desiredClass.toLowerCase();
            if (clsLower === 'axe') iconPath = 'assets/weapon-icons/axe_icon.png';
            else if (clsLower === 'sword') iconPath = 'assets/weapon-icons/sword_icon.png';
            else if (clsLower === 'hammer') iconPath = 'assets/weapon-icons/hammer_icon.png';
            else if (clsLower === 'dagger') iconPath = 'assets/weapon-icons/dagger_icon.png';
            else if (clsLower === 'spear') iconPath = 'assets/weapon-icons/spear_icon.png';
            else if (clsLower === 'bow') iconPath = 'assets/weapon-icons/crossbow_icon.png';
            enemyWeapon = { min: weaponMin, max: weaponMax, weaponClass: desiredClass, baseType: desiredClass, iconPath };
        }
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
        enemy.weapon = enemyWeapon;
        if (enemyWeapon && enemyWeapon.statMods) {
            const m = enemyWeapon.statMods;
            if (typeof m.str === 'number') enemy.str += m.str;
            if (typeof m.atk === 'number') enemy.atk += m.atk;
            if (typeof m.def === 'number') enemy.def += m.def;
            if (typeof m.vit === 'number') enemy.vit += m.vit;
        }
        enemy.maxHp = this.getEnemyMaxHp(enemy);
        enemy.hp = enemy.maxHp;
        const baseArm = mode === 'no_armor' ? 0 : Math.max(0, Math.floor(enemy.def * 1.2 + enemy.vit * 0.8 + s * 2));
        enemy.maxArmor = baseArm;
        enemy.armor = baseArm;
        enemy.avatarKey = (typeof getEnemyAvatarKey === 'function') ? getEnemyAvatarKey(tpl) : (tpl && tpl.avatarKey ? tpl.avatarKey : (enemyName || '').toLowerCase());
        return enemy;
    },
    getEnemyMaxHp(e) {
        const vit = e.vit || 1;
        const lvl = e.lvl || 1;
        const base = 2 + vit * 4 + (lvl - 1) * 6;
        return Math.max(6, base);
    },
    getEnemyDmgRange(e) {
        // Player damage: weapon.min/max + STR*2
        // Enemy için daha zayıf: enemy weapon biraz kısılmış + floor(STR * 1.0)
        const str = e.str || 0;
        const strBonus = Math.floor(str * 1.0);
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
    async init(mode = 'duel', setup = null, preFaded = false) {
        this.mode = mode || 'duel';
        this.context = setup || null;
        const p = game.player;
        this.maxHp = p.getMaxHp(); this.hp = this.maxHp;
        this.maxArmor = this.mode === 'no_armor' ? 0 : p.getTotalArmor(); this.armor = this.maxArmor;
        this.playerDots = [];
        this.dotResist = {};
        this._lagTimers = {};
        this._lastBarPct = {};
        this.injuryRisk = 0;
        this.criticalHitsTaken = 0;
        this.playerHpDamageTaken = 0;
        this.lastEnemyName = '';
        this.spellCooldowns = {};

        // Prepare combat potion slots for this fight.
        // Inventory reservation is handled when assigning slots in inventory.
        this.bagSlots = [null, null, null];
        if (p && Array.isArray(p.bagSlots)) {
            this.bagSlots = p.bagSlots.map(slot => {
                if (!slot) return null;
                return {
                    type: slot.type || 'potion',
                    subType: slot.subType,
                    percent: slot.percent || 0,
                    name: slot.name || '',
                    icon: slot.icon || '',
                    desc: slot.desc || '',
                    rarity: slot.rarity || 'rarity-common',
                    price: slot.price,
                    used: false
                };
            });
        }
        // Yeni dövüşe girerken önceki fight'tan kalan UI izlerini temizle
        const dmgEl = $('dmg-overlay');
        if (dmgEl) {
            dmgEl.innerText = '';
            dmgEl.className = 'dmg-text';
        }
        const particlesEl = $('combat-impact-particles');
        if (particlesEl) particlesEl.innerHTML = '';
        this.stopTwirlVfx();
        const finisherEl = $('combat-finish-flash');
        if (finisherEl) finisherEl.className = 'combat-finish-flash';
        const playerFxEl = $('c-player-avatar-fx');
        if (playerFxEl) playerFxEl.className = 'combat-avatar-fx combat-avatar-fx-player';
        const logEl = $('combat-log');
        if (logEl) {
            logEl.innerHTML = '';
            logEl.classList.remove('expanded');
        }
        // Combat portraits: player + enemy
        const playerAvatarEl = $('c-player-avatar');
        if (playerAvatarEl) {
            playerAvatarEl.src = PLAYER_AVATAR_IMG;
        }
        const enemyGen = setup && Array.isArray(setup.enemyGens) && setup.enemyGens[0]
            ? setup.enemyGens[0]
            : ((typeof generateEnemyTemplateForLevel === 'function') ? generateEnemyTemplateForLevel((setup && setup.enemyLevel) || p.level) : null);
        const secondEnemyGen = this.mode === 'duo'
            ? ((setup && Array.isArray(setup.enemyGens) && setup.enemyGens[1])
                ? setup.enemyGens[1]
                : ((typeof generateEnemyTemplateForLevel === 'function') ? generateEnemyTemplateForLevel((setup && setup.secondaryEnemyLevel) || Math.max(1, p.level - 1)) : null))
            : null;
        this.enemies = [this.buildEnemyCombatant(enemyGen, this.mode)];
        if (this.mode === 'duo') this.enemies.push(this.buildEnemyCombatant(secondEnemyGen, this.mode));
        this.activeEnemyIndex = 0;
        this.syncActiveEnemy();
        const enemyAvatarEl = $('c-enemy-avatar');
        if (enemyAvatarEl && this.enemies[0]) enemyAvatarEl.src = ENEMY_AVATARS[this.enemies[0].avatarKey] || '';
        const enemy2AvatarEl = $('c-enemy2-avatar');
        if (enemy2AvatarEl && this.enemies[1]) enemy2AvatarEl.src = ENEMY_AVATARS[this.enemies[1].avatarKey] || '';
        const enemy2Wrap = $('combat-avatar-enemy-2');
        const enemy2Unit = $('enemy-unit-2');
        if (enemy2Wrap) enemy2Wrap.classList.toggle('hidden', this.mode !== 'duo');
        if (enemy2Unit) enemy2Unit.classList.toggle('hidden', this.mode !== 'duo');

        // Yeni dövüşte enemy death cross efektini sıfırla
        const cross = $('enemy-death-cross');
        if (cross) {
            cross.classList.remove('enemy-death-cross-anim');
            cross.style.opacity = '0';
        }
        // Player death cross efektini de sıfırla
        const pCross = $('player-death-cross');
        if (pCross) {
            pCross.classList.remove('player-death-cross-anim');
            pCross.style.opacity = '0';
        }
        const cross2 = $('enemy2-death-cross');
        if (cross2) {
            cross2.classList.remove('enemy-death-cross-anim');
            cross2.style.opacity = '0';
        }

        const gameContainer = $('game-container');
        if (gameContainer && !preFaded) {
            gameContainer.classList.add('screen-fade-active');
            await wait(230);
        }
        if (typeof playFightMusic === 'function') playFightMusic();
        $('screen-hub').classList.add('hidden'); $('screen-combat').classList.remove('hidden'); $('enemy-think').style.display='none';
        if (gameContainer) {
            await wait(80);
            gameContainer.classList.remove('screen-fade-active');
        }
        if (this.mode === 'no_armor') {
            this.logMessage('No Armor rules are active. Both fighters enter unguarded.');
        } else if (this.mode === 'duo') {
            this.logMessage('1v2 rules are active. Two enemies stand against you.');
        }
        this.log = [];
        if (this.mode === 'duo' && this.enemies[1]) this.logMessage(`${this.enemies[0].name} and ${this.enemies[1].name} enter the arena!`);
        else this.logMessage(`${this.enemy.name} enters the arena!`);
        this.renderSpellPanel();
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
    inspectEnemy(index = null) {
        if (this.targetSelectionActive && typeof index === 'number') {
            this.setActiveEnemy(index);
            return;
        }
        $('modal-inspect').classList.remove('hidden');
        if (typeof index === 'number') this.setActiveEnemy(index);
        const e = this.syncActiveEnemy();
        if (!e) return;

        $('ins-name').innerText = e.name;
        $('ins-lvl').innerText = e.lvl;
        $('ins-str').innerText = e.str;
        $('ins-atk').innerText = e.atk;
        $('ins-def').innerText = e.def;
        $('ins-vit').innerText = e.vit;
        $('ins-mag').innerText = e.mag || 0;

        // Avatar
        const avatarEl = $('ins-avatar');
        if (avatarEl) {
            const src = ENEMY_AVATARS[e.avatarKey] || '';
            avatarEl.src = src;
            avatarEl.style.display = src ? 'block' : 'none';
        }

        // HP / Armor
        const hpEl = $('ins-hp-text');
        const armEl = $('ins-arm-text');
        if (hpEl) hpEl.innerText = `${Math.max(0, e.hp ?? e.maxHp)} / ${e.maxHp}`;
        if (armEl) armEl.innerText = `${Math.max(0, e.armor ?? e.maxArmor)} / ${e.maxArmor}`;

        // Status effects
        const statusRow = $('ins-status-row');
        if (statusRow) {
            const effects = e.statusEffects || {};
            const chips = Object.entries(effects)
                .filter(([, v]) => v && (v.stacks > 0 || v.turnsLeft > 0))
                .map(([key, v]) => {
                    const colorMap = { bleed: 'text-red', poison: 'text-green', burn: 'text-orange' };
                    const cls = colorMap[key] || 'text-white';
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    const info = v.stacks ? `×${v.stacks}` : (v.turnsLeft ? `${v.turnsLeft}t` : '');
                    return `<span class="status-chip status-chip-${key} ${cls}">${label}${info ? ' ' + info : ''}</span>`;
                });
            statusRow.innerHTML = chips.join('');
        }

        // Flavor text
        const descEl = $('ins-desc');
        if (descEl) {
            const quotes = [
                '"Do not underestimate the desperate."',
                '"Every scar tells a story of survival."',
                '"The arena forges killers."',
                '"Eyes up. This one has blood on its hands."',
                '"A dangerous foe. Watch your footing."',
            ];
            descEl.innerText = quotes[Math.floor(e.name.length % quotes.length)];
        }

        const w = e.weapon || null;
        const nameEl = $('ins-weapon-name');
        const rangeEl = $('ins-weapon-range');
        if (w) {
            if (nameEl) nameEl.innerText = w.name || getDisplayWeaponFamily(w) || 'Weapon';
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
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${w.rarity || ''}">${w.name || getDisplayWeaponFamily(w) || 'Weapon'}</div>`);
                    if (typeof w.min === 'number' && typeof w.max === 'number') {
                        lines.push(`<div><span class="text-orange">Damage:</span> ${w.min}-${w.max}</div>`);
                    }
                    lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(w)}</div>`);
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
    inspectPlayer() {
        const p = game.player;
        if (!p) return;

        $('modal-inspect').classList.remove('hidden');

        const effStr = p.getEffectiveStr();
        const effAtk = p.getEffectiveAtk();
        const effDef = p.getEffectiveDef();
        const effVit = p.getEffectiveVit();
        const effMag = p.getEffectiveMag();

        $('ins-name').innerText = p.name;
        $('ins-lvl').innerText = p.level || 1;
        $('ins-str').innerText = effStr;
        $('ins-atk').innerText = effAtk;
        $('ins-def').innerText = effDef;
        $('ins-vit').innerText = effVit;
        $('ins-mag').innerText = effMag;

        // Avatar
        const avatarEl = $('ins-avatar');
        if (avatarEl) { avatarEl.src = PLAYER_AVATAR_IMG; avatarEl.style.display = 'block'; }

        // HP / Armor
        const hpEl = $('ins-hp-text');
        const armEl = $('ins-arm-text');
        if (hpEl) hpEl.innerText = `${Math.max(0, this.hp)} / ${this.maxHp}`;
        if (armEl) armEl.innerText = `${Math.max(0, this.armor)} / ${this.maxArmor}`;

        // Status effects (player)
        const statusRow = $('ins-status-row');
        if (statusRow) {
            const effects = this.playerStatusEffects || {};
            const colorMap = { bleed: 'text-red', poison: 'text-green', burn: 'text-orange' };
            const chips = Object.entries(effects)
                .filter(([, v]) => v && (v.stacks > 0 || v.turnsLeft > 0))
                .map(([key, v]) => {
                    const cls = colorMap[key] || 'text-white';
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    const info = v.stacks ? `×${v.stacks}` : (v.turnsLeft ? `${v.turnsLeft}t` : '');
                    return `<span class="status-chip status-chip-${key} ${cls}">${label}${info ? ' ' + info : ''}</span>`;
                });
            statusRow.innerHTML = chips.join('');
        }

        const w = p.gear && p.gear.weapon ? p.gear.weapon : null;
        const nameEl = $('ins-weapon-name');
        const rangeEl = $('ins-weapon-range');
        const descEl = $('ins-desc');

        if (rangeEl) {
            const range = p.getDmgRange();
            rangeEl.innerText = `${range.min}–${range.max}`;
        }

        if (descEl) {
            descEl.innerText = '"Take a good look. You may never see it again."';
        }

        if (w) {
            if (nameEl) nameEl.innerText = w.name || getDisplayWeaponFamily(w) || 'Weapon';

            // Player silahı için de basit tooltip kullan
            if (nameEl) {
                const previewBox = $('shop-preview');
                const previewBody = $('shop-preview-body');
                const previewIcon = $('shop-preview-icon');
                nameEl.onmouseenter = (ev) => {
                    if (!previewBox || !previewBody) return;
                    let lines = [];
                    const rarityText = (w.rarity || '').replace('rarity-','');
                    const minLvl = (typeof w.minLevel === 'number') ? w.minLevel : (typeof w.minShopLevel === 'number' ? w.minShopLevel : 1);
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${w.rarity || ''}">${w.name || getDisplayWeaponFamily(w) || 'Weapon'}</div>`);
                    if (typeof w.min === 'number' && typeof w.max === 'number') {
                        lines.push(`<div><span class="text-orange">Damage:</span> ${w.min}-${w.max}</div>`);
                    }
                    lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(w)}</div>`);
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
                    if (previewIcon) previewIcon.classList.add('hidden');
                    previewBox.classList.remove('hidden');
                    previewBox.classList.add('visible');
                };
                nameEl.onmousemove = (ev) => {
                    const previewBox = $('shop-preview');
                    if (!previewBox || !previewBox.classList.contains('visible')) return;
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
                nameEl.onmouseleave = () => {
                    const previewBox = $('shop-preview');
                    if (!previewBox) return;
                    previewBox.classList.remove('visible');
                };
            }
        } else {
            if (nameEl) nameEl.innerText = 'Unarmed';
        }
    },
    openBag() {
        if (this.turn !== 'player' || this.actionLock) return;
        this.closeSpellPanel();
        const modal = $('modal-bag');
        const list = $('bag-list');
        const countEl = $('bag-count');
        if (!modal || !list) return;

        list.innerHTML = '';

        const slots = this.bagSlots || [];
        const filledSlots = slots.filter(s => s);
        if (countEl) countEl.innerText = `${filledSlots.length} item${filledSlots.length === 1 ? '' : 's'}`;

        if (filledSlots.length === 0) {
            list.innerHTML = '<p class="bag-modal-empty">Your bag is empty.<br><span style="font-size:0.8rem;">Assign items from Inventory before a fight.</span></p>';
            modal.classList.remove('hidden');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'bag-modal-grid';

        slots.forEach((slot, idx) => {
            if (!slot) return; // skip empty slots in combat bag view

            const card = document.createElement('div');
            const isUsed = slot.used;
            card.className = `bag-modal-card${isUsed ? ' bag-modal-card-used' : ''}`;

            let iconHtml = '';
            let nameHtml = '';
            let descHtml = '';

            if (slot.type === 'consumable') {
                iconHtml = `<div class="bag-modal-icon">${slot.icon || '📦'}</div>`;
                nameHtml = slot.name;
                const dotLabel = { cure_bleed: 'Removes Bleed', cure_poison: 'Removes Poison', cure_burn: 'Removes Burn' }[slot.subType] || '';
                descHtml = dotLabel;
            } else {
                const typeLabel = slot.subType === 'armor' ? 'Armor' : 'HP';
                iconHtml = `<div class="bag-modal-icon">🧪</div>`;
                nameHtml = slot.name || `${typeLabel} ${slot.percent || 0}%`;
                descHtml = `Restores ${slot.percent || 0}% ${typeLabel.toLowerCase()}`;
            }

            card.innerHTML = `
                ${iconHtml}
                <div class="bag-modal-card-body">
                    <div class="bag-modal-card-name">${isUsed ? `<s>${nameHtml}</s>` : nameHtml}</div>
                    <div class="bag-modal-card-desc">${isUsed ? 'Used' : descHtml}</div>
                </div>
                <button class="btn bag-modal-use-btn" data-idx="${idx}" ${isUsed ? 'disabled' : ''}>
                    ${isUsed ? '✓' : 'USE'}
                </button>
            `;

            if (!isUsed) {
                card.querySelector('button').onclick = () => {
                    this.usePotionSlot(idx);
                };
            }

            grid.appendChild(card);
        });

        list.appendChild(grid);
        modal.classList.remove('hidden');
    },
    closeBag() {
        const modal = $('modal-bag');
        if (modal) modal.classList.add('hidden');
    },
    usePotionSlot(index) {
        if (this.turn !== 'player' || this.actionLock) return;
        if (!this.bagSlots || index < 0 || index >= this.bagSlots.length) return;
        const slot = this.bagSlots[index];
        if (!slot || slot.used) return;

        const acts = $('combat-actions');
        if (acts) {
            acts.style.opacity = '0.8';
            acts.style.pointerEvents = 'none';
        }
        this.actionLock = true;

        // --- Consumable cure items ---
        const cureMap = { cure_bleed: 'bleed', cure_poison: 'poison', cure_burn: 'burn' };
        if (slot.type === 'consumable' && cureMap[slot.subType]) {
            const dotId = cureMap[slot.subType];
            const before = (this.playerDots || []).length;
            this.playerDots = (this.playerDots || []).filter(d => d.id !== dotId);
            const removed = before - this.playerDots.length;
            const itemName = slot.name || slot.subType;
            if (removed > 0) {
                const dotLabel = dotId.charAt(0).toUpperCase() + dotId.slice(1);
                this.logMessage(`You use <span class="log-${dotId}">${itemName}</span> and cure <span class="log-${dotId}">${dotLabel}</span>.`);
            } else {
                this.logMessage(`You use ${itemName}, but you are not affected by ${dotId}.`);
            }
            slot.used = true;
            this.updateUI();
            this.closeBag();
            setTimeout(() => {
                this.setTurn('enemy');
                this.actionLock = false;
                if (acts) { acts.style.opacity = '1'; acts.style.pointerEvents = 'auto'; }
            }, 300);
            return;
        }

        if (slot.type === 'consumable') {
            const itemName = slot.name || 'Consumable';
            this.logMessage(`${itemName} cannot be used during combat.`);
            this.closeBag();
            this.actionLock = false;
            if (acts) { acts.style.opacity = '1'; acts.style.pointerEvents = 'auto'; }
            return;
        }

        const type = slot.subType === 'armor' ? 'armor' : 'hp';
        if (type === 'hp') {
            const pct = (slot.percent || 0) / 100;
            const heal = Math.max(1, Math.floor(this.maxHp * pct));
            this.hp = Math.min(this.maxHp, this.hp + heal);
            this.showDmg(heal, 'player', 'heal');
            this.logMessage(`You drink a health potion and heal ${heal} HP.`);
        } else {
            // Armor potion: eğer armor tamamen bitmişse (0 veya altı), pot boşa gider
            if (this.armor <= 0) {
                this.logMessage('Armor is broken!');
            } else {
                const pct = (slot.percent || 0) / 100;
                const gain = Math.max(1, Math.floor(this.maxArmor * pct));
                const before = this.armor;
                this.armor = Math.min(this.maxArmor, this.armor + gain);
                const actual = this.armor - before;
                if (actual > 0) {
                    this.logMessage(`You drink an armor potion and restore ${actual} Armor.`);
                } else {
                    this.logMessage('Your armor is already at maximum.');
                }
            }
        }

        slot.used = true;
        this.updateUI();
        this.closeBag();

        setTimeout(() => {
            this.setTurn('enemy');
            this.actionLock = false;
            if (acts) {
                acts.style.opacity = '1';
                acts.style.pointerEvents = 'auto';
            }
        }, 300);
    },
    returnUnusedPotions() {
        if (!game.player || !Array.isArray(this.bagSlots)) return;
        this.bagSlots.forEach((slot) => {
            if (!slot) return;
            if (!slot.used) {
                if (slot.type === 'consumable') {
                    game.addConsumableToInventory(slot, 1);
                } else {
                    game.addPotionToInventory(slot, 1);
                }
            }
        });
        if (game.player && Array.isArray(game.player.bagSlots)) {
            game.player.bagSlots = game.player.bagSlots.map(slot => slot ? { ...slot, used: false } : null);
        }
        this.bagSlots = [null, null, null];
    },
    updateUI() {
        const activeTarget = this.syncActiveEnemy();
        const e1 = this.enemies[0] || this.enemy;
        if (!e1) return;
        if (!this.targetSelectionActive) this.pendingAttackType = null;
        $('c-enemy-name').innerText = e1.name; $('c-enemy-lvl').innerText = `Lvl ${e1.lvl}`;
        const enemyHpPct = e1.maxHp > 0 ? (e1.hp / e1.maxHp) * 100 : 0;
        this.updateLagBar('c-enemy-hp', 'c-enemy-hp-lag', enemyHpPct);
        $('c-enemy-hp-text').innerText = `${Math.max(0,e1.hp)}/${e1.maxHp}`;
        const enemyArmPct = e1.maxArmor > 0 ? (e1.armor / e1.maxArmor) * 100 : 0;
        this.updateLagBar('c-enemy-arm', 'c-enemy-arm-lag', enemyArmPct);
        $('c-enemy-arm-text').innerText = `${Math.max(0, e1.armor)}/${e1.maxArmor}`;
        const e2 = this.enemies[1];
        const enemy2Wrap = $('combat-avatar-enemy-2');
        const enemy2Unit = $('enemy-unit-2');
        if (enemy2Wrap) enemy2Wrap.classList.toggle('hidden', !(this.mode === 'duo' && e2));
        if (enemy2Unit) enemy2Unit.classList.toggle('hidden', !(this.mode === 'duo' && e2));
        if (this.mode === 'duo' && e2) {
            $('c-enemy2-name').innerText = e2.name;
            $('c-enemy2-lvl').innerText = `Lvl ${e2.lvl}`;
            this.updateLagBar('c-enemy2-hp', 'c-enemy2-hp-lag', e2.maxHp > 0 ? (e2.hp / e2.maxHp) * 100 : 0);
            $('c-enemy2-hp-text').innerText = `${Math.max(0,e2.hp)}/${e2.maxHp}`;
            this.updateLagBar('c-enemy2-arm', 'c-enemy2-arm-lag', e2.maxArmor > 0 ? (e2.armor / e2.maxArmor) * 100 : 0);
            $('c-enemy2-arm-text').innerText = `${Math.max(0,e2.armor)}/${e2.maxArmor}`;
            const enemy2Avatar = $('c-enemy2-avatar');
            if (enemy2Avatar && !enemy2Avatar.src) enemy2Avatar.src = ENEMY_AVATARS[e2.avatarKey] || '';
            const enemy2Cross = $('enemy2-death-cross');
            if (enemy2Cross && e2.hp <= 0) enemy2Cross.classList.add('enemy-death-cross-anim');
        }
        const renderEnemyDots = (enemy, elId) => {
            const el = $(elId);
            if (!el) return;
            if (!enemy || !enemy.dots || enemy.dots.length === 0) {
                el.innerHTML = '';
                return;
            }
            el.innerHTML = enemy.dots.map(dot => {
                const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[dot.id]) ? STATUS_EFFECTS_CONFIG.effects[dot.id] : null;
                const icon = cfg ? cfg.icon : '●';
                const label = cfg ? cfg.label : dot.id;
                const color = cfg ? cfg.color : '#fff';
                return `<span class="status-badge" style="color:${color};">${icon} ${label} (${dot.remaining})</span>`;
            }).join(' ');
        };
        renderEnemyDots(e1, 'enemy-status-icons');
        renderEnemyDots(e2, 'enemy2-status-icons');
        const p = game.player;
        const nameEl = $('c-player-name-text');
        const lvlEl = $('c-player-lvl');
        if (nameEl) nameEl.innerText = p.name;
        if (lvlEl) lvlEl.innerText = `Lvl ${p.level || 1}`;
        const playerHpPct = this.maxHp > 0 ? (this.hp / this.maxHp) * 100 : 0;
        this.updateLagBar('c-player-hp', 'c-player-hp-lag', playerHpPct);
        $('c-player-hp-text').innerText = `${Math.max(0,this.hp)}/${this.maxHp}`;
        const armPct = this.maxArmor > 0 ? (this.armor/this.maxArmor)*100 : 0;
        this.updateLagBar('c-player-arm', 'c-player-arm-lag', armPct);
        $('c-player-arm-text').innerText = `${Math.max(0,this.armor)}/${this.maxArmor}`;
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
        this.refreshAvatarFx();

        if(this.turn === 'player') {
            const previewEnemy = (typeof this.hoverTargetIndex === 'number' && this.targetSelectionActive && this.enemies[this.hoverTargetIndex] && this.enemies[this.hoverTargetIndex].hp > 0)
                ? this.enemies[this.hoverTargetIndex]
                : (!this.targetSelectionActive ? activeTarget : null);
            if (previewEnemy) {
                const hit = this.calcHit(game.player.getEffectiveAtk(), previewEnemy.def) + game.player.getHitBonus();
                const q = Math.max(5, Math.min(99, hit + 12));
                const n = Math.max(5, Math.min(99, hit));
                const p = Math.max(5, Math.min(99, hit - 10));
                $('hit-quick').innerText = q + "%"; $('hit-normal').innerText = n + "%"; $('hit-power').innerText = p + "%";
            } else {
                $('hit-quick').innerText = '--'; $('hit-normal').innerText = '--'; $('hit-power').innerText = '--';
            }
        }
        const spellBtn = $('btn-spells');
        const spellInfo = $('spell-quick-info');
        if (spellBtn) {
            const available = this.getAvailableSpells();
            const castable = available.some(s => this.canCastSpell(s));
            spellBtn.disabled = !castable;
            if (spellInfo) {
                const ready = available.filter(s => this.canCastSpell(s)).length;
                spellInfo.innerText = `${ready}/${available.length} ready`;
            }
        }
        this.renderSpellPanel();
        this.updateEnemyTargetUI();
    },
    getAvailableSpells() {
        const p = game.player;
        const all = (typeof SPELL_LIBRARY !== 'undefined' && Array.isArray(SPELL_LIBRARY)) ? SPELL_LIBRARY : [];
        const unlocked = Array.isArray(p && p.spellsUnlocked) ? p.spellsUnlocked : [];
        return all.filter(spell => unlocked.includes(spell.id));
    },
    getSpellById(spellId) {
        const all = (typeof SPELL_LIBRARY !== 'undefined' && Array.isArray(SPELL_LIBRARY)) ? SPELL_LIBRARY : [];
        return all.find(s => s.id === spellId) || null;
    },
    getSpellCooldown(spellId) {
        return Math.max(0, (this.spellCooldowns && this.spellCooldowns[spellId]) || 0);
    },
    canCastSpell(spell) {
        if (!spell) return false;
        if (this.turn !== 'player' || this.actionLock) return false;
        if (this.getSpellCooldown(spell.id) > 0) return false;
        return true;
    },
    toggleSpellPanel() {
        const panel = $('combat-spell-panel');
        if (!panel) return;
        if (panel.classList.contains('hidden')) {
            this.openSpellPanel();
        } else {
            this.closeSpellPanel();
        }
    },
    openSpellPanel() {
        if (this.turn !== 'player' || this.actionLock) return;
        this.closeBag();
        const panel = $('combat-spell-panel');
        const log = $('combat-log');
        if (!panel) return;
        this.renderSpellPanel();
        panel.classList.remove('hidden');
        if (log) log.classList.add('hidden');
    },
    closeSpellPanel() {
        const panel = $('combat-spell-panel');
        const log = $('combat-log');
        if (panel) panel.classList.add('hidden');
        if (log) log.classList.remove('hidden');
    },
    renderSpellPanel() {
        const panel = $('combat-spell-panel');
        if (!panel) return;
        const spells = this.getAvailableSpells();
        if (spells.length === 0) {
            panel.innerHTML = '<div class="combat-spell-empty">No spells unlocked.</div>';
            return;
        }
        panel.innerHTML = spells.map(spell => {
            const cd = this.getSpellCooldown(spell.id);
            const canCast = this.canCastSpell(spell);
            const reason = cd > 0 ? `CD ${cd}` : 'Ready';
            return `
                <button class="combat-spell-btn ${canCast ? '' : 'is-disabled'}" ${canCast ? '' : 'disabled'} onclick="combat.castSpell('${spell.id}')">
                    <div class="combat-spell-head">
                        <span class="combat-spell-name">${spell.name}</span>
                        <span class="combat-spell-cost">CD ${spell.cooldown || 0}</span>
                    </div>
                    <div class="combat-spell-desc">${spell.description}</div>
                    <div class="combat-spell-meta">${reason}</div>
                </button>
            `;
        }).join('');
    },
    getSpellValue(spell, key, fallback = 0) {
        return (spell && typeof spell[key] === 'number') ? spell[key] : fallback;
    },
    computeSpellDamage(spell, caster) {
        const mag = caster.getEffectiveMag();
        const base = this.getSpellValue(spell, 'basePower', 0);
        const scaling = this.getSpellValue(spell, 'scaling', 2.0);
        const raw = base + (mag * scaling) + (caster.getSpellPower() * 0.35);
        return Math.max(1, Math.floor(raw));
    },
    computeSpellDotDamage(spell, caster) {
        const dot = spell && spell.dot ? spell.dot : null;
        if (!dot) return 0;
        const mag = caster.getEffectiveMag();
        const raw = (dot.damageBase || 1) + (mag * (dot.damageScale || 0.2));
        return Math.max(1, Math.floor(raw));
    },
    getSpellProfile(type = 'damage') {
        if (type === 'dot') {
            return {
                shake: 'shake-md',
                blur: 'combat-blur-sm',
                impactDuration: 360,
                hitStopMs: 50,
                particleColor: 'rgba(174,126,255,0.94)',
                slashColor: 'rgba(224,198,255,0.9)',
                impactSize: 250,
                impactAnimMs: 260,
                particleCount: 8,
                slashCount: 2
            };
        }
        if (type === 'shield' || type === 'cleanse') {
            return {
                shake: 'shake-sm',
                blur: 'combat-blur-sm',
                impactDuration: 280,
                hitStopMs: 35,
                particleColor: 'rgba(150,230,255,0.9)',
                slashColor: 'rgba(220,245,255,0.86)',
                impactSize: 200,
                impactAnimMs: 220,
                particleCount: 6,
                slashCount: 1
            };
        }
        return {
            shake: 'shake-lg',
            blur: 'combat-blur-lg',
            impactDuration: 460,
            hitStopMs: 82,
            particleColor: 'rgba(198,144,255,0.98)',
            slashColor: 'rgba(255,214,255,0.92)',
            impactSize: 300,
            impactAnimMs: 320,
            particleCount: 10,
            slashCount: 3
        };
    },
    applySpellCooldownTick() {
        if (!this.spellCooldowns) this.spellCooldowns = {};
        Object.keys(this.spellCooldowns).forEach(id => {
            const next = Math.max(0, (this.spellCooldowns[id] || 0) - 1);
            this.spellCooldowns[id] = next;
        });
    },
    async castSpell(spellId, targetIndex = null) {
        if (this.turn !== 'player' || this.actionLock) return;
        const spell = this.getSpellById(spellId);
        if (!spell) return;
        if (spell.targetType === 'enemy' && this.mode === 'duo' && targetIndex === null && this.getLivingEnemies().length > 1) {
            this.pendingAttackType = `spell:${spell.id}`;
            this.targetSelectionActive = true;
            this.hoverTargetIndex = null;
            this.updateEnemyTargetUI();
            this.updateUI();
            this.logMessage('Choose an enemy target for your spell.');
            return;
        }
        if (this.getSpellCooldown(spell.id) > 0) {
            this.logMessage(`${spell.name} is on cooldown.`);
            return;
        }

        this.targetSelectionActive = false;
        this.pendingAttackType = null;
        this.hoverTargetIndex = null;
        if (typeof targetIndex === 'number' && Array.isArray(this.enemies) && this.enemies[targetIndex] && this.enemies[targetIndex].hp > 0) {
            this.activeEnemyIndex = targetIndex;
            this.syncActiveEnemy();
        }

        this.actionLock = true;
        this.closeSpellPanel();
        const acts = $('combat-actions');
        if (acts) {
            acts.style.opacity = '0.8';
            acts.style.pointerEvents = 'none';
        }

        try {
            const p = game.player;

            const spellProfile = this.getSpellProfile(spell.type);

            if (spell.type === 'damage') {
                const targetEnemy = this.syncActiveEnemy();
                if (!targetEnemy || targetEnemy.hp <= 0) {
                    this.logMessage('No valid target for spell.');
                    this.updateUI();
                    return;
                }
                const damage = this.computeSpellDamage(spell, p);
                this.takeDamage(damage, 'enemy');
                this.showDmg(damage, 'enemy', 'crit');
                this.logMessage(`You cast ${spell.name} and deal <span class="log-dmg">${damage}</span> magic damage to ${targetEnemy.name}.`);
                this.triggerHitImpact(spellProfile.shake, spellProfile.blur, spellProfile.impactDuration, {
                    hitStopMs: spellProfile.hitStopMs,
                    particleColor: spellProfile.particleColor,
                    slashColor: spellProfile.slashColor,
                    impactSize: spellProfile.impactSize,
                    particleCount: spellProfile.particleCount,
                    slashCount: spellProfile.slashCount,
                    impactAnimMs: spellProfile.impactAnimMs,
                    impactCore: 'rgba(220,190,255,0.96)',
                    impactMid: 'rgba(130,56,210,0.9)',
                    impactGlow: 'rgba(104,36,184,0.9)'
                });
                this.showCombatToast(`${spell.name}!`, 'status');
                playSfx('armorHit');
                if (spell.statusEffect && spell.statusEffect.id && Math.random() < (spell.statusEffect.chance || 0)) {
                    const dotDamage = Math.max(1, Math.floor((spell.statusEffect.damageBase || 3) + (p.getEffectiveMag() * (spell.statusEffect.damageScale || 0.2))));
                    this.applyDotToEnemy(this.activeEnemyIndex, spell.statusEffect.id, dotDamage, spell.statusEffect.duration || 2, spell.name);
                    const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[spell.statusEffect.id]) ? STATUS_EFFECTS_CONFIG.effects[spell.statusEffect.id] : null;
                    const label = cfg ? cfg.label : spell.statusEffect.id;
                    this.logMessage(`${spell.name} inflicts <span class="log-status">${label}</span>.`);
                }
            } else if (spell.type === 'dot') {
                const targetEnemy = this.syncActiveEnemy();
                if (!targetEnemy || targetEnemy.hp <= 0) {
                    this.logMessage('No valid target for spell.');
                    this.updateUI();
                    return;
                }
                const dot = spell.dot || {};
                const dotId = dot.id || (spell.statusEffect && spell.statusEffect.id) || 'poison';
                const dotDamage = this.computeSpellDotDamage(spell, p);
                const duration = dot.duration || 3;
                this.applyDotToEnemy(this.activeEnemyIndex, dotId, dotDamage, duration, spell.name);
                const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[dotId]) ? STATUS_EFFECTS_CONFIG.effects[dotId] : null;
                const label = cfg ? cfg.label : dotId;
                this.logMessage(`You cast ${spell.name} and apply <span class="log-status">${label}</span> to ${targetEnemy.name}.`);
                this.showCombatToast(`${spell.name} cast`, 'status', dotId);
                this.triggerHitImpact(spellProfile.shake, spellProfile.blur, spellProfile.impactDuration, {
                    hitStopMs: spellProfile.hitStopMs,
                    particleColor: spellProfile.particleColor,
                    slashColor: spellProfile.slashColor,
                    impactSize: spellProfile.impactSize,
                    particleCount: spellProfile.particleCount,
                    slashCount: spellProfile.slashCount,
                    impactAnimMs: spellProfile.impactAnimMs,
                    impactCore: 'rgba(180,255,220,0.94)',
                    impactMid: 'rgba(80,180,120,0.86)',
                    impactGlow: 'rgba(52,145,91,0.8)'
                });
                this.showDmg(dotDamage, 'enemy', 'dot');
                playSfx('armorHit');
            } else if (spell.type === 'shield') {
                if (this.maxArmor <= 0) {
                    this.logMessage(`You cast ${spell.name}, but no armor can be restored in this battle.`);
                } else {
                    const gain = Math.max(1, Math.floor(this.getSpellValue(spell, 'basePower', 8) + (p.getEffectiveMag() * this.getSpellValue(spell, 'scaling', 1.4))));
                    const before = this.armor;
                    this.armor = Math.min(this.maxArmor, this.armor + gain);
                    const actual = this.armor - before;
                    this.logMessage(`You cast ${spell.name} and gain <span class="log-heal">${actual}</span> Armor.`);
                    this.showDmg(actual, 'player', 'heal');
                    this.triggerHitImpact(spellProfile.shake, spellProfile.blur, spellProfile.impactDuration, {
                        hitStopMs: spellProfile.hitStopMs,
                        particleColor: spellProfile.particleColor,
                        slashColor: spellProfile.slashColor,
                        impactSize: spellProfile.impactSize,
                        particleCount: spellProfile.particleCount,
                        slashCount: spellProfile.slashCount,
                        impactAnimMs: spellProfile.impactAnimMs,
                        impactCore: 'rgba(170,220,255,0.9)',
                        impactMid: 'rgba(95,148,220,0.82)',
                        impactGlow: 'rgba(60,104,173,0.75)'
                    });
                }
            } else if (spell.type === 'cleanse') {
                if (!this.playerDots || this.playerDots.length === 0) {
                    this.logMessage(`You cast ${spell.name}, but no affliction is active.`);
                } else {
                    const removed = this.playerDots[0];
                    this.playerDots = this.playerDots.filter((dot, idx) => idx !== 0);
                    const cfg = (typeof STATUS_EFFECTS_CONFIG !== 'undefined' && STATUS_EFFECTS_CONFIG.effects[removed.id]) ? STATUS_EFFECTS_CONFIG.effects[removed.id] : null;
                    const label = cfg ? cfg.label : removed.id;
                    this.logMessage(`You cast ${spell.name} and cleanse <span class="log-status">${label}</span>.`);
                    this.triggerHitImpact(spellProfile.shake, spellProfile.blur, spellProfile.impactDuration, {
                        hitStopMs: spellProfile.hitStopMs,
                        particleColor: spellProfile.particleColor,
                        slashColor: spellProfile.slashColor,
                        impactSize: spellProfile.impactSize,
                        particleCount: spellProfile.particleCount,
                        slashCount: spellProfile.slashCount,
                        impactAnimMs: spellProfile.impactAnimMs,
                        impactCore: 'rgba(215,255,238,0.9)',
                        impactMid: 'rgba(126,211,180,0.78)',
                        impactGlow: 'rgba(82,166,137,0.72)'
                    });
                }
            }

            if (spell.cooldown && spell.cooldown > 0) {
                this.spellCooldowns[spell.id] = spell.cooldown;
            }

            this.updateUI();
            if (this.getLivingEnemies().length === 0) {
                this.win();
            } else {
                await wait(700);
                this.setTurn('enemy');
            }
        } catch (err) {
            console.error('castSpell error', err);
            this.logMessage('Spell cast failed, flow recovered.');
            this.updateUI();
        } finally {
            this.actionLock = false;
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
    flashEnemyDotAvatar(enemy, effects) {
        const idx = this.enemies.indexOf(enemy);
        const avatarWrap = idx === 1
            ? $('combat-avatar-enemy-2')
            : document.querySelector('.combat-avatar-enemy:not(.combat-avatar-enemy-2)');
        if (!avatarWrap) return;
        let color;
        if (effects.hasBleed)       color = 'rgba(220,30,30,0.55)';
        else if (effects.hasBurn)   color = 'rgba(255,120,0,0.55)';
        else if (effects.hasPoison) color = 'rgba(60,200,60,0.55)';
        else return;
        avatarWrap.style.transition = 'box-shadow 0.05s';
        avatarWrap.style.boxShadow = `0 0 0 3px ${color}, 0 0 18px ${color}`;
        setTimeout(() => { avatarWrap.style.boxShadow = ''; }, 350);
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
    calcHit(atk, def) {
        // Daha kontrollü bir temel doğruluk: ATK üstünlüğü hala önemli,
        // ancak küçük farklarda aşırı yüksek yüzde oluşmasın.
        const base = 51 + (atk - def) * 4;
        return Math.max(5, Math.min(99, base));
    },
    getPlayerAttackProfile(type) {
        if (type === 'quick') {
            return { hitBonus: 12, damageMult: 0.82, shake: 'shake-sm', blur: 'combat-blur-sm', impactDuration: 260, hitStopMs: 40, particleColor: 'rgba(180,220,255,0.95)', slashColor: 'rgba(255,255,255,0.95)', impactSize: 180 };
        }
        if (type === 'power') {
            return { hitBonus: -10, damageMult: 1.35, shake: 'shake-lg', blur: 'combat-blur-lg', impactDuration: 500, hitStopMs: 90, particleColor: 'rgba(255,138,101,0.95)', slashColor: 'rgba(255,214,140,0.95)', impactSize: 300 };
        }
        return { hitBonus: 0, damageMult: 1, shake: 'shake-md', blur: 'combat-blur-md', impactDuration: 380, hitStopMs: 58, particleColor: 'rgba(255,236,179,0.95)', slashColor: 'rgba(255,255,255,0.9)', impactSize: 230 };
    },
    computeDotDamageFromAffix(affix, attacker) {
        if (!affix) return 0;
        let total = affix.baseDamage || 0;
        const scale = affix.scale || {};
        const getStat = (key) => {
            if (attacker instanceof Player) {
                if (key === 'str') return attacker.getEffectiveStr();
                if (key === 'atk') return attacker.getEffectiveAtk();
                if (key === 'def') return attacker.getEffectiveDef();
                if (key === 'vit') return attacker.getEffectiveVit();
                if (key === 'mag') return attacker.getEffectiveMag();
                if (key === 'chr') return attacker.getEffectiveChr();
                return 0;
            }
            return attacker && typeof attacker[key] === 'number' ? attacker[key] : 0;
        };
        Object.keys(scale).forEach(key => {
            total += getStat(key) * scale[key];
        });
        return Math.max(1, Math.floor(total));
    },
    applyWeaponOnHitEffects(attacker, weapon, targetType, enemyIndex = null) {
        if (typeof STATUS_EFFECTS_CONFIG === 'undefined' || !weapon || !weapon.dotAffix) return;
        const affix = weapon.dotAffix;
        const effectId = affix.effect;
        if (!effectId || !STATUS_EFFECTS_CONFIG.effects[effectId]) return;
        const identity = attacker instanceof Player ? attacker.getClassWeaponIdentity() : null;
        const bonusChance = attacker instanceof Player ? attacker.getSkillEffect(`dotChance_${effectId}`) + (identity && identity[`dotChance_${effectId}`] ? identity[`dotChance_${effectId}`] : 0) : 0;
        const finalChance = Math.min(0.95, (affix.chance || 0) + bonusChance);
        if ((rng(0, 100) / 100) > finalChance) return;
        const bonusDamage = attacker instanceof Player ? attacker.getSkillEffect(`dotDamage_${effectId}`) : 0;
        const damage = this.computeDotDamageFromAffix(affix, attacker) + bonusDamage;
        const duration = affix.duration || STATUS_EFFECTS_CONFIG.effects[effectId].duration;
        const sourceName = attacker instanceof Player ? (weapon.name || attacker.name) : (weapon.name || attacker.name || 'Enemy weapon');
        if (targetType === 'player') {
            const alreadyHadEffect = !!(this.playerDots && this.playerDots.some(dot => dot.id === effectId));
            this.applyDotToPlayer(effectId, damage, duration, sourceName);
            const cfg = STATUS_EFFECTS_CONFIG.effects[effectId];
            const label = cfg ? cfg.label : effectId;
            const icon = cfg ? cfg.icon : '!';
            this.logMessage(`${attacker.name} inflicts <span class="log-status">${label}</span> on you.`);
            this.showCombatToast(`${icon} ${label}${alreadyHadEffect ? ' refreshed' : ''}`, 'status', effectId);
            this.burstAvatarFx(effectId);
        } else if (targetType === 'enemy') {
            const idx = typeof enemyIndex === 'number' ? enemyIndex : this.activeEnemyIndex;
            const targetEnemy = this.enemies[idx];
            if (!targetEnemy || targetEnemy.hp <= 0) return;
            const alreadyHadEffect = !!(targetEnemy.dots && targetEnemy.dots.some(dot => dot.id === effectId));
            this.applyDotToEnemy(idx, effectId, damage, duration, sourceName);
            const cfg = STATUS_EFFECTS_CONFIG.effects[effectId];
            const label = cfg ? cfg.label : effectId;
            this.logMessage(`Your weapon inflicts <span class="log-status">${label}</span> on ${targetEnemy.name}.`);
            this.showCombatToast(`${cfg ? cfg.icon : '!'} ${label}${alreadyHadEffect ? ' refreshed' : ''}`, 'status', effectId);
        }
    },
    setTurn(who) {
        this.turn = who; const ind = $('turn-indicator'); const acts = $('combat-actions');
        if(who === 'player') {
            ind.innerText = "PLAYER TURN"; ind.className = "text-green";
            this.applySpellCooldownTick();
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

                const regenAmount = game.player.getRegen();
                if(this.hp < this.maxHp) {
                    const before = this.hp;
                    this.hp = Math.min(this.maxHp, this.hp + regenAmount);
                    const actual = this.hp - before;
                    if (actual > 0) this.logMessage(`You regenerate <span class="log-heal">${actual}</span> HP.`);
                }
                this.updateUI();

                // DOT ve regen çözüldükten sonra oyuncu artık hareket edebilir
                acts.style.opacity = '1';
                acts.style.pointerEvents = 'auto';
            }, delay);
        } else {
            ind.innerText = "ENEMY TURN"; ind.className = "text-red"; acts.style.opacity = '0.5'; acts.style.pointerEvents = 'none';
            this.closeSpellPanel();

            if (this.applyEnemyDotTicks()) return;

            // Düşman turu başında, Vitality statına göre can yenilesin
            this.getLivingEnemies().forEach(e => {
                if (e && e.hp > 0 && e.hp < e.maxHp && typeof e.vit === 'number') {
                    const enemyRegen = Math.floor(e.vit / 2);
                    if (enemyRegen > 0) {
                        e.hp = Math.min(e.maxHp, e.hp + enemyRegen);
                        this.logMessage(`${e.name} regenerates <span class="log-heal">${enemyRegen}</span> HP.`);
                    }
                }
            });
            this.updateUI();

            // İleride düşmana DOT eklendiğinde burada da benzer şekilde DOT önce, aksiyon sonra çözülebilir
            this.runEnemyTurn();
        }
    },
    applyDotToPlayer(dotId, damage, duration, sourceName = '') {
        if(typeof STATUS_EFFECTS_CONFIG === 'undefined') return;
        const cfg = STATUS_EFFECTS_CONFIG.effects[dotId];
        if(!cfg) return;
        const existing = this.playerDots.find(d => d.id === dotId);
        if(existing) {
            existing.remaining = duration || cfg.duration;
            existing.damage = damage;
            existing.source = sourceName;
        } else {
            this.playerDots.push({ id: dotId, remaining: duration || cfg.duration, damage, source: sourceName });
        }
    },
    applyDotToEnemy(enemyIndex, dotId, damage, duration, sourceName = '') {
        if(typeof STATUS_EFFECTS_CONFIG === 'undefined') return;
        const cfg = STATUS_EFFECTS_CONFIG.effects[dotId];
        const enemy = this.enemies[enemyIndex];
        if (!cfg || !enemy) return;
        if (!Array.isArray(enemy.dots)) enemy.dots = [];
        const existing = enemy.dots.find(d => d.id === dotId);
        if (existing) {
            existing.remaining = duration || cfg.duration;
            existing.damage = damage;
            existing.source = sourceName;
        } else {
            enemy.dots.push({ id: dotId, remaining: duration || cfg.duration, damage, source: sourceName });
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
            const dmg = Math.max(1, dot.damage || Math.floor(this.maxHp * cfg.damagePct));
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
            // HP barını güncelle
            this.updateUI();
            // Aktif DOT tiplerine göre renkli vignette göster
            this.flashDotVignette({ hasPoison, hasBurn, hasBleed });
            this.showDmg(totalDmg, 'player', 'dot');
            const playerDotClass = hasBleed ? 'log-bleed' : (hasBurn ? 'log-burn' : 'log-poison');
            this.logMessage(`You <span class="${playerDotClass}">${hasBleed ? 'bleed' : (hasBurn ? 'burn' : 'writhe in poison')}</span> for <span class="log-dmg">${totalDmg}</span> damage.`);
            // DOT'tan ölme durumu: HP barı sıfırlandığı anda death cross + gecikmeli defeat ekranı
            if(this.hp <= 0) {
                game.handlePlayerDeath();
                return true;
            }
        }
        return false;
    },
    applyEnemyDotTicks() {
        if (typeof STATUS_EFFECTS_CONFIG === 'undefined') return false;
        let someoneDied = false;
        this.getLivingEnemies().forEach(enemy => {
            if (!enemy.dots || enemy.dots.length === 0 || enemy.hp <= 0) return;
            let totalDmg = 0;
            const nextDots = [];
            let hasPoison = false, hasBurn = false, hasBleed = false;
            const firedTypes = [];
            enemy.dots.forEach(dot => {
                const cfg = STATUS_EFFECTS_CONFIG.effects[dot.id];
                if (!cfg) return;
                const dmg = Math.max(1, dot.damage || Math.floor(enemy.maxHp * cfg.damagePct));
                totalDmg += dmg;
                if (dot.id === 'poison') hasPoison = true;
                if (dot.id === 'burn')   hasBurn   = true;
                if (dot.id === 'bleed')  hasBleed  = true;
                if (!firedTypes.includes(dot.id)) firedTypes.push(dot.id);
                dot.remaining -= 1;
                if (dot.remaining > 0) nextDots.push(dot);
                else {
                    const prev = enemy.dotResist[dot.id] || 0;
                    enemy.dotResist[dot.id] = Math.min(0.9, prev + 0.4);
                }
            });
            enemy.dots = nextDots;
            if (totalDmg > 0) {
                const savedIndex = this.activeEnemyIndex;
                this.activeEnemyIndex = this.enemies.indexOf(enemy);
                this.syncActiveEnemy();
                this.takeDamage(totalDmg, 'enemy');
                this.updateUI();

                // Visual: DOT damage number on enemy side
                this.showDmg(totalDmg, 'enemy', 'dot');

                // Visual: flash enemy avatar with DOT colour
                this.flashEnemyDotAvatar(enemy, { hasPoison, hasBurn, hasBleed });

                // Descriptive log per DOT type
                const typeLabels = { bleed: 'bleeds', burn: 'burns', poison: 'writhes in poison' };
                const typeLabel = firedTypes.map(id => typeLabels[id] || 'suffers').join(' and ');
                const dotClass = hasBleed ? 'log-bleed' : (hasBurn ? 'log-burn' : 'log-poison');
                this.logMessage(`${enemy.name} <span class="${dotClass}">${typeLabel}</span> for <span class="log-dmg">${totalDmg}</span> damage.`);
                if (enemy.hp <= 0) this.logMessage(`${enemy.name} collapses from the affliction.`);
                this.activeEnemyIndex = savedIndex;
                if (enemy.hp <= 0) someoneDied = true;
            }
        });
        this.syncActiveEnemy();
        if (this.getLivingEnemies().length === 0) {
            this.win();
            return true;
        }
        return someoneDied;
    },
    takeDamage(amount, target) {
        if(target === 'player') {
            let rem = amount;
            const armorBefore = this.armor || 0;
            if(this.armor > 0) {
                if(this.armor >= amount) {
                    this.armor -= amount;
                    rem = 0;
                } else {
                    rem = amount - this.armor;
                    this.armor = 0;
                }
            }
            const armorDmg = Math.min(armorBefore, amount);
            const hpDmg = rem;
            this.hp -= hpDmg; if(this.hp < 0) this.hp = 0;
            this.playerHpDamageTaken += hpDmg;
            this.injuryRisk += hpDmg + Math.floor(armorDmg * 0.25);
            if(armorDmg > 0) {
                playSfx('armorHit');
                playSfx('armorHitMetal');
            }
            if(hpDmg > 0) {
                this.flashBlood();
                playSfx('hpHit');
            }
        } else {
            const e = this.enemy;
            if (!e) return;
            let rem = amount;
            const armorBefore = e.armor || 0;
            if (e.armor > 0) {
                if (e.armor >= amount) {
                    e.armor -= amount;
                    rem = 0;
                } else {
                    rem = amount - e.armor;
                    e.armor = 0;
                }
            }
            const armorDmg = Math.min(armorBefore, amount);
            const hpDmg = rem;
            e.hp -= hpDmg;
            if (e.hp < 0) e.hp = 0;
            if(armorDmg > 0) {
                playSfx('armorHit');
                playSfx('armorHitMetal');
            }
            if(hpDmg > 0) playSfx('hpHit');
        }
    },
    triggerHitImpact(shakeClass = 'shake-sm', blurClass = 'combat-blur-sm', duration = 400) {
        const options = arguments[3] || {};
        const c = $('game-container');
        if (!c) return;
        const impactPoint = this.getImpactPoint();
        c.style.setProperty('--impact-x', `${impactPoint.x}px`);
        c.style.setProperty('--impact-y', `${impactPoint.y}px`);
        c.style.setProperty('--impact-size', `${options.impactSize || 220}px`);
        c.style.setProperty('--impact-core', options.impactCore || 'rgba(200,0,0,0.95)');
        c.style.setProperty('--impact-mid', options.impactMid || 'rgba(150,0,0,0.9)');
        c.style.setProperty('--impact-glow', options.impactGlow || 'rgba(120,0,0,0.9)');
        c.style.setProperty('--impact-duration', `${options.impactAnimMs || 260}ms`);
        c.classList.remove('shake-sm', 'shake-md', 'shake-lg', 'hit-impact');
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.remove('combat-blur-sm', 'combat-blur-md', 'combat-blur-lg');
        void c.offsetWidth;
        if (options.hitStopMs) this.triggerHitStop(options.hitStopMs);
        c.classList.add(shakeClass);
        c.classList.add('hit-impact');
        if (combatScreen && blurClass) combatScreen.classList.add(blurClass);
        setTimeout(() => {
            c.classList.remove(shakeClass);
            c.classList.remove('hit-impact');
            if (combatScreen && blurClass) combatScreen.classList.remove(blurClass);
        }, duration);
    },
    triggerHitStop(ms = 50) {
        const screen = $('screen-combat');
        if (!screen) return;
        screen.classList.remove('hit-stop');
        void screen.offsetWidth;
        screen.classList.add('hit-stop');
        setTimeout(() => {
            screen.classList.remove('hit-stop');
        }, ms);
    },
    getImpactPoint() {
        const container = $('game-container');
        const playerWrap = document.querySelector('.combat-avatar-player');
        const playerUnit = document.querySelector('.player-unit');
        const enemyWrap = this.activeEnemyIndex === 1 ? $('combat-avatar-enemy-2') : document.querySelector('.combat-avatar-enemy:not(.combat-avatar-enemy-2)');
        const playerAnchor = (playerWrap && getComputedStyle(playerWrap).display !== 'none') ? playerWrap : playerUnit;
        if (!container || !playerAnchor || !enemyWrap) {
            return { x: 640, y: 360 };
        }
        const contRect = container.getBoundingClientRect();
        const pRect = playerAnchor.getBoundingClientRect();
        const eRect = enemyWrap.getBoundingClientRect();
        const x = ((pRect.left + pRect.width / 2) + (eRect.left + eRect.width / 2)) / 2 - contRect.left;
        const y = ((pRect.top + pRect.height / 2) + (eRect.top + eRect.height / 2)) / 2 - contRect.top;
        return { x, y };
    },
    spawnImpactParticles({ x, y, particleColor, slashColor, particleCount = 7, slashCount = 2 } = {}) {
        const host = $('combat-impact-particles');
        if (!host) return;
        const total = particleCount + slashCount;
        for (let i = 0; i < total; i++) {
            const node = document.createElement('span');
            const isSlash = i >= particleCount;
            node.className = `impact-particle${isSlash ? ' slash' : ''}`;
            node.style.setProperty('--px', `${x || 0}px`);
            node.style.setProperty('--py', `${y || 0}px`);
            const angle = Math.random() * Math.PI * 2;
            const dist = isSlash ? 70 + Math.random() * 70 : 32 + Math.random() * 90;
            node.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            node.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
            node.style.setProperty('--pcolor', isSlash ? (slashColor || 'rgba(255,255,255,0.9)') : (particleColor || 'rgba(255,160,160,0.88)'));
            if (isSlash) node.style.transform = `rotate(${Math.round(angle * 57.2958)}deg)`;
            host.appendChild(node);
            setTimeout(() => node.remove(), 700);
        }
    },
    flashFinisher(kind = 'kill') {
        const flash = $('combat-finish-flash');
        if (!flash) return;
        flash.className = 'combat-finish-flash';
        flash.classList.add('show');
        if (kind) flash.dataset.kind = kind;
        setTimeout(() => {
            flash.className = 'combat-finish-flash';
        }, 540);
    },
    updateLagBar(fillId, lagId, pct, { immediate = false } = {}) {
        const fill = $(fillId);
        const lag = $(lagId);
        if (!fill || !lag) return;
        const safePct = Math.max(0, Math.min(100, pct));
        const prevPct = (typeof this._lastBarPct[lagId] === 'number') ? this._lastBarPct[lagId] : safePct;
        fill.style.width = safePct + '%';
        if (immediate || safePct >= prevPct) {
            lag.style.width = safePct + '%';
        } else {
            lag.style.width = prevPct + '%';
            clearTimeout(this._lagTimers[lagId]);
            this._lagTimers[lagId] = setTimeout(() => {
                lag.style.width = safePct + '%';
            }, 120);
        }
        this._lastBarPct[lagId] = safePct;
    },
    refreshAvatarFx() {
        const fx = $('c-player-avatar-fx');
        if (!fx) return;
        fx.className = 'combat-avatar-fx combat-avatar-fx-player';
        if (!this.playerDots || this.playerDots.length === 0) return;
        const uniqueIds = [...new Set(this.playerDots.map(dot => dot.id))];
        uniqueIds.forEach(id => fx.classList.add(`fx-${id}`));
        if (uniqueIds.length > 1) fx.classList.add('fx-mixed');
        fx.classList.add('is-active');
    },
    burstAvatarFx(effectId) {
        const fx = $('c-player-avatar-fx');
        if (!fx) return;
        const color = STATUS_TOAST_COLORS[effectId] || 'rgba(255,255,255,0.85)';
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('span');
            p.className = 'combat-avatar-fx-particle';
            p.style.setProperty('--particle-color', color);
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 38;
            p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
            fx.appendChild(p);
            setTimeout(() => p.remove(), 950);
        }
    },
    showCombatToast(text, tone = 'status', effectId = '') {
        const host = $('screen-combat');
        if (!host) return;
        const toast = document.createElement('div');
        toast.className = `combat-toast combat-toast-${tone}`;
        if (effectId && STATUS_TOAST_COLORS[effectId]) {
            toast.style.setProperty('--toast-color', STATUS_TOAST_COLORS[effectId]);
        }
        toast.textContent = text;
        host.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
        }, 900);
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 1400);
    },
    ensureTwirlVfxElement() {
        const host = $('screen-combat');
        if (!host) return null;
        let el = $('combat-twirl-vfx');
        if (!el) {
            el = document.createElement('img');
            el.id = 'combat-twirl-vfx';
            el.className = 'combat-twirl-vfx';
            el.alt = 'attack twirl effect';
            host.appendChild(el);
        }
        return el;
    },
    stopTwirlVfx() {
        if (this.twirlInterval) {
            clearInterval(this.twirlInterval);
            this.twirlInterval = null;
        }
        if (this.twirlTimeout) {
            clearTimeout(this.twirlTimeout);
            this.twirlTimeout = null;
        }
        if (this.twirlCleanupTimeout) {
            clearTimeout(this.twirlCleanupTimeout);
            this.twirlCleanupTimeout = null;
        }
        const twirlEl = $('combat-twirl-vfx');
        if (twirlEl) {
            // Keep active transform during fade to prevent mirrored end-frame snap.
            twirlEl.classList.add('is-active');
            twirlEl.classList.add('is-fading');
            this.twirlCleanupTimeout = setTimeout(() => {
                const node = $('combat-twirl-vfx');
                if (!node) return;
                node.classList.remove('is-active');
                node.classList.remove('is-fading');
                node.classList.remove('is-mirrored');
                this.twirlCleanupTimeout = null;
            }, 180);
        }
        this.twirlFrameIndex = 0;
    },
    playTwirlVfx(duration = 180, frameMs = 34, opts = {}) {
        const twirlEl = this.ensureTwirlVfxElement();
        if (!twirlEl || !Array.isArray(this.twirlFrames) || this.twirlFrames.length === 0) return;

        this.stopTwirlVfx();
        const mirror = !!(opts && opts.mirror);
        twirlEl.classList.toggle('is-mirrored', mirror);
        twirlEl.classList.remove('is-active');
        twirlEl.classList.remove('is-fading');
        this.twirlFrameIndex = 0;
        twirlEl.src = this.twirlFrames[0];
        twirlEl.classList.add('is-active');

        const frameDuration = Math.max(24, frameMs);
        const frameCount = this.twirlFrames.length;
        this.twirlInterval = setInterval(() => {
            this.twirlFrameIndex += 1;
            if (this.twirlFrameIndex >= frameCount) {
                clearInterval(this.twirlInterval);
                this.twirlInterval = null;
                return;
            }
            twirlEl.src = this.twirlFrames[this.twirlFrameIndex];
        }, frameDuration);

        const singleCycleMs = frameDuration * Math.max(1, frameCount - 1);
        this.twirlTimeout = setTimeout(() => {
            this.stopTwirlVfx();
        }, Math.max(singleCycleMs + 40, duration));
    },
    async playCollisionAnimation(type, result) {
        playSfx('dodge');
        this.playTwirlVfx(180, 32, { mirror: type === 'enemy' });
        await wait(120);
        if (result && typeof result.apply === 'function') {
            result.apply();
        }
    },
    async playDodgeAnimation(attacker, result) {
        playSfx('dodge');
        this.playTwirlVfx(160, 30, { mirror: attacker === 'enemy' });
        await wait(100);
        if (result && typeof result.apply === 'function') {
            result.apply();
        }
    },
    async playerAttack(type, targetIndex = null) {
        if (this.turn !== 'player' || this.actionLock) return;
        if (this.mode === 'duo' && targetIndex === null && this.getLivingEnemies().length > 1 && type !== 'heal') {
            this.pendingAttackType = type;
            this.targetSelectionActive = true;
            this.hoverTargetIndex = null;
            this.updateEnemyTargetUI();
            this.updateUI();
            this.logMessage('Choose which enemy to strike.');
            return;
        }
        this.targetSelectionActive = false;
        this.pendingAttackType = null;
        this.hoverTargetIndex = null;
        if (typeof targetIndex === 'number' && Array.isArray(this.enemies) && this.enemies[targetIndex] && this.enemies[targetIndex].hp > 0) {
            this.activeEnemyIndex = targetIndex;
            this.syncActiveEnemy();
            this.updateEnemyTargetUI();
        }
        this.actionLock = true;
        const active = document.activeElement; if (active && typeof active.blur === 'function') active.blur();
        const acts = $('combat-actions');
        acts.style.opacity = '0.8';
        acts.style.pointerEvents = 'none';
        try {
            const p = game.player; const e = this.enemy;
            if(type === 'heal') {
                const heal = Math.floor(this.maxHp * 0.4); this.hp = Math.min(this.maxHp, this.hp + heal);
                this.showDmg(heal, 'player', 'heal');
                this.logMessage(`You drink a potion and heal ${heal} HP.`);
                this.updateUI(); this.setTurn('enemy'); return;
            }
            const profile = this.getPlayerAttackProfile(type);
            let hit = this.calcHit(p.getEffectiveAtk(), e.def);
            hit += p.getHitBonus();
            const effectiveHit = Math.max(5, Math.min(99, hit + profile.hitBonus));
            const roll = rng(0,100);
            const didHit = roll <= effectiveHit;

            const attackResult = {
                apply: () => {
                    if (didHit) {
                        const range = p.getDmgRange();
                        const baseDmg = rng(range.min, range.max);
                        let dmg = Math.floor(baseDmg * profile.damageMult);
                        const targetEnemy = this.syncActiveEnemy();
                        const hasAffliction = !!(targetEnemy && Array.isArray(targetEnemy.dots) && targetEnemy.dots.length > 0);
                        if (hasAffliction) dmg = Math.floor(dmg * (1 + p.getAfflictedDamageMult()));
                        const critChance = 5 + p.getEffectiveAtk() + p.getCritBonus();
                        let isCrit = false;
                        let isDisastrous = false;
                        if (type === 'power') {
                            const disastrousChancePlayer = 6;
                            if (rng(0,100) < disastrousChancePlayer) {
                                isDisastrous = true;
                                const critLike = Math.floor(dmg * 1.5);
                                dmg = Math.floor(critLike * 4);
                            } else if (rng(0,100) < critChance) {
                                isCrit = true;
                                dmg = Math.floor(dmg * 1.5);
                            }
                        } else {
                            if (rng(0,100) < critChance) {
                                isCrit = true;
                                dmg = Math.floor(dmg * 1.5);
                            }
                        }
                        const shred = p.getConditionalSkillEffect('armorShredWhile') + (p.getClassWeaponIdentity().armorShred || 0);
                        if (targetEnemy && shred > 0 && targetEnemy.armor > 0) {
                            const shredAmt = Math.max(0, Math.floor(targetEnemy.armor * shred));
                            if (shredAmt > 0) {
                                targetEnemy.armor = Math.max(0, targetEnemy.armor - shredAmt);
                                this.logMessage(`Armor shatters for <span class="log-dmg">${shredAmt}</span>.`);
                            }
                        }
                        this.takeDamage(dmg, 'enemy');
                        this.applyWeaponOnHitEffects(p, p.gear.weapon, 'enemy', this.activeEnemyIndex);
                        this.showDmg(dmg, 'enemy', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));
                        const label = type==='quick' ? 'Quick' : (type==='power' ? 'Power' : 'Normal');
                        let critText = '';
                        if (isDisastrous) critText = ' (DISASTROUS HIT!)';
                        else if (isCrit) critText = ' (CRIT)';
                        this.logMessage(`You use ${label} Attack and hit ${targetEnemy.name} for <span class="log-dmg">${dmg}</span>.${critText}`);
                        this.triggerHitImpact(profile.shake, profile.blur, profile.impactDuration, {
                            hitStopMs: profile.hitStopMs,
                            particleColor: profile.particleColor,
                            slashColor: profile.slashColor,
                            impactSize: profile.impactSize,
                            particleCount: isDisastrous ? 12 : (isCrit ? 10 : 7),
                            slashCount: type === 'power' ? 4 : 2,
                            impactAnimMs: isDisastrous ? 320 : (isCrit ? 280 : 240),
                            impactCore: isDisastrous ? 'rgba(255,245,180,0.98)' : (isCrit ? 'rgba(255,226,120,0.96)' : undefined),
                            impactMid: isDisastrous ? 'rgba(255,128,0,0.9)' : (isCrit ? 'rgba(255,184,0,0.88)' : undefined),
                            impactGlow: isDisastrous ? 'rgba(255,98,0,0.92)' : (isCrit ? 'rgba(255,208,0,0.9)' : undefined)
                        });
                        if (isCrit) this.showCombatToast('CRITICAL', 'status');
                        if (isDisastrous) this.showCombatToast('DISASTROUS', 'status');
                        if (targetEnemy.hp <= 0) {
                            this.logMessage(`${targetEnemy.name} falls in the arena.`);
                            this.flashFinisher(isDisastrous ? 'disastrous' : 'kill');
                            const defeatedIndex = this.enemies.indexOf(targetEnemy);
                            const cross = defeatedIndex === 1 ? $('enemy2-death-cross') : $('enemy-death-cross');
                            if (cross) {
                                cross.classList.remove('enemy-death-cross-anim');
                                void cross.offsetWidth;
                                cross.classList.add('enemy-death-cross-anim');
                            }
                            this.syncActiveEnemy();
                        }
                    } else {
                        this.showDmg(Math.random() < 0.5 ? 'DODGE' : 'MISS', 'enemy', 'miss');
                        this.logMessage(`Your attack misses ${e.name}.`);
                    }
                    this.updateUI();
                }
            };

            if (didHit) {
                await this.playCollisionAnimation(type, attackResult);
            } else {
                await this.playDodgeAnimation('player', attackResult);
            }

            if(this.getLivingEnemies().length === 0) {
                this.win();
            } else {
                await wait(800);
                this.setTurn('enemy');
            }
        } catch (err) {
            console.error('playerAttack error', err);
            this.logMessage('Combat hiccup recovered.');
            this.updateUI();
        } finally {
            this.actionLock = false;
        }
    },
    async runEnemyTurn() {
        if (this.enemyActing) return;
        this.enemyActing = true;
        try {
            $('enemy-think').style.display = 'block'; await wait(1500); $('enemy-think').style.display = 'none';
            const p = game.player;
            const attackers = this.getLivingEnemies();
            for (let i = 0; i < attackers.length; i++) {
                const e = attackers[i];
                this.activeEnemyIndex = this.enemies.indexOf(e);
                this.syncActiveEnemy();
                this.updateUI();
                let hit = this.calcHit(e.atk, p.getEffectiveDef());
                hit = Math.max(5, Math.min(99, hit - p.getDodgeBonus()));
                const roll = rng(0,100);
                const didHit = roll <= hit;

                const attackResult = {
                    apply: () => {
                        if (didHit) {
                            const erange = this.getEnemyDmgRange(e);
                            let dmg = rng(erange.min, erange.max);
                            const critChanceEnemy = 5 + e.atk;
                            let isCrit = false;
                            let isDisastrous = false;
                            const disastrousChanceEnemy = 3;
                            if (rng(0,100) < disastrousChanceEnemy) {
                                isDisastrous = true;
                                const critLike = Math.floor(dmg * 1.5);
                                dmg = Math.floor(critLike * 4);
                            } else if (rng(0,100) < critChanceEnemy) {
                                isCrit = true;
                                dmg = Math.floor(dmg * 1.5);
                            }
                            if (isCrit || isDisastrous) this.criticalHitsTaken += isDisastrous ? 2 : 1;
                            this.lastEnemyName = e.name;
                            this.takeDamage(dmg, 'player');
                            this.applyWeaponOnHitEffects(e, e.weapon, 'player');
                            this.showDmg(dmg, 'player', isDisastrous ? 'disastrous' : (isCrit ? 'crit' : 'dmg'));
                            let extra = '';
                            if (isDisastrous) extra = ' (DISASTROUS HIT!)';
                            else if (isCrit) extra = ' (CRIT)';
                            this.logMessage(`${e.name} hits you for <span class="log-dmg">${dmg}</span>.${extra}`);
                            this.triggerHitImpact('shake-md', 'combat-blur-md', 360, {
                                hitStopMs: isDisastrous ? 85 : (isCrit ? 60 : 46),
                                particleColor: isDisastrous ? 'rgba(255,110,64,0.95)' : 'rgba(255,138,128,0.92)',
                                slashColor: 'rgba(255,244,214,0.88)',
                                impactSize: isDisastrous ? 290 : (isCrit ? 250 : 220),
                                particleCount: isDisastrous ? 11 : (isCrit ? 9 : 6),
                                slashCount: isDisastrous ? 4 : 2,
                                impactAnimMs: isDisastrous ? 320 : 260,
                                impactCore: isDisastrous ? 'rgba(255,232,160,0.96)' : undefined,
                                impactMid: isDisastrous ? 'rgba(255,100,50,0.9)' : undefined,
                                impactGlow: isDisastrous ? 'rgba(255,60,0,0.9)' : undefined
                            });
                            if (isDisastrous) this.showCombatToast('BRUTAL HIT', 'status');
                            if (this.hp <= 0 && typeof game.handlePlayerDeath === 'function') game.handlePlayerDeath();
                        } else {
                            this.showDmg(Math.random() < 0.5 ? 'DODGE' : 'MISS', 'player', 'miss');
                            this.logMessage(`${e.name}'s attack misses you.`);
                        }
                        this.updateUI();
                    }
                };

                if (didHit) await this.playCollisionAnimation('enemy', attackResult);
                else await this.playDodgeAnimation('enemy', attackResult);
                if (this.hp <= 0) break;
                if (i < attackers.length - 1) await wait(420);
            }

            if(this.hp > 0) {
                await wait(500);
                this.syncActiveEnemy();
                this.setTurn('player');
            }
        } catch (err) {
            console.error('runEnemyTurn error', err);
            const think = $('enemy-think');
            if (think) think.style.display = 'none';
            this.logMessage('Enemy turn recovered.');
            this.updateUI();
            if (this.hp > 0) this.setTurn('player');
        } finally {
            this.enemyActing = false;
        }
    },
    win() {
        const p = game.player; p.wins++; 
        // ensure enemy HP bar visibly drains to 0 before victory
        if (Array.isArray(this.enemies)) this.enemies.forEach(e => { if (e && e.hp > 0) e.hp = 0; });
        // Önce HP/armor barlarını 0'a güncelle
        this.updateUI();
        // Sonra enemy avatar üzerinde death cross efektini tetikle
        ['enemy-death-cross', 'enemy2-death-cross'].forEach(id => {
            const cross = $(id);
            if (cross && !cross.classList.contains('hidden')) {
                cross.classList.remove('enemy-death-cross-anim');
                void cross.offsetWidth;
                cross.classList.add('enemy-death-cross-anim');
            }
        });
        const totalEnemyLevels = (this.enemies || []).reduce((sum, e) => sum + ((e && e.lvl) || 0), 0) || ((this.enemy && this.enemy.lvl) || 1);
        const baseGold = 30 + (totalEnemyLevels * 12);
        const baseXp = 70 + (totalEnemyLevels * 20);
        const chr = p.getEffectiveChr();
        let rewardMult = 1 + chr * 0.022 + p.getRewardMultiplierBonus();
        if (this.mode === 'no_armor') rewardMult += 0.25;
        if (this.mode === 'duo') rewardMult += 0.55;

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

        let gold = Math.floor(baseGold * goldMult);
        let xp = Math.floor(baseXp * xpMult);
        const tournamentAvailable = game.isTournamentAvailable();
        const inTournament = !!game.currentTournament;
        const inDungeon = !!game.currentDungeon && this.context && this.context.source === 'dungeon';
        if (!inTournament && this.context && this.context.source === 'pit' && tournamentAvailable && !(this.context && this.context.xpEnabled)) {
            xp = 0;
        }
        let victorySubtitle = 'Enemy Defeated.';
        let tournamentBannerText = '';
        let isFinalRound = false;
        let isFinalDungeonRoom = false;
        let dungeonLootBundle = null;
        if (inTournament) {
            isFinalRound = game.currentTournament.index >= game.currentTournament.rounds.length - 1;
            if (!isFinalRound) {
                victorySubtitle = `Round ${game.currentTournament.index + 1} of ${game.currentTournament.rounds.length} cleared.`;
            } else {
                gold += Math.floor((160 + game.currentTournament.tier * 110) * (1 + chr * 0.018));
                xp += Math.floor((200 + game.currentTournament.tier * 145) * (1 + chr * 0.018));
                p.tournamentsCompleted = Math.max(p.tournamentsCompleted || 0, game.currentTournament.tier);
                victorySubtitle = `The crowd rises. The city remembers your name.`;
                const tierMeta = game.getTournamentTierMeta(game.currentTournament.tier);
                tournamentBannerText = `${tierMeta.name} champion. Glory and gold are yours.`;
            }
        } else if (inDungeon) {
            const currentNode = typeof game.getCurrentDungeonNode === 'function' ? game.getCurrentDungeonNode() : null;
            const roomFloor = currentNode ? currentNode.floor : 0;
            gold += 20 + ((game.currentDungeon.depth || 1) * 14) + (roomFloor * 18);
            xp += 30 + ((game.currentDungeon.depth || 1) * 16) + (roomFloor * 22);
            isFinalDungeonRoom = !!currentNode && currentNode.type === 'boss';
            if (typeof game.createDungeonLootBundle === 'function') {
                dungeonLootBundle = game.createDungeonLootBundle(currentNode, this.context);
                if (dungeonLootBundle) gold += dungeonLootBundle.goldTotal || 0;
            }
            if (isFinalDungeonRoom) {
                gold += 140 + ((game.currentDungeon.depth || 1) * 60);
                xp += 170 + ((game.currentDungeon.depth || 1) * 75);
                p.dungeonsCompleted = (p.dungeonsCompleted || 0) + 1;
                p.deepestDungeonDepth = Math.max(p.deepestDungeonDepth || 0, game.currentDungeon.depth || 0);
                victorySubtitle = `The final chamber breaks. The dungeon yields its tribute.`;
            } else {
                victorySubtitle = `The chamber falls quiet. New passages open deeper below.`;
            }
        } else if (tournamentAvailable && xp === 0) {
            victorySubtitle = 'Gold earned. Tournament progression now withholds pit XP.';
        }
        // Victory ekranını X animasyonundan ~2.5sn sonra göster
        setTimeout(() => {
            game.resolveFightInjuries({
                mode: this.mode,
                context: this.context,
                playerHpDamageTaken: this.playerHpDamageTaken,
                criticalHitsTaken: this.criticalHitsTaken,
                lastEnemyName: this.lastEnemyName,
                defeat: false
            });
            if (inDungeon && dungeonLootBundle && typeof game.grantDungeonLootBundle === 'function') {
                game.grantDungeonLootBundle(dungeonLootBundle);
            } else if (!inDungeon && typeof game.clearDungeonVictoryLoot === 'function') {
                game.clearDungeonVictoryLoot();
            }
            if (inDungeon && typeof game.resolveCurrentDungeonCombatVictory === 'function') {
                game.resolveCurrentDungeonCombatVictory();
            }
            p.gold += gold; p.xp += xp;
            this.returnUnusedPotions();
            $('modal-victory').classList.remove('hidden');

            // --- Tournament header (round progress pips) ---
            const tourHeader = $('vic-tournament-header');
            const tourNameEl = $('vic-tournament-name');
            const roundTrack = $('vic-round-track');
            if (inTournament && game.currentTournament) {
                const t = game.currentTournament;
                const tierMeta = game.getTournamentTierMeta(t.tier);
                if (tourNameEl) tourNameEl.innerText = tierMeta.name.toUpperCase();
                if (roundTrack) {
                    roundTrack.innerHTML = t.rounds.map((_, i) => {
                        const isLast = i === t.rounds.length - 1;
                        let cls = 'vic-round-pip';
                        if (i < t.index) cls += ' done';
                        else if (i === t.index) cls += isLast ? ' final' : ' current';
                        return `<div class="${cls}"></div>`;
                    }).join('');
                }
                if (tourHeader) tourHeader.classList.remove('hidden');
            } else {
                if (tourHeader) tourHeader.classList.add('hidden');
            }

            // --- Champion banner ---
            const champBanner = $('vic-champion-banner');
            const vicTitle = $('vic-title');
            const vicKicker = $('vic-kicker');
            if (isFinalRound) {
                if (champBanner) champBanner.classList.remove('hidden');
                if (vicTitle) { vicTitle.innerText = 'CHAMPION!'; vicTitle.classList.add('is-champion'); }
                if (vicKicker) vicKicker.innerText = 'Tournament Complete';
            } else if (isFinalDungeonRoom) {
                if (champBanner) champBanner.classList.remove('hidden');
                if (vicTitle) { vicTitle.innerText = 'DUNGEON CLEARED'; vicTitle.classList.remove('is-champion'); }
                if (vicKicker) vicKicker.innerText = 'Depth Conquered';
            } else {
                if (champBanner) champBanner.classList.add('hidden');
                if (vicTitle) { vicTitle.innerText = 'VICTORY!'; vicTitle.classList.remove('is-champion'); }
                if (vicKicker) vicKicker.innerText = inTournament ? 'Tournament' : (inDungeon ? 'Dungeon Run' : 'Arena Result');
            }

            // --- Continue button label ---
            const continueBtn = $('vic-continue-btn');
            if (continueBtn) {
                if (inTournament && !isFinalRound) continueBtn.innerText = 'NEXT ROUND';
                else if (isFinalRound) continueBtn.innerText = 'CLAIM GLORY';
                else if (inDungeon && !isFinalDungeonRoom) continueBtn.innerText = 'NEXT ROOM';
                else if (isFinalDungeonRoom) continueBtn.innerText = 'LEAVE DUNGEON';
                else continueBtn.innerText = 'CONTINUE';
            }

            const subtitleEl = $('victory-subtitle');
            if (subtitleEl) subtitleEl.innerText = victorySubtitle;
            const tournamentBanner = $('victory-tournament-banner');
            if (tournamentBanner) {
                tournamentBanner.innerText = tournamentBannerText;
                tournamentBanner.classList.toggle('hidden', !tournamentBannerText);
            }
            if (inDungeon && typeof game.renderDungeonVictoryLoot === 'function') game.renderDungeonVictoryLoot();
            this.animateVal('vic-gold',0,gold,1000); this.animateVal('vic-xp',0,xp,1000);
            $('vic-xp-gain').innerText = xp;
            $('vic-xp-text').innerText = `${p.xp}/${p.xpMax}`;
            setTimeout(()=>{ const pct=Math.min(100,(p.xp/p.xpMax)*100); $('vic-xp-bar').style.width=pct+'%'; },100);
            game.shopFightCount = (game.shopFightCount || 0) + 1;
            game.updateShopRefreshIndicator();
            if (inTournament && game.currentTournament && isFinalRound) {
                game.currentTournament = null;
                game.currentEncounter = null;
            }
            game.saveGame();
        }, 2500);
    },
    animateVal(id,s,e,d){ let obj=$(id),r=e-s,st=new Date().getTime(),et=st+d; let t=setInterval(()=>{ let n=new Date().getTime(),rem=Math.max((et-n)/d,0),v=Math.round(e-(rem*r)); obj.innerHTML=v; if(v==e)clearInterval(t); },20); },
    showDmg(val,t,type) {
        const el=$('dmg-overlay'); 
        el.classList.remove('anim-gravity', 'anim-crit', 'anim-disastrous', 'anim-miss', 'anim-dot', 'anim-heal');
        el.style.letterSpacing = '';
        el.style.textShadow = '4px 4px 0 #000';
        void el.offsetWidth;

        if(type==='disastrous'){
            el.innerHTML = `DISASTROUS HIT!<br>${val}!`;
            el.style.color = '#ff9100';
            el.style.fontSize = '5rem';
            el.style.letterSpacing = '0.08em';
            el.style.textShadow = '0 0 18px rgba(255,145,0,0.8), 4px 4px 0 #000';
            el.classList.add('anim-disastrous');
        }
        else if(type==='crit'){
            el.innerHTML = `CRITICAL!<br>${val}!`;
            el.style.color = '#ffea00';
            el.style.fontSize = '4rem';
            el.style.letterSpacing = '0.04em';
            el.style.textShadow = '0 0 16px rgba(255,234,0,0.75), 4px 4px 0 #000';
            el.classList.add('anim-crit');
        }
        else if(type==='miss'){
            el.innerText = typeof val === 'string' ? val : "DODGE";
            el.style.color = '#ffeb3b';
            el.style.fontSize = '3.5rem';
            el.classList.add('anim-miss');
        }
        else if(type==='dot'){
            // DOT hasarında pozitif sayı göster (eksi yok)
            el.innerText = `${val}`;
            el.style.color = '#d500f9';
            el.style.fontSize = '3.2rem';
            el.style.textShadow = '0 0 14px rgba(213,0,249,0.75), 4px 4px 0 #000';
            el.classList.add('anim-dot');
        }
        else {
            el.innerText = val;
            el.style.fontSize = '3.5rem';
            el.style.color = (type==='heal' ? '#00e676' : (t==='player' ? '#ff1744' : '#fff'));
            if (type === 'heal') {
                el.style.textShadow = '0 0 14px rgba(0,230,118,0.7), 4px 4px 0 #000';
                el.classList.add('anim-heal');
            } else {
                el.classList.add('anim-gravity');
            }
        }
        if (!el.classList.contains('anim-crit') && !el.classList.contains('anim-disastrous') && !el.classList.contains('anim-miss') && !el.classList.contains('anim-dot') && !el.classList.contains('anim-heal') && !el.classList.contains('anim-gravity')) {
            el.classList.add('anim-gravity');
        }
    }
};
