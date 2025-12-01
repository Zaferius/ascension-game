// UI Audio helper for button hover / select sounds

// Configure your UI sound paths here
const uiAudioConfig = {
    hoverSrc: 'assets/sfx/hover-sound.wav',
    selectSrc: 'assets/sfx/select-sound.wav'
};

// Single shared Audio instances
const uiSounds = {
    hover: new Audio(uiAudioConfig.hoverSrc),
    select: new Audio(uiAudioConfig.selectSrc)
};

const getUiVolume = () => {
    // Reuse global AUDIO_LEVELS from sfxConfig.js if available
    const master = (typeof AUDIO_LEVELS !== 'undefined' && AUDIO_LEVELS.master != null) ? AUDIO_LEVELS.master : 1;
    const sfx = (typeof AUDIO_LEVELS !== 'undefined' && AUDIO_LEVELS.sfx != null) ? AUDIO_LEVELS.sfx : 1;
    return Math.max(0, Math.min(1, master * sfx));
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
