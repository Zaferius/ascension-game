const MAX_TOURNAMENT_TIER = 20;

const TOURNAMENT_TIERS = [
    { tier: 1, name: 'Ash Gate Trials', theme: 'New blood stains the sand beneath the cracked city gate.', final: ['Ragpicker the Cunning'] },
    { tier: 2, name: 'Black Dust Circuit', theme: 'Faster killers circle the pit while the crowd begins to notice.', final: ['Blackfang the Swift'] },
    { tier: 3, name: 'Cinder Crown Open', theme: 'Weapon specialists emerge, each eager to carve a title.', final: ['Ironjaw the Brutal'] },
    { tier: 4, name: 'Grimhook Gauntlet', theme: 'The city sends executioners rather than brawlers.', final: ['Grimhook the Relentless'] },
    { tier: 5, name: 'Blood Banner Rounds', theme: 'Veterans of the old pits return under torn crimson standards.', final: ['Ashveil the Unbroken'] },
    { tier: 6, name: 'Broken Oath Cup', theme: 'Paladins, deserters, and mercenaries collide for iron coin.', final: ['Oathscar the Guarded'] },
    { tier: 7, name: 'Bone Lantern Trials', theme: 'The dead and the desperate both answer the call.', final: ['Bonegrin the Tireless'] },
    { tier: 8, name: 'Red Quarry Clash', theme: 'The quarry fighters bring savage force and little mercy.', final: ['Bloodtusk the Juggernaut'] },
    { tier: 9, name: 'Iron Ledger League', theme: 'Only proven killers survive the accountants of the arena.', final: ['Blackvigil the Stalwart'] },
    { tier: 10, name: 'Howling Sand Major', theme: 'Every round is louder, richer, and more lethal than the last.', final: ['Warfang the Reaper'] },
    { tier: 11, name: 'Cinder Vow Trials', theme: 'Fire-marked duelists and oathbreakers command the stands.', final: ['Cindervow the Savage'] },
    { tier: 12, name: 'Cryptbone Masters', theme: 'Veterans whisper that no one reaches the end untouched.', final: ['Cryptfang the Enduring'] },
    { tier: 13, name: 'Goremaw Invitational', theme: 'Only specialists and monsters earn a place in this blood-soaked ascent.', final: ['Goremaw the Brutal'] },
    { tier: 14, name: 'Palecrest Ascension', theme: 'The city expects spectacle, and the ascent delivers blood.', final: ['Palecrest the Ironwall'] },
    { tier: 15, name: 'Skullbrand Supreme', theme: 'Named killers enter in pairs and leave in pieces.', final: ['Skullbrand the Pit Wolf', 'Dreadhook the Relentless'] },
    { tier: 16, name: 'Dreadrattle Crown', theme: 'The old pits shake with heavier armor and sharper steel.', final: ['Dreadrattle the Unbroken', 'Bleakskull the Guarded'] },
    { tier: 17, name: 'Ember Throne Cup', theme: 'The crowd roars only for champions and spectacular deaths.', final: ['Graveshield the Stalwart', 'Grimtusk the Ravager'] },
    { tier: 18, name: 'Pit Wolf Dominion', theme: 'Every victory here is a public execution of the weak.', final: ['Stonejaw the Iron Beast', 'Rattlebrand the Relentless'] },
    { tier: 19, name: 'Last Oath Championship', theme: 'The city gathers to witness the final proving of iron and will.', final: ['Hollowbrand the Arena Fang', 'Ironscar the Butcher'] },
    { tier: 20, name: 'Iron City Grand Ascension', theme: 'The final ascent crowns the one name the city cannot forget.', final: ['Vorga the Pit King', 'Ser Caldus the Unbroken'] }
];
