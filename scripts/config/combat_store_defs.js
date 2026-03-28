// Combat Store item definitions
// type: 'consumable' — cure items
// type: 'bag_upgrade' — permanent bag slot expansions

const COMBAT_STORE_DEFS = [
    { key: 'bandage',          type: 'consumable',  subType: 'cure_bleed',  name: 'Bandage',         icon: '🩹', desc: 'Removes the Bleed effect.',   price: 20,   rarity: 'rarity-common' },
    { key: 'antivenom',        type: 'consumable',  subType: 'cure_poison', name: 'Antivenom',        icon: '☠', desc: 'Removes the Poison effect.',  price: 20,   rarity: 'rarity-common' },
    { key: 'antifire_blanket', type: 'consumable',  subType: 'cure_burn',   name: 'Antifire Blanket', icon: '🧯', desc: 'Removes the Burn effect.',    price: 25,   rarity: 'rarity-common' },
];

const BAG_UPGRADE_TIERS = [
    { toSlots: 10, price: 150,  label: 'Bag Upgrade I',   desc: 'Expand bag to 10 slots.' },
    { toSlots: 12, price: 280,  label: 'Bag Upgrade II',  desc: 'Expand bag to 12 slots.' },
    { toSlots: 14, price: 450,  label: 'Bag Upgrade III', desc: 'Expand bag to 14 slots.' },
    { toSlots: 16, price: 680,  label: 'Bag Upgrade IV',  desc: 'Expand bag to 16 slots.' },
    { toSlots: 18, price: 980,  label: 'Bag Upgrade V',   desc: 'Expand bag to 18 slots.' },
    { toSlots: 20, price: 1400, label: 'Bag Upgrade VI',  desc: 'Expand bag to 20 slots. Maximum capacity.' },
];
