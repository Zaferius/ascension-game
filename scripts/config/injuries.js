const INJURY_LIBRARY = [
    { id: 'fractured_leg', name: 'Fractured Leg', duration: 3, severity: 'major', effects: { dodgePenalty: 8, hitChancePenalty: 4 }, summary: '-8 Dodge / -4 Hit' },
    { id: 'twisted_knee', name: 'Twisted Knee', duration: 2, severity: 'minor', effects: { dodgePenalty: 5, atkFlatPenalty: 2 }, summary: '-5 Dodge / -2 Attack' },
    { id: 'dislocated_shoulder', name: 'Dislocated Shoulder', duration: 3, severity: 'major', effects: { atkFlatPenalty: 3, critChancePenalty: 6 }, summary: '-3 Attack / -6 Crit' },
    { id: 'fractured_wrist', name: 'Fractured Wrist', duration: 2, severity: 'minor', effects: { atkFlatPenalty: 2, hitChancePenalty: 4 }, summary: '-2 Attack / -4 Hit' },
    { id: 'cracked_ribs', name: 'Cracked Ribs', duration: 3, severity: 'major', effects: { hpFlatPenalty: 18, regenPenalty: 1 }, summary: '-18 Health / -1 Regen' },
    { id: 'bruised_lungs', name: 'Bruised Lungs', duration: 2, severity: 'minor', effects: { regenPenalty: 1, hitChancePenalty: 3 }, summary: '-1 Regen / -3 Hit' },
    { id: 'concussion', name: 'Concussion', duration: 2, severity: 'major', effects: { hitChancePenalty: 6, critChancePenalty: 6 }, summary: '-6 Hit / -6 Crit' },
    { id: 'broken_guard', name: 'Broken Guard', duration: 3, severity: 'major', effects: { armorMultPenalty: 0.12, defFlatPenalty: 3 }, summary: '-12% Armor / -3 Defence' },
    { id: 'internal_bleeding', name: 'Internal Bleeding', duration: 2, severity: 'major', effects: { hpFlatPenalty: 12, regenPenalty: 2 }, summary: '-12 Health / -2 Regen' }
];

const getInjuryById = (id) => INJURY_LIBRARY.find(injury => injury.id === id) || null;
