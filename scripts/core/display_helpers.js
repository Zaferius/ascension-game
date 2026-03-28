const STATUS_TOAST_COLORS = {
    poison: '#76ff03',
    burn: '#ff9100',
    bleed: '#ff5252'
};

const getDisplayWeaponFamily = (item) => {
    if (typeof formatWeaponFamily === 'function') return formatWeaponFamily(item);
    const raw = typeof item === 'string' ? item : (item?.weaponClass || item?.baseType || 'Sword');
    return String(raw);
};

const getDisplayItemType = (item) => {
    if (!item) return '';
    if (item.type === 'weapon') return getDisplayWeaponFamily(item);
    if (item.type === 'armor') return item.slot ? item.slot.charAt(0).toUpperCase() + item.slot.slice(1) : 'Armor';
    if (item.type === 'trinket') return item.baseType || 'Trinket';
    if (item.type === 'potion') return 'Potion';
    return item.baseType || item.weaponClass || '';
};

const getWeaponIconPathShared = (item) => {
    if (!item || item.type !== 'weapon') return '';
    const cls = (item.weaponClass || '').toLowerCase();
    const baseLower = (item.baseType || '').toLowerCase();
    if (cls === 'axe' || baseLower.includes('axe')) return 'assets/weapon-icons/axe_icon.png';
    if (cls === 'sword' || baseLower.includes('blade') || baseLower.includes('sword')) return 'assets/weapon-icons/sword_icon.png';
    if (cls === 'hammer' || baseLower.includes('hammer') || baseLower.includes('mace')) return 'assets/weapon-icons/hammer_icon.png';
    if (cls === 'dagger' || baseLower.includes('dagger')) return 'assets/weapon-icons/dagger_icon.png';
    if (cls === 'spear' || baseLower.includes('spear') || baseLower.includes('halberd')) return 'assets/weapon-icons/spear_icon.png';
    if (cls === 'bow' || cls === 'crossbow' || baseLower.includes('bow') || baseLower.includes('crossbow') || baseLower.includes('arbalest')) return 'assets/weapon-icons/crossbow_icon.png';
    return '';
};

const getArmorIconPathShared = (item) => {
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

const getItemIconPathShared = (item) => {
    if (!item) return '';
    if (item.type === 'weapon') return getWeaponIconPathShared(item);
    if (item.type === 'armor') return getArmorIconPathShared(item);
    if (item.type === 'trinket') return item.iconPath || 'assets/images/trinket-icons/trinket2-icon.png';
    if (item.type === 'potion') return 'assets/images/potion-icons/potion-icon.png';
    if (item.type === 'consumable') return null; // emoji icon — handled by caller
    return '';
};
