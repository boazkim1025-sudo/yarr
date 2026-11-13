const ROLES = [
  {id:'doctor',name:'의사',team:'town',power:'밤에 한 명을 보호합니다. 연속으로 같은 사람은 보호할 수 없습니다.'},
  {id:'reporter',name:'기자',team:'town',power:'게임 중 한 번, 밤에 한 명을 취재해 다음 날 직업을 공개합니다.'},
  {id:'police',name:'경찰',team:'town',power:'밤에 한 명을 조사해 마피아인지 확인합니다. 보스는 시민으로 표시됩니다.'},
  {id:'detective',name:'탐정',team:'town',power:'밤에 한 명을 조사해 그 사람이 밤에 행동했는지 확인합니다.'},
  {id:'medium',name:'영매',team:'town',power:'밤에 탈락자 한 명의 직업을 확인합니다.'},
  {id:'politician',name:'정치인',team:'town',power:'생존 중 낮 투표가 두 표로 계산됩니다.'},
  {id:'soldier',name:'군인',team:'town',power:'첫 번째 밤 공격을 한 번 버팁니다.'},
  {id:'watcher',name:'감시자',team:'town',power:'밤에 한 명을 감시해 그 사람을 찾아간 사람 수만 확인합니다.'},
  {id:'trapper',name:'트래퍼',team:'town',power:'게임 중 한 번 덫을 놓아 밤에 대상을 방문한 사람을 확인합니다.'},
  {id:'guardian',name:'수호천사',team:'town',power:'게임 중 한 번 밤에 한 명을 공격에서 보호합니다.'},
  {id:'psychologist',name:'심리학자',team:'town',power:'밤에 한 명의 팀(시민/마피아/중립)을 확인합니다.'},
  {id:'timeTraveler',name:'시간 여행자',team:'town',power:'게임 중 한 번, 지난 낮 시작 시점으로 되돌려 그 낮의 투표와 결과를 취소합니다.'},
  {id:'boss',name:'보스',team:'mafia',power:'마피아 팀의 우두머리. 경찰 조사에서 시민으로 표시됩니다.'},
  {id:'spy',name:'스파이',team:'mafia',power:'밤에 한 명의 정확한 직업을 확인합니다.'},
  {id:'intimidator',name:'협박범',team:'mafia',power:'밤에 한 명을 골라 다음 낮 투표를 못 하게 합니다.'},
  {id:'disguiser',name:'변장술사',team:'mafia',power:'마피아 팀이며 경찰 조사에서 마피아가 아닌 것으로 표시됩니다.'},
  {id:'controller',name:'조종자',team:'mafia',power:'밤에 한 명을 골라 다음 낮 투표를 못 하게 합니다.'},
  {id:'doppelganger',name:'도플갱어',team:'mafia',power:'게임 중 한 번, 밤에 한 명의 직업을 확인합니다.'},
  {id:'necromancer',name:'사령술사',team:'mafia',power:'게임 중 한 번, 탈락한 마피아 한 명을 되살립니다.'},
  {id:'ghost',name:'유령 마피아',team:'mafia',power:'탈락 후 한 번, 밤에 마지막 공격 대상을 지목합니다.'},
  {id:'clown',name:'광대',team:'neutral',power:'낮 투표로 처형되면 즉시 단독 승리합니다.'},
  {id:'survivor',name:'생존자',team:'neutral',power:'게임 종료 때 살아 있으면 개인 승리합니다.'},
  {id:'immortal',name:'불사신',team:'neutral',power:'밤 공격 한 번을 버팁니다. 낮 투표로는 처형될 수 있습니다.'},
  {id:'mirror',name:'거울 인간',team:'neutral',power:'마피아의 첫 공격을 반사해 공격에 참여한 마피아 한 명을 탈락시킵니다.'},
  {id:'trickster',name:'사기꾼',team:'neutral',power:'게임 중 한 번 낮 투표에서 두 사람의 투표 대상을 서로 바꿉니다.'},
  {id:'psychopath',name:'사이코패스',team:'neutral',power:'밤마다 한 명을 공격합니다. 마피아와 별개로 마지막까지 살아남으면 단독 승리합니다.'}
];

