// Fixed potion definitions used by the potion shop (prices scale with player level)
const POTION_DEFS = [
    { key: 'hp_25',    type: 'potion', subType: 'hp',    percent: 25,  name: 'Health Potion (25%)',  priceFactor: 4 },
    { key: 'hp_50',    type: 'potion', subType: 'hp',    percent: 50,  name: 'Health Potion (50%)',  priceFactor: 7 },
    { key: 'hp_75',    type: 'potion', subType: 'hp',    percent: 75,  name: 'Health Potion (75%)',  priceFactor: 11 },
    { key: 'hp_100',   type: 'potion', subType: 'hp',    percent: 100, name: 'Health Potion (100%)', priceFactor: 15 },
    { key: 'arm_25',   type: 'potion', subType: 'armor', percent: 25,  name: 'Armor Potion (25%)',   priceFactor: 3 },
    { key: 'arm_50',   type: 'potion', subType: 'armor', percent: 50,  name: 'Armor Potion (50%)',   priceFactor: 6 },
    { key: 'arm_75',   type: 'potion', subType: 'armor', percent: 75,  name: 'Armor Potion (75%)',   priceFactor: 9 },
    { key: 'arm_100',  type: 'potion', subType: 'armor', percent: 100, name: 'Armor Potion (100%)',  priceFactor: 12 },
];
