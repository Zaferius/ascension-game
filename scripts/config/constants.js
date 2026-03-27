// Global utility helpers
const $ = (id) => document.getElementById(id);
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Player avatar display options (emoji)
const AVATARS = ['🗿', '🦁', '💀', '👺'];

// How many fights (win or loss) before shops fully refresh
const SHOP_REFRESH_INTERVAL = 10;
// How many fights before potion shop stock refreshes
const POTION_REFRESH_INTERVAL = 5;

// In-game portrait images for combat
const PLAYER_AVATAR_IMG = 'assets/images/ingame-avatars/player.png';
const ENEMY_AVATARS = {
    bandit:   'assets/images/ingame-avatars/bandit1.jpeg',
    goblin:   'assets/images/ingame-avatars/goblin1.jpeg',
    marauder: 'assets/images/ingame-avatars/marauder1.jpeg',
    orc:      'assets/images/ingame-avatars/orc1.jpeg',
    paladin:  'assets/images/ingame-avatars/paladin1.jpeg',
    skeleton: 'assets/images/ingame-avatars/skeleton1.jpeg'
};

const INTRO_SCRIPT = {
    textColor: '#E8E2C8',
    scenes: [
        {
            id: 'scene1',
            bg: 'assets/images/intro/intro1.jpeg',
            lines: [
                { text: 'They stripped you of your name', delay: 500,  fadeIn: 1200, hold: 2500 },
                { text: 'They took your pride, your freedom your life', delay: 400, fadeIn: 1200, hold: 2700 },
                { text: 'In the darkness, you were forgotten', delay: 400, fadeIn: 1300, hold: 2800 }
            ]
        },
        {
            id: 'scene2',
            bg: 'assets/images/intro/intro2.jpeg',
            lines: [
                { text: 'But something survived', delay: 700,  fadeIn: 1200, hold: 2400 },
                { text: 'Pain did not break you it forged you', delay: 400, fadeIn: 1200, hold: 2700 },
                { text: 'Every scar became a promise', delay: 400, fadeIn: 1300, hold: 2800 }
            ]
        },
        {
            id: 'scene3',
            bg: 'assets/images/intro/intro3.jpeg',
            lines: [
                { text: 'Now you stand again', delay: 800,  fadeIn: 1200, hold: 2300 },
                { text: 'Not to beg', delay: 300, fadeIn: 1100, hold: 2000 },
                { text: 'Not to survive', delay: 300, fadeIn: 1100, hold: 2100 },
                { text: 'But to conquer', delay: 300, fadeIn: 1300, hold: 2600 }
            ]
        }
    ],
    finalPauseMs: 1000,
    finalLines: [
        'They tried to erase you',
        'Now make them remember'
    ]
};

const SAVE_KEY = 'arenaV7_saves';
const ARMOR_SLOTS = ['head','neck','shoulders','chest','arms','shield','thighs','shins'];
const TRINKET_SLOTS = ['trinket1', 'trinket2'];

const BASE_STATS = {
    Warrior:  { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Beserker: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 },
    Guardian: { str: 1, atk: 1, def: 1, vit: 1, mag: 1, chr: 1 }
};

// Strips the base weapon type word from a legendary weapon's display name
const cleanLegendaryWeaponName = (item) => {
    if(!item || item.rarityKey !== 'legendary') return item ? item.name : '';
    const base = item.baseType;
    if(!base) return item.name;
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + escaped + '\\b', 'ig');
    return item.name.replace(re, '').replace(/\s+/g, ' ').trim();
};
