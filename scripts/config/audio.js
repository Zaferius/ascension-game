// Central SFX, music, and UI audio configuration

const AUDIO_LEVELS = {
    master: 0.9,   // global master volume
    sfx: 0.9,      // sound effects volume
    music: 0.3     // background music volume
};

const SFX_MAP = {
    hpHit: [
        "assets/sfx/combat/flesh_hit1.wav",
        "assets/sfx/combat/flesh_hit2.wav",
        "assets/sfx/combat/flesh_hit3.wav",
        "assets/sfx/combat/flesh_hit4.wav",
    ],
    armorHit: [
        "assets/sfx/combat/flesh_hit1.wav",
        "assets/sfx/combat/flesh_hit2.wav",
        "assets/sfx/combat/flesh_hit3.wav",
        "assets/sfx/combat/flesh_hit4.wav",
    ],
    armorHitMetal: "assets/sfx/combat/hit-metal.wav",
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
    const entry = SFX_MAP[key];
    if (!entry) return;

    let src = entry;
    if (Array.isArray(entry)) {
        if (entry.length === 0) return;
        if (!playSfx._lastIndexByKey) playSfx._lastIndexByKey = {};
        const lastIndex = playSfx._lastIndexByKey[key];
        let nextIndex = Math.floor(Math.random() * entry.length);
        if (entry.length > 1 && nextIndex === lastIndex) {
            nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (entry.length - 1))) % entry.length;
        }
        playSfx._lastIndexByKey[key] = nextIndex;
        src = entry[nextIndex];
    }

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

// --- UI Audio ---

const uiAudioConfig = {
    hoverSrc: 'assets/sfx/hover-sound.wav',
    selectSrc: 'assets/sfx/select-sound.wav'
};

const uiSounds = {
    hover: new Audio(uiAudioConfig.hoverSrc),
    select: new Audio(uiAudioConfig.selectSrc)
};

const getUiVolume = () => {
    return Math.max(0, Math.min(1, (AUDIO_LEVELS.master ?? 1) * (AUDIO_LEVELS.sfx ?? 1)));
};

function playUiHover() {
    try {
        uiSounds.hover.volume = getUiVolume();
        uiSounds.hover.currentTime = 0;
        const p = uiSounds.hover.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

function playUiSelect() {
    try {
        uiSounds.select.volume = getUiVolume();
        uiSounds.select.currentTime = 0;
        const p = uiSounds.select.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

// Attach SFX to buttons within a given root element (or document by default)
function wireButtonSfx(root) {
    const scope = root || document;
    const btns = scope.querySelectorAll('button, .btn, .c-btn');
    btns.forEach(b => {
        if (!b.__sfxBound) {
            b.addEventListener('mouseenter', playUiHover);
            b.addEventListener('click', playUiSelect);
            b.__sfxBound = true;
        }
    });
}
