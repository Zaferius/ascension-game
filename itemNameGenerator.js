// Dark-fantasy item name configuration and generator
// You can tweak these lists and probabilities freely.

const itemNameData = {
    baseNames: {
        weapon: [
            "Blade","Longsword","War Axe","Battle Axe","Greatsword","Claymore","Scimitar","Cutlass","Falchion","Hatchet",
            "Warhammer","Maul","Mace","Flail","Morningstar","Spear","Pike","Halberd","Glaive","Lance",
            "Dagger","Dirk","Kris","Stiletto","Rapier","Twinblade","Hand Crossbow","Crossbow","Longbow","War Bow",
            "Shortbow","Recurve Bow","Throwing Axe","Javelin","Trident","Quarterstaff","War Staff","Spellblade","Wand","Focus",
            "Totem","Relic","Scythe","Reaper","Chakram","Whip"
        ],
        armor: [
            "Warplate","Battleplate","Mail","War Mail","Scale Armor","Chain Armor","Splint Armor","War Harness","War Coat","Battle Cuirass",
            "Field Plate","War Panoply","Guard Armor","Sentinel Armor","Gladiator Mail","Arena Harness","Legion Plate","Shadow Armor","Storm Plate","Doom Mail"
        ],
        trinket: [
            "Ring","Signet","Band","Seal","Amulet","Talisman","Charm","Idol","Totem","Relic",
            "Pendant","Medallion","Focus Stone","Oculus","Eye","Token","Fetish","Charmstone","Rune Stone","Emblem"
        ]
    },

    armorSlots: {
        head: {
            baseNames: [
                "Helm","War Helm","Greathelm","Battle Mask","Visor","Cowl","Hood","War Hood","Circlet","Crown",
                "Skullcap","Faceguard","War Visage","Gladiator Helm","Arena Mask","Horned Helm","Deathmask","Dragon Helm","Storm Hood","Shadow Visor"
            ]
        },
        neck: {
            baseNames: [
                "Gorget","War Amulet","Rune Collar","Torque","Choker","Neckguard","Charmchain","Soulchain","Oath Pendant","Blood Pendant",
                "Spirit Gorget","Ward Collar","Dragon Torque","Bone Talisman","Shadow Locket","Iron Collar","Storm Amulet","Hex Charm","Soul Pendant","Grim Gorget"
            ]
        },
        shoulders: {
            baseNames: [
                "Pauldrons","Shoulderguards","War Mantle","Mantle","Spaulders","War Shoulders","Battle Mantle","Guard Pauldrons","Storm Spaulders","Dread Mantle",
                "Legion Pauldrons","Arena Shoulders","Vanguard Mantle","Bone Spaulders","Iron Shoulders","Dragon Pauldrons","Shadow Mantle","War Plates","Siegebreaker Spaulders","Blood Mantle"
            ]
        },
        chest: {
            baseNames: [
                "Breastplate","Chestplate","Battleplate","War Harness","Runic Cuirass","Cuirass","War Coat","Mail Hauberk","Scale Coat","War Brigandine",
                "Gladiator Mail","Arena Harness","Heartplate","Dragon Cuirass","Stormplate","Bloodplate","Shadow Cuirass","Titan Plate","Guardian Mail","Legion Breastplate"
            ]
        },
        arms: {
            baseNames: [
                "Gauntlets","Vambraces","Bracers","War Gloves","Fistguards","Handguards","War Grips","Iron Fists","Claw Gauntlets","Battle Mitts",
                "Guard Bracers","Dragon Gauntlets","Storm Vambraces","Bone Grips","Shadow Gauntlets","Arena Gloves","Gladiator Fists","Chain Bracers","Runebound Gauntlets","Blood Vambraces"
            ]
        },
        shield: {
            baseNames: [
                "Shield","Tower Shield","Bulwark","Aegis","Kite Shield","Round Shield","Wall Shield","War Buckler","Guard Shield","Legion Bulwark",
                "Dragon Aegis","Storm Bulwark","Bone Shield","Iron Wall","Oathshield","Dread Bulwark","Skull Shield","Sun Aegis","Blood Buckler","Rampart"
            ]
        },
        thighs: {
            baseNames: [
                "Legplates","Cuisses","War Tassets","Tassets","Battle Skirt","War Greaves","Leg Guards","Plate Cuisses","Arena Tassets","Gladiator Cuisses",
                "Dragon Legplates","Storm Cuisses","Shadow Tassets","Bone Leggings","Chain Cuisses","Sentinel Legplates","Vanguard Tassets","Blood Cuisses","Iron Legwraps","War Skirt"
            ]
        },
        shins: {
            baseNames: [
                "Greaves","War Boots","Plated Boots","Sabatons","War Greaves","Battle Boots","Legguards","Steel Greaves","Arena Boots","Gladiator Greaves",
                "Dragon Sabatons","Storm Boots","Shadow Greaves","Bone Treads","Chain Boots","Sentinel Sabatons","Vanguard Greaves","Blood Boots","Iron Walkers","War Sandals"
            ]
        }
    },

    rarityPrefixes: {
        common: [
            "Rusty","Chipped","Worn","Tarnished","Crude","Dulled","Frayed","Bent","Scarred","Stained",
            "Weathered","Old","Ragged","Faded","Nicked","Patched","Splintered","Dented","Militia","Recruit's"
        ],
        uncommon: [
            "Sturdy","Tempered","Scout's","Soldier's","Guard's","Balanced","Fine","Reliable","Serviceable","Hardened",
            "Reinforced","Sharpened","Steadfast","Ironbound","Watcher's","Arena","Gladiator's","Drilled","Outrider's","Vanguard"
        ],
        rare: [
            "Runic","Shadowforged","Stormforged","Bloodforged","Nightforged","Spellforged","Grimforged","Gravebound","Oathbound","Wardforged",
            "Stormcaller's","Bonecarved","Ashen","Phantom","Ironwall","Dreadforged","Warlock's","Wraithwoven","Thunderforged","Skysunder"
        ],
        epic: [
            "Dragonforged","Eternal","Celestial","Voidforged","Soulbound","Doomforged","Hellforged","Sunforged","Nightfall","Skullrender",
            "Dragonscale","Stormreaver","Bloodmoon","Starforged","Titanguard","Netherforged","Worldscar","Kingsguard","Riftforged","Dreadnought"
        ],
        legendary: [
            "Worldbreaker","Apocalypse","Godforged","Cataclysmic","Primordial","Transcendent","Mythic","Ancient","Firstborn","Last Dawn",
            "Worldshaper","Worldsplitter","Heavenbreaker","Voidheart","Soulreaver","Eclipseborn","Godslayer","Kingslayer","Titanborn","Endbringer"
        ]
    },

    raritySuffixes: {
        common: [
            "of Training","of the Guard","of the Militia","of the Recruit","of the Yard","of the Watch","of the Barracks","of the Pit","of the Arena",
            "of the Footman","of Drills","of the Garrison","of the Gate","of Duty","of the Patroller","of the Line","of Worn Steel","of Old Blood","of the Stables","of the Wall"
        ],
        uncommon: [
            "of Readiness","of the Vanguard","of the Outrider","of the Patrol","of the Cohort","of Service","of the Skirmish","of the Shieldline","of the Escort",
            "of the Warband","of the Sentinel","of the Captain","of the Duelist","of the Hunter","of the Ranger","of the Lancer","of True Aim","of the Strongarm","of the Roadguard","of the Arena Guard"
        ],
        rare: [
            "of the Storm","of Burning Ashes","of the Phantom","of the Iron Wall","of the Grave","of Shifting Sands","of the Howling Wind","of the Blood Oath","of the Night Watch",
            "of the Warden","of the Runebound","of the Veil","of the Deep","of the Black Sun","of the Wolf","of the Raven","of Broken Chains","of the Hex","of Withering Blades","of the Silent Step"
        ],
        epic: [
            "of the Fallen King","of Endless Night","of the Dragon's Oath","of the Blood Moon","of the Eternal Arena","of the Last Legion","of the Undying Host","of the Doom Herald",
            "of the Celestial Storm","of the Void Gate","of the Shattered Crown","of the First Empire","of the Crimson Pact","of the Dragon's Breath","of the Abyss","of the Starless Sky",
            "of the Bone Colossus","of the Thorned Crown","of the Immortal Duel","of the Titan Wars"
        ],
        legendary: [
            "Soul Harvest","the World Eater","the First Flame","the Final Eclipse","the Last Gladiator","the World Forge","the Dawnless Age","the Broken Pantheon",
            "the Living Storm","the Void Serpent","the Dragon's Grave","the Silent King","the Eternal Colosseum","the Sun's Grave","the Primeval Roar","the Blood Tribunal",
            "the Godfall","the Last Sun","the Final Oath","the Endless War"
        ]
    },

    namePatterns: {
        weapon: [
            "{rarityPrefix} {baseName}",
            "{baseName} {raritySuffix}",
            "{rarityPrefix} {baseName} {raritySuffix}"
        ],
        armor: [
            "{rarityPrefix} {baseName}",
            "{baseName} {raritySuffix}",
            "{rarityPrefix} {baseName} {raritySuffix}"
        ],
        trinket: [
            "{rarityPrefix} {baseName}",
            "{baseName} {raritySuffix}",
            "{rarityPrefix} {baseName} {raritySuffix}"
        ]
    },

    legendaryUniques: [
        {
            id: "soul_reaver",
            name: "Soul Reaver",
            category: "weapon",
            type: "Greatsword",
            tags: ["shadow","lifesteal","curse"]
        },
        {
            id: "oblivion_edge",
            name: "Oblivion Edge",
            category: "weapon",
            type: "Sword",
            tags: ["void","crit","execution"]
        },
        {
            id: "grim_whisper",
            name: "Grim Whisper",
            category: "weapon",
            type: "Dagger",
            tags: ["poison","assassin"]
        },
        {
            id: "worldsplitter",
            name: "Worldsplitter",
            category: "weapon",
            type: "War Axe",
            tags: ["cleave","earth","armor_break"]
        },
        {
            id: "heart_of_the_titan",
            name: "Heart of the Titan",
            category: "armor",
            type: "Chestplate",
            tags: ["hp","armor","thorns"]
        },
        {
            id: "aegis_of_the_fallen_king",
            name: "Aegis of the Fallen King",
            category: "armor",
            type: "Shield",
            tags: ["block","tank"]
        },
        {
            id: "echoes_of_the_ancients",
            name: "Echoes of the Ancients",
            category: "trinket",
            type: "Amulet",
            tags: ["cooldown","echo"]
        }
    ]
};

