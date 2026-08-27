const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const SUPER_OWNER_EMAIL = "lp5006352@gmail.com";

let users = {
  [SUPER_OWNER_EMAIL]: { 
    pbId: '2081902760', 
    email: SUPER_OWNER_EMAIL, 
    username: '☆ Lucky Ak47 🖥️☆', 
    coins: 1000000000, 
    diamonds: 5000000, 
    role: 'owner', 
    vipLevel: 10 
  }
};

let activeRooms = [
  { id: 'room_101', name: '🎤 PB Underground Rap Battle 101', host: 'Lucky Ak47', category: 'Rap', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', seats: Array(12).fill(null), beat: 'Drill 140 BPM' },
  { id: 'room_102', name: 'SINGLE GIRLS 🍻 BOYS Party', host: 'Mr Love', category: 'Hot', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', seats: Array(12).fill(null), beat: 'Dhol Trap' }
];

app.post('/api/auth/gmail', (req, res) => {
  let { email, username, customId } = req.body;
  if (!email) return res.status(400).json({ success: false });
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER_EMAIL.toLowerCase());

  if (isOwner) {
    users[em] = {
      pbId: '2081902760',
      email: SUPER_OWNER_EMAIL,
      username: username || '☆ Lucky Ak47 🖥️☆',
      coins: 1000000000,
      diamonds: 5000000,
      role: 'owner',
      vipLevel: 10
    };
  } else if (!users[em]) {
    users[em] = {
      pbId: customId ? customId.trim() : Math.floor(10000000 + Math.random() * 90000000).toString(),
      email: em,
      username: username || em.split('@')[0],
      coins: 10000,
      diamonds: 200,
      role: 'member',
      vipLevel: 0
    };
  }
  res.json({ success: true, user: users[em] });
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));

io.on('connection', (socket) => {
  socket.on('join_room', (d) => socket.join(d.roomId));
  socket.on('leave_room', (d) => {
    socket.leave(d.roomId);
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      r.seats = r.seats.map(s => s && s.name === d.username ? null : s);
      io.to(d.roomId).emit('stage_synced', r.seats);
    }
  });

  socket.on('take_seat', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      if (r.seats[d.seatIndex] && r.seats[d.seatIndex].locked) return;
      r.seats = r.seats.map(s => s && s.name === d.username ? null : s);
      r.seats[d.seatIndex] = { name: d.username, isMuted: false, locked: false };
      io.to(d.roomId).emit('stage_synced', r.seats);
    }
  });

  socket.on('leave_seat', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r && r.seats[d.seatIndex] && r.seats[d.seatIndex].name === d.username) {
      r.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('stage_synced', r.seats);
    }
  });

  socket.on('toggle_self_mute', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      let s = r.seats.find(x => x && x.name === d.username);
      if (s) { s.isMuted = !s.isMuted; io.to(d.roomId).emit('stage_synced', r.seats); }
    }
  });

  socket.on('update_room_layout', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      let count = parseInt(d.seatCount);
      let newSeats = Array(count).fill(null);
      for (let i = 0; i < Math.min(r.seats.length, count); i++) newSeats[i] = r.seats[i];
      r.seats = newSeats;
      io.to(d.roomId).emit('room_updated', r);
    }
  });

  socket.on('god_mode_action', (d) => {
    let requester = users[d.requesterEmail.toLowerCase().trim()];
    if (!requester || requester.role !== 'owner') return;

    let targetUser = Object.values(users).find(u => u.username.toLowerCase() === d.target.toLowerCase() || u.pbId === d.target || u.email === d.target);
    if (!targetUser) { socket.emit('god_success', "User not found!"); return; }

    if (d.action === 'coins') {
      targetUser.coins += d.value;
      io.emit('wallet_synced', { email: targetUser.email, coins: targetUser.coins });
      socket.emit('god_success', `Sent ${d.value} coins to ${targetUser.username}`);
    } else if (d.action === 'vip') {
      targetUser.vipLevel = d.value;
      socket.emit('god_success', `Set VIP Level ${d.value} for ${targetUser.username}`);
    }
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));
});

