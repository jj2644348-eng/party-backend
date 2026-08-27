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
    username: 'Lucky Ak47',
    coins: 1000000000,
    role: 'owner'
  }
};

let gifts = [
  { id: 'g1', name: 'Rose', price: 10, icon: '🌹' },
  { id: 'g2', name: 'Choco', price: 50, icon: '🍫' },
  { id: 'g3', name: 'Super Car', price: 1000, icon: '🏎️' },
  { id: 'g4', name: 'Royal Crown', price: 5000, icon: '👑' },
  { id: 'g5', name: 'Rocket', price: 10000, icon: '🚀' },
  { id: 'g6', name: 'Fire Dragon', price: 50000, icon: '🐉' }
];

let activeRooms = [
  { id: 'room_101', name: 'PB Underground Rap Battle', host: 'Lucky Ak47', category: 'Rap', banner: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', seats: Array(12).fill(null) },
  { id: 'room_102', name: 'PB Cyber VIP Club', host: 'Mr Love', category: 'VIP', banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400', seats: Array(12).fill(null) }
];

app.post('/api/auth/gmail', (req, res) => {
  const { email, username } = req.body || {};
  if (!email) return res.status(400).json({ success: false });
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER.toLowerCase());

  if (isOwner) {
    users[em] = { pbId: '2081902760', email: SUPER_OWNER, username: username || 'Lucky Ak47', coins: 1000000000, role: 'owner' };
  } else if (!users[em]) {
    users[em] = { pbId: Math.floor(10000000 + Math.random() * 90000000).toString(), email: em, username: username || em.split('@')[0], coins: 50000, role: 'member' };
  }
  res.json({ success: true, user: users[em] });
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));
app.get('/api/gifts', (req, res) => res.json(gifts));

io.on('connection', (socket) => {
  socket.on('join_room', (d) => socket.join(d.roomId));
  
  socket.on('create_custom_room', (d) => {
    let newRoom = {
      id: 'room_' + Date.now(),
      name: d.name || 'PB Live Party',
      host: d.host,
      category: d.category || 'Music',
      banner: d.banner || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
      seats: Array(12).fill(null)
    };
    activeRooms.unshift(newRoom);
    io.emit('rooms_updated', activeRooms);
    socket.emit('room_created', newRoom);
  });

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

  socket.on('send_gift', (d) => {
    let sender = users[d.senderEmail?.toLowerCase().trim()];
    let gift = gifts.find(g => g.id === d.giftId);
    if (!sender || !gift) return;

    let targetCount = d.targetSeat === 'all' ? 12 : 1;
    let totalCost = gift.price * targetCount;

    if (sender.coins < totalCost) return;

    sender.coins -= totalCost;
    io.to(d.roomId).emit('gift_broadcast', {
      sender: sender.username,
      giftName: gift.name,
      giftIcon: gift.icon,
      target: d.targetName || 'All Mic Seats'
    });
    socket.emit('coin_updated', sender.coins);
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));
});

app.get('*', (req, res) => {
  res.send('<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">' +
'  <title>PB Live Studio</title>' +
'  <script src="/socket.io/socket.io.js"></script>' +
'  <style>' +
'    * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; user-select: none; }' +
'    body { background: #070913; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }' +
'    .app { width: 100%; max-width: 440px; height: 100%; background: #0c1022; display: flex; flex-direction: column; position: relative; }' +
'    #auth { position: absolute; inset:0; background: #070913; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }' +
'    .inp { background: #151a36; border: 1px solid #283366; border-radius: 8px; padding: 12px; color: #fff; outline: none; font-size: 14px; }' +
'    .btn { background: linear-gradient(135deg, #ff0055, #00f0ff); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }' +
'    .top-bar { height: 52px; padding: 0 14px; display: flex; justify-content: space-between; align-items: center; background: #10152e; border-bottom: 1px solid #1c244d; flex-shrink: 0; }' +
'    .top-actions { display: flex; gap: 8px; align-items: center; }' +
'    .btn-create { background: linear-gradient(90deg, #00f0ff, #0072ff); color: #000; font-weight: 900; font-size: 11px; padding: 6px 12px; border-radius: 12px; border: none; cursor: pointer; }' +
'    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding: 12px 12px 70px; }' +
'    .panel.active { display: flex; }' +
'    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }' +
'    .card { background: #121833; border-radius: 12px; overflow: hidden; border: 1px solid #1f2852; cursor: pointer; position: relative; }' +
'    .card img { width: 100%; height: 120px; object-fit: cover; }' +
'    .card-info { padding: 8px; }' +
'    .bnav { height: 58px; background: #0c1022; border-top: 1px solid #1c244d; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }' +
'    .nav-item { display: flex; flex-direction: column; align-items: center; font-size: 10px; color: #6a7bb2; cursor: pointer; gap: 2px; }' +
'    .nav-item.active { color: #00f0ff; font-weight: bold; }' +
'    .room { position: absolute; inset:0; background: radial-gradient(circle at center, #181030 0%, #070913 100%); z-index: 200; display: none; flex-direction: column; }' +
'    .room-top { height: 48px; display: flex; justify-content: space-between; align-items: center; padding: 0 12px; background: #10152e; border-bottom: 1px solid #1c244d; }' +
'    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px; }' +
'    .seat { display: flex; flex-direction: column; align-items: center; cursor: pointer; }' +
'    .ring { width: 44px; height: 44px; border-radius: 50%; background: #151a36; border: 2px solid #283366; display: flex; justify-content: center; align-items: center; font-size: 11px; font-weight: bold; }' +
'    .ring.on { border-color: #00f0ff; color: #00f0ff; background: #1a2a4a; box-shadow: 0 0 10px #00f0ff; }' +
'    .ring.muted { border-color: #ff0055; color: #ff0055; }' +
'    .modal { position: absolute; inset:0; background: rgba(0,0,0,0.8); z-index: 600; display: none; justify-content: center; align-items: flex-end; }' +
'    .sheet { width: 100%; max-width: 440px; background: #0f142c; border-top: 2px solid #00f0ff; border-radius: 16px 16px 0 0; padding: 16px; display: flex; flex-direction: column; gap: 10px; }' +
'    .gift-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 220px; overflow-y: auto; }' +
'    .gift-item { background: #161c3d; border: 1px solid #253066; border-radius: 10px; padding: 8px; text-align: center; cursor: pointer; }' +
'    .gift-item.sel { border-color: #ffd700; background: #2a2850; }' +
'  </style>' +
'</head>' +
'<body>' +
'<div class="app">' +
'  <div id="auth">' +
'    <h2 style="text-align:center; color:#00f0ff;">PB LIVE STUDIO</h2>' +
'    <input type="text" id="aName" class="inp" placeholder="Name" value="Lucky Ak47">' +
'    <input type="email" id="aMail" class="inp" placeholder="Gmail" value="lp5006352@gmail.com">' +
'    <button class="btn" onclick="auth()">Enter Studio</button>' +
'  </div>' +
'  <div class="top-bar">' +
'    <span style="font-weight:900; color:#00f0ff;">PB LIVE</span>' +
'    <div class="top-actions">' +
'      <button class="btn-create" onclick="openCreateRoomModal()">+ Create Room</button>' +
'      <span style="background:gold; color:#000; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold;" id="uCoins">0 C</span>' +
'    </div>' +
'  </div>' +
'  <div class="panel active" id="tabLive">' +
'    <div class="grid" id="rList"></div>' +
'  </div>' +
'  <div class="panel" id="tabMe">' +
'    <div style="padding:24px; text-align:center;">' +
'      <h3 id="meUname">User</h3>' +
'      <p id="meId" style="color:#00f0ff; font-size:12px; margin:4px 0 16px;"></p>' +
'      <div style="background:#161c3d; border:1px solid #283366; border-radius:12px; padding:12px; margin-bottom:16px;">' +
'        <div style="font-size:12px; color:#888;">Wallet Balance</div>' +
'        <div style="font-size:18px; color:gold; font-weight:bold;" id="meCoinsDisplay">0 C</div>' +
'      </div>' +
'      <button class="btn" style="background:#1f2852; width:100%;" onclick="logout()">Logout</button>' +
'    </div>' +
'  </div>' +
'  <div class="room" id="rScreen">' +
'    <div class="room-top">' +
'      <span id="rTitle" style="color:#00f0ff; font-weight:bold; font-size:12px;">Room</span>' +
'      <div style="display:flex; gap:6px;">' +
'        <button id="btnMic" class="btn" style="padding:4px 8px; font-size:10px; background:#1c244d; display:none;" onclick="toggleMic()">Mic On</button>' +
'        <button class="btn" style="padding:4px 10px; font-size:10px;" onclick="exitR()">Exit</button>' +
'      </div>' +
'    </div>' +
'    <div class="stage" id="stg"></div>' +
'    <div style="flex:1; padding:10px; overflow-y:auto; font-size:11px;" id="cBox"></div>' +
'    <div style="height:50px; background:#10152e; display:flex; align-items:center; padding:0 10px; gap:8px;">' +
'      <button style="background:#ff0055; border:none; border-radius:50%; width:34px; height:34px; font-size:16px; cursor:pointer;" onclick="openGiftModal()">🎁</button>' +
'      <input type="text" id="cInp" style="flex:1; background:#182042; border:1px solid #283366; border-radius:20px; padding:6px 12px; color:#fff; font-size:11px; outline:none;" placeholder="Chat live...">' +
'      <button class="btn" style="padding:6px 12px; border-radius:20px;" onclick="sendMsg()">Send</button>' +
'    </div>' +
'  </div>' +
'  <div class="modal" id="createModal">' +
'    <div class="sheet">' +
'      <h3 style="color:#00f0ff; font-size:14px; text-align:center;">Create Room</h3>' +
'      <input type="text" id="crName" class="inp" placeholder="Room Title">' +
'      <select id="crCat" class="inp">' +
'        <option value="Music">Music & Singing</option>' +
'        <option value="Rap">Rap Battle</option>' +
'        <option value="VIP">VIP Club</option>' +
'      </select>' +
'      <button class="btn" onclick="submitCreateRoom()">Launch Room</button>' +
'      <button class="btn" style="background:#222;" onclick="closeModals()">Cancel</button>' +
'    </div>' +
'  </div>' +
'  <div class="modal" id="giftModal">' +
'    <div class="sheet">' +
'      <div style="display:flex; justify-content:space-between; align-items:center;">' +
'        <span style="color:gold; font-weight:bold; font-size:12px;">Send Gift</span>' +
'        <select id="gTarget" class="inp" style="padding:4px 8px; font-size:11px;">' +
'          <option value="all">All Mic Seats</option>' +
'        </select>' +
'      </div>' +
'      <div class="gift-grid" id="gGrid"></div>' +
'      <button class="btn" onclick="sendSelectedGift()">Send Gift</button>' +
'      <button class="btn" style="background:#222; padding:6px;" onclick="closeModals()">Close</button>' +
'    </div>' +
'  </div>' +
'  <div class="bnav">' +
'    <div class="nav-item active" onclick="switchNav(\'tabLive\', this)"><div style="font-size:17px;">⚡</div><span>Live</span></div>' +
'    <div class="nav-item" onclick="switchNav(\'tabMe\', this)"><div style="font-size:17px;">👤</div><span>Me</span></div>' +
'  </div>' +
'</div>' +
'<script>' +
'  const socket = io();' +
'  let user = null, curId = null, seats = Array(12).fill(null), allRooms = [], gifts = [], selectedGift = null;' +
'  let sv = localStorage.getItem(\'pb_u\');' +
'  if (sv) { user = JSON.parse(sv); document.getElementById(\'auth\').style.display = \'none\'; syncMe(); }' +
'  fetch(\'/api/rooms\').then(r => r.json()).then(rms => { allRooms = rms; renderRooms(rms); });' +
'  fetch(\'/api/gifts\').then(r => r.json()).then(g => { gifts = g; renderGiftGrid(); });' +
'  function renderRooms(rms) {' +
'    let html = \'\';' +
'    rms.forEach(r => {' +
'      html += \'<div class="card" onclick="openR(\\\'\' + r.id + \'\\\', \\\'\' + r.name + \'\\\')">\';' +
'      html += \'<img src="\' + r.banner + \'">\';' +
'      html += \'<div class="card-info">\';' +
'      html += \'<div style="font-size:11px; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\' + r.name + \'</div>\';' +
'      html += \'<div style="font-size:10px; color:#6a7bb2; margin-top:2px;">Host: \' + r.host + \'</div>\';' +
'      html += \'</div></div>\';' +
'    });' +
'    document.getElementById(\'rList\').innerHTML = html;' +
'  }' +
'  function renderGiftGrid() {' +
'    let html = \'\';' +
'    gifts.forEach(g => {' +
'      html += \'<div class="gift-item" id="gi_\' + g.id + \'" onclick="selectGift(\\\'\' + g.id + \'\\\')">\';' +
'      html += \'<div style="font-size:24px;">\' + g.icon + \'</div>\';' +
'      html += \'<div style="font-size:10px; font-weight:bold; margin-top:2px;">\' + g.name + \'</div>\';' +
'      html += \'<div style="font-size:9px; color:gold;">\' + g.price + \' C</div>\';' +
'      html += \'</div>\';' +
'    });' +
'    document.getElementById(\'gGrid\').innerHTML = html;' +
'  }' +
'  function selectGift(id) {' +
'    selectedGift = gifts.find(x => x.id === id);' +
'    document.querySelectorAll(\'.gift-item\').forEach(el => el.classList.remove(\'sel\'));' +
'    document.getElementById(\'gi_\' + id).classList.add(\'sel\');' +
'  }' +
'  function auth() {' +
'    let email = document.getElementById(\'aMail\').value, username = document.getElementById(\'aName\').value;' +
'    fetch(\'/api/auth/gmail\', { method: \'POST\', headers: { \'Content-Type\': \'application/json\' }, body: JSON.stringify({ email, username }) })' +
'    .then(r => r.json()).then(d => {' +
'      if (d.success) { user = d.user; localStorage.setItem(\'pb_u\', JSON.stringify(user)); document.getElementById(\'auth\').style.display = \'none\'; syncMe(); }' +
'    });' +
'  }' +
'  function syncMe() {' +
'    document.getElementById(\'uCoins\').innerText = (user.coins || 0).toLocaleString() + \' C\';' +
'    document.getElementById(\'meCoinsDisplay\').innerText = (user.coins || 0).toLocaleString() + \' C\';' +
'    document.getElementById(\'meUname\').innerText = user.username;' +
'    document.getElementById(\'meId\').innerText = \'ID: \' + user.pbId;' +
'  }' +
'  function switchNav(tabId, el) {' +
'    document.querySelectorAll(\'.bnav .nav-item\').forEach(n => n.classList.remove(\'active\'));' +
'    el.classList.add(\'active\');' +
'    document.querySelectorAll(\'.panel\').forEach(p => p.classList.remove(\'active\'));' +
'    document.getElementById(tabId).classList.add(\'active\');' +
'  }' +
'  function openCreateRoomModal() { document.getElementById(\'createModal\').style.display = \'flex\'; }' +
'  function openGiftModal() {' +
'    let select = document.getElementById(\'gTarget\');' +
'    select.innerHTML = \'<option value="all">All Mic Seats</option>\';' +
'    seats.forEach((s, idx) => {' +
'      if (s) select.innerHTML += \'<option value="\' + idx + \'">\' + s.name + \' (Mic \' + (idx + 1) + \')</option>\';' +
'    });' +
'    document.getElementById(\'giftModal\').style.display = \'flex\';' +
'  }' +
'  function closeModals() {' +
'    document.getElementById(\'createModal\').style.display = \'none\';' +
'    document.getElementById(\'giftModal\').style.display = \'none\';' +
'  }' +
'  function submitCreateRoom() {' +
'    let name = document.getElementById(\'crName\').value;' +
'    let cat = document.getElementById(\'crCat\').value;' +
'    if (!name) return alert("Please enter room title");' +
'    socket.emit(\'create_custom_room\', { name, category: cat, host: user.username });' +
'    closeModals();' +
'  }' +
'  function sendSelectedGift() {' +
'    if (!selectedGift) return alert("Please select a gift");' +
'    let target = document.getElementById(\'gTarget\').value;' +
'    socket.emit(\'send_gift\', {' +
'      roomId: curId,' +
'      senderEmail: user.email,' +
'      giftId: selectedGift.id,' +
'      targetSeat: target,' +
'      targetName: target === \'all\' ? \'All Mics\' : (\'Mic \' + (parseInt(target) + 1))' +
'    });' +
'    closeModals();' +
'  }' +
'  function openR(id, name) {' +
'    curId = id;' +
'    document.getElementById(\'rTitle\').innerText = name;' +
'    document.getElementById(\'rScreen\').style.display = \'flex\';' +
'    seats = Array(12).fill(null);' +
'    drawStage();' +
'    socket.emit(\'join_room\', { roomId: id, username: user.username });' +
'  }' +
'  function exitR() { socket.emit(\'leave_room\', { roomId: curId, username: user.username }); document.getElementById(\'rScreen\').style.display = \'none\'; curId = null; }' +
'  function drawStage() {' +
'    let html = \'\';' +
'    seats.forEach((s, i) => {' +
'      let ringClass = s ? (s.isMuted ? \'ring muted\' : \'ring on\') : \'ring\';' +
'      let innerText = s ? (s.isMuted ? \'Muted\' : s.name.substring(0,2)) : (i === 0 ? \'Host\' : (i + 1));' +
'      let subText = s ? s.name : \'Mic \' + (i + 1);' +
'      html += \'<div class="seat" onclick="toggleSeat(\' + i + \')">\';' +
'      html += \'<div class="\' + ringClass + \'">\' + innerText + \'</div>\';' +
'      html += \'<span style="font-size:8px; color:#6a7bb2; margin-top:2px;">\' + subText + \'</span>\';' +
'      html += \'</div>\';' +
'    });' +
'    document.getElementById(\'stg\').innerHTML = html;' +
'    let mySeat = seats.find(s => s && s.name === user?.username);' +
'    let micBtn = document.getElementById(\'btnMic\');' +
'    if (mySeat) {' +
'      micBtn.style.display = \'block\';' +
'      micBtn.innerText = mySeat.isMuted ? \'Muted\' : \'Mic On\';' +
'    } else {' +
'      micBtn.style.display = \'none\';' +
'    }' +
'  }' +
'  function toggleSeat(i) {' +
'    if (!seats[i]) socket.emit(\'take_seat\', { roomId: curId, seatIndex: i, username: user.username });' +
'    else if (seats[i].name === user.username) socket.emit(\'leave_seat\', { roomId: curId, seatIndex: i, username: user.username });' +
'  }' +
'  function toggleMic() { socket.emit(\'toggle_self_mic\', { roomId: curId, username: user.username }); }' +
'  function sendMsg() {' +
'    let inp = document.getElementById(\'cInp\');' +
'    if (inp.value.trim()) { socket.emit(\'send_
