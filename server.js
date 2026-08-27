const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// 1. Data Store (Users & Families)
let users = {
  'lovepreet': { 
    username: 'Lovepreet', 
    coins: 10000000, 
    diamonds: 500000, 
    role: 'owner', 
    userLevel: 99, 
    vipLevel: 10, 
    family: 'PB Royals' 
  }
};

let families = [
  { id: 'pb_royals', name: 'PB Royals', leader: 'Lovepreet', members: 12, power: 85000, badge: '👑' },
  { id: 'desi_club', name: 'Desi Warriors', leader: 'PB_Hero', members: 8, power: 34000, badge: '🔥' }
];

let activeRooms = [
  { id: 'room_101', name: 'PB 101 Royal Club', host: 'Lovepreet', category: 'Voice Party', seats: Array(8).fill(null) },
  { id: 'room_102', name: 'Desi Shayari & Melodies', host: 'PB_Poet', category: 'Music & Poetry', seats: Array(8).fill(null) }
];

// 2. Core APIs
app.get('/api/user/:username', (req, res) => {
  let u = req.params.username.toLowerCase();
  if (!users[u]) {
    users[u] = {
      username: req.params.username,
      coins: (u === 'lovepreet' || u === 'admin') ? 10000000 : 5000,
      diamonds: (u === 'lovepreet' || u === 'admin') ? 500000 : 200,
      role: (u === 'lovepreet' || u === 'admin') ? 'owner' : 'member',
      userLevel: (u === 'lovepreet' || u === 'admin') ? 99 : 1,
      vipLevel: (u === 'lovepreet' || u === 'admin') ? 10 : 0,
      family: 'None'
    };
  }
  res.json(users[u]);
});

app.get('/api/families', (req, res) => res.json(families));
app.get('/api/rooms', (req, res) => res.json(activeRooms));

// 3. Real-Time Socket Center
io.on('connection', (socket) => {
  socket.on('join_room', (d) => {
    socket.join(d.roomId);
    io.to(d.roomId).emit('user_entered', { user: d.username, vip: d.vipLevel, family: d.family });
  });

  socket.on('leave_room', (d) => {
    socket.leave(d.roomId);
    io.to(d.roomId).emit('user_left', { user: d.username });
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));

  socket.on('take_seat', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room && !room.seats[d.seatIndex]) {
      room.seats[d.seatIndex] = d.username;
      io.to(d.roomId).emit('stage_synced', room.seats);
    }
  });

  socket.on('leave_seat', (d) => {
    let room = activeRooms.find(r => r.id === d.roomId);
    if (room && room.seats[d.seatIndex] === d.username) {
      room.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('stage_synced', room.seats);
    }
  });

  socket.on('send_gift', (d) => {
    io.to(d.roomId).emit('gift_blast', d);
  });

  socket.on('admin_recharge', (d) => {
    let target = d.target.toLowerCase();
    if (!users[target]) {
      users[target] = { username: d.target, coins: d.amount, diamonds: 0, role: 'member', userLevel: 1, vipLevel: 1, family: 'None' };
    } else {
      users[target].coins += d.amount;
    }
    io.emit('wallet_synced', { username: users[target].username, coins: users[target].coins });
  });
});