// Helper: random element from array
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Ensure Title Case (basic)
function toTitleCase(str) {
    return str
        .split(/\s+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// Avoid repeating the same word twice in one name (very simple pass)
function dedupeRepeatedWords(str) {
    const parts = str.split(/\s+/).filter(Boolean);
    const result = [];
    const seen = new Set();
    for (const p of parts) {
        const key = p.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(p);
    }
    return result.join(" ");
}

// Main generator
// context: { category, rarity, slot?, baseType? }
function generateItemName(context) {
    const category = context.category;
    const rarity = context.rarity; // 'common' | ...
    const slot = context.slot;
    let baseType = context.baseType;

    const data = itemNameData;

    // Choose base name pool
    let basePool;
    if (category === 'armor' && slot && data.armorSlots[slot]) {
        basePool = data.armorSlots[slot].baseNames;
    } else {
        basePool = data.baseNames[category] || [];
    }

    if (!basePool || basePool.length === 0) {
        basePool = data.baseNames.weapon; // last resort
    }

    // If baseType supplied and it exists in pool, prefer that; else random
    let baseName;
    if (baseType && basePool.some(n => n.toLowerCase() === baseType.toLowerCase())) {
        baseName = basePool.find(n => n.toLowerCase() === baseType.toLowerCase());
    } else {
        baseName = randomChoice(basePool);
    }

    const prefixPool = data.rarityPrefixes[rarity] || [];
    const suffixPool = data.raritySuffixes[rarity] || [];
    const rarityPrefix = prefixPool.length ? randomChoice(prefixPool) : '';
    const rawSuffix = suffixPool.length ? randomChoice(suffixPool) : '';
    // Legendary suffixlerde baştaki "of" kelimesini at
    const raritySuffix = (rarity === 'legendary')
        ? rawSuffix.replace(/^of\s+/i, '')
        : rawSuffix;

    const patterns = data.namePatterns[category] || data.namePatterns.weapon;
    let pattern = randomChoice(patterns);

    let name = pattern
        .replace('{rarityPrefix}', rarityPrefix)
        .replace('{baseName}', baseName)
        .replace('{raritySuffix}', raritySuffix)
        .replace(/\s+/g, ' ')
        .trim();

    name = dedupeRepeatedWords(name);
    name = toTitleCase(name);

    // Legendary unique chance (30%)
    if (rarity === 'legendary') {
        if (Math.random() < 0.3) {
            const uniques = data.legendaryUniques.filter(u => {
                if (u.category !== category) return false;
                if (slot && u.slot && u.slot !== slot) return false;
                if (baseType && u.type && u.type.toLowerCase() !== baseType.toLowerCase()) return false;
                return true;
            });
            if (uniques.length) {
                const chosen = randomChoice(uniques);
                return chosen.name;
            }
        }
    }

    return name;
}

// Expose globally for non-module usage
window.itemNameData = itemNameData;
window.generateItemName = generateItemName;
