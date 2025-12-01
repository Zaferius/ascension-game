// Central SFX & music configuration and helpers
const AUDIO_LEVELS = {
    master: 0.9,   // global master volume
    sfx: 0.9,      // sound effects volume
    music: 0.3     // background music volume
};

const SFX_MAP = {
    hpHit: "assets/sfx/meat-impact.wav",
    armorHit: "assets/sfx/hit-metal.wav",
    dodge: "assets/sfx/dash.wav",
};

const MUSIC_MAP = {
    fight: "assets/sfx/fight-music.mp3",
};

const getSfxVolume = () => {
    return Math.max(0, Math.min(1, (AUDIO_LEVELS.master ?? 1) * (AUDIO_LEVELS.sfx ?? 1)));
};

const getMusicVolume = () => {
    return Math.max(0, Math.min(1, (AUDIO_LEVELS.master ?? 1) * (AUDIO_LEVELS.music ?? 1)));
};

function playSfx(key) {
    const src = SFX_MAP[key];
    if (!src) return;
    try {
        const a = new Audio(src);
        a.volume = getSfxVolume();
        a.currentTime = 0;
        a.play();
    } catch {}
}

let _fightMusic = null;

function playFightMusic() {
    const src = MUSIC_MAP.fight;
    if (!src) return;
    try {
        if (!_fightMusic) {
            _fightMusic = new Audio(src);
            _fightMusic.loop = true;
        }
        _fightMusic.volume = getMusicVolume();
        _fightMusic.currentTime = 0;
        const p = _fightMusic.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
}

function stopFightMusic() {
    try {
        if (_fightMusic) {
            _fightMusic.pause();
            _fightMusic.currentTime = 0;
        }
    } catch {}
}
