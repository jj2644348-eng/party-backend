const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const SUPER_OWNER = "lp5006352@gmail.com";

let users = {
  [SUPER_OWNER]: {
    pbId: '2081902760',
    email: SUPER_OWNER,
    username: '☆ Lucky Ak47 🖥️☆',
    coins: 1000000000,
    role: 'owner'
  }
};

let activeRooms = [
  { id: 'room_101', name: '🎤 PB Underground Rap Battle 101', host: '☆ Lucky Ak47 🖥️☆', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', seats: Array(12).fill(null) },
  { id: 'room_102', name: 'SINGLE GIRLS 🍻 BOYS Party', host: 'Mr Love', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', seats: Array(12).fill(null) }
];

app.post('/api/auth/gmail', (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ success: false });
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER.toLowerCase());

  if (isOwner) {
    users[em] = { pbId: '2081902760', email: SUPER_OWNER, username: username || '☆ Lucky Ak47 🖥️☆', coins: 1000000000, role: 'owner' };
  } else if (!users[em]) {
    users[em] = { pbId: Math.floor(10000000 + Math.random() * 90000000).toString(), email: em, username: username || em.split('@')[0], coins: 10000, role: 'member' };
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
      r.seats = r.seats.map(s => s && s.name === d.username ? null : s);
      r.seats[d.seatIndex] = { name: d.username, isMuted: false };
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

  socket.on('toggle_self_mic', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      let seat = r.seats.find(s => s && s.name === d.username);
      if (seat) {
        seat.isMuted = !seat.isMuted;
        io.to(d.roomId).emit('stage_synced', r.seats);
      }
    }
  });
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>BoloHi PB Live</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; user-select: none; }
    body { background: #031518; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: #041a1e; display: flex; flex-direction: column; position: relative; }
    #auth { position: absolute; inset:0; background: #041a1e; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }
    .inp { background: #08292f; border: 1px solid #145963; border-radius: 8px; padding: 12px; color: #fff; outline: none; font-size: 14px; }
    .btn { background: linear-gradient(90deg, #ffaa00, #ff0055); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }
    .top-header { height: 50px; padding: 0 12px; display: flex; justify-content: space-between; align-items: center; background: #031418; border-bottom: 1px solid #145963; flex-shrink: 0; }
    .top-tabs { display: flex; gap: 16px; font-size: 15px; font-weight: bold; }
    .top-tab { color: #5aa19b; cursor: pointer; }
    .top-tab.active { color: #ffd700; }
    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .panel.active { display: flex; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
    .card { background: #072227; border-radius: 10px; overflow: hidden; border: 1px solid #145963; cursor: pointer; }
    .card img { width: 100%; height: 120px; object-fit: cover; }
    .card-info { padding: 8px; }
    .bnav { height: 56px; background: #031418; border-top: 1px solid #145963; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #5aa19b; cursor: pointer; gap: 2px; }
    .nav-item.active { color: #00f0ff; font-weight: bold; }
    .room { position: absolute; inset:0; background: #020e10; z-index: 200; display: none; flex-direction: column; }
    .room-top { height: 46px; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; background: #041a1e; border-bottom: 1px solid #145963; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px; }
    .seat-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .ring { width: 44px; height: 44px; border-radius: 50%; background: #08292f; border: 2px solid #145963; display: flex; justify-content: center; align-items: center; font-size: 10px; font-weight: bold; }
    .ring.on { border-color: #ffd700; color: #ffd700; background: #133a35; }
    .ring.muted { border-color: #ff3344; color: #ff3344; }
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
    <div style="background:gold; color:#000; font-weight:bold; padding:2px 8px; border-radius:10px; font-size:11px;" id="uCoins">0 C</div>
  </div>

  <div class="panel active" id="tabParty">
    <div class="grid" id="rList"></div>
  </div>

  <div class="panel" id="tabDiscover">
    <div style="padding:24px; text-align:center;"><h3 style="color:#ffd700;">🎰 Discover & Games</h3></div>
  </div>

  <div class="panel" id="tabFamily">
    <div style="padding:24px; text-align:center;"><h3 style="color:#00f0ff;">👥 PB Royal Family</h3></div>
  </div>

  <div class="panel" id="tabMessage">
    <div style="padding:16px;"><h4 style="color:#ffd700;">🔔 Messages (68)</h4></div>
  </div>

  <div class="panel" id="tabMe">
    <div style="padding:20px; text-align:center;">
      <h3 id="meUname">User</h3>
      <p id="meId" style="color:#ffd700; font-size:12px; margin:4px 0 14px;"></p>
      <button class="btn" style="background:#333;" onclick="logout()">Logout</button>
    </div>
  </div>

  <div class="room" id="rScreen">
    <div class="room-top">
      <span id="rTitle" style="color:#ffd700; font-weight:bold; font-size:12px;">Room</span>
      <div style="display:flex; gap:6px;">
        <button id="btnMic" class="btn" style="padding:4px 8px; font-size:10px; background:#145963; display:none;" onclick="toggleMic()">🎙️ Mic On</button>
        <button class="btn" style="padding:4px 10px; font-size:10px;" onclick="exitR()">Exit</button>
      </div>
    </div>
    <div class="stage" id="stg"></div>
  </div>

  <div class="bnav">
    <div class="nav-item active" onclick="switchNav('tabParty', this)"><div style="font-size:18px;">🕌</div><span>Party</span></div>
    <div class="nav-item" onclick="switchNav('tabDiscover', this)"><div style="font-size:18px;">🧭</div><span>Discover</span></div>
    <div class="nav-item" onclick="switchNav('tabFamily', this)"><div style="font-size:18px;">👥</div><span>Family</span></div>
    <div class="nav-item" onclick="switchNav('tabMessage', this)"><div style="font-size:18px;">🔔</div><span>Message</span></div>
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
      <div class="card" onclick="openR('\${r.id}', '\${r.name}')">
        <img src="\${r.banner}">
        <div class="card-info">
          <div style="font-size:11px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${r.name}</div>
          <div style="font-size:10px; color:#6bbbb3; margin-top:4px;">🇮🇳 \${r.host}</div>
        </div>
      </div>
    \`).join('');
  }

  function auth() {
    let email = document.getElementById('aMail').value;
    let username = document.getElementById('aName').value;
    fetch('/api/auth/gmail', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, username }) 
    })
    .then(r => r.json()).then(d => {
      if (d.success) { 
        user = d.user; 
        localStorage.setItem('pb_u', JSON.stringify(user)); 
        document.getElementById('auth').style.display = 'none'; 
        syncMe(); 
      }
    });
  }

  function syncMe() {
    document.getElementById('uCoins').innerText = user.coins + ' C';
    document.getElementById('meUname').innerText = user.username;
    document.getElementById('meId').innerText = 'ID: ' + user.pbId;
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
    if (type === 'mine') renderRooms(allRooms.filter(r => r.host === user?.username || r.host === '☆ Lucky Ak47 🖥️☆'));
    else if (type === 'party') renderRooms(allRooms);
  }

  function openR(id, name) {
    curId = id;
    document.getElementById('rTitle').innerText = name;
    document.getElementById('rScreen').style.display = 'flex';
    seats = Array(12).fill(null);
    drawStage();
    socket.emit('join_room', { roomId: id, username: user.username });
  }

  function exitR() { socket.emit('leave_room', { roomId: curId, username: user.username }); document.getElementById('rScreen').style.display = 'none'; curId = null; }

  function drawStage() {
    document.getElementById('stg').innerHTML = seats.map((s, i) => \`
      <div class="seat-box" onclick="toggleSeat(\${i})">
        <div class="ring \${s ? (s.isMuted ? 'muted' : 'on') : ''}">\${s ? (s.isMuted ? '🔇' : s.name.substring(0,2)) : (i===0?'👑':i+1)}</div>
        <span style="font-size:8px; color:#5aa19b; margin-top:2px;">\${s ? s.name : (i===0?'Console':'Mic '+(i+1))}</span>
      </div>
    \`).join('');

    let mySeat = seats.find(s => s && s.name === user?.username);
    let micBtn = document.getElementById('btnMic');
    if (mySeat) {
      micBtn.style.display = 'block';
      micBtn.innerText = mySeat.isMuted ? '🔇 Muted' : '🎙️ Mic On';
    } else {
      micBtn.style.display = 'none';
    }
  }

  function toggleSeat(i) {
    if (!seats[i]) socket.emit('take_seat', { roomId: curId, seatIndex: i, username: user.username });
    else if (seats[i].name === user.username) socket.emit('leave_seat', { roomId: curId, seatIndex: i, username: user.username });
  }

  function toggleMic() {
    socket.emit('toggle_self_mic', { roomId: curId, username: user.username });
  }

  function logout() { localStorage.removeItem('pb_u'); location.reload(); }

  socket.on('stage_synced', s => { seats = s; drawStage(); });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on port ' + PORT);
});
                            