const DEFAULT = [
  'doctor','reporter','police','detective','medium','politician','soldier','watcher','guardian','psychologist','timeTraveler',
  'boss','spy','intimidator','disguiser','controller','clown','survivor','immortal','psychopath'
];

const $ = s => document.querySelector(s);
const getRole = id => ROLES.find(r => r.id === id);
const teamLabel = t => ({ town: '시민 팀', mafia: '마피아 팀', neutral: '중립' })[t];

let peer = null;
let host = false;
let myId = '';
let myName = '';
let room = '';
let links = new Map();
let seats = [];
let chosen = [...DEFAULT];
let phase = 'lobby';
let round = 0;
let myRole = null;
let pendingVotes = {};
let state = {};
let history = [];

function esc(s) {
  return String(s).replace(/[&<>\"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function toast(s) {
  const e = $('#toast');
  e.textContent = s;
  e.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => e.classList.remove('show'), 2800);
}

function tab(which) {
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === which);
  });
  $('#hostPane').classList.toggle('hidden', which !== 'host');
  $('#joinPane').classList.toggle('hidden', which !== 'join');
}

document.querySelectorAll('.tab').forEach(b => b.onclick = () => tab(b.dataset.tab));

function randomCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), x => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join('');
}

function renderRolePicker() {
  const groups = ['town', 'mafia', 'neutral'];
  $('#rolePicker').innerHTML = groups.map(team => `
    <div class="role-group">
      <h3>${teamLabel(team)}</h3>
      ${ROLES.filter(r => r.team === team).map(r => `
        <label class="role-option">
          <input type="checkbox" value="${r.id}" ${chosen.includes(r.id) ? 'checked' : ''}>
          <span>${r.name}</span>
        </label>
      `).join('')}
    </div>
  `).join('');

  $('#rolePicker').querySelectorAll('input').forEach(i => {
    i.onchange = () => {
      chosen = [...$('#rolePicker').querySelectorAll('input:checked')].map(x => x.value);
      const enabled = chosen.length === 20 && seats.length >= 2;
      $('#startGame').disabled = !enabled;
      $('#startGame').textContent = chosen.length === 20 ? '게임 시작 · 20명 구성' : `역할 ${chosen.length}/20 선택`;
    };
  });
}

function setStatus(s) {
  $('#connectionStatus').textContent = s;
}

function setupPeer(id) {
  if (!window.Peer) {
    toast('온라인 모듈을 불러오지 못했습니다. 인터넷 연결을 확인하세요.');
    return false;
  }

  peer = new Peer(id);
  peer.on('error', e => {
    toast(e.type === 'unavailable-id' ? '방 코드 충돌입니다. 다시 방을 만들어 주세요.' : '연결 오류: ' + e.type);
  });
  peer.on('disconnected', () => setStatus('연결 끊김'));
  return true;
}

$('#createRoom').onclick = () => {
  myName = $('#hostName').value.trim();
  if (!myName) return toast('이름을 입력해 주세요.');

  room = randomCode();
  myId = 'host';
  host = true;

  if (!setupPeer('mafia20-' + room)) return;

  peer.on('open', () => {
    seats = [{ id: 'host', name: myName, online: true }];
    $('#setup').classList.add('hidden');
    $('#game').classList.add('hidden');
    $('#roomPanel').classList.remove('hidden');
    $('#roomLabel').textContent = room;
    setStatus('방 생성됨 · ' + room);
    renderRolePicker();
    renderLobby();
  });

  peer.on('connection', conn => {
    conn.on('data', data => onHostData(conn, data));
    conn.on('open', () => {
      links.set(conn.peer, conn);
      conn.send({ type: 'welcome', room });
    });
  });
};

$('#joinRoom').onclick = () => {
  myName = $('#joinName').value.trim();
  room = $('#roomCode').value.trim().toUpperCase();

  if (!myName || room.length !== 6) {
    return toast('이름과 6자리 방 코드를 입력해 주세요.');
  }

  host = false;
  myId = 'p-' + Math.random().toString(36).slice(2, 10);

  if (!setupPeer()) return;

  peer.on('open', () => {
    const conn = peer.connect('mafia20-' + room, { reliable: true });
    links.set('host', conn);

    conn.on('open', () => {
      conn.send({ type: 'join', id: myId, name: myName });
      setStatus('방 연결 중 · ' + room);
    });

    conn.on('data', onClientData);
    conn.on('error', () => toast('방에 연결하지 못했습니다. 코드와 방장 상태를 확인하세요.'));
  });
};

