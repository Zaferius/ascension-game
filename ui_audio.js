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

// Fight background music
const fightMusic = new Audio('assets/sfx/fight-music.mp3');
fightMusic.loop = true;

function playUiHover() {
    try {
        uiSounds.hover.currentTime = 0;
        const p = uiSounds.hover.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

// Fight music controls
function playFightMusic() {
    try {
        fightMusic.currentTime = 0;
        const p = fightMusic.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
}

function stopFightMusic() {
    try {
        fightMusic.pause();
        fightMusic.currentTime = 0;
    } catch (e) {}
}

function playUiSelect() {
    try {
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
