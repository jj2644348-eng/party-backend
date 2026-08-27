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
    role: 'owner',
    vipLevel: 10
  }
};

let activeRooms = [
  { id: 'room_101', name: '🎤 PB Underground Rap Battle 101', host: '☆ Lucky Ak47 🖥️☆', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', seats: Array(12).fill(null) },
  { id: 'room_102', name: 'SINGLE GIRLS 🍻 BOYS Party', host: 'Mr Love', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', seats: Array(12).fill(null) }
];

app.post('/api/auth/gmail', (req, res) => {
  let { email, username, customId } = req.body;
  if (!email) return res.status(400).json({ success: false, msg: "Email required" });
  
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER_EMAIL.toLowerCase());

  if (isOwner) {
    users[em] = {
      pbId: '2081902760',
      email: SUPER_OWNER_EMAIL,
      username: username || '☆ Lucky Ak47 🖥️☆',
      coins: 1000000000,
      role: 'owner',
      vipLevel: 10
    };
  } else if (!users[em]) {
    users[em] = {
      pbId: customId ? customId.trim() : Math.floor(10000000 + Math.random() * 90000000).toString(),
      email: em,
      username: username || em.split('@')[0],
      coins: 10000,
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

  socket.on('god_mode_action', (d) => {
    let requester = users[d.requesterEmail?.toLowerCase().trim()];
    if (!requester || requester.role !== 'owner') return;

    let targetUser = Object.values(users).find(u => 
      u.username.toLowerCase() === d.target.toLowerCase() || 
      u.pbId === d.target || 
      u.email === d.target
    );
    if (!targetUser) {
      socket.emit('god_success', "यूज़र नहीं मिला!");
      return;
    }

    if (d.action === 'coins') {
      targetUser.coins += d.value;
      io.emit('wallet_synced', { email: targetUser.email, coins: targetUser.coins });
      socket.emit('god_success', `${targetUser.username} को ${d.value} कॉइन्स भेज दिए गए!`);
    } else if (d.action === 'vip') {
      targetUser.vipLevel = d.value;
      socket.emit('god_success', `${targetUser.username} को VIP ${d.value} दे दिया गया!`);
    }
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));
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
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    body { background: #031518; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: #041a1e; display: flex; flex-direction: column; position: relative; }

    #auth { position: absolute; inset:0; background: #041a1e; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }
    .inp { background: #08292f; border: 1px solid #145963; border-radius: 8px; padding: 12px; color: #fff; outline: none; font-size: 14px; }
    .btn { background: linear-gradient(90deg, #ffaa00, #ff0055); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }

    .top-header { height: 50px; padding: 0 12px; display: flex; justify-content: space-between; align-items: center; background: #031418; border-bottom: 1px solid #145963; flex-shrink: 0; }
    .top-tabs { display: flex; gap: 16px; font-size: 15px; font-weight: bold; }
    .top-tab { color: #5aa19b; cursor: pointer; position: relative; }
    .top-tab.active { color: #ffd700; }
    .top-tab.active::after { content:''; position: absolute; bottom: -4px; left: 0; width: 100%; height: 2px; background: #ffd700; }
    .top-icons { display: flex; gap: 8px; font-size: 16px; }
    .icon-btn { background: #08292f; border: 1px solid #145963; border-radius: 50%; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; cursor: pointer; }

    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .panel.active { display: flex; }

    .filter-bar { display: flex; gap: 8px; padding: 10px 12px; }
    .pill { background: #092c30; border: 1px solid #1a626a; border-radius: 16px; padding: 4px 12px; font-size: 12px; font-weight: bold; color: #6bbbb3; cursor: pointer; }
    .pill.active { background: linear-gradient(90deg, #00d2c4, #007d75); color: #fff; border-color: #00f0ff; }

    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px 12px; }
    .card { background: #072227; border-radius: 10px; overflow: hidden; border: 1px solid #145963; cursor: pointer; }
    .card img { width: 100%; height: 120px; object-fit: cover; }
    .card-info { padding: 8px; }

    .bnav { height: 56px; background: #031418; border-top: 1px solid #145963; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #5aa19b; cursor: pointer; position: relative; gap: 2px; }
    .nav-item.active { color: #00f0ff; font-weight: bold; }
    .badge { position: absolute; top: -2px; right: -6px; background: #ff0055; color: #fff; font-size: 8px; padding: 1px 4px; border-radius: 8px; font-weight: bold; }

    .room { position: absolute; inset:0; background: #020e10; z-index: 200; display: none; flex-direction: column; }
    .room-top { height: 46px; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; background: #041a1e; border-bottom: 1px solid #145963; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px; }
    .seat-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .ring { width: 44px; height: 44px; border-radius: 50%; background: #08292f; border: 2px solid #145963; display: flex; justify-content: center; align-items: center; font-size: 10px; font-weight: bold; }
    .ring.on { border-color: #ffd700; color: #ffd700; background: #133a35; }
    .ring.muted { border-color: #ff3344; color: #ff3344; }

    .god-panel { background: #06282e; border: 2px solid #ffd700; border-radius: 10px; padding: 12px; margin: 12px; display: none; flex-direction: column; gap: 8px; }
  </style>
</head>
<body>
<div class="app">

  <div id="auth">
    <h2 style="color:#ffd700; text-align:center;">👑 BoloHi PB Live</h2>
    <input type="text" id="aName" class="inp" placeholder="Name" value="☆ Lucky Ak47 🖥️☆">
    <input type="email" id="aMail" class="inp" placeholder="Gmail" value="lp5006352@gmail.com">
    <input type="text" id="aCustomId" class="inp" placeholder="Custom PB ID (Optional)">
    <button class="btn" onclick="auth()">Enter Studio</button>
  </div>

  <div class="top-header">
    <div class="top-tabs">
      <span class="top-tab" onclick="switchTopTab('mine', this)">Mine</span>
      <span class="top-tab active" onclick="switchTopTab('party', this)">Party</span>
      <span class="top-tab" onclick="switchTopTab('events', this)">Events</span>
    </div>
    <div class="top-icons">
      <div class="icon-btn" onclick="claimDailyBonus()">🎁</div>
      <div class="icon-btn" onclick="openMyRoom()">🏠</div>
    </div>
  </div>

  <div class="panel active" id="tabParty">
    <div class="filter-bar">
      <button class="pill active" onclick="filterList('popular', this)">🔥 Popular</button>
      <button class="pill" onclick="filterList('new', this)">✨ New</button>
    </div>
    <div class="grid" id="rList"></div>
  </div>

  <div class="panel" id="tabDiscover">
    <div style="padding:24px; text-align:center;">
      <h3 style="color:#ffd700;">🎰 Games & Roulette</h3>
      <p style="color:#888; font-size:12px; margin-top:8px;">Greedy Fruit & Wheel Games coming next!</p>
    </div>
  </div>

  <div class="panel" id="tabFamily">
    <div style="padding:24px; text-align:center;">
      <h3 style="color:#00f0ff;">👥 PB Royal Family</h3>
      <p style="color:#888; font-size:12px; margin-top:8px;">Join official Agency & Guilds</p>
    </div>
  </div>

  <div class="panel" id="tabMessage">
    <div style="padding:16px;">
      <h4 style="color:#ffd700; margin-bottom:10px;">🔔 System Messages (68)</h4>
      <div style="background:#072227; padding:10px; border-radius:8px; border:1px solid #145963; font-size:12px;">
        <b style="color:#00f0ff;">System:</b> Daily login rewards added to your account!
      </div>
    </div>
  </div>

  <div class="panel" id="tabMe">
    <div style="padding:20px; text-align:center;">
      <h3 id="meUname">User</h3>
      <p id="meId" style="color:#ffd700; font-size:12px; margin:4px 0;"></p>
      <p id="meRole" style="color:#00f0ff; font-size:11px; margin-bottom:10px;"></p>
      <div style="background:gold; color:#000; font-weight:bold; padding:4px 12px; border-radius:12px; display:inline-block;" id="uCoins">0 C</div>

      <div class="god-panel" id="godPanel">
        <div style="color:#ffd700; font-weight:bold; font-size:12px;">👑 SUPER OWNER GOD MODE</div>
        <input type="text" id="godTarget" class="inp" placeholder="Target Username / PB ID" style="padding:8px; font-size:11px;">
        <div style="display:flex; gap:6px;">
          <input type="number" id="godCoins" class="inp" placeholder="Coins" style="flex:1; padding:8px; font-size:11px;">
          <button class="btn" style="padding:8px 12px; background:gold; color:#000;" onclick="godAction('coins')">Add Coins</button>
        </div>
        <button class="btn" style="padding:8px; background:#00f0ff; color:#000; font-size:11px;" onclick="godAction('vip')">Grant VIP 10 🌟</button>
      </div>

      <button class="btn" style="background:#333; margin-top:16px;" onclick="logout()">Logout</button>
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
      <div class="card" onclick="openR('\${r.id}', '\${r.name}')">
        <img src="\${r.banner}">
        <div class="card-info">
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
    let customId = document.getElementById('aCustomId').value;
    fetch('/api/auth/gmail', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ email, username, customId }) 
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
    if (type === 'mine') renderRooms(allRooms.filter(r => r.host === user?.username || r.host === '☆ Lucky Ak47 🖥️☆'));
    else if (type === 'party') renderRooms(allRooms);
    else if (type === 'events') alert("🎉 Events: VIP Super Carnival Live!");
  }

  function filterList(type, el) {
    document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    if (type === 'popular') renderRooms(allRooms);
    else renderRooms([...allRooms].reverse());
  }

  function claimDailyBonus() {
    alert("🎁 Daily Reward: 5,000 Coins Claimed!");
    user.coins += 5000;
    syncMe();
  }

  function openMyRoom() {
    let r = allRooms[0];
    if (r) openR(r.id, r.name);
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

  function sendMsg() {
    let inp = document.getElementById('cInp');
    if (inp.value.trim()) { socket.emit('send_chat', { roomId: curId, user: user.username, msg: inp.value }); inp.value = ''; }
  }

  function godAction(type) {
    let target = document.getElementById('godTarget').value;
    if (!target) { alert("Target ID / Name डालें!"); return; }
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
  socket.on('wallet_synced', d => {
    if (user && d.email === user.email) {
      user.coins = d.coins;
      localStorage.setItem('pb_u', JSON.stringify(user));
      syncMe();
    }
  });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('BoloHi PB Live Master Live on Port ' + PORT);
});
    
