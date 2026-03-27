const mp$ = (id) => document.getElementById(id);

const multiplayerUI = {
  socket: null,
  playerId: null,
  lobbyCode: '',
  isHost: false,
  ready: false,
  combatState: null,
  openMenu() {
    this.hideAllScreens();
    const screen = mp$('screen-multiplayer-menu');
    if (screen) screen.classList.remove('hidden');
    const input = mp$('mp-name');
    if (input && !input.value) input.value = (window.game && game.player && game.player.name) ? game.player.name : 'Gladiator';
  },
  backToMainMenu() {
    this.cleanupSocket();
    this.hideAllScreens();
    const start = mp$('screen-start');
    if (start) start.classList.remove('hidden');
  },
  hideAllScreens() {
    ['screen-start', 'screen-multiplayer-menu', 'screen-multiplayer-lobby', 'screen-multiplayer-combat'].forEach(id => {
      const el = mp$(id);
      if (el) el.classList.add('hidden');
    });
  },
  setStatus(text) {
    const menu = mp$('mp-menu-status');
    const lobby = mp$('mp-lobby-status');
    if (menu) menu.innerText = text;
    if (lobby) lobby.innerText = text;
  },
  getServerUrl() {
    const input = mp$('mp-server-url');
    return (input && input.value.trim()) || 'ws://localhost:8080';
  },
  getProfile() {
    const cls = mp$('mp-class') ? mp$('mp-class').value : 'Warrior';
    const name = mp$('mp-name') ? (mp$('mp-name').value.trim() || 'Gladiator') : 'Gladiator';
    if (window.game && game.player) {
      const p = game.player;
      const range = p.getDmgRange();
      return {
        name,
        classType: cls,
        level: p.level || 1,
        hp: p.getMaxHp(),
        armor: p.getTotalArmor(),
        atk: p.getEffectiveAtk(),
        def: p.getEffectiveDef(),
        min: range.min,
        max: range.max
      };
    }
    const base = { Warrior: { atk: 10, def: 8, hp: 72, armor: 18, min: 8, max: 14 }, Beserker: { atk: 11, def: 6, hp: 68, armor: 12, min: 10, max: 16 }, Guardian: { atk: 8, def: 10, hp: 84, armor: 24, min: 7, max: 12 } }[cls] || { atk: 10, def: 8, hp: 72, armor: 18, min: 8, max: 14 };
    return { name, classType: cls, level: 1, hp: base.hp, armor: base.armor, atk: base.atk, def: base.def, min: base.min, max: base.max };
  },
  ensureSocket(onOpenAction) {
    this.cleanupSocket();
    try {
      this.socket = new WebSocket(this.getServerUrl());
    } catch (err) {
      this.setStatus('Failed to create socket.');
      return;
    }
    this.socket.onopen = () => {
      this.setStatus('Connected to multiplayer server.');
      if (typeof onOpenAction === 'function') onOpenAction();
    };
    this.socket.onmessage = (event) => this.handleMessage(event);
    this.socket.onclose = () => {
      this.setStatus('Disconnected from server.');
    };
    this.socket.onerror = () => {
      this.setStatus('Connection error. Check your server URL.');
    };
  },
  send(type, payload = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type, ...payload }));
  },
  createLobby() {
    this.ensureSocket(() => {
      this.send('create_lobby', { profile: this.getProfile() });
    });
  },
  joinLobbyPrompt() {
    const code = window.prompt('Enter lobby code:');
    if (!code) return;
    this.ensureSocket(() => {
      this.send('join_lobby', { code: code.trim().toUpperCase(), profile: this.getProfile() });
    });
  },
  toggleReady() {
    this.ready = !this.ready;
    const btn = mp$('mp-ready-btn');
    if (btn) btn.innerText = this.ready ? 'Unready' : 'Ready';
    this.send('set_ready', { ready: this.ready });
  },
  startMatch() {
    this.send('start_match');
  },
  leaveLobby() {
    this.cleanupSocket();
    this.openMenu();
  },
  leaveMatch() {
    this.cleanupSocket();
    this.openMenu();
  },
  cleanupSocket() {
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
    this.playerId = null;
    this.lobbyCode = '';
    this.isHost = false;
    this.ready = false;
    this.combatState = null;
    const startBtn = mp$('mp-start-btn');
    if (startBtn) startBtn.classList.add('hidden');
    const readyBtn = mp$('mp-ready-btn');
    if (readyBtn) readyBtn.innerText = 'Ready';
  },
  handleMessage(event) {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === 'welcome') {
      this.playerId = msg.playerId;
      return;
    }
    if (msg.type === 'error') {
      this.setStatus(msg.message || 'Multiplayer error.');
      return;
    }
    if (msg.type === 'lobby_update') {
      this.lobbyCode = msg.code;
      this.isHost = !!msg.hostId && msg.hostId === this.playerId;
      this.renderLobby(msg);
      return;
    }
    if (msg.type === 'match_started' || msg.type === 'state') {
      this.combatState = msg.state;
      this.renderCombat(msg.state);
      return;
    }
    if (msg.type === 'match_over') {
      this.combatState = msg.state;
      this.renderCombat(msg.state);
      this.setStatus(msg.winnerId === this.playerId ? 'You win the duel.' : 'You were defeated.');
    }
  },
  renderLobby(msg) {
    this.hideAllScreens();
    const screen = mp$('screen-multiplayer-lobby');
    if (screen) screen.classList.remove('hidden');
    mp$('mp-lobby-code').innerText = msg.code || '----';
    const players = msg.players || [];
    const p1 = players[0];
    const p2 = players[1];
    mp$('mp-player-1').innerText = p1 ? `${p1.profile.name} (${p1.profile.classType})` : 'Empty Slot';
    mp$('mp-player-1-state').innerText = p1 ? (p1.ready ? 'Ready' : 'Waiting') : 'Not connected';
    mp$('mp-player-2').innerText = p2 ? `${p2.profile.name} (${p2.profile.classType})` : 'Empty Slot';
    mp$('mp-player-2-state').innerText = p2 ? (p2.ready ? 'Ready' : 'Waiting') : 'Not connected';
    const startBtn = mp$('mp-start-btn');
    if (startBtn) {
      const everyoneReady = players.length === 2 && players.every(p => p.ready);
      startBtn.classList.toggle('hidden', !(this.isHost && everyoneReady));
    }
    this.setStatus(players.length < 2 ? 'Waiting for opponent...' : 'Both players connected. Ready up.');
  },
  renderCombat(state) {
    this.hideAllScreens();
    const screen = mp$('screen-multiplayer-combat');
    if (screen) screen.classList.remove('hidden');
    const meIndex = state.players.findIndex(p => p.id === this.playerId);
    const foeIndex = meIndex === 0 ? 1 : 0;
    const me = state.players[meIndex];
    const foe = state.players[foeIndex];
    if (!me || !foe) return;
    mp$('mp-self-name').innerText = `${me.profile.name} Lvl ${me.profile.level}`;
    mp$('mp-foe-name').innerText = `${foe.profile.name} Lvl ${foe.profile.level}`;
    mp$('mp-self-hp').innerText = `${me.hp}/${me.maxHp}`;
    mp$('mp-self-armor').innerText = `${me.armor}/${me.maxArmor}`;
    mp$('mp-foe-hp').innerText = `${foe.hp}/${foe.maxHp}`;
    mp$('mp-foe-armor').innerText = `${foe.armor}/${foe.maxArmor}`;
    mp$('mp-self-hp-bar').style.width = `${(me.hp / me.maxHp) * 100}%`;
    mp$('mp-self-armor-bar').style.width = `${me.maxArmor > 0 ? (me.armor / me.maxArmor) * 100 : 0}%`;
    mp$('mp-foe-hp-bar').style.width = `${(foe.hp / foe.maxHp) * 100}%`;
    mp$('mp-foe-armor-bar').style.width = `${foe.maxArmor > 0 ? (foe.armor / foe.maxArmor) * 100 : 0}%`;
    const yourTurn = state.turn === this.playerId && !state.winnerId;
    mp$('mp-turn-indicator').innerText = state.winnerId ? (state.winnerId === this.playerId ? 'VICTORY' : 'DEFEAT') : (yourTurn ? 'YOUR TURN' : 'OPPONENT TURN');
    mp$('mp-turn-indicator').className = state.winnerId ? (state.winnerId === this.playerId ? 'text-green' : 'text-red') : (yourTurn ? 'text-green' : 'text-red');
    const actions = mp$('mp-combat-actions');
    if (actions) actions.style.pointerEvents = yourTurn ? 'auto' : 'none';
    if (actions) actions.style.opacity = yourTurn ? '1' : '0.5';
    const log = mp$('mp-combat-log');
    if (log) log.innerHTML = (state.log || []).slice(-8).map(line => `<div>${line}</div>`).join('');
  },
  sendAction(action) {
    if (!this.combatState || this.combatState.turn !== this.playerId || this.combatState.winnerId) return;
    this.send('combat_action', { action });
  }
};