// 4. Main App Interface (All Views Built-in)
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>PB 3D Live Voice Studio</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    body { background: #060813; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app-shell { width: 100%; max-width: 440px; height: 100%; background: #0c0f20; display: flex; flex-direction: column; position: relative; }
    
    /* Header */
    .app-head { height: 52px; padding: 0 14px; background: #12162c; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1c2242; }
    .brand-title { font-size: 15px; font-weight: 900; color: #ff0055; letter-spacing: 0.5px; }
    .wallet-box { display: flex; gap: 6px; font-size: 11px; font-weight: bold; }
    .coin-badge { background: linear-gradient(90deg, #ffd700, #ff9900); color: #000; padding: 4px 8px; border-radius: 12px; }
    .dia-badge { background: linear-gradient(90deg, #00f0ff, #0077ff); color: #000; padding: 4px 8px; border-radius: 12px; }

    /* Views */
    .view-panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 65px; }
    .view-panel.active { display: flex; }

    /* Party Lobby */
    .hero-banner { margin: 12px 14px; height: 110px; border-radius: 14px; background: linear-gradient(135deg, #ff0055, #7928ca); padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; }
    .sec-label { font-size: 12px; font-weight: bold; color: #8a94b8; margin: 10px 14px 6px; text-transform: uppercase; }
    .room-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 14px; }
    .room-tile { background: #141933; border-radius: 12px; padding: 12px; border: 1px solid #20274e; cursor: pointer; }
    .room-tag { font-size: 9px; background: #ff0055; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; width: fit-content; margin-bottom: 6px; }
    
    /* Family View */
    .fam-card { margin: 6px 14px; background: #141933; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #20274e; }
    .fam-badge { font-size: 24px; width: 44px; height: 44px; background: #1d2448; border-radius: 50%; display: flex; justify-content: center; align-items: center; }

    /* Me View */
    .me-banner { padding: 20px 14px; background: linear-gradient(180deg, #171c38 0%, #0c0f20 100%); display: flex; flex-direction: column; align-items: center; }
    .me-avatar { width: 72px; height: 72px; border-radius: 50%; border: 3px solid #ffd700; box-shadow: 0 0 12px #ffd700; margin-bottom: 8px; }
    .stats-card { margin: 12px 14px; background: #141933; border-radius: 12px; padding: 14px; display: flex; justify-content: space-around; border: 1px solid #20274e; }
    .stat-item { text-align: center; font-size: 11px; color: #8a94b8; }
    .stat-item b { font-size: 16px; color: #ffd700; display: block; margin-bottom: 2px; }
    .admin-recharge-btn { margin: 10px 14px; padding: 12px; background: linear-gradient(90deg, #ff0055, #ff5500); border-radius: 10px; text-align: center; font-weight: bold; cursor: pointer; display: none; }

    /* 8-Mic Live Room */
    .room-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #070914; z-index: 100; display: none; flex-direction: column; }
    .room-header { height: 48px; padding: 0 14px; background: #12162c; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1c2242; }
    .mic-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 6px; padding: 14px 10px; background: #0e1224; border-bottom: 1px solid #1a203c; }
    .mic-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .mic-ring { width: 48px; height: 48px; border-radius: 50%; background: #171c38; border: 2px solid #29325c; display: flex; justify-content: center; align-items: center; font-size: 15px; }
    .mic-ring.occupied { border-color: #00f0ff; box-shadow: 0 0 12px #00f0ff; color: #00f0ff; font-weight: bold; }
    .mic-name { font-size: 10px; margin-top: 4px; color: #8a94b8; }
    .room-chat { flex: 1; padding: 10px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .chat-bubble { background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
    .gift-slider { display: flex; gap: 8px; padding: 8px 12px; background: #0f1326; overflow-x: auto; border-top: 1px solid #1c2242; }
    .gift-card { min-width: 65px; padding: 6px 4px; background: #171c38; border-radius: 8px; text-align: center; font-size: 10px; cursor: pointer; }
    .gift-card span { font-size: 20px; display: block; margin-bottom: 2px; }
    .room-inputs { padding: 8px 12px; background: #090c1a; display: flex; gap: 8px; }
    .input-bar { flex: 1; background: #141933; border: 1px solid #242c54; border-radius: 14px; padding: 8px 12px; color: #fff; outline: none; font-size: 12px; }
    .btn-send { background: #ff0055; border: none; border-radius: 12px; padding: 0 14px; color: #fff; font-weight: bold; cursor: pointer; }
    #giftPopupLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; justify-content: center; align-items: center; font-size: 85px; z-index: 110; }

    /* Bottom Tab Bar */
    .bottom-bar { height: 58px; background: #101428; border-top: 1px solid #1a203c; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 40; }
    .tab-item { display: flex; flex-direction: column; align-items: center; color: #6f7a9f; font-size: 10px; background: transparent; border: none; cursor: pointer; gap: 2px; }
    .tab-item.active { color: #ff0055; font-weight: bold; }
    .tab-item span { font-size: 18px; }
    .tab-add { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ff0055, #ff5500); display: flex; justify-content: center; align-items: center; color: #fff; font-size: 24px; font-weight: bold; box-shadow: 0 0 12px rgba(255,0,85,0.6); margin-top: -14px; cursor: pointer; }
  </style>
</head>
<body>
<div class="app-shell">
  <!-- Top Bar -->
  <div class="app-head">
    <div class="brand-title">👑 PB LIVE STUDIO</div>
    <div class="wallet-box">
      <span class="coin-badge" id="hudCoins">0 C</span>
      <span class="dia-badge" id="hudDia">0 D</span>
    </div>
  </div>

  <!-- Tab 1: Party Rooms -->
  <div class="view-panel active" id="viewParty">
    <div class="hero-banner">
      <h3 style="font-size:16px;">🔥 3D Live Voice Club</h3>
      <p style="font-size:11px; opacity:0.8;">Join 8-Mic Stage, Chat & Gift!</p>
    </div>
    <div class="sec-label">Active Live Rooms</div>
    <div class="room-grid" id="roomListContainer"></div>
  </div>

  <!-- Tab 2: Family & Agency -->
  <div class="view-panel" id="viewFamily">
    <div class="sec-label">Top Ranked Families</div>
    <div id="familyListContainer"></div>
  </div>

  <!-- Tab 3: Me / Profile -->
  <div class="view-panel" id="viewMe">
    <div class="me-banner">
      <img class="me-avatar" src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png">
      <h3 id="meUname">User</h3>
      <p id="meRoleTxt" style="font-size:11px; color:#00f0ff; margin-top:2px;">VIP Member</p>
    </div>
    <div class="stats-card">
      <div class="stat-item"><b id="meCoins">0</b>Coins</div>
      <div class="stat-item"><b id="meDia">0</b>Diamonds</div>
      <div class="stat-item"><b id="meLvl">Lv 1</b>Level</div>
      <div class="stat-item"><b id="meVip">VIP 0</b>VIP</div>
    </div>
    <div class="admin-recharge-btn" id="btnAdminRecharge" onclick="openAdminRechargeModal()">👑 Owner Recharge Panel</div>
  </div>

  <!-- 8-Mic Live Room Screen -->
  <div class="room-screen" id="roomScreen">
    <div id="giftPopupLayer"></div>
    <div class="room-header">
      <div>
        <h4 id="activeRoomTitle" style="font-size:13px; color:#ff0055;">Room Name</h4>
        <span style="font-size:10px; color:#00f0ff;">Live 8-Seat Audio Stage</span>
      </div>
      <button style="background:#ff3344; color:#fff; border:none; padding:4px 10px; border-radius:10px; font-weight:bold; font-size:11px; cursor:pointer;" onclick="exitCurrentRoom()">Exit</button>
    </div>
    <div class="mic-grid" id="stageGrid"></div>
    <div class="room-chat" id="chatStream">
      <div class="chat-bubble" style="color:#00f0ff;">✨ Welcome to the Voice Party!</div>
    </div>
    <div class="gift-slider">
      <div class="gift-card" onclick="sendGiftItem('Rose', 50, '🌹')"><span>🌹</span>50 C</div>
      <div class="gift-card" onclick="sendGiftItem('Royal Ring', 200, '💍')"><span>💍</span>200 C</div>
      <div class="gift-card" onclick="sendGiftItem('Sports Car', 1000, '🏎️')"><span>🏎️</span>1000 C</div>
      <div class="gift-card" onclick="sendGiftItem('Helicopter', 5000, '🚁')"><span>🚁</span>5000 C</div>
    </div>
    <div class="room-inputs">
      <input type="text" id="chatInputField" class="input-bar" placeholder="Type message...">
      <button class="btn-send" onclick="sendRoomMsg()">Send</button>
    </div>
  </div>

  <!-- Bottom Tabs -->
  <div class="bottom-bar">
    <button class="tab-item active" id="tabBtnParty" onclick="switchMainTab('viewParty', 'tabBtnParty')"><span>🏠</span>Party</button>
    <button class="tab-item" id="tabBtnFamily" onclick="switchMainTab('viewFamily', 'tabBtnFamily')"><span>🛡️</span>Family</button>
    <div class="tab-add" onclick="createRoomPrompt()">+</div>
    <button class="tab-item" id="tabBtnMe" onclick="switchMainTab('viewMe', 'tabBtnMe')"><span>👤</span>Me</button>
  </div>
</div>

<script>
  const socket = io();
  let username = prompt("Enter Username (Type 'Lovepreet' for Owner Power):") || ("User_" + Math.floor(Math.random()*1000));
  let user = {};
  let curRoomId = null;
  let activeSeats = Array(8).fill(null);

  fetch('/api/user/' + username).then(r => r.json()).then(d => { user = d; renderUser(); });
  fetch('/api/rooms').then(r => r.json()).then(rooms => renderRooms(rooms));
  fetch('/api/families').then(r => r.json()).then(fams => renderFamilies(fams));

  function renderUser() {
    document.getElementById('hudCoins').innerText = user.coins + ' C';
    document.getElementById('hudDia').innerText = user.diamonds + ' D';
    document.getElementById('meUname').innerText = user.username;
    document.getElementById('meCoins').innerText = user.coins;
    document.getElementById('meDia').innerText = user.diamonds;
    document.getElementById('meLvl').innerText = 'Lv ' + user.userLevel;
    document.getElementById('meVip').innerText = 'VIP ' + user.vipLevel;
    if(user.role === 'owner') {
      document.getElementById('meRoleTxt').innerText = '👑 Super Owner';
      document.getElementById('btnAdminRecharge').style.display = 'block';
    }
  }

  function renderRooms(rooms) {
    let container = document.getElementById('roomListContainer');
    container.innerHTML = rooms.map(r => \`
      <div class="room-tile" onclick="openRoom('\${r.id}', '\${r.name}')">
        <div class="room-tag">\${r.category}</div>
        <h4 style="font-size:13px;">\${r.name}</h4>
        <p style="font-size:10px; color:#00f0ff; margin-top:2px;">Host: \${r.host}</p>
      </div>
    \`).join('');
  }

  function renderFamilies(fams) {
    let container = document.getElementById('familyListContainer');
    container.innerHTML = fams.map(f => \`
      <div class="fam-card">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="fam-badge">\${f.badge}</div>
          <div>
            <h4 style="font-size:13px;">\${f.name}</h4>
            <span style="font-size:10px; color:#8a94b8;">Leader: \${f.leader} | Members: \${f.members}</span>
          </div>
        </div>
        <div style="font-size:11px; color:#ffd700; font-weight:bold;">⚡ \${f.power}</div>
      </div>
    \`).join('');
  }

  function switchMainTab(viewId, btnId) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(btnId) document.getElementById(btnId).classList.add('active');
  }

  function openRoom(id, name) {
    curRoomId = id;
    document.getElementById('activeRoomTitle').innerText = name;
    document.getElementById('roomScreen').style.display = 'flex';
    renderStage();
    socket.emit('join_room', { roomId: id, username: user.username, vipLevel: user.vipLevel, family: user.family });
  }

  function exitCurrentRoom() {
    socket.emit('leave_room', { roomId: curRoomId, username: user.username });
    document.getElementById('roomScreen').style.display = 'none';
    curRoomId = null;
  }

  function renderStage() {
    let stage = document.getElementById('stageGrid');
    stage.innerHTML = activeSeats.map((occupant, idx) => \`
      <div class="mic-box" onclick="toggleSeat(\${idx})">
        <div class="mic-ring \${occupant ? 'occupied' : ''}">\${occupant ? occupant.substring(0,2) : (idx === 0 ? '👑' : idx)}</div>
        <div class="mic-name">\${occupant ? occupant : (idx === 0 ? 'Host' : 'Mic ' + idx)}</div>
      </div>
    \`).join('');
  }

  function toggleSeat(idx) {
    if (activeSeats[idx] === user.username) {
      socket.emit('leave_seat', { roomId: curRoomId, seatIndex: idx, username: user.username });
    } else if (!activeSeats[idx]) {
      socket.emit('take_seat', { roomId: curRoomId, seatIndex: idx, username: user.username });
    }
  }

  function sendRoomMsg() {
    let inp = document.getElementById('chatInputField');
    if (!inp.value.trim()) return;
    socket.emit('send_chat', { roomId: curRoomId, user: user.username, msg: inp.value });
    inp.value = '';
  }

  function sendGiftItem(name, cost, icon) {
    if (user.coins < cost) { alert("Not enough coins!"); return; }
    user.coins -= cost;
    renderUser();
    socket.emit('send_gift', { roomId: curRoomId, sender: user.username, name: name, icon: icon });
  }

  function createRoomPrompt() {
    let rName = prompt("Enter New Voice Room Name:");
    if (rName) {
      let newId = 'room_' + Date.now();
      activeRooms.push({ id: newId, name: rName, host: user.username, category: 'Party', seats: Array(8).fill(null) });
      renderRooms(activeRooms);
      openRoom(newId, rName);
    }
  }

  function openAdminRechargeModal() {
    let target = prompt("Enter username to recharge:");
    let amt = prompt("Enter coin amount:");
    if (target && amt) socket.emit('admin_recharge', { target: target, amount: parseInt(amt) });
  }

  socket.on('stage_synced', seats => { activeSeats = seats; renderStage(); });
  socket.on('recv_chat', d => {
    let box = document.getElementById('chatStream');
    box.innerHTML += '<div class="chat-bubble"><b style="color:#00f0ff;">' + d.user + ':</b> ' + d.msg + '</div>';
    box.scrollTop = box.scrollHeight;
  });
  socket.on('gift_blast', d => {
    let box = document.getElementById('chatStream');
    box.innerHTML += '<div class="chat-bubble" style="background:linear-gradient(90deg,#ff0055,#ffaa00);color:#fff;font-weight:bold;">🎁 ' + d.sender + ' sent ' + d.name + '!</div>';
    box.scrollTop = box.scrollHeight;
    let anim = document.getElementById('giftPopupLayer');
    anim.innerText = d.icon;
    setTimeout(() => { anim.innerText = ''; }, 1600);
  });
  socket.on('wallet_synced', d => {
    if (d.username.toLowerCase() === user.username.toLowerCase()) {
      user.coins = d.coins;
      renderUser();
    }
  });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Party Studio Engine Started on Port ' + PORT);
});