function onHostData(conn, d) {
  if (d.type === 'join') {
    if (phase !== 'lobby' || seats.length >= 20) {
      conn.send({ type: 'error', message: '방이 시작됐거나 인원이 가득 찼습니다.' });
      return;
    }

    if (seats.some(p => p.name.toLowerCase() === d.name.toLowerCase())) {
      conn.send({ type: 'error', message: '이미 사용 중인 이름입니다.' });
      return;
    }

    seats.push({ id: d.id, name: String(d.name).slice(0, 20), online: true });
    conn.__seat = d.id;
    conn.send({ type: 'joined', id: d.id });
    renderLobby();
    broadcastLobby();
  } else if (d.type === 'vote') {
    pendingVotes[d.id] = d.target;
    renderGame();
  } else if (d.type === 'action') {
    if (d.action === 'rewind' && phase === 'night' && history.length) {
      rewind();
    } else if (d.action === 'nightAction') {
      state.actions[d.role] = d.target;
      broadcastPublic();
    }
  }
}

function onClientData(d) {
  if (d.type === 'error') return toast(d.message);
  if (d.type === 'joined') {
    myId = d.id;
    return;
  }

  if (d.type === 'lobby') {
    seats = d.seats;
    $('#setup').classList.add('hidden');
    $('#roomPanel').classList.remove('hidden');
    $('#roomLabel').textContent = d.room;
    $('#lobbyPlayers').innerHTML = seats.map(p => `
      <div class="lobby-player">
        ${esc(p.name)}${p.id === myId ? ' <small>(나)</small>' : ''}
      </div>
    `).join('');
    setStatus(`대기 중 · ${seats.length}/20명`);
  }

  if (d.type === 'start') {
    myRole = d.roles[myId];
    seats = d.seats;
    round = 0;
    phase = 'role';
    $('#setup').classList.add('hidden');
    $('#game').classList.remove('hidden');
    renderGame(d.public);
  }

  if (d.type === 'public') {
    seats = d.seats || seats;
    round = d.round;
    phase = d.phase;
    state = d.state || state;
    renderGame(d);
  }

  if (d.type === 'privateRole') {
    myRole = d.role;
    renderGame();
  }

  if (d.type === 'result') {
    toast(d.message);
  }
}

function broadcastLobby() {
  const packet = { type: 'lobby', room, seats };
  for (const c of links.values()) {
    try { c.send(packet); } catch {}
  }
}

function renderLobby() {
  if (!host) return;

  $('#lobbyPlayers').innerHTML = seats.map(p => `
    <div class="lobby-player">
      ${esc(p.name)}${p.id === 'host' ? ' <small>(방장)</small>' : ''}
    </div>
  `).join('');

  $('#startGame').disabled = seats.length < 2 || chosen.length !== 20;
  $('#startGame').textContent = chosen.length === 20 ? '게임 시작 · 20명 구성' : `역할 ${chosen.length}/20 선택`;
  $('#startGame').onclick = startGame;
  broadcastLobby();
}

function alive() {
  return seats.filter(p => p.alive !== false);
}

function broadcastPublic() {
  const pub = {
    type: 'public',
    room,
    seats: seats.map(p => ({ id: p.id, name: p.name, alive: p.alive !== false })),
    phase,
    round,
    state: {
      lastEvent: state.lastEvent || '',
      votes: pendingVotes
    }
  };

  for (const c of links.values()) {
    try { c.send(pub); } catch {}
  }

  renderGame(pub);
}

function startGame() {
  if (seats.length < 2 || chosen.length !== 20) {
    return toast('20개 역할을 고르고 최소 2명이 참가해야 합니다.');
  }

  const roles = [...chosen].sort(() => Math.random() - 0.5);
  const shuffled = [...seats].sort(() => Math.random() - 0.5);

  seats = shuffled.map((p, i) => ({ ...p, role: roles[i], alive: true }));

  round = 0;
  phase = 'role';
  state = { actions: {}, lastEvent: '역할을 비밀리에 확인하세요.' };
  pendingVotes = {};
  history = [];

  for (const p of seats) {
    if (p.id === 'host') {
      myRole = p.role;
    } else {
      const c = [...links.values()].find(x => x.__seat === p.id);
      if (c) {
        c.send({ type: 'privateRole', role: p.role });
        c.send({
          type: 'start',
          roles: { [p.id]: p.role },
          seats: seats.map(q => ({ id: q.id, name: q.name, alive: true })),
          public: { phase, round, message: state.lastEvent }
        });
      }
    }
  }

  broadcastPublic();
  renderGame();
}

