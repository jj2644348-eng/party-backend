const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const SUPER_OWNER = "lovepreet@gmail.com";

let users = {
  [SUPER_OWNER]: { pbId: '2081902760', email: SUPER_OWNER, username: '☆ Lucky Ak47 🖥️☆', coins: 10000000, diamonds: 500000, role: 'owner', vipLevel: 10 }
};

let activeRooms = [
  { id: 'room_101', name: '🎤 PB Rap Battle 101', host: 'Lucky Ak47', category: 'Rap', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300', seats: Array(12).fill(null), beat: 'Drill 140 BPM', pk: { red: 0, blue: 0 } },
  { id: 'room_102', name: 'SINGLE GIRLS 🍻 BOYS Party', host: 'Mr Love', category: 'Hot', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', seats: Array(12).fill(null), beat: 'Dhol Trap', pk: { red: 0, blue: 0 } }
];

app.post('/api/auth/gmail', (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ success: false });
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER.toLowerCase());

  if (!users[em]) {
    users[em] = {
      pbId: Math.floor(10000000 + Math.random() * 90000000).toString(),
      email: em,
      username: username || em.split('@')[0],
      coins: isOwner ? 10000000 : 5000,
      diamonds: isOwner ? 500000 : 100,
      role: isOwner ? 'owner' : 'member',
      vipLevel: isOwner ? 10 : 0
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
      r.seats = r.seats.map(s => s && s.name === d.username ? null : s);
      r.seats[d.seatIndex] = { name: d.username };
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
  socket.on('change_beat', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) { r.beat = d.beat; io.to(d.roomId).emit('beat_updated', d.beat); }
  });
  socket.on('vote_pk', (d) => {
    let r = activeRooms.find(x => x.id === d.roomId);
    if (r) {
      if (d.team === 'red') r.pk.red += 100; else r.pk.blue += 100;
      io.to(d.roomId).emit('pk_updated', r.pk);
    }
  });
  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));
  socket.on('send_gift', (d) => io.to(d.roomId).emit('gift_blast', d));
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>PB Live Studio</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
    body { background: #000; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: #0b0e1b; display: flex; flex-direction: column; position: relative; }
    #auth { position: absolute; top:0; left:0; width:100%; height:100%; background: #070914; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }
    .inp { background: #1a203e; border: 1px solid #2c3666; border-radius: 8px; padding: 12px; color: #fff; }
    .btn { background: #ff0055; color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }
    .head { height: 48px; padding: 0 14px; display: flex; justify-content: space-between; align-items: center; background: #12162c; border-bottom: 1px solid #1c2242; }
    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .panel.active { display: flex; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
    .card { background: #131830; border-radius: 10px; overflow: hidden; border: 1px solid #1f274c; cursor: pointer; padding-bottom: 8px; }
    .card img { width: 100%; height: 110px; object-fit: cover; }
    .room { position: absolute; top:0; left:0; width:100%; height:100%; background: #070914; z-index: 200; display: none; flex-direction: column; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 10px; }
    .seat { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .ring { width: 44px; height: 44px; border-radius: 50%; background: #1a203e; border: 2px solid #2e3b6d; display: flex; justify-content: center; align-items: center; font-size: 11px; }
    .ring.on { border-color: #00f0ff; color: #00f0ff; background: #1f2c52; }
    .pk { height: 32px; background: #101428; display: flex; align-items: center; padding: 0 10px; gap: 8px; font-size: 11px; font-weight: bold; }
    .pk-bar { flex: 1; height: 8px; display: flex; background: #222; border-radius: 4px; overflow: hidden; }
    .chat { flex: 1; padding: 8px; overflow-y: auto; font-size: 11px; display: flex; flex-direction: column; gap: 4px; }
    .bnav { height: 50px; background: #101428; border-top: 1px solid #1c2242; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; }
  </style>
</head>
<body>
<div class="app">
  <div id="auth">
    <h2 style="color:#ff0055; text-align:center;">👑 BoloHi PB Live</h2>
    <input type="text" id="aName" class="inp" placeholder="Name" value="☆ Lucky Ak47 🖥️☆">
    <input type="email" id="aMail" class="inp" placeholder="Gmail" value="lovepreet@gmail.com">
    <button class="btn" onclick="auth()">Enter Live Studio</button>
  </div>

  <div class="head">
    <span style="font-weight:900; color:#ff0055;">BoloHi PB Live</span>
    <span style="font-size:11px; background:gold; color:#000; padding:2px 8px; border-radius:10px;" id="uCoins">0 C</span>
  </div>

  <div class="panel active" id="tabRooms">
    <div class="grid" id="rList"></div>
  </div>

  <div class="panel" id="tabMe">
    <div style="padding:20px; text-align:center;">
      <h3 id="meUname">User</h3>
      <p id="meId" style="color:#ffd700; font-size:11px; margin:4px 0 12px;"></p>
      <button class="btn" style="background:#333;" onclick="logout()">Logout</button>
    </div>
  </div>

  <div class="room" id="rScreen">
    <div style="height:44px; display:flex; justify-content:space-between; align-items:center; padding:0 12px; background:#12162c;">
      <span id="rTitle" style="font-size:12px; font-weight:bold; color:#ff0055;">Room</span>
      <button class="btn" style="padding:4px 10px; font-size:10px;" onclick="exitR()">Exit</button>
    </div>
    <div class="pk">
      <span id="pkR" style="color:#ff0055;">🔴 Red: 0</span>
      <div class="pk-bar"><div id="bRed" style="flex:1; background:#ff0055;"></div><div id="bBlue" style="flex:1; background:#00f0ff;"></div></div>
      <span id="pkB" style="color:#00f0ff;">🔵 Blue: 0</span>
    </div>
    <div class="stage" id="stg"></div>
    <div style="padding:4px 10px; background:#161c38; display:flex; justify-content:space-between; font-size:10px;">
      <span id="bTxt">🎵 Beat: Drill 140 BPM</span>
      <button onclick="setBeat()" style="background:#00f0ff; border:none; padding:2px 6px; border-radius:4px; font-weight:bold;">🎧 Beat</button>
    </div>
    <div class="chat" id="cBox"></div>
    <div style="height:44px; background:#0c0f20; display:flex; align-items:center; padding:0 8px; gap:6px;">
      <input type="text" id="cInp" style="flex:1; background:#1a203e; border:1px solid #333; border-radius:12px; padding:6px 10px; color:#fff; font-size:11px;" placeholder="Message...">
      <button class="btn" style="padding:6px 10px;" onclick="sendMsg()">➤</button>
      <button onclick="votePK('red')" style="background:#ff0055; color:#fff; border:none; padding:6px; border-radius:6px; font-size:10px;">🔴</button>
      <button onclick="votePK('blue')" style="background:#00f0ff; color:#000; border:none; padding:6px; border-radius:6px; font-size:10px;">🔵</button>
      <button onclick="sendGift()" style="background:gold; color:#000; border:none; padding:6px; border-radius:6px; font-size:10px;">🎁</button>
    </div>
  </div>

  <div class="bnav">
    <button onclick="showTab('tabRooms')" style="background:none; border:none; color:#ff0055; font-weight:bold; font-size:12px; cursor:pointer;">🏠 Party</button>
    <button onclick="showTab('tabMe')" style="background:none; border:none; color:#888; font-weight:bold; font-size:12px; cursor:pointer;">👤 Me</button>
  </div>
</div>

<script>
  const socket = io();
  let user = null, curId = null, seats = Array(12).fill(null);

  let sv = localStorage.getItem('pb_u');
  if (sv) { user = JSON.parse(sv); document.getElementById('auth').style.display = 'none'; syncMe(); }

  fetch('/api/rooms').then(r => r.json()).then(rms => {
    document.getElementById('rList').innerHTML = rms.map(r => \`
      <div class="card" onclick="openR('\${r.id}', '\${r.name}', '\${r.beat}')">
        <img src="\${r.banner}">
        <div style="padding:6px 8px; font-size:11px; font-weight:bold;">\${r.name}</div>
      </div>
    \`).join('');
  });

  function auth() {
    let email = document.getElementById('aMail').value, username = document.getElementById('aName').value;
    fetch('/api/auth/gmail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username }) })
    .then(r => r.json()).then(d => {
      if (d.success) { user = d.user; localStorage.setItem('pb_u', JSON.stringify(user)); document.getElementById('auth').style.display = 'none'; syncMe(); }
    });
  }

  function syncMe() {
    document.getElementById('uCoins').innerText = user.coins + ' C';
    document.getElementById('meUname').innerText = user.username;
    document.getElementById('meId').innerText = 'ID: ' + user.pbId;
  }

  function logout() { localStorage.removeItem('pb_u'); location.reload(); }
  function showTab(id) { document.querySelectorAll('.panel').forEach(p => p.classList.remove('active')); document.getElementById(id).classList.add('active'); }

  function openR(id, name, beat) {
    curId = id; document.getElementById('rTitle').innerText = name;
    document.getElementById('bTxt').innerText = '🎵 Beat: ' + beat;
    document.getElementById('rScreen').style.display = 'flex';
    drawStage(); socket.emit('join_room', { roomId: id, username: user.username });
  }

  function exitR() { socket.emit('leave_room', { roomId: curId, username: user.username }); document.getElementById('rScreen').style.display = 'none'; curId = null; }

  function drawStage() {
    document.getElementById('stg').innerHTML = seats.map((s, i) => \`
      <div class="seat" onclick="tapSeat(\${i})">
        <div class="ring \${s ? 'on' : ''}">\${s ? s.name.substring(0,2) : (i===0?'👑':i+1)}</div>
        <span style="font-size:8px; color:#888; margin-top:2px;">\${s ? s.name : (i===0?'Console':'Mic '+(i+1))}</span>
      </div>
    \`).join('');
  }

  function tapSeat(i) {
    if (seats[i] && seats[i].name === user.username) socket.emit('leave_seat', { roomId: curId, seatIndex: i, username: user.username });
    else if (!seats[i]) socket.emit('take_seat', { roomId: curId, seatIndex: i, username: user.username });
  }

  function setBeat() {
    let b = prompt("Enter Beat (e.g. Drill 140, Boombap 90, Trap 808):", "Trap 808 BPM");
    if (b) socket.emit('change_beat', { roomId: curId, beat: b });
  }

  function votePK(t) { socket.emit('vote_pk', { roomId: curId, team: t }); }
  function sendMsg() {
    let inp = document.getElementById('cInp');
    if (!inp.value.trim()) return;
    socket.emit('send_chat', { roomId: curId, user: user.username, msg: inp.value }); inp.value = '';
  }
  function sendGift() { socket.emit('send_gift', { roomId: curId, sender: user.username, name: 'VIP Ring 💍' }); }

  socket.on('stage_synced', s => { seats = s; drawStage(); });
  socket.on('beat_updated', b => document.getElementById('bTxt').innerText = '🎵 Beat: ' + b);
  socket.on('pk_updated', pk => {
    document.getElementById('pkR').innerText = '🔴 Red: ' + pk.red;
    document.getElementById('pkB').innerText = '🔵 Blue: ' + pk.blue;
    let tot = (pk.red + pk.blue) || 1;
    document.getElementById('bRed').style.flex = pk.red / tot;
    document.getElementById('bBlue').style.flex = pk.blue / tot;
  });
  socket.on('recv_chat', d => {
    let b = document.getElementById('cBox');
    b.innerHTML += '<div><b style="color:#00f0ff;">' + d.user + ':</b> ' + d.msg + '</div>';
    b.scrollTop = b.scrollHeight;
  });
  socket.on('gift_blast', d => {
    let b = document.getElementById('cBox');
    b.innerHTML += '<div style="background:gold; color:#000; font-weight:bold; padding:2px 4px; border-radius:4px;">🎁 ' + d.sender + ' sent ' + d.name + '</div>';
    b.scrollTop = b.scrollHeight;
  });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Studio running on Port ' + PORT);
});

