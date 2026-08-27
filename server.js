const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

function generatePBId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

const SUPER_OWNER_EMAIL = "lovepreet@gmail.com";

let users = {
  [SUPER_OWNER_EMAIL]: { 
    pbId: '2081902760',
    email: SUPER_OWNER_EMAIL,
    username: '☆ Lucky Ak47 🖥️☆', 
    coins: 10000000, 
    diamonds: 500000, 
    role: 'owner', 
    userLevel: 99, 
    vipLevel: 10, 
    followers: 46,
    following: 108,
    friends: 43,
    family: 'PB Royals',
    frame: 'frame-gold-glow'
  }
};

let activeRooms = [
  { id: 'room_101', name: '🎤 PB Underground Rap Battle 101', host: 'Lucky Ak47', category: 'Rap', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', seats: Array(12).fill(null), currentBeat: 'Drill 140 BPM', pk: { teamRed: 0, teamBlue: 0, active: true } },
  { id: 'room_102', name: '🔥 Desi Beats & Melodies Freestyle', host: 'PB_Rapper', category: 'Music', banner: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300', seats: Array(12).fill(null), currentBeat: 'Punjabi Dhol Trap', pk: { teamRed: 0, teamBlue: 0, active: false } },
  { id: 'room_103', name: '35+💎Follow VS Follow Lounge', host: 'Kunal', category: 'Hot', banner: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', seats: Array(12).fill(null), currentBeat: 'None', pk: { teamRed: 0, teamBlue: 0, active: false } }
];

app.post('/api/auth/gmail', (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ success: false, msg: 'Email required!' });
  const em = email.toLowerCase().trim();
  const isExactOwner = (em === SUPER_OWNER_EMAIL.toLowerCase());

  if (!users[em]) {
    users[em] = {
      pbId: generatePBId(),
      email: em,
      username: username || em.split('@')[0],
      coins: isExactOwner ? 10000000 : 5000,
      diamonds: isExactOwner ? 500000 : 100,
      role: isExactOwner ? 'owner' : 'member',
      userLevel: isExactOwner ? 99 : 1,
      vipLevel: isExactOwner ? 10 : 0,
      followers: 0,
      following: 0,
      friends: 0,
      family: 'None',
      frame: isExactOwner ? 'frame-gold-glow' : 'frame-none'
    };
  }
  res.json({ success: true, user: users[em] });
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));

io.on('connection', (socket) => {
  socket.on('join_room', (d) => {
    socket.join(d.roomId);
    io.to(d.roomId).emit('user_entered', { user: d.username, pbId: d.pbId, vip: d.vipLevel });
  });

  socket.on('leave_room', (d) => {
    socket.leave(d.roomId);
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room) {
      for (let i = 0; i < room.seats.length; i++) {
        if (room.seats[i] && room.seats[i].name === d.username) room.seats[i] = null;
      }
      io.to(d.roomId).emit('stage_synced', room.seats);
    }
  });

  socket.on('take_seat', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room) {
      for (let i = 0; i < room.seats.length; i++) {
        if (room.seats[i] && room.seats[i].name === d.username) room.seats[i] = null;
      }
      room.seats[d.seatIndex] = { name: d.username, pbId: d.pbId, vip: d.vipLevel };
      io.to(d.roomId).emit('stage_synced', room.seats);
    }
  });

  socket.on('leave_seat', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room && room.seats[d.seatIndex] && room.seats[d.seatIndex].name === d.username) {
      room.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('stage_synced', room.seats);
    }
  });

  socket.on('change_beat', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room) {
      room.currentBeat = d.beat;
      io.to(d.roomId).emit('beat_updated', d.beat);
    }
  });

  socket.on('rap_vote', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room && room.pk) {
      if (d.team === 'red') room.pk.teamRed += d.points;
      else room.pk.teamBlue += d.points;
      io.to(d.roomId).emit('pk_score_updated', room.pk);
    }
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));

  socket.on('send_gift', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room && room.pk) {
      if (d.targetTeam === 'red') room.pk.teamRed += d.cost;
      else if (d.targetTeam === 'blue') room.pk.teamBlue += d.cost;
      io.to(d.roomId).emit('pk_score_updated', room.pk);
    }
    io.to(d.roomId).emit('gift_blast', d);
  });
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BoloHi PB Rap & Live Studio</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    html, body { width: 100%; height: 100%; background: #000; color: #111; overflow: hidden; display: flex; justify-content: center; }
    .app-shell { width: 100%; max-width: 440px; height: 100%; background: #0a0c16; display: flex; flex-direction: column; position: relative; color: #fff; }

    #authOverlay { position: absolute; top:0; left:0; width:100%; height:100%; background: #070914; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; }
    .auth-box { background: #131830; padding: 24px; border-radius: 16px; border: 1px solid #222b52; display: flex; flex-direction: column; gap: 12px; }
    .auth-inp { background: #1a203e; border: 1px solid #2c3666; border-radius: 10px; padding: 12px; color: #fff; outline: none; }
    .auth-btn { background: #ff0055; color: #fff; font-weight: 900; border: none; padding: 12px; border-radius: 10px; cursor: pointer; }

    .top-head { height: 48px; padding: 0 14px; display: flex; justify-content: space-between; align-items: center; background: #12162c; border-bottom: 1px solid #1c2242; }
    .app-logo { font-size: 18px; font-weight: 900; color: #ff0055; letter-spacing: -0.5px; }

    .sub-tabs { display: flex; gap: 8px; padding: 8px 14px; background: #12162c; overflow-x: auto; border-bottom: 1px solid #1c2242; }
    .stab { padding: 4px 14px; border-radius: 14px; font-size: 12px; font-weight: bold; background: #1a203e; color: #8a94b8; cursor: pointer; white-space: nowrap; }
    .stab.active { background: #ff0055; color: #fff; }

    .view-panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .view-panel.active { display: flex; }

    .rap-banner { margin: 12px 14px; height: 110px; border-radius: 14px; background: linear-gradient(135deg, #ff0055, #7928ca); padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 4px 15px rgba(255,0,85,0.3); }
    .party-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px 14px; }
    .p-card { background: #131830; border-radius: 12px; overflow: hidden; border: 1px solid #1f274c; cursor: pointer; }
    .p-thumb { height: 120px; position: relative; }
    .p-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .p-tag { position: absolute; bottom: 8px; left: 8px; background: #ff0055; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 8px; }
    .p-info { padding: 8px; font-size: 11px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .me-head { padding: 20px 14px; background: linear-gradient(180deg, #161b36 0%, #0a0c16 100%); display: flex; gap: 12px; align-items: center; }
    .me-avatar { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #ffd700; object-fit: cover; }
    .me-stats { display: flex; justify-content: space-around; padding: 12px 14px; background: #131830; border-radius: 12px; margin: 10px 14px; }
    .me-stats div { text-align: center; font-size: 11px; color: #8a94b8; }
    .me-stats b { display: block; font-size: 15px; color: #ffd700; }

    .room-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, #26112d 0%, #080914 100%); z-index: 200; display: none; flex-direction: column; }
    .rap-pk-bar { height: 36px; background: #101428; display: flex; align-items: center; padding: 0 10px; border-bottom: 1px solid #20274e; gap: 8px; }
    .pk-red { flex: 1; background: #ff0055; height: 10px; border-radius: 5px 0 0 5px; transition: 0.3s; }
    .pk-blue { flex: 1; background: #00f0ff; height: 10px; border-radius: 0 5px 5px 0; transition: 0.3s; }

    .stage-12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 4px; padding: 10px 6px; }
    .seat-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .seat-ring { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.2); display: flex; justify-content: center; align-items: center; font-size: 13px; font-weight: bold; }
    .seat-ring.occupied { border-color: #00f0ff; background: #1b264f; color: #00f0ff; box-shadow: 0 0 12px #00f0ff; }
    .seat-name { font-size: 9px; margin-top: 4px; color: #a4b0d8; max-width: 50px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }

    .beat-bar { height: 38px; background: #12162c; border-top: 1px solid #1c2242; border-bottom: 1px solid #1c2242; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; font-size: 11px; }
    .beat-btn { background: #ff0055; border: none; padding: 4px 10px; border-radius: 8px; color: #fff; font-size: 10px; font-weight: bold; cursor: pointer; }

    #beatModal { position: absolute; bottom: 0; left: 0; width: 100%; background: #101428; border-top: 2px solid #ff0055; padding: 14px; display: none; flex-direction: column; gap: 8px; z-index: 250; }
    .beat-item { background: #171d3a; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; cursor: pointer; }

    .bottom-nav { height: 54px; background: #101428; border-top: 1px solid #1c2242; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-btn { display: flex; flex-direction: column; align-items: center; color: #6f7a9f; font-size: 10px; font-weight: bold; background: transparent; border: none; cursor: pointer; gap: 2px; }
    .nav-btn.active { color: #ff0055; }
    .nav-btn span { font-size: 18px; }
  </style>
</head>
<body>
<div class="app-shell">

  <!-- AUTH SCREEN -->
  <div id="authOverlay">
    <div class="auth-box">
      <h2 style="color:#ff0055; text-align:center;">🎤 PB RAP LIVE</h2>
      <input type="text" id="authName" class="auth-inp" placeholder="Display Name" value="☆ Lucky Ak47 🖥️☆">
      <input type="email" id="authEmail" class="auth-inp" placeholder="Gmail Address" value="lovepreet@gmail.com">
      <button class="auth-btn" onclick="submitAuth()">Enter Studio</button>
    </div>
  </div>

  <!-- TOP HEADER -->
  <div class="top-head">
    <span class="app-logo">🎤 BoloHi Rap Live</span>
    <div style="display:flex; gap:10px; font-size:11px; font-weight:bold;">
      <span style="background:gold; color:#000; padding:2px 8px; border-radius:10px;" id="topCoins">0 C</span>
    </div>
  </div>

  <!-- SUB TABS -->
  <div class="sub-tabs">
    <div class="stab active" onclick="switchFilter('Rap')">🎤 Rap Battle</div>
    <div class="stab" onclick="switchFilter('Music')">🎵 Beats</div>
    <div class="stab" onclick="switchFilter('Hot')">🔥 Hot Party</div>
  </div>

  <!-- TAB 1: RAP & PARTY LOBBY -->
  <div class="view-panel active" id="tabParty">
    <div class="rap-banner">
      <h3>🔥 Live Rap & DJ Studio</h3>
      <p style="font-size:11px; opacity:0.85;">12-Mic Stage, Live Beat Loops & PK Rap Battles!</p>
    </div>
    <div class="party-grid" id="roomsList"></div>
  </div>

  <!-- TAB 2: ME -->
  <div class="view-panel" id="tabMe">
    <div class="me-head">
      <img class="me-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200">
      <div>
        <h3 id="meTitle" style="font-size:15px;">Lucky Ak47</h3>
        <p id="meIdDisplay" style="font-size:11px; color:#ffd700;">ID: 2081902760</p>
      </div>
    </div>
    <div class="me-stats">
      <div><b id="meCoins">0</b>Coins</div>
      <div><b id="meDia">0</b>Diamonds</div>
      <div><b>Lv. 99</b>Level</div>
      <div><b>VIP 10</b>VIP</div>
    </div>
    <div style="padding:14px; text-align:center; color:#ff3344; font-weight:bold; cursor:pointer;" onclick="logout()">🚪 Logout</div>
  </div>

  <!-- 12-MIC RAP BATTLE STAGE -->
  <div class="room-overlay" id="roomScreen">
    <div style="height:44px; display:flex; justify-content:space-between; align-items:center; padding:0 12px; background:rgba(0,0,0,0.4);">
      <h4 id="rmTitle" style="font-size:12px; color:#ff0055;">🎤 Rap Stage 101</h4>
      <button style="background:#ff3344; color:#fff; border:none; padding:4px 10px; border-radius:10px; font-weight:bold; font-size:11px; cursor:pointer;" onclick="exitRoom()">Exit</button>
    </div>

    <!-- Live PK Rap Scoreboard -->
    <div class="rap-pk-bar">
      <span style="font-size:10px; font-weight:bold; color:#ff0055;" id="scoreRed">🔴 Red: 0</span>
      <div style="flex:1; display:flex; gap:2px; height:8px;">
        <div class="pk-red" id="barRed"></div>
        <div class="pk-blue" id="barBlue"></div>
      </div>
      <span style="font-size:10px; font-weight:bold; color:#00f0ff;" id="scoreBlue">🔵 Blue: 0</span>
    </div>

    <!-- 12 Seats Stage -->
    <div class="stage-12" id="stageGrid"></div>

    <!-- Live Beat Player Console -->
    <div class="beat-bar">
      <span id="curBeatTxt">🎵 Beat: Drill 140 BPM</span>
      <button class="beat-btn" onclick="toggleBeatModal()">🎧 Select Beat</button>
    </div>

    <!-- Room Chat -->
    <div style="flex:1; padding:8px 12px; overflow-y:auto; font-size:11px;" id="chatBox">
      <div style="background:rgba(0,0,0,0.4); padding:4px 8px; border-radius:6px; width:fit-content; color:#00f0ff;">🎤 Rap Stage Live. Tap mic to freestyle!</div>
    </div>

    <!-- Bottom Controls -->
    <div style="height:48px; background:#0c0f20; display:flex; align-items:center; padding:0 10px; gap:8px;">
      <input type="text" id="chatInp" style="flex:1; background:#161a34; border:1px solid #28305e; border-radius:14px; padding:6px 10px; color:#fff; font-size:12px;" placeholder="Drop your lyrics...">
      <button style="background:#ff0055; color:#fff; border:none; border-radius:10px; padding:6px 12px; font-weight:bold;" onclick="sendMsg()">➤</button>
      <button style="background:#00f0ff; color:#000; border:none; border-radius:10px; padding:6px 10px; font-weight:bold;" onclick="votePK('blue')">🔵 Vote</button>
      <button style="background:#ff0055; color:#fff; border:none; border-radius:10px; padding:6px 10px; font-weight:bold;" onclick="votePK('red')">🔴 Vote</button>
    </div>

    <!-- Beat Selector Modal -->
    <div id="beatModal">
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold;">
        <span>Select Freestyle Rap Beat</span>
        <button style="background:transparent; color:#fff; border:none;" onclick="toggleBeatModal()">✕</button>
      </div>
      <div class="beat-item" onclick="setBeat('Drill Beat 140 BPM')"><span>🔥 Punjabi Drill 140 BPM</span><button class="beat-btn">Play</button></div>
      <div class="beat-item" onclick="setBeat('Desi Boombap 90 BPM')"><span>📻 Old School Boombap 90 BPM</span><button class="beat-btn">Play</button></div>
      <div class="beat-item" onclick="setBeat('808 Heavy Trap')"><span>⚡ 808 Heavy Trap Bass</span><button class="beat-btn">Play</button></div>
    </div>
  </div>

  <!-- 2-TAB BOTTOM BAR -->
  <div class="bottom-nav">
    <button class="nav-btn active" id="nbParty" onclick="switchNav('tabParty', 'nbParty')"><span>🏠</span>Party</button>
    <button class="nav-btn" id="nbMe" onclick="switchNav('tabMe', 'nbMe')"><span>👤</span>Me</button>
  </div>
</div>

<script>
  const socket = io();
  let user = null;
  let curRoomId = null;
  let activeSeats = Array(12).fill(null);
  let allRooms = [];

  let saved = localStorage.getItem('bolo_user');
  if(saved) {
    user = JSON.parse(saved);
    document.getElementById('authOverlay').style.display = 'none';
    renderUser();
  }

  fetch('/api/rooms').then(r => r.json()).then(rooms => {
    allRooms = rooms;
    renderRooms(rooms);
  });

  function submitAuth() {
    let email = document.getElementById('authEmail').value;
    let username = document.getElementById('authName').value;
    fetch('/api/auth/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username })
    }).then(r => r.json()).then(d => {
      if(d.success) {
        user = d.user;
        localStorage.setItem('bolo_user', JSON.stringify(user));
        document.getElementById('authOverlay').style.display = 'none';
        renderUser();
      }
    });
  }

  function logout() { localStorage.removeItem('bolo_user'); location.reload(); }

  function renderUser() {
    document.getElementById('meTitle').innerText = user.username;
    document.getElementById('meIdDisplay').innerText = 'ID: ' + user.pbId;
    document.getElementById('topCoins').innerText = user.coins + ' C';
    document.getElementById('meCoins').innerText = user.coins;
    document.getElementById('meDia').innerText = user.diamonds;
  }

  function renderRooms(rooms) {
    let box = document.getElementById('roomsList');
    box.innerHTML = rooms.map(r => \`
      <div class="p-card" onclick="openRoom('\${r.id}', '\${r.name}', '\${r.currentBeat}')">
        <div class="p-thumb">
          <img src="\${r.banner}">
          <span class="p-tag">\${r.category}</span>
        </div>
        <div class="p-info">\${r.name}</div>
      </div>
    \`).join('');
  }

  function switchFilter(cat) {
    document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderRooms(allRooms.filter(r => cat === 'All' || r.category === cat));
  }

  function switchNav(tabId, btnId) {
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById(btnId).classList.add('active');
  }

  function openRoom(id, name, beat) {
    curRoomId = id;
    document.getElementById('rmTitle').innerText = name;
    document.getElementById('curBeatTxt').innerText = '🎵 Beat: ' + (beat || 'Drill 140 BPM');
    document.getElementById('roomScreen').style.display = 'flex';
    renderStage();
    socket.emit('join_room', { roomId: id, username: user.username, pbId: user.pbId, vipLevel: user.vipLevel });
  }

  function exitRoom() {
    socket.emit('leave_room', { roomId: curRoomId, username: user.username });
    document.getElementById('roomScreen').style.display = 'none';
    curRoomId = null;
  }

  function renderStage() {
    let s = document.getElementById('stageGrid');
    s.innerHTML = activeSeats.map((occ, i) => \`
      <div class="seat-box" onclick="toggleSeat(\${i})">
        <div class="seat-ring \${occ ? 'occupied' : ''}">\${occ ? occ.name.substring(0,2) : (i===0?'👑':'+')}</div>
        <div class="seat-name">\${occ ? occ.name : (i===0?'Console':'Mic '+(i+1))}</div>
      </div>
    \`).join('');
  }

  func