function renderGame(pub = {}) {
  if (!$('#game') || $('#game').classList.contains('hidden')) return;

  $('#phase').textContent = ({
    role: 'ROLE REVEAL',
    night: 'NIGHT PHASE',
    day: 'DAY PHASE',
    vote: 'VOTE RESULT',
    end: 'GAME OVER'
  })[phase] || phase.toUpperCase();

  $('#gameTitle').textContent = ({
    role: '역할 확인',
    night: `밤 ${round} · 비밀 행동`,
    day: `낮 ${round} · 토론과 투표`,
    vote: '투표 결과',
    end: '게임 종료'
  })[phase] || '온라인 게임';

  $('#gameMessage').textContent = pub.message || state.lastEvent || '게임이 진행 중입니다.';
  $('#round').textContent = round;

  $('#myRole').classList.toggle('hidden', !myRole);
  if (myRole) {
    const r = getRole(myRole);
    $('#myRole').innerHTML = `
      <span class="eyebrow">내 비밀 역할 · ${teamLabel(r.team)}</span>
      <b>${r.name}</b>
      <p>${r.power}</p>
    `;
  }

  $('#publicBoard').innerHTML = `
    <h3>생존 현황 · ${alive().length}/20</h3>
    <div class="board">
      ${seats.map(p => `
        <span class="seat ${p.alive === false ? 'dead' : ''}">
          ${esc(p.name)}${p.id === myId ? ' · 나' : ''}
        </span>
      `).join('')}
    </div>
  `;

  renderControls();
}

function renderControls() {
  const c = $('#gameControls');

  if (!host) {
    c.innerHTML =
      phase === 'day'
        ? `
          <div class="panel">
            <h3>비밀 투표</h3>
            <select id="myVote">
              <option value="">대상 선택</option>
              ${alive().filter(p => p.id !== myId).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select>
            <button id="sendVote" class="primary">투표 제출</button>
          </div>
        `
        : phase === 'night' && myRole
          ? `
            <div class="panel">
              <h3>밤 행동 (해당 직업만)</h3>
              <p class="hint">방장이 행동 순서를 안내합니다. 능력이 있는 경우 대상을 고르세요.</p>
              <select id="nightTarget">
                <option value="">대상 선택</option>
                ${alive().filter(p => p.id !== myId).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
              </select>
              <button id="sendAction" class="primary">행동 제출</button>
            </div>
          `
          : '';

    $('#sendVote')?.addEventListener('click', () => {
      const target = $('#myVote').value;
      if (!target) return toast('투표 대상을 선택하세요.');
      links.get('host')?.send({ type: 'vote', id: myId, target });
      toast('투표를 제출했습니다.');
    });

    $('#sendAction')?.addEventListener('click', () => {
      const target = $('#nightTarget').value;
      if (!target) return toast('대상을 선택하세요.');
      links.get('host')?.send({ type: 'action', role: myRole, target });
      toast('밤 행동을 제출했습니다.');
    });

    return;
  }

  let html = '';

  if (phase === 'role') {
    html = `
      <div class="panel">
        <p>각 참가자가 자기 역할을 확인했습니다. 모두 준비되면 밤으로 이동하세요.</p>
        <button class="primary" id="goNight">밤으로 진행 <b>→</b></button>
      </div>
    `;
  }

  if (phase === 'night') {
    html = `
      <div class="panel">
        <h3>밤 행동 취합</h3>
        <p>참가자의 비밀 행동 제출을 기다립니다. 마피아 공격은 방장이 토론을 거쳐 결정하세요.</p>
        <button class="primary" id="goDay">아침이 밝았습니다 <b>→</b></button>
      </div>
    `;
  }

  if (phase === 'day') {
    html = `
      <div class="panel">
        <h3>투표 취합 · ${Object.keys(pendingVotes).length}/${alive().length}표</h3>
        <div class="vote-results">
          ${Object.entries(pendingVotes).map(([v, t]) => `
            <span>${esc(seats.find(p => p.id === v)?.name || '')} → ${esc(seats.find(p => p.id === t)?.name || '')}</span>
          `).join('')}
        </div>
        <button class="primary" id="resolveVote">투표 집계 및 다음 밤 <b>→</b></button>
      </div>
    `;
  }

  if (phase === 'end') {
    html = `
      <div class="panel">
        <h2>게임 종료</h2>
        <button class="primary" onclick="location.reload()">새 게임</button>
      </div>
    `;
  }

  c.innerHTML = html;

  $('#goNight')?.addEventListener('click', () => {
    phase = 'night';
    round += 1;
    state.actions = {};
    state.lastEvent = `밤 ${round}입니다. 각자 비밀 행동을 진행하세요.`;
    broadcastPublic();
  });

  $('#goDay')?.addEventListener('click', () => {
    phase = 'day';
    state.lastEvent = '낮 토론을 시작하세요. 모든 생존자는 비밀 투표를 제출합니다.';
    pendingVotes = {};
    broadcastPublic();
  });

  $('#resolveVote')?.addEventListener('click', resolveVotes);
}

