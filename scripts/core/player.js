// Player class — character state, stats, equipment, and progression
// Depends on: ARMOR_SLOTS, TRINKET_SLOTS, AVATARS, BASE_STATS (constants.js)
//             SKILL_TREE, normalizeWeaponFamily (skill_tree.js)

class Player {
    constructor(name, cls, avatarIdx) {
        this.name = name; this.class = cls; this.avatar = AVATARS[avatarIdx];
        this.level = 1; this.xp = 0; this.xpMax = 100; this.gold = 100;
        this.stats = { ...BASE_STATS[cls] };
        this.inventory = [];
        this.gear = { weapon: null };
        ARMOR_SLOTS.forEach(s => this.gear[s] = null);
        TRINKET_SLOTS.forEach(s => this.gear[s] = null);
        this.wins = 0; this.pts = 0;
        this.skillPoints = 0;
        this.skills = {};
        this.tournamentsCompleted = 0;
        this.dungeonsCompleted = 0;
        this.deepestDungeonDepth = 0;
        this.injuries = [];
        this.bagCapacity = 8;
        this.bagSlots = new Array(8).fill(null);
    }

    // --- Skill helpers ---
    getSkillRank(id) {
        return (this.skills && this.skills[id]) || 0;
    }
    getSkillEffect(key) {
        return SKILL_TREE.reduce((sum, node) => {
            const rank = this.getSkillRank(node.id);
            if (!rank || !node.effects || typeof node.effects[key] !== 'number') return sum;
            return sum + node.effects[key] * rank;
        }, 0);
    }

    // --- Weapon / class identity ---
    getWeaponFamily() {
        return normalizeWeaponFamily(this.gear.weapon);
    }
    getClassWeaponIdentity() {
        const family = this.getWeaponFamily();
        const cls = this.class;
        if (cls === 'Warrior'  && family === 'sword')    return { label: 'Sword Duelist',      dmgMult: 0.08, dodge: 4, hit: 4, def: 2 };
        if (cls === 'Warrior'  && family === 'crossbow') return { label: 'Crossbow Precision',  dmgMult: 0.08, hit: 10, crit: 4 };
        if (cls === 'Beserker' && family === 'axe')      return { label: 'Axe Berserker',       dmgMult: 0.12, crit: 8, dotChance_bleed: 0.08 };
        if (cls === 'Beserker' && family === 'dagger')   return { label: 'Dagger Venom',        dmgMult: 0.08, dodge: 6, dotChance_poison: 0.08 };
        if (cls === 'Guardian' && family === 'spear')    return { label: 'Spear Controller',    dmgMult: 0.08, def: 8, hit: 6, armorShred: 0.08 };
        return { label: '', dmgMult: 0, dodge: 0, hit: 0, crit: 0, def: 0, armorShred: 0, dotChance_bleed: 0, dotChance_poison: 0, dotChance_burn: 0 };
    }
    getConditionalSkillEffect(prefix) {
        return this.getSkillEffect(`${prefix}_${this.getWeaponFamily()}`);
    }

    // --- Combat/reward multipliers ---
    getAfflictedDamageMult()   { return this.getSkillEffect('afflictedDamageMult'); }
    getRewardMultiplierBonus() { return this.getSkillEffect('rewardMult'); }
    getSellMultiplierBonus()   { return this.getSkillEffect('sellMult'); }

    // --- Injury / gear bonuses ---
    getInjuryPenalty(key) {
        if (!Array.isArray(this.injuries)) return 0;
        return this.injuries.reduce((sum, injury) => sum + ((injury.effects && typeof injury.effects[key] === 'number') ? injury.effects[key] : 0), 0);
    }
    getGearStatBonus(key) {
        let bonus = 0;
        if (!this.gear) return 0;
        Object.keys(this.gear).forEach(slot => {
            const item = this.gear[slot];
            if (!item || !item.statMods) return;
            const val = item.statMods[key];
            if (typeof val === 'number') bonus += val;
        });
        return bonus;
    }