// पूरा UI सीधे सर्वर से लोड होगा
app.get('*', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>BoloHi PB Live</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; user-select: none; }
    body { background: #031518; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: radial-gradient(circle at top, #0c3b38 0%, #031418 100%); display: flex; flex-direction: column; position: relative; }

    #auth { position: absolute; top:0; left:0; width:100%; height:100%; background: #041b1f; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }
    .inp { background: #08292f; border: 1px solid #145963; border-radius: 8px; padding: 12px; color: #fff; outline: none; }
    .btn { background: linear-gradient(90deg, #ffaa00, #ff0055); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }

    .top-header { height: 50px; padding: 0 12px; display: flex; justify-content: space-between; align-items: center; background: rgba(3, 20, 24, 0.9); flex-shrink: 0; border-bottom: 1px solid rgba(255,215,0,0.2); }
    .top-tabs { display: flex; gap: 16px; font-size: 15px; font-weight: bold; }
    .top-tab { color: #5aa19b; cursor: pointer; }
    .top-tab.active { color: #ffd700; border-bottom: 2px solid #ffd700; }
    .top-icons { display: flex; gap: 10px; font-size: 16px; }
    .top-icon-btn { background: rgba(0,0,0,0.4); border: 1px solid #145963; border-radius: 50%; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; cursor: pointer; }

    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 65px; }
    .panel.active { display: flex; }

    .filter-bar { display: flex; gap: 10px; padding: 10px 12px 6px; }
    .btn-pill { background: #092c30; border: 1px solid #1a626a; border-radius: 16px; padding: 5px 14px; font-size: 12px; font-weight: bold; color: #6bbbb3; cursor: pointer; }
    .btn-pill.active { background: linear-gradient(90deg, #00d2c4, #007d75); color: #fff; border-color: #00f0ff; }

    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px 12px; }
    .card { background: #072227; border-radius: 12px; overflow: hidden; border: 1.5px solid #145963; cursor: pointer; }
    .card img { width: 100%; height: 130px; object-fit: cover; }
    .card-meta { padding: 8px; }

    .bnav { height: 56px; background: #041a1e; border-top: 1px solid #145963; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; color: #4e8c85; font-size: 10px; font-weight: bold; cursor: pointer; position: relative; }
    .nav-item.active { color: #00f0ff; }
    .badge { position: absolute; top: -2px; right: -6px; background: #ff0055; color: #fff; font-size: 8px; padding: 1px 4px; border-radius: 8px; }

    .room { position: absolute; top:0; left:0; width:100%; height:100%; background: #05191d; z-index: 200; display: none; flex-direction: column; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 10px; flex-shrink: 0; }
    .seat { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .ring { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid #145963; display: flex; justify-content: center; align-items: center; font-size: 11px; font-weight: bold; }
    .ring.on { border-color: #ffd700; color: #ffd700; background: #133a35; }
    
    .god-panel { background: #06282e; border: 2px solid #ffd700; border-radius: 10px; padding: 12px; margin: 10px; display: none; flex-direction: column; gap: 8px; }
  </style>
</head>
<body>
<div class="app">

  <div id="auth">
    <h2 style="color:#ffd700; text-align:center;">👑 BoloHi PB Live</h2>
    <input type="text" id="aName" class="inp" placeholder="Name" value="☆ Lucky Ak47 🖥️☆">
    <input type="email" id="aMail" class="inp" placeholder="Gmail" value="lp5006352@gmail.com">
    <button class="btn" onclick="auth()">Enter Studio</button>
  </div>

  <div class="top-header">
    <div class="top-tabs">
      <span class="top-tab" onclick="switchTopTab('mine', this)">Mine</span>
      <span class="top-tab active" onclick="switchTopTab('party', this)">Party</span>
      <span class="top-tab" onclick="switchTopTab('events', this)">Events</span>
    </div>
    <div class="top-icons">
      <div class="top-icon-btn" onclick="alert('🎁 Daily Bonus: 5,000 Coins Claimed!')">🎁</div>
      <div class="top-icon-btn" onclick="openMyRoom()">🏠</div>
    </div>
  </div>

  <div class="panel active" id="tabParty">
    <div class="filter-bar">
      <button class="btn-pill active" onclick="switchFilter('popular', this)">🔥 Popular</button>
      <button class="btn-pill" onclick="switchFilter('new', this)">✨ New</button>
    </div>
    <div class="grid" id="rList"></div>
  </div>

  <div class="panel" id="tabDiscover">
    <div style="padding:20px; text-align:center;">
      <h3 style="color:#ffd700;">🎰 Discover & Games</h3>
    </div>
  </div>

  <div class="panel" id="tabFamily">
    <div style="padding:20px; text-align:center;">
      <h3 style="color:#00f0ff;">👥 Family & Agency</h3>
    </div>
  </div>

  <div class="panel" id="tabMessage">
    <div style="padding:16px;">
      <h4 style="color:#ffd700;">🔔 System Notices (68)</h4>
      <p style="font-size:12px; margin-top:8px; color:#888;">Welcome to PB Live Studio!</p>
    </div>
  </div>

  <div class="panel" id="tabMe">
    <div style="padding:16px; text-align:center;">
      <h3 id="meUname">User</h3>
      <p id="meId" style="color:#ffd700; font-size:11px; margin:4px 0;"></p>
      <p id="meRole" style="color:#00f0ff; font-size:11px; margin-bottom:10px;"></p>
      <div style="background:gold; color:#000; font-weight:bold; padding:4px 10px; border-radius:12px; display:inline-block;" id="uCoins">0 C</div>

      <div class="god-panel" id="godPanel">
        <div style="color:#ffd700; font-weight:bold; font-size:12px;">👑 SUPER OWNER GOD MODE</div>
        <input type="text" id="godTarget" class="inp" placeholder="Target Username / ID" style="padding:6px; font-size:11px;">
        <div style="display:flex; gap:6px;">
          <input type="number" id="godCoins" class="inp" placeholder="Coins" style="flex:1; padding:6px; font-size:11px;">
          <button class="btn" style="padding:6px 10px; background:gold; color:#000;" onclick="godAction('coins')">Add Coins</button>
        </div>
        <button class="btn" style="padding:6px; background:#00f0ff; color:#000; font-size:11px;" onclick="godAction('vip')">Grant VIP 10 🌟</button>
      </div>

      <button class="btn" style="background:#333; margin-top:10px;" onclick="logout()">Logout</button>
    </div>
  </div>

  <div class="room" id="rScreen">
    <div style="height:48px; display:flex; justify-content:space-between; align-items:center; padding:0 12px; background:#041a1e;">
      <span id="rTitle" style="font-size:12px; font-weight:bold; color:#ffd700;">Room</span>
      <button class="btn" style="padding:4px 10px; font-size:10px;" onclick="exitR()">Exit Room</button>
    </div>
    <div class="stage" id="stg"></div>
    <div style="flex:1; padding:10px; overflow-y:auto;" id="cBox"></div>
    <div style="height:48px; background:#031418; display:flex; align-items:center; padding:0 10px; gap:6px;">
      <input type="text" id="cInp" style="flex:1; background:#072227; border:1px solid #145963; border-radius:12px; padding:6px 10px; color:#fff; font-size:11px;" placeholder="Message...">
      <button class="btn" style="padding:6px 12px;" onclick="sendMsg()">➤</button>
    </div>
  </div>

  <div class="bnav">
    <div class="nav-item active" onclick="switchNav('tabParty', this)"><div style="font-size:18px;">🕌</div><span>Party</span></div>
    <div class="nav-item" onclick="switchNav('tabDiscover', this)"><div style="font-size:18px;">🧭</div><span>Discover</span></div>
    <div class="nav-item" onclick="switchNav('tabFamily', this)"><div style="font-size:18px;">👥</div><span>Family</span></div>
    <div class="nav-item" onclick="switchNav('tabMessage', this)"><div style="font-size:18px;">🔔</div><span class="badge">68</span><span>Message</span></div>
    <div class="nav-item" onclick="switchNav('tabMe', this)"><div style="font-size:18px;">🌙</div><span>Me</span></div>
  </div>

</div>

<script>
  const socket = io();
  let user = null, curId = null, seats = Array(12).fill(null), allRooms = [];

  let sv = localStorage.getItem('pb_u');
  if (sv) { user = JSON.parse(sv); document.getElementById('auth').style.display = 'none'; syncMe(); }

  fetch('/api/rooms').then(r => r.json()).then(rms => {
    allRooms = rms;
    renderRooms(rms);
  });

  function renderRooms(rms) {
    document.getElementById('rList').innerHTML = rms.map(r => \`
      <div class="card" onclick="openR('\${r.id}', '\${r.name}', \${r.seats.length})">
        <img src="\${r.banner}">
        <div class="card-meta">
          <div style="font-size:11px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${r.name}</div>
          <div style="display:flex; justify-content:space-between; font-size:10px; color:#6bbbb3; margin-top:4px;">
            <span>🇮🇳 \${r.host}</span>
            <span>🟢 \${r.seats.filter(x=>x).length + 1} live</span>
          </div>
        </div>
      </div>
    \`).join('');
  }

  function auth() {
    let email = document.getElementById('aMail').value;
    let username = document.getElementById('aName').value;
    fetch('/api/auth/gmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username }) })
    .then(r => r.json()).then(d => {
      if (d.success) { user = d.user; localStorage.setItem('pb_u', JSON.stringify(user)); document.getElementById('auth').style.display = 'none'; syncMe(); }
    });
  }

  function syncMe() {
    document.getElementById('uCoins').innerText = user.coins + ' C';
    document.getElementById('meUname').innerText = user.username;
    document.getElementById('meId').innerText = 'ID: ' + user.pbId;
    document.getElementById('meRole').innerText = user.role === 'owner' ? '👑 Super Owner' : 'VIP Member';
    if (user.role === 'owner') document.getElementById('godPanel').style.display = 'flex';
  }

  function switchNav(tabId, el) {
    document.querySelectorAll('.bnav .nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
  }

  function switchTopTab(type, el) {
    document.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }

  function switchFilter(fType, el) {
    document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  function openMyRoom() {
    let myR = allRooms[0];
    if (myR) openR(myR.id, myR.name, myR.seats.length);
  }

  function openR(id, name, seatLen) {
    curId = id;
    document.getElementById('rTitle').innerText = name;
    document.getElementById('rScreen').style.display = 'flex';
    seats = Array(seatLen || 12).fill(null);
    drawStage();
    socket.emit('join_room', { roomId: id, username: user.username });
  }

  function exitR() { socket.emit('leave_room', { roomId: curId, username: user.username }); document.getElementById('rScreen').style.display = 'none'; curId = null; }

  function drawStage() {
    document.getElementById('stg').innerHTML = seats.map((s, i) => \`
      <div class="seat" onclick="toggleSeat(\${i})">
        <div class="ring \${s ? 'on' : ''}">\${s ? s.name.substring(0,2) : (i === 0 ? '👑' : i+1)}</div>
        <span style="font-size:8px; color:#72beb6; margin-top:2px;">\${s ? s.name : (i===0?'Console':'Mic '+(i+1))}</span>
      </div>
    \`).join('');
  }

  function toggleSeat(i) {
    if (!seats[i]) socket.emit('take_seat', { roomId: curId, seatIndex: i, username: user.username, email: user.email });
    else if (seats[i].name === user.username) socket.emit('leave_seat', { roomId: curId, seatIndex: i, username: user.username });
  }

  function sendMsg() {
    let inp = document.getElementById('cInp');
    if (inp.value.trim()) { socket.emit('send_chat', { roomId: curId, user: user.username, msg: inp.value }); inp.value = ''; }
  }

  function godAction(type) {
    let target = document.getElementById('godTarget').value;
    let val = type === 'coins' ? parseInt(document.getElementById('godCoins').value) || 0 : 10;
    socket.emit('god_mode_action', { requesterEmail: user.email, target, action: type, value: val });
  }

  function logout() { localStorage.removeItem('pb_u'); location.reload(); }

  socket.on('stage_synced', s => { seats = s; drawStage(); });
  socket.on('recv_chat', d => {
    let b = document.getElementById('cBox');
    b.innerHTML += '<div><b style="color:#00f0ff;">' + d.user + ':</b> ' + d.msg + '</div>';
    b.scrollTop = b.scrollHeight;
  });
  socket.on('god_success', msg => { alert(msg); syncMe(); });
</script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Master Engine Live on Port ' + PORT);
});
          