function resolveVotes() {
  const tally = {};
  for (const [voter, target] of Object.entries(pendingVotes)) {
    const p = seats.find(x => x.id === voter);
    tally[target] = (tally[target] || 0) + (p?.role === 'politician' ? 2 : 1);
  }

  const max = Math.max(0, ...Object.values(tally));
  const top = Object.keys(tally).filter(k => tally[k] === max);
  const out = top.length === 1 ? seats.find(p => p.id === top[0]) : null;

  history.push({
    seats: seats.map(p => ({ ...p })),
    round,
    votes: { ...pendingVotes },
    phase: 'day'
  });

  if (out) {
    if (out.role === 'clown') {
      out.alive = false;
      phase = 'end';
      state.lastEvent = `${out.name} (광대)가 처형되어 단독 승리했습니다.`;
    } else {
      out.alive = false;
      state.lastEvent = `${out.name}님이 투표로 탈락했습니다. 역할은 공개되지 않습니다.`;
    }
  } else {
    state.lastEvent = '동률입니다. 아무도 탈락하지 않았습니다.';
  }

  pendingVotes = {};
  const w = winCheck();

  if (w) {
    phase = 'end';
    state.lastEvent = w;
  }

  broadcastPublic();

  if (out?.role === 'clown' || w) {
    renderEnd(w || '광대 단독 승리');
  } else {
    phase = 'night';
    round += 1;
    state.lastEvent += ' 다음 밤으로 이동합니다.';
    broadcastPublic();
  }
}

function winCheck() {
  const mafiaAlive = alive().filter(p => getRole(p.role).team === 'mafia').length;
  const townAlive = alive().filter(p => getRole(p.role).team === 'town').length;
  const psychopathAlive = alive().filter(p => p.role === 'psychopath');

  if (psychopathAlive.length && alive().length === 1) return '사이코패스 단독 승리';
  if (mafiaAlive === 0) return '시민 팀 승리';
  if (mafiaAlive >= townAlive) return '마피아 팀 승리';

  return '';
}

function renderEnd(w) {
  phase = 'end';
  state.lastEvent = w;

  $('#gameTitle').textContent = '게임 종료';
  $('#gameMessage').textContent = w;

  $('#gameControls').innerHTML = `
    <div class="panel">
      <h3>전체 역할 공개</h3>
      <div class="final-list">
        ${seats.map(p => `
          <div>${esc(p.name)} · ${getRole(p.role).name} (${teamLabel(getRole(p.role).team)}) ${p.alive ? '생존' : '탈락'}</div>
        `).join('')}
      </div>
      <button class="primary" onclick="location.reload()">새 게임</button>
    </div>
  `;

  broadcastPublic();
}

$('#copyCode').onclick = async () => {
  try {
    await navigator.clipboard.writeText(room);
    toast('방 코드 복사 완료: ' + room);
  } catch {
    toast('방 코드: ' + room);
  }
};

renderRolePicker();
