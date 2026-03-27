// Config for status effects (DOT) used by weapon affixes and combat

const STATUS_EFFECTS_CONFIG = {
    effects: {
        poison: {
            id: 'poison',
            label: 'Poison',
            icon: '☠',
            color: '#76ff03',
            damagePct: 0.06, // % of max HP per tick
            duration: 3      // turns
        },
        burn: {
            id: 'burn',
            label: 'Burn',
            icon: '🔥',
            color: '#ff9100',
            damagePct: 0.08,
            duration: 2
        },
        bleed: {
            id: 'bleed',
            label: 'Bleed',
            icon: '💉',
            color: '#ff1744',
            damagePct: 0.05,
            duration: 4
        }
    }
};
