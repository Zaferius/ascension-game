const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const server = http.createServer();
const wss = new WebSocketServer({ server });
const lobbies = new Map();

function id() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function makeCode() {
  let code = id().slice(0, 4);
  while (lobbies.has(code)) code = id().slice(0, 4);
  return code;
}

function send(ws, payload) {
  if (ws.readyState === 1) ws.send(JSON.stringify(payload));
}

function broadcastLobby(lobby) {
  const payload = {
    type: 'lobby_update',
    code: lobby.code,
    hostId: lobby.hostId,
    players: lobby.players.map(p => ({ id: p.id, ready: p.ready, profile: p.profile }))
  };
  lobby.players.forEach(p => send(p.ws, payload));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function calcHit(atk, def) {
  return clamp(55 + (atk - def) * 5, 5, 99);
}

function createMatchState(lobby) {
  const players = lobby.players.map(p => ({
    id: p.id,
    profile: p.profile,
    hp: p.profile.hp,
    maxHp: p.profile.hp,
    armor: p.profile.armor,
    maxArmor: p.profile.armor
  }));
  const first = players[Math.floor(Math.random() * players.length)].id;
  return {
    players,
    turn: first,
    winnerId: null,
    log: [`${players[0].profile.name} and ${players[1].profile.name} enter the lobby arena.`, `${players.find(p => p.id === first).profile.name} acts first.`]
  };
}

function applyAction(state, actorId, action) {
  const actor = state.players.find(p => p.id === actorId);
  const target = state.players.find(p => p.id !== actorId);
  if (!actor || !target || state.winnerId) return state;
  const profile = actor.profile;
  const targetProfile = target.profile;
  const attackProfile = action === 'quick'
    ? { hitBonus: 18, damageMult: 0.82, label: 'Quick' }
    : action === 'power'
      ? { hitBonus: -12, damageMult: 1.35, label: 'Power' }
      : { hitBonus: 0, damageMult: 1, label: 'Normal' };
  const hit = clamp(calcHit(profile.atk, targetProfile.def) + attackProfile.hitBonus, 5, 99);
  const roll = Math.floor(Math.random() * 100);
  if (roll > hit) {
    state.log.push(`${profile.name} uses ${attackProfile.label} Attack but misses.`);
  } else {
    let dmg = Math.floor((profile.min + Math.floor(Math.random() * (profile.max - profile.min + 1))) * attackProfile.damageMult);
    let rem = dmg;
    if (target.armor > 0) {
      const absorbed = Math.min(target.armor, rem);
      target.armor -= absorbed;
      rem -= absorbed;
    }
    if (rem > 0) target.hp = Math.max(0, target.hp - rem);
    state.log.push(`${profile.name} hits ${target.profile.name} for ${dmg}.`);
    if (target.hp <= 0) {
      state.winnerId = actorId;
      state.log.push(`${target.profile.name} falls in the arena.`);
    }
  }
  if (!state.winnerId) state.turn = target.id;
  return state;
}

function broadcastState(lobby, type = 'state') {
  lobby.players.forEach(p => send(p.ws, { type, state: lobby.match }));
}

function removePlayer(ws) {
  for (const [code, lobby] of lobbies.entries()) {
    const idx = lobby.players.findIndex(p => p.ws === ws);
    if (idx === -1) continue;
    lobby.players.splice(idx, 1);
    if (lobby.players.length === 0) {
      lobbies.delete(code);
      return;
    }
    lobby.hostId = lobby.players[0].id;
    lobby.players.forEach(p => (p.ready = false));
    lobby.match = null;
    broadcastLobby(lobby);
    return;
  }
}

wss.on('connection', (ws) => {
  ws.playerId = id();
  send(ws, { type: 'welcome', playerId: ws.playerId });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'create_lobby') {
      const code = makeCode();
      const lobby = {
        code,
        hostId: ws.playerId,
        players: [{ id: ws.playerId, ws, ready: false, profile: msg.profile }],
        match: null
      };
      lobbies.set(code, lobby);
      ws.lobbyCode = code;
      broadcastLobby(lobby);
      return;
    }
    if (msg.type === 'join_lobby') {
      const lobby = lobbies.get(msg.code);
      if (!lobby) return send(ws, { type: 'error', message: 'Lobby not found.' });
      if (lobby.players.length >= 2) return send(ws, { type: 'error', message: 'Lobby is full.' });
      lobby.players.push({ id: ws.playerId, ws, ready: false, profile: msg.profile });
      ws.lobbyCode = lobby.code;
      broadcastLobby(lobby);
      return;
    }
    const lobby = ws.lobbyCode ? lobbies.get(ws.lobbyCode) : null;
    if (!lobby) return;
    if (msg.type === 'set_ready') {
      const player = lobby.players.find(p => p.id === ws.playerId);
      if (!player) return;
      player.ready = !!msg.ready;
      broadcastLobby(lobby);
      return;
    }
    if (msg.type === 'start_match') {
      if (lobby.hostId !== ws.playerId) return;
      if (lobby.players.length !== 2 || !lobby.players.every(p => p.ready)) return;
      lobby.match = createMatchState(lobby);
      broadcastState(lobby, 'match_started');
      return;
    }
    if (msg.type === 'combat_action') {
      if (!lobby.match || lobby.match.turn !== ws.playerId) return;
      applyAction(lobby.match, ws.playerId, msg.action);
      broadcastState(lobby, lobby.match.winnerId ? 'match_over' : 'state');
    }
  });

  ws.on('close', () => removePlayer(ws));
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Close the existing multiplayer server or run with another port.`);
    console.error(`Example: PORT=8081 npm run multiplayer`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Multiplayer server listening on ws://localhost:${PORT}`);
});
