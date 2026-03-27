const game = {
    ...gameSaveLoad,
    ...gameShop,
    ...gameEncounter,
    player: null, selectedAvatar: 0, shopStock: { weapon: [], armor: [], trinket: [] }, shopSortOrder: 'desc', shopSortKey: 'price', currentShopType: 'weapon', currentTradeMode: 'buy', codexFilter: 'weapon', currentPitMode: 'duel', currentEncounter: null, currentTournament: null,
    potionStock: {},
    saveSlots: [], lastSlot: -1, currentSlotIndex: -1,
    shopFightCount: 0,
    lastShopFightReset: 0,
    lastPotionFightReset: 0,

    selectAvatar(idx) { this.selectedAvatar = idx; document.querySelectorAll('.avatar-option').forEach((el, i) => el.classList.toggle('selected', i === idx)); },
    async newGameView() {
        if (!this.ensureSlotForNewPlayer()) return;
        const introScreen = $('screen-intro');
        const startScreen = $('screen-start');
        const skipBtn = $('intro-skip-button');
        this._introCancelled = false;
        if (skipBtn) {
            skipBtn.onclick = () => {
                this._introCancelled = true;
                this.finishNewGameIntro();
            };
        }
        if (startScreen) startScreen.classList.add('hidden');
        if (introScreen) introScreen.classList.remove('hidden');
        await this.playIntroSequence(true);
        if (!this._introCancelled) {
            this.finishNewGameIntro();
        }
    },
    createCharacter() {
        const name = $('inp-name').value || "Gladiator";
        const cls = $('inp-class').value;
        document.querySelectorAll('.creation-class-card').forEach(el => {
            el.classList.toggle('is-selected', el.dataset.class === cls);
        });
        this.player = new Player(name, cls, this.selectedAvatar);
        const rustTemplate = (typeof getWeaponTemplateByKey === 'function')
            ? (getWeaponTemplateByKey('rusty_blade') || getWeaponTemplateByKey('rusty_sword'))
            : (typeof WEAPONS !== 'undefined'
                ? (
                    WEAPONS.find(w => w.key === 'rusty_blade')
                    || WEAPONS.find(w => w.key === 'rusty_sword')
                    || WEAPONS.find(w => w.type === 'weapon' && w.rarityKey === 'common' && w.weaponClass === 'Sword' && w.minShopLevel === 1)
                  )
                : null);
        if (rustTemplate) {
            this.player.equip({ ...rustTemplate, id: Date.now() + Math.random() });
        }
        // Başlangıçta 9 stat puanı dağıtma panelini (creation ekranının sağ tarafı) hazırla
        this.player.pts = 9;
        this.tempCreateStats = { ...this.player.stats };
        this.renderCreateUI();
    },
    setCreationClass(cls) {
        const sel = $('inp-class');
        if (sel) sel.value = cls;
        this.createCharacter();
    },
    consumePotionFromInventory(potionLike, qty = 1) {
        if (!this.player || !potionLike || qty <= 0 || !Array.isArray(this.player.inventory)) return false;
        const inv = this.player.inventory;
        const subType = potionLike.subType;
        const percent = potionLike.percent || 0;
        const name = potionLike.name || '';
        const existing = inv.find(it => it && it.type === 'potion' && it.subType === subType && (it.percent || 0) === percent && it.name === name && (it.qty || 0) >= qty);
        if (!existing) return false;
        existing.qty = (existing.qty || 0) - qty;
        if (existing.qty <= 0) {
            const idx = inv.indexOf(existing);
            if (idx !== -1) inv.splice(idx, 1);
        }
        return true;
    },
    addTestGold(amount = 100) {
        if(!this.player) return;
        this.player.gold += amount;
        this.updateHubUI();
        this.saveGame();
    },
    goToMainMenu() {
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        const introScreen = $('screen-intro');
        if (introScreen) introScreen.classList.add('hidden');
        const creationScreen = $('screen-creation');
        if (creationScreen) creationScreen.classList.add('hidden');
        const startScreen = $('screen-start');
        if (startScreen) startScreen.classList.remove('hidden');
        if (typeof stopFightMusic === 'function') stopFightMusic();
        if (typeof wireButtonSfx === 'function' && startScreen) wireButtonSfx(startScreen);
    },
    openSkillTree() {
        const modal = $('modal-skilltree');
        if (!modal || !this.player) return;
        this.renderSkillTree();
        modal.classList.remove('hidden');
        if (typeof wireButtonSfx === 'function') wireButtonSfx(modal);
    },
    closeSkillTree() {
        const modal = $('modal-skilltree');
        if (modal) modal.classList.add('hidden');
    },
    canUnlockSkill(node) {
        if (!this.player || !node) return false;
        if ((this.player.skillPoints || 0) <= 0) return false;
        const rank = this.player.getSkillRank(node.id);
        if (rank >= (node.maxRank || 1)) return false;
        const reqs = node.requires || [];
        return reqs.every(id => this.player.getSkillRank(id) > 0);
    },
    isSkillUnlocked(node) {
        if (!this.player || !node) return false;
        return this.player.getSkillRank(node.id) > 0;
    },
    unlockSkill(skillId) {
        if (!this.player) return;
        const node = SKILL_TREE.find(s => s.id === skillId);
        if (!node || !this.canUnlockSkill(node)) return;
        this.player.skills[skillId] = (this.player.skills[skillId] || 0) + 1;
        this.player.skillPoints -= 1;
        this.renderSkillTree();
        this.updateHubUI();
        this.saveGame();
    },
    renderSkillTree() {
        if (!this.player) return;
        const pts = $('skilltree-points');
        const host = $('skilltree-branches');
        if (pts) pts.innerText = this.player.skillPoints || 0;
        if (!host) return;
        host.innerHTML = SKILL_BRANCHES.map(branch => {
            const nodes = SKILL_TREE.filter(node => node.branch === branch.key);
            const tierMap = new Map();
            nodes.forEach(node => {
                if (!tierMap.has(node.tier || 1)) tierMap.set(node.tier || 1, []);
                tierMap.get(node.tier || 1).push(node);
            });
            const tierHtml = [...tierMap.entries()].sort((a,b)=>a[0]-b[0]).map(([tier, tierNodes]) => {
                const nodeHtml = tierNodes.map(node => {
                    const rank = this.player.getSkillRank(node.id);
                    const unlocked = this.isSkillUnlocked(node);
                    const canBuy = this.canUnlockSkill(node);
                    const reqText = (node.requires && node.requires.length) ? `Requires: ${node.requires.map(id => SKILL_TREE.find(s => s.id === id)?.name || id).join(', ')}` : '';
                    const isMaxed = unlocked && rank >= (node.maxRank || 1);
                    const nodeClass = isMaxed ? 'is-maxed' : (unlocked ? 'is-unlocked' : (canBuy ? 'is-available' : 'is-locked'));
                    return `<button class="btn skilltree-node ${nodeClass}" ${isMaxed ? 'disabled' : ''} onclick="game.unlockSkill('${node.id}')"><span class="skilltree-node-name">${node.name}</span><span class="skilltree-node-rank">Rank ${rank}/${node.maxRank || 1}</span><span class="skilltree-node-desc">${node.description}</span>${reqText ? `<span class="skilltree-node-req">${reqText}</span>` : ''}</button>`;
                }).join('');
                return `<div class="skilltree-tier"><div class="skilltree-tier-label">Tier ${tier}</div><div class="skilltree-node-list">${nodeHtml}</div></div>`;
            }).join('');
            return `<div class="skilltree-branch" data-branch="${branch.key}"><div class="skilltree-branch-head"><h3 class="skilltree-branch-title"><span class="skilltree-branch-icon">${branch.icon || '✦'}</span><span>${branch.name}</span></h3><div class="skilltree-branch-desc">${branch.description || ''}</div></div><div class="skilltree-tier-list">${tierHtml}</div></div>`;
        }).join('');
    },
    getItemBadgeMarkup(item) {
        if (!item) return '';
        const parts = [];
        if (item.dotAffix) parts.push(`<span class="item-chip item-chip-dot item-chip-dot-${item.dotAffix.effect}">${item.dotAffix.effect}</span>`);
        return parts.join(' ');
    },
    getWeaponDotTooltipLine(item) {
        if (!item || !item.dotAffix) return '';
        const affix = item.dotAffix;
        const scaleKeys = Object.keys(affix.scale || {}).map(k => k.toUpperCase()).join(' / ');
        return `<div><span class="text-red">On Hit:</span> ${Math.round((affix.chance || 0) * 100)}% ${affix.effect.charAt(0).toUpperCase() + affix.effect.slice(1)} for ${affix.duration} turns</div><div style="margin-top:4px; color:#aaa; font-size:0.8rem;">Scales with ${scaleKeys || 'Weapon Power'}</div>`;
    },
    showHub() {
        // Hide all menu screens except hub, stop combat music, refresh hub UI
        // (non-modal overlays stay controlled by their own logic)
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const combatScreen = $('screen-combat');
        if (combatScreen) combatScreen.classList.add('hidden');
        const hubScreen = $('screen-hub');
        if (hubScreen) hubScreen.classList.remove('hidden');
        const encounterModal = $('modal-encounter');
        if (encounterModal) encounterModal.classList.add('hidden');
        const tournamentModal = $('modal-tournament');
        if (tournamentModal) tournamentModal.classList.add('hidden');
        this.currentEncounter = null;
        this.updateHubUI();
        if (typeof stopFightMusic === 'function') stopFightMusic();
        wireButtonSfx($('screen-hub'));
    },
    async playIntroSequence(forNewGame = false) {
        const introScreen = $('screen-intro');
        const bg = $('intro-background');
        const img = $('intro-image');
        const txt = $('intro-text');
        if (!introScreen || !bg || !img || !txt) return;
        const bass = new Audio('assets/audio/ui/deep_bass_hit.ogg');
        const setOpacity = (o) => {
            introScreen.style.opacity = String(o);
        };
        introScreen.style.background = '#000';
        setOpacity(1);
        const showLine = async (content, opts) => {
            txt.style.opacity = '0';
            txt.style.color = '#bbbbbb';
            txt.style.textShadow = '';
            txt.innerText = content;
            if (opts && opts.delay) await wait(opts.delay);
            try { bass.currentTime = 0; bass.play(); } catch {}
            const fadeInMs = (opts && opts.fadeIn) || 1200;
            const holdMs = (opts && opts.hold) || 2200;
            const start = performance.now();
            return new Promise(resolve => {
                const stepIn = (t) => {
                    const p = Math.min(1, (t - start) / fadeInMs);
                    txt.style.opacity = String(p);
                    if (p < 1) {
                        requestAnimationFrame(stepIn);
                    } else {
                        setTimeout(resolve, holdMs);
                    }
                };
                requestAnimationFrame(stepIn);
            });
        };
        for (const scene of INTRO_SCRIPT.scenes) {
            img.src = scene.bg;
            img.style.opacity = '0';
            txt.style.textShadow = '';
            // fade in scene image
            {
                const fadeMs = 800;
                const start = performance.now();
                await new Promise(resolve => {
                    const step = (t) => {
                        const p = Math.min(1, (t - start) / fadeMs);
                        img.style.opacity = String(p);
                        if (p < 1 && !this._introCancelled) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    requestAnimationFrame(step);
                });
            }
            for (const line of scene.lines) {
                if (this._introCancelled) return;
                await showLine(line.text, line);
            }
            // fade out image + text between scenes
            {
                const fadeMs = 700;
                const start = performance.now();
                await new Promise(resolve => {
                    const step = (t) => {
                        const p = Math.min(1, (t - start) / fadeMs);
                        const o = 1 - p;
                        img.style.opacity = String(o);
                        txt.style.opacity = String(o);
                        if (p < 1 && !this._introCancelled) {
                            requestAnimationFrame(step);
                        } else {
                            resolve();
                        }
                    };
                    requestAnimationFrame(step);
                });
            }
        }
        // final section: pure black, centered quote
        img.src = '';
        img.style.opacity = '0';
        await wait(INTRO_SCRIPT.finalPauseMs);
        const overlay = $('intro-overlay');
        if (overlay) {
            overlay.style.top = '0';
            overlay.style.bottom = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
        }
        txt.style.textShadow = '0 0 26px #7A1A1A';
        txt.style.textAlign = 'center';
        for (let i = 0; i < INTRO_SCRIPT.finalLines.length; i++) {
            const line = INTRO_SCRIPT.finalLines[i];
            if (i === INTRO_SCRIPT.finalLines.length - 1) {
                txt.style.fontSize = '1.6rem';
                txt.style.textShadow = '0 0 26px #7A1A1A';
            } else {
                txt.style.fontSize = '1.4rem';
                txt.style.textShadow = '0 0 18px #7A1A1A';
            }
            await showLine(line, { delay: i === 0 ? 1000 : 400, fadeIn: 1800, hold: 2600 });
        }
        // slow fadeout of whole intro before creation fades in
        {
            const fadeMs = 1200;
            const start = performance.now();
            await new Promise(resolve => {
                const step = (t) => {
                    const p = Math.min(1, (t - start) / fadeMs);
                    setOpacity(1 - p);
                    if (p < 1) {
                        requestAnimationFrame(step);
                    } else {
                        resolve();
                    }
                };
                requestAnimationFrame(step);
            });
            introScreen.style.opacity = '';
        }
    },
    finishNewGameIntro() {
        const introScreen = $('screen-intro');
        if (introScreen) introScreen.classList.add('hidden');
        $('screen-creation').classList.remove('hidden');
        this.createCharacter();
    },
    ensurePreviewHelpers() {
        if (typeof this._buildItemPreview === 'function' && typeof this._moveItemPreview === 'function') return;
        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const getWeaponPreviewIconPath = (item) => {
            if (!item || item.type !== 'weapon') return '';
            const cls = (item.weaponClass || '').toLowerCase();
            const baseLower = (item.baseType || '').toLowerCase();
            if (cls === 'axe' || baseLower.includes('axe')) return 'assets/weapon-icons/axe_icon.png';
            if (cls === 'sword' || baseLower.includes('blade') || baseLower.includes('sword')) return 'assets/weapon-icons/sword_icon.png';
            if (cls === 'hammer' || baseLower.includes('hammer') || baseLower.includes('mace')) return 'assets/weapon-icons/hammer_icon.png';
            if (cls === 'dagger' || baseLower.includes('dagger')) return 'assets/weapon-icons/dagger_icon.png';
            if (cls === 'spear' || baseLower.includes('spear') || baseLower.includes('halberd')) return 'assets/weapon-icons/spear_icon.png';
            if (cls === 'bow' || baseLower.includes('bow') || baseLower.includes('crossbow')) return 'assets/weapon-icons/crossbow_icon.png';
            return '';
        };
        this._buildItemPreview = (item) => {
            if (!item || !previewBody) return;
            const rarityText = (item.rarity || '').replace('rarity-', '');
            const minLvl = getItemMinLevel(item);
            let lines = [];
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            const badgeMarkup = this.getItemBadgeMarkup(item);
            if (badgeMarkup) lines.push(`<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">${badgeMarkup}</div>`);
            if (item.type === 'weapon') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                if (typeof item.min === 'number' && typeof item.max === 'number') lines.push(`<div><span class="text-orange">Damage:</span> ${item.min}-${item.max}</div>`);
                const dotLine = this.getWeaponDotTooltipLine(item);
                if (dotLine) lines.push(dotLine);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                let armorLine = `${val}`;
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                const equipped = this.player && this.player.gear && item.slot ? this.player.gear[item.slot] : null;
                if (equipped && typeof equipped.val === 'number') {
                    const diff = val - equipped.val;
                    if (diff !== 0) {
                        const sign = diff > 0 ? '+' : '';
                        const diffCls = diff > 0 ? 'text-green' : 'text-red';
                        armorLine += ` <span class="${diffCls}" style="font-size:0.85rem;">(${sign}${diff})</span>`;
                    }
                }
                lines.push(`<div><span class="text-shield">Armor:</span> ${armorLine}</div>`);
            } else if (item.type === 'trinket') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
            }
            if (item.statMods) {
                const map = [
                    { key: 'str', label: 'Strength', cls: 'text-orange' },
                    { key: 'atk', label: 'Attack', cls: 'text-red' },
                    { key: 'def', label: 'Defence', cls: 'text-blue' },
                    { key: 'vit', label: 'Vitality', cls: 'text-green' },
                    { key: 'mag', label: 'Magicka', cls: 'text-purple' },
                    { key: 'chr', label: 'Charisma', cls: 'text-gold' }
                ];
                const modLines = [];
                map.forEach(({ key, label, cls }) => {
                    const v = item.statMods[key];
                    if (typeof v === 'number' && v !== 0) {
                        const sign = v > 0 ? '+' : '';
                        const toneClass = v > 0 ? 'text-green' : 'text-red';
                        modLines.push(`<div class="${toneClass}">${sign}${v} ${label}</div>`);
                    }
                });
                if (modLines.length) {
                    lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                    lines = lines.concat(modLines);
                    lines.push('</div>');
                }
            }
            lines.push(`<div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;"><span>Rarity: ${rarityText}</span><span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span></div>`);
            if (item.info) {
                const infoClass = item.infoColor || 'text-gold';
                lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${item.info}</div>`);
            }
            previewBody.innerHTML = lines.join('');
            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') iconPath = getWeaponPreviewIconPath(item);
                else if (item.type === 'armor') iconPath = getArmorIconPath(item);
                else if (item.type === 'trinket') iconPath = item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                if (iconPath) {
                    previewIcon.src = iconPath;
                    previewIcon.classList.remove('hidden');
                } else {
                    previewIcon.src = '';
                    previewIcon.classList.add('hidden');
                }
            }
        };
        this._moveItemPreview = (ev) => {
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
    },
    updateHubUI() {
        this.ensurePreviewHelpers();
        const p = this.player;
        $('ui-name').innerText = p.name; $('ui-lvl').innerText = p.level; $('ui-gold').innerText = p.gold;
        const avatarImg = $('ui-avatar');
        if (avatarImg) avatarImg.src = PLAYER_AVATAR_IMG;
        const hasInjury = Array.isArray(p.injuries) && p.injuries.length > 0;
        const profileCard = document.querySelector('.hub-profile-card');
        if (profileCard) profileCard.classList.toggle('has-injury', hasInjury);
        // Hub XP bar under level label
        const xpNow = typeof p.xp === 'number' ? p.xp : 0;
        const xpMax = typeof p.xpMax === 'number' && p.xpMax > 0 ? p.xpMax : 100;
        const xpPct = Math.max(0, Math.min(100, Math.round((xpNow / xpMax) * 100)));
        const xpFill = $('hub-xp-fill');
        const xpText = $('hub-xp-text');
        if (xpFill) xpFill.style.width = xpPct + '%';
        if (xpText) xpText.innerText = `${xpNow} / ${xpMax} XP`;
        const dmg = p.getDmgRange(); const arm = p.getTotalArmor();

        // Hub ekranı görünürken buton SFX wiring'ini tazele
        wireButtonSfx($('screen-hub'));

        const effStr = p.getEffectiveStr();
        const effAtk = p.getEffectiveAtk();
        const effVit = p.getEffectiveVit();
        const effDef = p.getEffectiveDef();
        const effMag = p.getEffectiveMag();
        const effChr = p.getShopEffectiveChr();
        const strBonus = effStr - p.stats.str;
        const atkBonus = effAtk - p.stats.atk;
        const vitBonus = effVit - p.stats.vit;
        const defBonus = effDef - p.stats.def;
        const magBonus = effMag - p.stats.mag;
        const chrBase = (p.stats.chr ?? 0);
        const chrBonus = effChr - chrBase;

        // Equipment Lists
        const renderSlot = (slot, title) => {
            const item = p.gear[slot];
            let display;
            if(item) {
                if(item.type === 'weapon') {
                    const dmgText = (typeof item.min === 'number' && typeof item.max === 'number') ? ` <span style="color:#888; font-size:0.8rem;">(${item.min}-${item.max})</span>` : '';
                    const isLegendary = item.rarityKey === 'legendary';
                    const baseName = isLegendary ? cleanLegendaryWeaponName(item) : item.name;
                    // Hub'daki Melee Weapon satırı için isim span'ine id ver (tooltip hedefi)
                    const spanId = (slot === 'weapon') ? 'hub-weapon-name' : '';
                    const idAttr = spanId ? ` id="${spanId}"` : '';
                    display = `<span${idAttr} class="${item.rarity}">${baseName}</span>${dmgText}`;
                } else if (item.type === 'trinket') {
                    const spanId = (slot === 'trinket1') ? 'hub-trinket1-name' : (slot === 'trinket2') ? 'hub-trinket2-name' : '';
                    const idAttr = spanId ? ` id="${spanId}"` : '';
                    display = `<span${idAttr} class="${item.rarity}">${item.name}</span>`;
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

        // Trinkets section (2 slot)
        html += `<div class="eq-header">TRINKETS</div>`;
        html += renderSlot('trinket1', 'Trinket 1');
        html += renderSlot('trinket2', 'Trinket 2');
        $('ui-equip').innerHTML = html;

        // Attach armor panel button + hub weapon / trinket tooltips after injecting HTML
        const btn = document.querySelector('#ui-equip .stat-row button');
        if(btn) btn.onclick = () => game.openArmorPanel();

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const buildPreviewFromItem = this._buildItemPreview;
        const sharedMovePreview = this._moveItemPreview;

        const wireWeaponHover = () => {
            const wName = $('hub-weapon-name');
            const weapon = p.gear.weapon;
            if (!wName || !weapon || !previewBox || !previewBody || typeof buildPreviewFromItem !== 'function') return;
            const movePreview = sharedMovePreview;
            wName.onmouseenter = (ev) => {
                buildPreviewFromItem(weapon);
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
        const setupTrinketHover = (elId, trinket) => {
            const el = $(elId);
            if (!el || !trinket || !previewBox || !previewBody || typeof sharedMovePreview !== 'function') return;
            const buildPreview = () => {
                const rarityText = (trinket.rarity || '').replace('rarity-','');
                const lines = [];
                lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${trinket.rarity}">${trinket.name}</div>`);
                if (trinket.baseType) lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(trinket)}</div>`);

                // İnsan okunur stat satırları (+1 Strength, +2 Attack, ...)
                if (trinket.statMods) {
                    const statCfg = {
                        str: { label: 'Strength', cls: 'text-orange' },
                        atk: { label: 'Attack',   cls: 'text-red' },
                        def: { label: 'Defence',  cls: 'text-blue' },
                        vit: { label: 'Vitality', cls: 'text-green' },
                        mag: { label: 'Magicka',  cls: 'text-purple' },
                        chr: { label: 'Charisma', cls: 'text-gold' }
                    };
                    Object.entries(trinket.statMods).forEach(([k,v]) => {
                        if (!v) return; // 0 statları gösterme
                        const cfg = statCfg[k] || { label: k.toUpperCase(), cls: 'text-gold' };
                        const sign = v > 0 ? '+' : '';
                        lines.push(`<div class="${cfg.cls}">${sign}${v} ${cfg.label}</div>`);
                    });
                }
                if (typeof trinket.goldBonus === 'number') {
                    lines.push(`<div><span class="text-gold">Gold Bonus:</span> +${Math.round(trinket.goldBonus*100)}%</div>`);
                }
                if (typeof trinket.xpBonus === 'number') {
                    lines.push(`<div><span class="text-purple">XP Bonus:</span> +${Math.round(trinket.xpBonus*100)}%</div>`);
                }
                const rarityLabel = rarityText || 'common';
                const minLvl = (typeof trinket.minLevel === 'number')
                    ? trinket.minLevel
                    : (typeof trinket.minShopLevel === 'number' ? trinket.minShopLevel : 1);
                lines.push(`
                    <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                        <span>Rarity: ${rarityLabel}</span>
                        <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                    </div>
                `);
                if (trinket.info) {
                    const infoClass = trinket.infoColor || 'text-gold';
                    lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${trinket.info}</div>`);
                }
                previewBody.innerHTML = lines.join('');

                if (previewIcon) {
                    // Hub trinket tooltip: always use the shared trinket icon
                    previewIcon.src = trinket.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                    previewIcon.classList.remove('hidden');
                }
            };
            el.onmouseenter = (ev) => {
                buildPreview();
                sharedMovePreview(ev);
                previewBox.classList.remove('hidden');
                previewBox.classList.add('visible');
            };
            el.onmousemove = (ev) => {
                if (previewBox.classList.contains('visible')) sharedMovePreview(ev);
            };
            el.onmouseleave = () => {
                previewBox.classList.remove('visible');
            };
        };

        wireWeaponHover();
        setupTrinketHover('hub-trinket1-name', p.gear.trinket1);
        setupTrinketHover('hub-trinket2-name', p.gear.trinket2);
        const tournamentBtn = $('btn-tournament');
        const tournamentSub = $('hub-tournament-sub');
        const tournamentBanner = $('hub-tournament-banner');
        const tournamentBannerText = $('hub-tournament-banner-text');
        if (tournamentBtn && tournamentSub) {
            const available = this.isTournamentAvailable();
            tournamentBtn.classList.toggle('is-available', available);
            tournamentBtn.disabled = !available;
            if (available) {
                const tier = this.getNextTournamentTier();
                tournamentSub.innerText = `Tier ${tier} unlocked. Enter for a heavy final payout.`;
                if (tournamentBanner) tournamentBanner.classList.remove('hidden');
                if (tournamentBannerText) tournamentBannerText.innerText = `Tournament Awaits - Tier ${tier}`;
            } else {
                if ((p.tournamentsCompleted || 0) >= MAX_TOURNAMENT_TIER) {
                    tournamentSub.innerText = 'All 20 tournament tiers conquered.';
                } else {
                    const nextLevel = Math.max(((p.tournamentsCompleted || 0) + 1) * 3, 3);
                    tournamentSub.innerText = `Unlocks at level ${nextLevel}. Normal pit fights give gold only once it opens.`;
                }
                if (tournamentBanner) tournamentBanner.classList.add('hidden');
            }
        }
        const hubMsg = $('hub-msg');
        if (hubMsg && (p.skillPoints || 0) > 0) hubMsg.innerText = `You have ${p.skillPoints} unspent skill point${p.skillPoints === 1 ? '' : 's'}.`;
        // Hub'a döndüğümüzde de shop sayaç bilgisini tazele
        this.updateShopRefreshIndicator();
    },
    doUnequip(slot) { this.player.unequip(slot); this.updateHubUI(); this.saveGame(); },
    openInventory() {
        this.currentTradeMode = 'buy';
        $('screen-hub').classList.add('hidden'); $('screen-list').classList.remove('hidden');
        this.currentInvFilter = this.currentInvFilter || 'all';
        this.renderList(this.player.inventory, 'inv'); $('shop-gold').innerText = this.player.gold;
        this.updateTradeToggleUI();
        wireButtonSfx($('screen-list'));
    },
    openCodex(type = 'weapon') {
        const screens = document.querySelectorAll('.menu-screen');
        screens.forEach(e => e.classList.add('hidden'));
        const codexScreen = $('screen-codex');
        if (codexScreen) codexScreen.classList.remove('hidden');
        this.codexFilter = type;
        const root = $('codex-filters');
        if (root) {
            root.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-primary');
                if (btn.dataset.filter === type) btn.classList.add('btn-primary');
            });
        }
        this.renderCodex();
        if (typeof wireButtonSfx === 'function' && codexScreen) wireButtonSfx(codexScreen);
    },
    setCodexFilter(type) {
        this.codexFilter = type;
        const root = $('codex-filters');
        if (root) {
            root.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('btn-primary');
                if (btn.dataset.filter === type) btn.classList.add('btn-primary');
            });
        }
        this.renderCodex();
    },
    renderCodex() {
        const cont = $('codex-container');
        if (!cont) return;
        cont.innerHTML = '';
        let pool = [];
        if (this.codexFilter === 'weapon') {
            pool = (typeof WEAPONS !== 'undefined') ? WEAPONS : [];
        } else if (this.codexFilter === 'armor') {
            pool = (typeof ARMORS !== 'undefined') ? ARMORS : [];
        } else if (this.codexFilter === 'trinket') {
            pool = (typeof TRINKETS !== 'undefined') ? TRINKETS : [];
        }
        if (!pool || pool.length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No items found.</div>';
            return;
        }
        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const getItemTypeLabel = (item) => {
            if (!item) return '';
            return getDisplayItemType(item);
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
        const getItemIconPath = (item) => {
            if (!item) return '';
            if (item.type === 'weapon') return getWeaponIconPathShared(item);
            if (item.type === 'armor') return getArmorIconPath(item);
            if (item.type === 'trinket') return item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
            if (item.type === 'potion') return 'assets/images/potion-icons/potion-icon.png';
            return '';
        };
        const buildPreviewFromItem = (item) => {
            if (!item || !previewBody) return;
            const rarityText = (item.rarity || '').replace('rarity-', '');
            const minLvl = getItemMinLevel(item);
            let lines = [];
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            const badgeMarkup = this.getItemBadgeMarkup(item);
            if (badgeMarkup) lines.push(`<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">${badgeMarkup}</div>`);
            if (item.type === 'weapon') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                if (typeof item.min === 'number' && typeof item.max === 'number') {
                    lines.push(`<div><span class="text-orange">Damage:</span> ${item.min}-${item.max}</div>`);
                }
                const dotLine = this.getWeaponDotTooltipLine(item);
                if (dotLine) lines.push(dotLine);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                lines.push(`<div><span class="text-shield">Armor:</span> ${val}</div>`);
            } else if (item.type === 'trinket') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
            }
            if (item.statMods) {
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
                    const v = item.statMods[key];
                    if (typeof v === 'number' && v !== 0) {
                        const sign = v > 0 ? '+' : '';
                        const toneClass = v > 0 ? 'text-green' : 'text-red';
                        modLines.push(`<div class="${toneClass}">${sign}${v} ${label}</div>`);
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
            if (item.info) {
                const infoClass = item.infoColor || 'text-gold';
                lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${item.info}</div>`);
            }
            previewBody.innerHTML = lines.join('');

            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') {
                    iconPath = getWeaponIconPathShared(item);
                } else if (item.type === 'armor') {
                    iconPath = getArmorIconPath(item);
                } else if (item.type === 'trinket') {
                    // Trinket katalogunda gelen ikon yolunu kullan, yoksa varsayılan bir trinket ikonu göster
                    iconPath = item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
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

        // Expose universal tooltip helpers so other parts (potion shop, slots) reuse exactly the same behavior
        this._buildItemPreview = buildPreviewFromItem;
        this._moveItemPreview = movePreview;
        pool.forEach(item => {
            const row = document.createElement('div');
            row.className = 'item-row';
            const minLvl = getItemMinLevel(item);
            const typeLabel = getItemTypeLabel(item);
            const rarityText = (item.rarity || '').replace('rarity-', '');
            const lvlHtml = `<span style="color:#ccc;">${minLvl}</span>`;
            const priceTxt = typeof item.price === 'number' ? item.price : '-';
            row.innerHTML = `
                <div class="${item.rarity}">${item.name}</div>
                <div style="font-size:0.8rem;">${rarityText}</div>
                <div style="font-size:0.8rem; color:#ccc;">${typeLabel}</div>
                <div style="font-size:0.8rem; color:#ccc;">${lvlHtml}</div>
                <div class="text-gold">${priceTxt}</div>
                <div style="font-size:0.8rem; color:#666;">-</div>
            `;
            if (previewBox && previewBody) {
                row.onmouseenter = (ev) => {
                    buildPreviewFromItem(item);
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
        });
    },
    renderPotionShop() {
        const cont = $('list-container');
        const titleEl = $('list-title');
        const headerExtra = $('list-header-extra');
        if (!cont || !titleEl) return;
        titleEl.innerText = this.currentTradeMode === 'sell' ? 'POTION SHOP - SELL' : 'POTION SHOP';
        const subtitleEl = $('list-title-sub');
        if (subtitleEl) subtitleEl.innerText = this.currentTradeMode === 'sell' ? 'Trade away spare potions from your inventory.' : 'Brew room stock rotates quickly. Buy before the shelf goes dry.';
        if (headerExtra) headerExtra.innerHTML = '';
        cont.innerHTML = '';
        this.updateTradeToggleUI();

        if (headerExtra) {
            const info = document.createElement('div');
            info.style.color = '#888';
            info.style.fontSize = '0.82rem';
            info.textContent = this.currentTradeMode === 'sell' ? 'Sell potions from your inventory.' : 'Browse the apothecary stock.';
            headerExtra.appendChild(info);
        }

        if (this.currentTradeMode === 'sell') {
            this.renderList([], 'shop');
            return;
        }

        // Potion shop açıkken inventory'ye özel potion slot kartını gizle
        const slotCard = $('inv-potion-slots-card');
        if (slotCard) {
            slotCard.classList.add('hidden');
            slotCard.innerHTML = '';
        }

        if (!this.potionStock || Object.keys(this.potionStock).length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">No potions available.</div>';
            return;
        }

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
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

        // Sort potion entries according to current shopSortKey/shopSortOrder
        const dir = this.shopSortOrder === 'desc' ? -1 : 1;
        const entries = Object.values(this.potionStock).sort((a, b) => {
            const pa = a.price ?? 0;
            const pb = b.price ?? 0;
            const ta = (a.tpl && a.tpl.subType) || '';
            const tb = (b.tpl && b.tpl.subType) || '';
            const la = (a.tpl && a.tpl.percent) || 0;
            const lb = (b.tpl && b.tpl.percent) || 0;
            let av, bv;
            if (this.shopSortKey === 'price') {
                av = pa; bv = pb;
            } else if (this.shopSortKey === 'type') {
                // hp vs armor
                av = ta; bv = tb;
            } else if (this.shopSortKey === 'level') {
                // use potion strength as a pseudo-level for sorting
                av = la; bv = lb;
            } else {
                // rarity or unknown: all potions are common, fall back to name
                av = (a.tpl && a.tpl.name) || '';
                bv = (b.tpl && b.tpl.name) || '';
            }
            if (av === bv) return 0;
            return av < bv ? -1 * dir : 1 * dir;
        });

        entries.forEach(entry => {
            const { tpl, qty, price } = entry;
            const row = document.createElement('div');
            row.className = 'item-row';
            const typeLabel = tpl.subType === 'hp' ? 'Health' : 'Armor';
            const percentText = `${tpl.percent}%`;
            const buyPrice = this.getAdjustedBuyPrice({ price });
            const disabled = qty <= 0 || this.player.gold < buyPrice;
            const btnState = disabled ? 'disabled' : '';
            const iconPath = getItemIconPathShared({ type: 'potion' });
            row.innerHTML = `
                <div class="item-main-wrap">
                    <div class="item-card-icon">${iconPath ? `<img src="${iconPath}" alt="">` : ''}</div>
                    <div class="item-main">
                        <div class="item-main-name rarity-common">${tpl.name} <span class="potion-stock-count">x ${qty}</span></div>
                        <div class="item-main-sub">Restores ${tpl.percent}% ${typeLabel.toLowerCase()} in combat.</div>
                    </div>
                </div>
                <div><span class="item-chip">Potion</span></div>
                <div><span class="item-chip">${typeLabel}</span></div>
                <div class="item-level"><span class="item-chip">${percentText}</span></div>
                <div class="item-price"><span class="text-gold">${buyPrice}</span></div>
                <div class="item-action"><button class="btn btn-buy" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>Buy</button></div>
            `;
            // Tooltip for potions in the potion shop – same layout as universal potion tooltip
            if (previewBox && previewBody) {
                row.onmouseenter = (ev) => {
                    const typeLabel = tpl.subType === 'armor' ? 'Armor' : 'Health';
                    const pct = tpl.percent || 0;
                    const rarityText = 'common';
                    const minLvl = 1;
                    const lines = [];
                    lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="rarity-common">${tpl.name}</div>`);
                    lines.push(`<div><span class="text-green">Type:</span> Potion</div>`);
                    lines.push(`<div><span class="text-blue">Effect:</span> Restore ${pct}% ${typeLabel}</div>`);
                    lines.push(`
                        <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                            <span>Rarity: ${rarityText}</span>
                            <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                        </div>
                    `);
                    previewBody.innerHTML = lines.join('');
                    if (previewIcon) {
                        previewIcon.src = 'assets/images/potion-icons/potion-icon.png';
                        previewIcon.classList.remove('hidden');
                    }
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
            const btn = row.querySelector('button');
            if (btn && !disabled) {
                btn.onclick = () => {
                    if (entry.qty <= 0 || this.player.gold < buyPrice) return;
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
                    // Re-render potion shop row / list
                    this.renderPotionShop();
                    $('shop-gold').innerText = this.player.gold;
                    this.updateHubUI();
                };
            }
            cont.appendChild(row);
        });
    },
    renderList(items, mode) {
        this.currentListMode = mode;
        const cont = $('list-container'); cont.innerHTML = '';
        const header = $('list-header-extra');
        if (header) header.innerHTML = '';
        if (mode === 'shop') {
            const type = this.currentShopType || 'weapon';
            let title = 'SHOP';
            let subtitle = 'Browse this shop stock.';
            if (type === 'weapon') title = 'WEAPONSMITH';
            else if (type === 'armor') title = 'ARMOR';
            else if (type === 'trinket') title = 'MAGIC SHOP';
            else if (type === 'potion') title = 'POTION SHOP';
            if (this.currentTradeMode === 'sell') title += ' - SELL';
            $('list-title').innerText = title;
            const subtitleEl = $('list-title-sub');
            if (subtitleEl) {
                if (type === 'weapon') subtitle = 'Trade steel, compare edges, and hunt for stronger weapon rolls.';
                else if (type === 'armor') subtitle = 'Layer protection piece by piece and read your upgrade gaps at a glance.';
                else if (type === 'trinket') subtitle = 'Browse arcane curios, passive boons, and mystical utility pieces.';
                else if (type === 'potion') subtitle = 'Refill field supplies and prepare for the next stretch of bloodshed.';
                if (this.currentTradeMode === 'sell') subtitle = 'Trade away matching gear from your inventory for fast coin.';
                subtitleEl.innerText = subtitle;
            }
            if (header) {
                const info = document.createElement('div');
                info.style.color = '#888';
                info.style.fontSize = '0.82rem';
                info.textContent = this.currentTradeMode === 'sell' ? 'Sell matching inventory items.' : 'Browse this shop stock.';
                header.appendChild(info);
            }
        } else {
            $('list-title').innerText = 'INVENTORY';
            const subtitleEl = $('list-title-sub');
            if (subtitleEl) subtitleEl.innerText = 'Inspect, compare, equip, and route consumables with less friction.';
            // Inventory filter buttons: All / Weapons / Armors / Trinkets
            const f = document.createElement('div');
            f.id = 'inv-filters';
            f.style.display = 'flex';
            f.style.gap = '8px';
            f.style.marginBottom = '8px';
            const makeBtn = (id, label) => {
                const b = document.createElement('button');
                b.className = 'btn btn-xs';
                b.textContent = label;
                b.dataset.filter = id;
                if (this.currentInvFilter === id) b.classList.add('btn-primary');
                b.onclick = () => {
                    this.currentInvFilter = id;
                    this.renderList(this.player.inventory, 'inv');
                };
                return b;
            };
            f.appendChild(makeBtn('all', 'All'));
            f.appendChild(makeBtn('weapon', 'Weapons'));
            f.appendChild(makeBtn('armor', 'Armors'));
            f.appendChild(makeBtn('trinket', 'Trinkets'));
            f.appendChild(makeBtn('potion', 'Potions'));
            if (header) {
                header.appendChild(f);
            }
        }

        const previewBox = $('shop-preview');
        const previewBody = $('shop-preview-body');
        const previewIcon = $('shop-preview-icon');
        const getItemMinLevel = (item) => {
            if (!item) return 1;
            if (typeof item.minLevel === 'number') return item.minLevel;
            if (typeof item.minShopLevel === 'number') return item.minShopLevel;
            return 1;
        };
        const getItemTypeLabel = (item) => {
            if (!item) return '';
            return getDisplayItemType(item);
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
            const minLvl = (item.type === 'potion') ? 1 : getItemMinLevel(item);
            let lines = [];
            // Title (name)
            lines.push(`<div style="font-size:1rem; margin-bottom:4px;" class="${item.rarity}">${item.name}</div>`);
            const badgeMarkup = this.getItemBadgeMarkup(item);
            if (badgeMarkup) lines.push(`<div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">${badgeMarkup}</div>`);
            // Core stats
            if (item.type === 'weapon') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                let dmgLine = `${item.min}-${item.max}`;
                const equipped = this.player && this.player.gear ? this.player.gear.weapon : null;
                if (equipped && typeof equipped.min === 'number' && typeof equipped.max === 'number') {
                    const curAvg = (equipped.min + equipped.max) / 2;
                    const newAvg = (item.min + item.max) / 2;
                    const diff = Math.round(newAvg - curAvg);
                    if (diff !== 0) {
                        const sign = diff > 0 ? '+' : '';
                        const diffCls = diff > 0 ? 'text-green' : 'text-red';
                        dmgLine += ` <span class="${diffCls}" style="font-size:0.85rem;">(${sign}${diff})</span>`;
                    }
                }
                lines.push(`<div><span class="text-orange">Damage:</span> ${dmgLine}</div>`);
                const dotLine = this.getWeaponDotTooltipLine(item);
                if (dotLine) lines.push(dotLine);
            } else if (item.type === 'armor') {
                const val = (typeof item.val === 'number') ? item.val : 0;
                let armorLine = `${val}`;
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
                const equipped = this.player && this.player.gear && item.slot ? this.player.gear[item.slot] : null;
                if (equipped && typeof equipped.val === 'number') {
                    const diff = val - equipped.val;
                    if (diff !== 0) {
                        const sign = diff > 0 ? '+' : '';
                        const diffCls = diff > 0 ? 'text-green' : 'text-red';
                        armorLine += ` <span class="${diffCls}" style="font-size:0.85rem;">(${sign}${diff})</span>`;
                    }
                }
                lines.push(`<div><span class="text-shield">Armor:</span> ${armorLine}</div>`);
            } else if (item.type === 'trinket') {
                lines.push(`<div><span class="text-blue">Type:</span> ${getDisplayItemType(item)}</div>`);
            } else if (item.type === 'potion') {
                const typeLabel = item.subType === 'armor' ? 'Armor' : 'Health';
                const pct = item.percent || 0;
                lines.push(`<div><span class="text-green">Type:</span> Potion</div>`);
                lines.push(`<div><span class="text-blue">Effect:</span> Restore ${pct}% ${typeLabel}</div>`);
            }
            // Stat buffs / debuffs from statMods
            if (item.statMods) {
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
                    const v = item.statMods[key];
                    if (typeof v === 'number' && v !== 0) {
                        const sign = v > 0 ? '+' : '';
                        const toneClass = v > 0 ? 'text-green' : 'text-red';
                        modLines.push(`<div class="${toneClass}">${sign}${v} ${label}</div>`);
                    }
                });
                if (modLines.length) {
                    lines.push('<div style="margin-top:6px; font-size:0.85rem;">');
                    lines = lines.concat(modLines);
                    lines.push('</div>');
                }
            }
            // Rarity + Level satırı (sağ altta Lvl X)
            lines.push(`
                <div style="margin-top:6px; font-size:0.8rem; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
                    <span>Rarity: ${rarityText}</span>
                    <span class="text-gold" style="font-size:0.95rem;">Lvl ${minLvl}</span>
                </div>
            `);

            // Optional lore/info line from catalog (info + infoColor)
            if (item.info) {
                const infoClass = item.infoColor || 'text-gold';
                lines.push(`<div class="${infoClass}" style="margin-top:4px; font-size:0.8rem; font-style:italic;">${item.info}</div>`);
            }
            previewBody.innerHTML = lines.join('');

            // Handle item type icon (weapon / armor / trinket / potion)
            if (previewIcon) {
                let iconPath = '';
                if (item.type === 'weapon') {
                    iconPath = getWeaponIconPathShared(item);
                } else if (item.type === 'armor') {
                    iconPath = getArmorIconPath(item);
                } else if (item.type === 'trinket') {
                    // All trinkets share the same icon for now
                    iconPath = item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
                } else if (item.type === 'potion') {
                    iconPath = 'assets/images/potion-icons/potion-icon.png';
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
            const activeFilter = this.currentInvFilter || 'all';
            const addEquippedRow = (slot, title) => {
                const equipped = this.player.gear[slot];
                if(!equipped) return;
                if (activeFilter !== 'all' && equipped.type !== activeFilter) return;
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
                const typeLabel = getItemTypeLabel(equipped);
                const badgeMarkup = this.getItemBadgeMarkup(equipped);
                const row = document.createElement('div');
                row.className = 'item-row';
                const iconPath = getItemIconPathShared(equipped);
                row.innerHTML = `
                    <div class="item-main-wrap">
                        <div class="item-card-icon">${iconPath ? `<img src="${iconPath}" alt="">` : ''}</div>
                        <div class="item-main">
                            <div class="item-main-name ${equipped.rarity}">${baseName}${nameSuffix}</div>
                            ${badgeMarkup ? `<div class="item-main-badges">${badgeMarkup}</div>` : ''}
                            <div class="item-main-sub">Equipped in ${title}${isWeapon ? ` • ${equipped.min}-${equipped.max} damage` : equipped.type === 'armor' ? ` • ${equipped.val} armor` : ''}</div>
                        </div>
                    </div>
                    <div><span class="item-chip">${equipped.rarity.replace('rarity-','')}</span></div>
                    <div><span class="item-chip">${getDisplayItemType(equipped)}</span></div>
                    <div class="item-level"><span class="item-chip">Equipped</span></div>
                    <div class="item-price"><span class="item-chip">-</span></div>
                    <div class="item-action"><button class="btn" style="padding:5px 10px; font-size:0.8rem;">Unequip</button></div>`;
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
            TRINKET_SLOTS.forEach(s => addEquippedRow(s, s.charAt(0).toUpperCase()+s.slice(1)));
        }

        // Apply inventory filter when in inventory mode
        let listItems = items;
        if (mode === 'shop' && this.currentTradeMode === 'sell') {
            listItems = this.getFilteredSellItems();
            this.sortShop(listItems);
        }
        if (mode === 'inv' && this.currentInvFilter && this.currentInvFilter !== 'all') {
            listItems = items.filter(it => it.type === this.currentInvFilter);
        }

        if(listItems.length === 0 && cont.children.length === 0) {
            cont.innerHTML = '<div style="text-align:center; padding:20px; color:#555;">Empty</div>';
        }

        listItems.forEach((item, idx) => {
            const div = document.createElement('div'); div.className = 'item-row';
            let diffHtml = '', statDisplay = '';
            
            if(item.type === 'weapon') {
                const current = this.player.gear.weapon;
                const curMax = current ? current.max : 0;
                const diff = item.max - curMax;
                diffHtml = diff > 0 ? `<span class="diff-pos">(+${diff})</span>` : (diff < 0 ? `<span class="diff-neg">(${diff})</span>` : '');
                statDisplay = `Dmg: ${item.min}-${item.max}`;
                if (item.dotAffix) statDisplay += ` • ${Math.round((item.dotAffix.chance || 0) * 100)}% ${item.dotAffix.effect}`;
            } else if (item.type === 'armor') {
                const current = this.player.gear[item.slot];
                const curVal = current ? current.val : 0;
                const diff = item.val - curVal;
                diffHtml = diff > 0 ? `<span class="diff-pos">(+${diff})</span>` : (diff < 0 ? `<span class="diff-neg">(${diff})</span>` : '');
                statDisplay = `Armor: ${item.val}`;
            } else if (item.type === 'trinket') {
                // Trinketlerde düz stat gösterimi yok, tooltipten okunacak
                statDisplay = 'Trinket';
            } else if (item.type === 'potion') {
                const typeLabel = item.subType === 'armor' ? 'Armor' : 'HP';
                statDisplay = `${typeLabel} ${item.percent || 0}%`;
            }

            const cls = item.type === 'weapon' ? (item.weaponClass || '').toLowerCase() : '';
            const baseLower = item.type === 'weapon' ? (item.baseType || '').toLowerCase() : '';
            const isLegendaryWeapon = item.type === 'weapon' && item.rarityKey === 'legendary';
            const minLvl = getItemMinLevel(item);
            const lvlOk = !this.player || (this.player.level >= minLvl);
            let nameHtml;
            if(isLegendaryWeapon) {
                const baseName = cleanLegendaryWeaponName(item);
                nameHtml = `${baseName}`;
            } else {
                nameHtml = `${item.name}`;
            }
            // Potions: show stack count as "Name x N" in inventory, with glowing counter
            if ((mode === 'inv' || (mode === 'shop' && this.currentTradeMode === 'sell')) && item.type === 'potion') {
                const qty = item.qty || 1;
                nameHtml = `${item.name} <span class="potion-stock-count">x ${qty}</span>`;
            }
            let btnTxt;
            if (mode === 'shop') btnTxt = this.currentTradeMode === 'sell' ? 'Sell' : 'Buy';
            else if (item.type === 'potion') btnTxt = 'Equip';
            else btnTxt = 'Equip';
            const tradePrice = mode === 'shop' ? (this.currentTradeMode === 'sell' ? this.getSellPrice(item) : this.getAdjustedBuyPrice(item)) : '-';
            const priceTxt = mode === 'shop' ? `${tradePrice}` : '-';
            let btnState = "";
            if (mode === 'shop') {
                if (this.currentTradeMode === 'buy' && (!lvlOk || this.player.gold < tradePrice)) btnState = "disabled";
            }
            const btnClass = mode === 'shop' ? 'btn btn-buy' : 'btn';

            const typeLabel = getItemTypeLabel(item);

            const lvlColor = lvlOk ? '#ccc' : '#f44336';
            const lvlHtml = `<span style="color:${lvlColor};">${minLvl}</span>`;
            const badgeMarkup = this.getItemBadgeMarkup(item);
            const iconPath = getItemIconPathShared(item);

            div.innerHTML = `
                <div class="item-main-wrap">
                    <div class="item-card-icon">${iconPath ? `<img src="${iconPath}" alt="">` : ''}</div>
                    <div class="item-main">
                        <div class="item-main-name ${item.rarity}">${nameHtml}</div>
                        ${badgeMarkup ? `<div class="item-main-badges">${badgeMarkup}</div>` : ''}
                        <div class="item-main-sub">${statDisplay}${diffHtml}</div>
                    </div>
                </div>
                <div><span class="item-chip">${item.rarity.replace('rarity-','')}</span></div>
                <div><span class="item-chip">${getDisplayItemType(item)}</span></div>
                <div class="item-level"><span class="item-chip" style="color:${lvlColor};">Lvl ${minLvl}</span></div>
                <div class="item-price"><span class="text-gold">${priceTxt}</span></div>
                <div class="item-action"><button class="${btnClass}" style="padding:5px 10px; font-size:0.8rem;" ${btnState}>${btnTxt}</button></div>
            `;

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
                    if (this.currentTradeMode === 'sell') {
                        this.sellItem(item);
                        return;
                    }
                    if(this.player.gold >= tradePrice) {
                        this.player.gold -= tradePrice;
                        // Auto-equip if corresponding slot is empty
                        const p = this.player;
                        let autoEquipped = false;
                        if (item.type === 'weapon' && !p.gear.weapon) {
                            p.equip(item);
                            autoEquipped = true;
                        } else if (item.type === 'armor' && !p.gear[item.slot]) {
                            p.equip(item);
                            autoEquipped = true;
                        } else if (item.type === 'trinket' && !p.gear.trinket1 && !p.gear.trinket2) {
                            p.equip(item);
                            autoEquipped = true;
                        }
                        if (!autoEquipped) {
                            this.player.inventory.push(item);
                        }
                        items.splice(idx, 1);
                        this.renderList(items, mode);
                        $('shop-gold').innerText = this.player.gold;
                        this.updateHubUI();
                    }
                } else {
                    // Inventory actions
                    if (item.type === 'potion') {
                        if (!this.player) return;
                        if (!Array.isArray(this.player.potionSlots)) {
                            this.player.potionSlots = [null, null, null];
                        }
                        const slots = this.player.potionSlots;
                        const freeIndex = slots.findIndex(s => !s);
                        if (freeIndex === -1) {
                            alert('All potion slots are filled.');
                            return;
                        }

                        if (!this.consumePotionFromInventory(item, 1)) {
                            alert('Potion not found in inventory.');
                            this.renderList(this.player.inventory, mode);
                            return;
                        }

                        slots[freeIndex] = {
                            subType: item.subType,
                            percent: item.percent,
                            name: item.name,
                            rarity: item.rarity || 'rarity-common',
                            price: item.price,
                            used: false
                        };

                        this.renderList(this.player.inventory, mode);
                    } else {
                        this.player.equip(item);
                        this.renderList(this.player.inventory, mode);
                        this.updateHubUI();
                    }
                }
            };
            cont.appendChild(div);
        });

        // Inventory-specific: fill external Potion Slots card (bottom-left of screen-list)
        const slotCard = $('inv-potion-slots-card');
        if (slotCard) {
            if (mode !== 'inv') {
                slotCard.classList.add('hidden');
                slotCard.innerHTML = '';
            } else {
                slotCard.classList.remove('hidden');
                slotCard.innerHTML = '';

                const title = document.createElement('div');
                title.textContent = 'Potion Slots';
                title.className = 'potion-card-title';
                slotCard.appendChild(title);

                const slotsArr = (this.player && Array.isArray(this.player.potionSlots)) ? this.player.potionSlots : [null, null, null];
                const makeSlotRow = (idx) => {
                    const row = document.createElement('div');
                    row.className = 'potion-card-row';

                    const info = document.createElement('div');
                    const slot = slotsArr[idx] || null;
                    let label = `Slot ${idx+1}`;
                    let detail = '';
                    if (!slot) {
                        detail = 'Empty';
                    } else {
                        const typeLabel = slot.subType === 'armor' ? 'Armor' : 'HP';
                        detail = `${typeLabel} ${slot.percent || 0}%`;
                    }
                    info.innerHTML = `<div class="potion-card-slot-label">${label}</div><div class="potion-card-slot-detail">${detail}</div>`;
                    row.appendChild(info);

                    const btn = document.createElement('button');
                    btn.className = 'btn btn-xs';
                    btn.textContent = 'Clear';
                    if (!slot) {
                        btn.disabled = true;
                    } else {
                        btn.onclick = () => {
                            if (!this.player || !Array.isArray(this.player.potionSlots)) return;
                            game.addPotionToInventory(slot, 1);
                            this.player.potionSlots[idx] = null;
                            this.renderList(this.player.inventory, 'inv');
                        };
                    }
                    row.appendChild(btn);

                    // Tooltip for potion slots using the global preview box
                    if (slot && previewBox && previewBody) {
                        row.onmouseenter = (ev) => {
                            const fakeItem = {
                                type: 'potion',
                                rarity: 'rarity-common',
                                name: slot.name || detail,
                                subType: slot.subType,
                                percent: slot.percent || 0
                            };
                            buildPreviewFromItem(fakeItem);
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
                    return row;
                };

                slotCard.appendChild(makeSlotRow(0));
                slotCard.appendChild(makeSlotRow(1));
                slotCard.appendChild(makeSlotRow(2));
            }
        }
    },
    openStatsHelp() {
        this.ensurePreviewHelpers();
        if (this.player) {
            const p = this.player;
            const identity = p.getClassWeaponIdentity();
            const effStr = p.getEffectiveStr();
            const effAtk = p.getEffectiveAtk();
            const effVit = p.getEffectiveVit();
            const effDef = p.getEffectiveDef();
            const effMag = p.getEffectiveMag();
            const effChr = p.getEffectiveChr();
            const values = $('modal-stats-values');
            const combat = $('modal-stats-combat');
            const summary = $('modal-stats-summary');
            const dmg = p.getDmgRange();
            const hp = p.getMaxHp();
            const armor = p.getTotalArmor();
            const regen = p.getRegen();
            const gearStr = p.getGearStatBonus('str');
            const gearAtk = p.getGearStatBonus('atk');
            const gearDef = p.getGearStatBonus('def');
            const gearVit = p.getGearStatBonus('vit');
            const gearMag = p.getGearStatBonus('mag');
            const gearChr = p.getGearStatBonus('chr');
            const guardianVitPassive = p.class === 'Guardian' ? Math.floor((p.stats.vit + gearVit) / 3) : 0;
            const warriorAtkPassive = p.class === 'Warrior' ? Math.floor((p.stats.atk + gearAtk) / 3) : 0;
            const berserkerStrPassive = p.class === 'Beserker' ? Math.floor((p.stats.str + gearStr) / 3) : 0;
            const skillAtk = p.getSkillEffect('atkFlat') + p.getConditionalSkillEffect('atkWhile') + (identity.atk || 0);
            const skillDef = p.getConditionalSkillEffect('defWhile') + (identity.def || 0);
            const skillHit = p.getSkillEffect('hitChance') + p.getConditionalSkillEffect('hitWhile') + (identity.hit || 0);
            const skillCrit = p.getSkillEffect('critChance') + p.getConditionalSkillEffect('critWhile') + (identity.crit || 0);
            const skillHp = p.getSkillEffect('hpFlat');
            const skillRegen = p.getSkillEffect('regenFlat');
            const injuryAtk = p.getInjuryPenalty('atkFlatPenalty');
            const injuryDef = p.getInjuryPenalty('defFlatPenalty');
            const injuryHit = p.getInjuryPenalty('hitChancePenalty');
            const injuryCrit = p.getInjuryPenalty('critChancePenalty');
            const injuryHp = p.getInjuryPenalty('hpFlatPenalty');
            const injuryRegen = p.getInjuryPenalty('regenPenalty');
            const weapon = p.gear.weapon;
            const weaponMin = weapon ? weapon.min : 2;
            const weaponMax = weapon ? weapon.max : 4;
            const strDamageBonus = effStr * 2;
            const rawArmor = ARMOR_SLOTS.reduce((sum, slot) => sum + ((p.gear[slot] && p.gear[slot].val) || 0), 0);
            const armorMultiplier = p.getArmorMultiplier();
            const hpMultiplier = p.getHpMultiplier();
            const row = (label, value, cls, base) => {
                const bonus = typeof base === 'number' ? value - base : 0;
                const bonusText = bonus > 0 ? ` <small>(base ${base} +${bonus})</small>` : '';
                return `<div class="stat-row"><span>${label}</span><span class="${cls}">${value}${bonusText}</span></div>`;
            };
            const hoverRow = (id, label, value, cls, base) => {
                const bonus = typeof base === 'number' ? value - base : 0;
                const bonusText = bonus > 0 ? ` <small>(base ${base} +${bonus})</small>` : '';
                return `<div id="${id}" class="stat-row stat-hover-row"><span>${label}</span><span class="${cls}">${value}${bonusText}</span></div>`;
            };
            if (values) {
                values.innerHTML = [
                    hoverRow('stat-core-str', 'Strength', effStr, 'text-orange', p.stats.str),
                    hoverRow('stat-core-atk', 'Attack', effAtk, 'text-red', p.stats.atk),
                    hoverRow('stat-core-def', 'Defence', effDef, 'text-blue', p.stats.def),
                    hoverRow('stat-core-vit', 'Vitality', effVit, 'text-green', p.stats.vit),
                    hoverRow('stat-core-mag', 'Magicka', effMag, 'text-purple', p.stats.mag),
                    hoverRow('stat-core-chr', 'Charisma', effChr, 'text-gold', p.stats.chr ?? 0)
                ].join('');
            }
            if (combat) {
                combat.innerHTML = `
                    <div id="stat-combat-hp" class="stat-row stat-hover-row"><span>Health</span><span class="text-red">${hp}</span></div>
                    <div id="stat-combat-armor" class="stat-row stat-hover-row"><span>Armor</span><span class="text-shield">${armor}</span></div>
                    <div id="stat-combat-dmg" class="stat-row stat-hover-row"><span>Melee Damage</span><span class="text-orange">${dmg.min}-${dmg.max}</span></div>
                    <div id="stat-combat-regen" class="stat-row stat-hover-row"><span>Regen / Turn</span><span class="text-green">${regen}</span></div>
                    ${identity.label ? `<div class="stat-row"><span>Build Identity</span><span class="text-gold">${identity.label}</span></div>` : ''}
                    <div class="hub-stats-divider"></div><h3 class="hub-stats-title">Health Status</h3>${Array.isArray(p.injuries) && p.injuries.length ? p.injuries.map(injury => `<div class="stat-row"><span>${injury.name}</span><span class="text-red">${injury.remainingFights} fights</span></div><div style="color:#a8a8b0; font-size:0.84rem; margin:-2px 0 8px 0;">${injury.summary}</div>`).join('') : `<div style="color:#9ed3ff; font-size:0.92rem;">Stable</div><div style="color:#a8a8b0; font-size:0.84rem; margin-top:4px;">No lingering injuries.</div>`}
                `;
            }
            if (summary) {
                summary.innerHTML = `${p.name}<br><span>Level ${p.level} - ${p.xp || 0} / ${p.xpMax || 100} XP</span>`;
            }

            const previewBox = $('shop-preview');
            const previewBody = $('shop-preview-body');
            const previewIcon = $('shop-preview-icon');
            const movePreview = this._moveItemPreview;
            const hoverMap = {
                'stat-core-str': `<div class="shop-preview-title">Strength Breakdown</div><div>Base: <span class="text-orange">${p.stats.str}</span></div><div>Gear Bonus: <span class="text-orange">${gearStr >= 0 ? '+' : ''}${gearStr}</span></div><div>Class Passive: <span class="text-orange">${berserkerStrPassive >= 0 ? '+' : ''}${berserkerStrPassive}</span></div><div style="margin-top:6px; color:#aaa;">Every point contributes <span class="text-orange">+2</span> melee damage.</div>`,
                'stat-core-atk': `<div class="shop-preview-title">Attack Breakdown</div><div>Base: <span class="text-red">${p.stats.atk}</span></div><div>Gear Bonus: <span class="text-red">${gearAtk >= 0 ? '+' : ''}${gearAtk}</span></div><div>Class Passive: <span class="text-red">${warriorAtkPassive >= 0 ? '+' : ''}${warriorAtkPassive}</span></div><div>Skill / Identity Bonus: <span class="text-red">${skillAtk >= 0 ? '+' : ''}${skillAtk}</span></div><div>Injury Penalty: <span class="text-red">-${injuryAtk}</span></div><div style="margin-top:6px; color:#aaa;">Raises hit chance and crit chance in combat.</div>`,
                'stat-core-def': `<div class="shop-preview-title">Defence Breakdown</div><div>Base: <span class="text-blue">${p.stats.def}</span></div><div>Gear Bonus: <span class="text-blue">${gearDef >= 0 ? '+' : ''}${gearDef}</span></div><div>Skill / Identity Bonus: <span class="text-blue">${skillDef >= 0 ? '+' : ''}${skillDef}</span></div><div>Injury Penalty: <span class="text-red">-${injuryDef}</span></div><div style="margin-top:6px; color:#aaa;">Reduces enemy hit chance against you.</div>`,
                'stat-core-vit': `<div class="shop-preview-title">Vitality Breakdown</div><div>Base: <span class="text-green">${p.stats.vit}</span></div><div>Gear Bonus: <span class="text-green">${gearVit >= 0 ? '+' : ''}${gearVit}</span></div><div>Class Passive: <span class="text-green">${guardianVitPassive >= 0 ? '+' : ''}${guardianVitPassive}</span></div><div style="margin-top:6px; color:#aaa;">Drives max health and regeneration.</div>`,
                'stat-core-mag': `<div class="shop-preview-title">Magicka Breakdown</div><div>Base: <span class="text-purple">${p.stats.mag}</span></div><div>Gear Bonus: <span class="text-purple">${gearMag >= 0 ? '+' : ''}${gearMag}</span></div><div style="margin-top:6px; color:#aaa;">Reserved for future spells and special systems.</div>`,
                'stat-core-chr': `<div class="shop-preview-title">Charisma Breakdown</div><div>Base: <span class="text-gold">${p.stats.chr ?? 0}</span></div><div>Gear Bonus: <span class="text-gold">${gearChr >= 0 ? '+' : ''}${gearChr}</span></div><div style="margin-top:6px; color:#aaa;">Improves economy and combat rewards.</div>`,
                'stat-combat-hp': `<div class="shop-preview-title">Health Formula</div><div>Base Health Seed: <span class="text-red">12</span></div><div>Vitality Contribution: <span class="text-red">${Math.max(0, effVit - 1)} x 4 = ${Math.max(0, effVit - 1) * 4}</span></div><div>Level Contribution: <span class="text-red">${Math.max(0, (p.level || 1) - 1)} x 6 = ${Math.max(0, (p.level || 1) - 1) * 6}</span></div><div>Class Multiplier: <span class="text-red">x${hpMultiplier.toFixed(2)}</span></div><div>Skill Bonus: <span class="text-red">+${skillHp}</span></div><div>Injury Penalty: <span class="text-red">-${injuryHp}</span></div><div>Final 3x Scaling: <span class="text-red">${hp}</span></div>`,
                'stat-combat-armor': `<div class="shop-preview-title">Armor Breakdown</div><div>Equipped Piece Total: <span class="text-shield">${rawArmor}</span></div><div>Class / Skill Multiplier: <span class="text-shield">x${armorMultiplier.toFixed(2)}</span></div><div>Injury Penalty: <span class="text-red">-${Math.round(p.getInjuryPenalty('armorMultPenalty') * 100)}%</span></div><div style="margin-top:6px;">Final Armor: <span class="text-shield">${armor}</span></div>`,
                'stat-combat-dmg': `<div class="shop-preview-title">Melee Damage Breakdown</div><div>Weapon Base: <span class="text-orange">${weaponMin}-${weaponMax}</span>${weapon ? ` <span style="color:#aaa;">(${weapon.name})</span>` : ' <span style="color:#aaa;">(unarmed)</span>'}</div><div>Strength Bonus: <span class="text-orange">+${strDamageBonus}</span> to min and max</div><div>Skill / Identity Multiplier: <span class="text-orange">x${(1 + p.getConditionalSkillEffect('weaponDamageMult') + (identity.dmgMult || 0)).toFixed(2)}</span></div><div style="margin-top:6px;">Final Damage: <span class="text-orange">${dmg.min}-${dmg.max}</span></div>`,
                'stat-combat-regen': `<div class="shop-preview-title">Regeneration Formula</div><div>Effective Vitality: <span class="text-green">${effVit}</span></div><div>Formula: <span class="text-green">floor(VIT / 2)</span></div><div>Skill Bonus: <span class="text-green">+${skillRegen}</span></div><div>Injury Penalty: <span class="text-red">-${injuryRegen}</span></div><div>Hit Bonus Total: <span class="text-green">+${skillHit}</span></div><div>Crit Bonus Total: <span class="text-green">+${skillCrit}</span></div><div style="margin-top:6px;">Regen Per Turn: <span class="text-green">${regen}</span></div>`
            };
            if (previewBox && previewBody && typeof movePreview === 'function') {
                Object.keys(hoverMap).forEach(id => {
                    const el = $(id);
                    if (!el) return;
                    el.onmouseenter = (ev) => {
                        previewBody.innerHTML = hoverMap[id];
                        if (previewIcon) {
                            previewIcon.src = '';
                            previewIcon.classList.add('hidden');
                        }
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
                });
            }
        }
        const m = $('modal-stats');
        if (!m) return;
        m.classList.remove('hidden');
        if (typeof wireButtonSfx === 'function') wireButtonSfx(m);
    },
    closeStatsHelp() {
        const m = $('modal-stats');
        if (m) m.classList.add('hidden');
    },
    openArmorPanel() {
        if (!this.player) return;
        this.ensurePreviewHelpers();
        const m = $('modal-armor');
        if (!m) return;
        m.classList.remove('hidden');
        const listEl = $('armor-list');
        const summaryEl = $('armor-summary');
        const totalEl = $('armor-total');
        const previewBox = $('shop-preview');
        const buildPreviewFromItem = this._buildItemPreview;
        const movePreview = this._moveItemPreview;
        if (!listEl) return;
        const p = this.player;
        let equippedCount = 0;
        let totalArmor = 0;
        const rows = [];
        const armorIcons = {
            head: 'assets/images/armor-icons/head_icon.png',
            neck: 'assets/images/armor-icons/neck_icon.png',
            shoulders: 'assets/images/armor-icons/shoulder_icon.png',
            chest: 'assets/images/armor-icons/chest_icon.png',
            arms: 'assets/images/armor-icons/arms_icon.png',
            shield: 'assets/images/armor-icons/shield_icon.png',
            thighs: 'assets/images/armor-icons/thighs_icon.png',
            shins: 'assets/images/armor-icons/shins_icon.png'
        };
        ARMOR_SLOTS.forEach(slot => {
            const item = p.gear[slot];
            const label = slot.charAt(0).toUpperCase() + slot.slice(1);
            const icon = armorIcons[slot] || '';
            if (item) {
                const val = (typeof item.val === 'number') ? item.val : 0;
                if (val > 0) totalArmor += val;
                equippedCount++;
                const valText = val ? `<span class="armor-piece-value">+${val}</span>` : '';
                rows.push(`
                    <div class="armor-row armor-row-filled">
                        <div class="armor-slot-cell">
                            <span class="armor-slot-icon-wrap">${icon ? `<img class="armor-slot-icon" src="${icon}" alt="${label}" />` : ''}</span>
                            <span class="armor-slot-name">${label}</span>
                        </div>
                        <div class="armor-piece-cell">
                            <span>
                                <span class="${item.rarity} armor-panel-item" data-armor-slot="${slot}">${item.name}</span>
                                ${valText}
                            </span>
                        </div>
                    </div>
                `);
            } else {
                rows.push(`
                    <div class="armor-row armor-row-empty">
                        <div class="armor-slot-cell">
                            <span class="armor-slot-icon-wrap">${icon ? `<img class="armor-slot-icon armor-slot-icon-empty" src="${icon}" alt="${label}" />` : ''}</span>
                            <span class="armor-slot-name">${label}</span>
                        </div>
                        <div class="armor-piece-cell">
                            <span class="armor-empty-pill">Empty</span>
                        </div>
                    </div>
                `);
            }
        });
        listEl.innerHTML = rows.join('');
        if (previewBox && typeof buildPreviewFromItem === 'function' && typeof movePreview === 'function') {
            ARMOR_SLOTS.forEach(slot => {
                const item = p.gear[slot];
                const el = listEl.querySelector(`[data-armor-slot="${slot}"]`);
                if (!item || !el) return;
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
            });
        }
        if (summaryEl) {
            summaryEl.innerText = `Equipped armor pieces: ${equippedCount}/${ARMOR_SLOTS.length}`;
        }
        if (totalEl) {
            totalEl.innerText = totalArmor;
        }
        if (typeof wireButtonSfx === 'function') wireButtonSfx(m);
    },
    closeArmorPanel() {
        const m = $('modal-armor');
        if (m) m.classList.add('hidden');
    },
    triggerLevelUp() { this.player.pts = 3; this.tempStats = {...this.player.stats}; $('modal-levelup').classList.remove('hidden'); this.renderLvlUI(); },
    renderLvlUI() { 
        const c = $('stat-allocator'); c.innerHTML=''; 
        const labels = {
            str: 'Strength',
            atk: 'Attack',
            def: 'Defence',
            vit: 'Vitality',
            mag: 'Magicka',
            chr: 'Charisma'
        };
        const effects = {
            str: ['+ Weapon Damage', '+ Melee Scaling'],
            atk: ['+ Hit Chance', '+ Crit Chance'],
            def: ['- Enemy Accuracy', '+ Survivability'],
            vit: ['+ Max Health', '+ Regen / Turn'],
            mag: ['+ Future Magic Power', '+ Ability Scaling'],
            chr: ['+ Gold Rewards', '+ XP Rewards']
        };
        const valueClasses = {
            str: 'text-orange',
            atk: 'text-red',
            def: 'text-blue',
            vit: 'text-green',
            mag: 'text-purple',
            chr: 'text-gold'
        };
        ['str','atk','def','vit','mag','chr'].forEach(k=>{ 
            const d=document.createElement('div');
            d.className = 'levelup-stat-row';
            const canDown = this.tempStats[k] > this.player.stats[k];
            const canUp = this.player.pts > 0;
            d.innerHTML = `
                <div class="levelup-stat-meta">
                    <div class="levelup-stat-code">${k.toUpperCase()}</div>
                    <div class="levelup-stat-label">${labels[k]}</div>
                </div>
                <div class="levelup-stat-effects">
                    <div>${effects[k][0]}</div>
                    <div>${effects[k][1]}</div>
                </div>
                <div class="levelup-stat-controls">
                    <button class="btn levelup-step-btn" ${canDown ? '' : 'disabled'} onclick="game.modStat('${k}',-1)">-</button>
                    <div class="levelup-stat-value ${valueClasses[k]}">${this.tempStats[k]}</div>
                    <button class="btn levelup-step-btn" ${canUp ? '' : 'disabled'} onclick="game.modStat('${k}',1)">+</button>
                </div>
            `;
            c.appendChild(d);
        }); 
        $('lvl-pts').innerText = this.player.pts; 
        const skillPts = $('lvl-skill-pts'); if (skillPts) skillPts.innerText = this.player.skillPoints || 0;
        const btn=$('btn-lvl-confirm');
        btn.disabled = (this.player.pts !== 0);
    },
    modStat(k,v) { if(v>0 && this.player.pts>0){this.tempStats[k]++; this.player.pts--;} else if(v<0 && this.tempStats[k]>this.player.stats[k]){this.tempStats[k]--; this.player.pts++;} this.renderLvlUI(); },
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
        const TOOLTIPS = {
            str: 'Improves weapon damage and melee scaling.',
            atk: 'Improves hit chance and critical strike chance.',
            def: 'Reduces enemy accuracy against you.',
            vit: 'Raises max health and regen per turn.',
            mag: 'Reserved for future magic and ability systems.',
            chr: 'Improves gold and XP rewards.'
        };
        ['str','atk','def','vit','mag','chr'].forEach(k => {
            const d = document.createElement('div');
            d.style.display = 'flex';
            d.style.justifyContent = 'space-between';
            d.style.alignItems = 'center';
            d.style.marginBottom = '4px';
            const label = LABELS[k] || k.toUpperCase();
            d.innerHTML = `
                <span class="creation-stat-label" data-tooltip="${TOOLTIPS[k] || ''}" style="font-size:0.9rem; flex:1; text-align:left;">${label}</span>
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
            btn.style.background = (this.player.pts === 0) ? '#6d0122' : '#222';
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
        const chosenName = ($('inp-name')?.value || '').trim();
        if (chosenName) this.player.name = chosenName;
        this.player.stats = { ...this.tempCreateStats };
        this.player.pts = 0;
        this.generateShopStock();
        game.showHub();
        this.saveGame();
    },
    closeVictory() {
        $('modal-victory').classList.add('hidden');
        $('vic-xp-bar').style.width='0%';

        // Level-up check happens first, regardless of tournament state
        if ((this.player.level || 1) < 100 && this.player.xp >= this.player.xpMax) {
            this.player.xp -= this.player.xpMax;
            this.player.xpMax = Math.floor(this.player.xpMax * 1.5);
            this.player.level = Math.min(100, (this.player.level || 1) + 1);
            this.player.skillPoints = (this.player.skillPoints || 0) + 1;
            // If in a tournament, resume it after the upgrade screen instead of going to hub
            this._levelUpReturnToTournament = !!(this.currentTournament);
            this.triggerLevelUp();
            return;
        }

        if ((this.player.level || 1) >= 100) this.player.xp = Math.min(this.player.xp, this.player.xpMax);
        this._advanceTournamentOrHub();
    },
    _advanceTournamentOrHub() {
        if (this.currentTournament && this.currentTournament.index < this.currentTournament.rounds.length - 1) {
            this.currentTournament.index += 1;
            this.prepareEncounter(this.currentTournament.rounds[this.currentTournament.index]);
        } else {
            this.showHub();
        }
    },
    confirmLevelUp() {
        this.player.stats = { ...this.tempStats };
        $('modal-levelup').classList.add('hidden');
        this.player.level = Math.min(100, this.player.level || 1);
        this.saveGame();
        if (this._levelUpReturnToTournament) {
            this._levelUpReturnToTournament = false;
            this._advanceTournamentOrHub();
        } else {
            this.showHub();
        }
        // Auto-open skill tree if player has unspent skill points
        if ((this.player.skillPoints || 0) > 0) {
            this.openSkillTree();
        }
    },
};

game.handlePlayerDeath = function() {
    if (!this.player) return;
    // Aynı ölüm sekansında birden fazla tetiklenmesini engelle
    if (this._deathInProgress) return;
    this._deathInProgress = true;
    if (window.combat) {
        this.resolveFightInjuries({
            mode: combat.mode,
            context: combat.context,
            playerHpDamageTaken: combat.playerHpDamageTaken,
            criticalHitsTaken: combat.criticalHitsTaken,
            lastEnemyName: combat.lastEnemyName,
            defeat: true
        });
    }

    const before = this.player.gold || 0;
    const lost = Math.floor(before * 0.4);
    this.player.gold = Math.max(0, before - lost);
    const lostEl = $('death-gold-lost');
    const remEl = $('death-gold-remaining');
    if (lostEl) lostEl.innerText = lost;
    if (remEl) remEl.innerText = this.player.gold;

    // Player avatar üzerindeki death cross animasyonunu tetikle
    const cross = $('player-death-cross');
    if (cross) {
        cross.classList.remove('player-death-cross-anim');
        void cross.offsetWidth;
        cross.classList.add('player-death-cross-anim');
    }

    // Ölümde de kullanılmayan combat potlarını envantere iade et
    if (window.combat && typeof combat.returnUnusedPotions === 'function') {
        combat.returnUnusedPotions();
    }
    this.currentEncounter = null;
    this.currentTournament = null;

    // Death ekranını X efektinden ~2.5sn sonra göster
    setTimeout(() => {
        const m = $('modal-death');
        if (m) m.classList.remove('hidden');
        // Death also counts as a fight for shop refresh logic
        this.shopFightCount = (this.shopFightCount || 0) + 1;
        this.updateShopRefreshIndicator();
        this.saveGame();
    }, 1000);
};

game.handleDeathContinue = function() {
    const m = $('modal-death');
    if (m) m.classList.add('hidden');
    this._deathInProgress = false;
    this.currentEncounter = null;
    this.currentTournament = null;
    this.showHub();
};

game.initSaves();

// expose main objects to global scope for inline HTML handlers
window.game = game;
window.combat = combat;
window.blackjack = blackjack;