    // --- Effective stats ---
    getEffectiveStr() {
        let s = this.stats.str + this.getGearStatBonus('str');
        if (this.class === 'Beserker') s += Math.floor(s / 3);
        return s;
    }
    getEffectiveAtk() {
        let a = this.stats.atk + this.getGearStatBonus('atk');
        if (this.class === 'Warrior') a += Math.floor(a / 3);
        a += this.getSkillEffect('atkFlat');
        a += this.getConditionalSkillEffect('atkWhile');
        a -= this.getInjuryPenalty('atkFlatPenalty');
        return Math.max(1, a);
    }
    getEffectiveVit() {
        let v = this.stats.vit + this.getGearStatBonus('vit');
        if (this.class === 'Guardian') v += Math.floor(v / 3);
        return v;
    }
    getEffectiveDef() {
        return Math.max(0, this.stats.def + this.getGearStatBonus('def') + this.getConditionalSkillEffect('defWhile') + (this.getClassWeaponIdentity().def || 0) - this.getInjuryPenalty('defFlatPenalty'));
    }
    getEffectiveMag() {
        return this.stats.mag + this.getGearStatBonus('mag');
    }
    getEffectiveChr() {
        return (this.stats.chr ?? 0) + this.getGearStatBonus('chr');
    }
    getShopEffectiveChr() {
        return this.getEffectiveChr() + this.getSkillEffect('shopChr');
    }

    // --- Derived combat stats ---
    getHpMultiplier()    { return (this.class === 'Guardian') ? 1.2 : 1.0; }
    getArmorMultiplier() { return Math.max(0.4, ((this.class === 'Guardian') ? 1.05 : 1.0) + this.getSkillEffect('armorMult') - this.getInjuryPenalty('armorMultPenalty')); }
    getDodgeBonus()      { return Math.max(0, ((this.class === 'Warrior') ? 8 : 0) + this.getConditionalSkillEffect('dodgeWhile') + (this.getClassWeaponIdentity().dodge || 0) - this.getInjuryPenalty('dodgePenalty')); }
    getHitBonus()        { return this.getSkillEffect('hitChance') + this.getConditionalSkillEffect('hitWhile') + (this.getClassWeaponIdentity().hit || 0) - this.getInjuryPenalty('hitChancePenalty'); }
    getCritBonus()       { return ((this.class === 'Beserker') ? 10 : 0) + this.getSkillEffect('critChance') + this.getConditionalSkillEffect('critWhile') + (this.getClassWeaponIdentity().crit || 0) - this.getInjuryPenalty('critChancePenalty'); }

    getMaxHp() {
        const vit = this.getEffectiveVit();
        const lvl = this.level || 1;
        const base = 2 + vit * 4 + (lvl - 1) * 6;
        const hp = Math.floor(base * this.getHpMultiplier());
        return Math.max(6, hp + this.getSkillEffect('hpFlat') - this.getInjuryPenalty('hpFlatPenalty'));
    }
    getRegen() {
        return Math.max(0, Math.floor(this.getEffectiveVit() / 2) + this.getSkillEffect('regenFlat') - this.getInjuryPenalty('regenPenalty'));
    }
    getTotalArmor() {
        let total = 0;
        ARMOR_SLOTS.forEach(s => { if(this.gear[s]) total += this.gear[s].val; });
        return Math.floor(total * this.getArmorMultiplier());
    }
    getDmgRange() {
        const w = this.gear.weapon;
        const strBonus = this.getEffectiveStr() * 2;
        const familyMult = 1 + this.getConditionalSkillEffect('weaponDamageMult') + (this.getClassWeaponIdentity().dmgMult || 0);
        if(w) return { min: Math.max(1, Math.floor((w.min + strBonus) * familyMult)), max: Math.max(1, Math.floor((w.max + strBonus) * familyMult)) };
        return { min: 2 + strBonus, max: 4 + strBonus };
    }

    // --- Equipment ---
    equip(item) {
        let slot;
        if (item.type === 'weapon') {
            slot = 'weapon';
        } else if (item.type === 'armor') {
            slot = item.slot;
        } else if (item.type === 'trinket') {
            const empty = TRINKET_SLOTS.find(s => !this.gear[s]);
            slot = empty || 'trinket1';
        } else {
            return;
        }
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
