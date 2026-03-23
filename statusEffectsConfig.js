// Config for status effects (DOT) and which enemies can apply them

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
    },
    // Which enemies can apply which effects and with what chance on a successful hit
    enemies: {
        orc: [
            { effect: 'bleed', chance: 0.35 }
        ],
        goblin: [
            { effect: 'poison', chance: 0.4 }
        ],
        bandit: [
            { effect: 'bleed', chance: 0.25 }
        ],
        skeleton: [
            { effect: 'bleed', chance: 0.25 }
        ],
        marauder: [
            { effect: 'bleed', chance: 0.3 }
        ],
        paladin: [
            { effect: 'burn', chance: 0.22 }
        ]
    }
};
