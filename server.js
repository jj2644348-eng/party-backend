const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// In-Memory User Store
let users = {
  'lovepreet': { username: 'Lovepreet', coins: 5000000, diamonds: 100000, role: 'owner', userLevel: 99, vipLevel: 5 }
};

app.get('/api/user/:username', (req, res) => {
  let u = req.params.username.toLowerCase();
  if (!users[u]) {
    users[u] = {
      username: req.params.username,
      coins: (u === 'lovepreet' || u === 'admin') ? 5000000 : 5000,
      diamonds: (u === 'lovepreet' || u === 'admin') ? 100000 : 200,
      role: (u === 'lovepreet' || u === 'admin') ? 'owner' : 'user',
      userLevel: (u === 'lovepreet' || u === 'admin') ? 99 : 1,
      vipLevel: (u === 'lovepreet' || u === 'admin') ? 5 : 0
    };
  }
  res.json(users[u]);
});

// Real-Time Socket Center
io.on('connection', (socket) => {
  socket.on('join_room', (d) => { socket.join(d.room); io.to(d.room).emit('user_entered', d); });
  socket.on('leave_room', (d) => socket.leave(d.room));
  socket.on('send_chat', (d) => io.to(d.room).emit('recv_chat', d));
  socket.on('seat_action', (d) => io.to(d.room).emit('seat_updated', d));
  socket.on('send_gift', (d) => io.to(d.room).emit('gift_blast', d));
  socket.on('admin_recharge', (d) => {
    let target = d.target.toLowerCase();
    if(!users[target]) users[target] = { username: d.target, coins: d.amount, diamonds: 0, role: 'user', userLevel: 1, vipLevel: 1 };
    else users[target].coins += d.amount;
    io.emit('wallet_sync', { username: users[target].username, coins: users[target].coins, vipLevel: users[target].vipLevel });
  });
});

// Single Page UI - Direct Serve
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>PB 3D Live Party Studio</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    body { background: #05060a; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: #0c0e18; display: flex; flex-direction: column; position: relative; }
    .view { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .view.active { display: flex; }
    .top-header { padding: 12px 16px; background: #131626; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f243d; }
    .app-logo { font-size: 15px; font-weight: 900; color: #ff0055; text-transform: uppercase; }
    .wallet-stat { display: flex; gap: 6px; font-size: 11px; font-weight: bold; }
    .c-pill { background: #ffd700; color: #000; padding: 3px 8px; border-radius: 12px; }
    .d-pill { background: #00f0ff; color: #000; padding: 3px 8px; border-radius: 12px; }
    .banner { margin: 12px; height: 90px; border-radius: 12px; background: linear-gradient(135deg, #ff0055, #7928ca); padding: 12px; display: flex; flex-direction: column; justify-content: flex-end; }
    .room-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px; }
    .room-card { background: #15182a; border-radius: 12px; padding: 12px; border: 1px solid #242947; cursor: pointer; }
    .room-card h4 { font-size: 13px; color: #fff; margin-bottom: 4px; }
    .room-card p { font-size: 10px; color: #00f0ff; }
    .me-box { padding: 20px 16px; background: linear-gradient(180deg, #181b2f 0%, #0c0e18 100%); display: flex; flex-direction: column; align-items: center; }
    .avatar-wrapper { width: 70px; height: 70px; border-radius: 50%; position: relative; margin-bottom: 8px; }
    .avatar-wrapper img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .frame-gold { position: absolute; top: -4px; left: -4px; width: 78px; height: 78px; border: 3px solid #ffd700; border-radius: 50%; box-shadow: 0 0 12px #ffd700; }
    .frame-royal { position: absolute; top: -4px; left: -4px; width: 78px; height: 78px; border: 3px solid #ff0055; border-radius: 50%; box-shadow: 0 0 14px #ff0055; }
    .stats-card { margin: 12px; background: #15182a; border-radius: 12px; padding: 14px; display: flex; justify-content: space-around; border: 1px solid #242947; }
    .stat-val { text-align: center; font-size: 11px; }
    .stat-val b { font-size: 16px; color: #ffd700; display: block; }
    .admin-btn { margin: 10px 12px; padding: 12px; background: linear-gradient(90deg, #ff0055, #7928ca); border-radius: 10px; text-align: center; font-weight: bold; cursor: pointer; display: none; font-size: 12px; }
    .room-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #070810; z-index: 100; display: none; flex-direction: column; }
    .room-top { padding: 10px 14px; background: #121422; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f233b; }
    .btn-leave-room { background: #ff3333; color: #fff; border: none; padding: 4px 10px; border-radius: 10px; font-weight: bold; font-size: 11px; cursor: pointer; }
    .stage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px 10px; }
    .mic-seat { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .mic-circle { width: 48px; height: 48px; border-radius: 50%; background: #171a2c; border: 2px solid #2c3254; display: flex; justify-content: center; align-items: center; font-size: 16px; }
    .mic-circle.active { border-color: #00f0ff; box-shadow: 0 0 12px #00f0ff; }
    .mic-lbl { font-size: 10px; margin-top: 4px; color: #8e95b3; font-weight: bold; }
    .seat-ctrl { display: flex; justify-content: space-around; padding: 6px; background: #111422; border-top: 1px solid #1d2136; }
    .ctrl-b { padding: 6px 14px; border-radius: 14px; border: none; font-size: 11px; font-weight: bold; cursor: pointer; }
    .b-take { background: #00f0ff; color: #000; }
    .b-leave { background: #ffaa00; color: #000; }
    .chat-box { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .msg-chip { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
    .gift-chip { background: linear-gradient(90deg, #ff0055, #ffaa00); color: #fff; font-weight: bold; }
    .gift-tray { display: flex; gap: 6px; padding: 8px; background: #0e101c; overflow-x: auto; border-top: 1px solid #1b1f33; }
    .gift-item { min-width: 65px; padding: 6px 2px; background: #16192b; border-radius: 8px; text-align: center; font-size: 9px; cursor: pointer; }
    .gift-item span { font-size: 20px; display: block; margin-bottom: 2px; }
    .room-foot { padding: 8px 10px; background: #080912; display: flex; gap: 6px; }
    .r-input { flex: 1; padding: 8px 12px; background: #161829; border: 1px solid #282e4e; border-radius: 16px; color: #fff; outline: none; font-size: 12px; }
    #entryAlert { position: absolute; top: 60px; left: 0; width: 100%; background: linear-gradient(90deg, #ff0055, #ffd700); color: #000; font-weight: 900; text-align: center; padding: 6px; font-size: 11px; display: none; z-index: 105; }
    #giftBlastLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; justify-content: center; align-items: center; z-index: 110; font-size: 85px; }
    .bottom-nav { height: 56px; background: #101220; border-top: 1px solid #1a1e30; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; width: 100%; z-index: 20; }
    .nav-btn { display: flex; flex-direction: column; align-items: center; color: #8e95b3; font-size: 10px; cursor: pointer; border: none; background: transparent; }
    .nav-btn.active { color: #ff0055; font-weight: bold; }
    .nav-btn span { font-size: 18px; margin-bottom: 2px; }
    .nav-plus { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ff0055, #ff5500); display: flex; justify-content: center; align-items: center; color: #fff; font-size: 24px; font-weight: bold; box-shadow: 0 0 10px rgba(255,0,85,0.6); margin-top: -15px; cursor: pointer; }
  </style>
</head>
<body>
<div class="app">
  <div class="top-header">
    <div class="app-logo">PB LIVE PARTY</div>
    <div class="wallet-stat">
      <span class="c-pill" id="topCoins">0</span>
      <span class="d-pill" id="topDia">0</span>
    </div>
  </div>
  <div class="view active" id="tabParty">
    <div class="banner">
      <h3 style="font-size:15px;">PB 3D Live Voice Club</h3>
      <p style="font-size:11px; opacity:0.8;">Join rooms, take mic & chat!</p>
    </div>
    <div class="room-list" id="roomGrid">
      <div class="room-card" onclick="enterRoom('PB 101 Royal Club')">
        <h4>PB 101 Royal Club</h4>
        <p>Live 8 Mics</p>
      </div>
    </div>
  </div>
  <div class="view" id="tabSearch">
    <div style="padding:12px; display:flex; gap:6px;">
      <input type="text" id="findUname" class="r-input" placeholder="Search user...">
      <button class="ctrl-b b-take" onclick="searchUser()">Search</button>
    </div>
    <div id="searchRes" style="padding:0 12px;"></div>
  </div>
  <div class="view" id="tabMe">
    <div class="me-box">
      <div class="avatar-wrapper" onclick="editAvatar()">
        <img id="meAvatarImg" src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png">
        <div id="meFrameClass" class="frame-gold"></div>
      </div>
      <h3 id="meDispName">User</h3>
      <p id="meRoleTxt" style="font-size:11px; color:#00f0ff; margin-top:2px;">Member</p>
    </div>
    <div class="stats-card">
      <div class="stat-val"><b id="meCoinsTxt">0</b>Coins</div>
      <div class="stat-val"><b id="meDiaTxt">0</b>Diamonds</div>
      <div class="stat-val"><b id="meLvlTxt">Lv 1</b>Level</div>
      <div class="stat-val"><b id="meVipTxt">VIP 0</b>VIP</div>
    </div>
    <div id="adminPanelBtn" class="admin-btn" onclick="openAdminRecharge()">👑 Admin Coin Recharge</div>
  </div>
  <div class="room-overlay" id="roomOverlay">
    <div id="entryAlert"></div>
    <div id="giftBlastLayer"></div>
    <div class="room-top">
      <div>
        <h4 id="activeRoomName" style="font-size:13px; color:#ff0055;">Room</h4>
        <span style="font-size:10px; color:#00f0ff;">8 Seats Audio</span>
      </div>
      <button class="btn-leave-room" onclick="leaveRoom()">Leave</button>
    </div>
    <div class="stage-grid">
      <div class="mic-seat" onclick="takeSeat(0)"><div class="mic-circle active" id="slot0">👑</div><div class="mic-lbl">Host</div></div>
      <div class="mic-seat" onclick="takeSeat(1)"><div class="mic-circle" id="slot1">1</div><div class="mic-lbl">Mic 1</div></div>
      <div class="mic-seat" onclick="takeSeat(2)"><div class="mic-circle" id="slot2">2</div><div class="mic-lbl">Mic 2</div></div>
      <div class="mic-seat" onclick="takeSeat(3)"><div class="mic-circle" id="slot3">3</div><div class="mic-lbl">Mic 3</div></div>
      <div class="mic-seat" onclick="takeSeat(4)"><div class="mic-circle" id="slot4">4</div><div class="mic-lbl">Mic 4</div></div>
      <div class="mic-seat" onclick="takeSeat(5)"><div class="mic-circle" id="slot5">5</div><div class="mic-lbl">Mic 5</div></div>
      <div class="mic-seat" onclick="takeSeat(6)"><div class="mic-circle" id="slot6">6</div><div class="mic-lbl">Mic 6</div></div>
      <div class="mic-seat" onclick="takeSeat(7)"><div class="mic-circle" id="slot7">7</div><div class="mic-lbl">Mic 7</div></div>
    </div>
    <div class="seat-ctrl">
      <button class="ctrl-b b-take" onclick="takeSeat(1)">🎤 Take Mic</button>
      <button class="ctrl-b b-leave" onclick="leaveSeat()">🛑 Leave Mic</button>
    </div>
    <div class="chat-box" id="rChatBox">
      <div class="msg-chip" style="color:#00f0ff;">✨ Welcome to Voice Room!</div>
    </div>
    <div class="gift-tray">
      <div class="gift-item" onclick="sendGift('Rose', 50, 5, '🌹')"><span>🌹</span>50 C</div>
      <div class="gift-item" onclick="sendGift('Ring', 200, 20, '💍')"><span>💍</span>200 C</div>
      <div class="gift-item" onclick="sendGift('Sports Car', 1000, 100, '🏎️')"><span>🏎️</span>1000 C</div>
      <div class="gift-item" onclick="sendGift('Helicopter', 5000, 500, '🚁')"><span>🚁</span>5000 C</div>
    </div>
    <div class="room-foot">
      <input type="text" id="rChatInp" class="r-input" placeholder="Message...">
      <button class="ctrl-b" style="background:#ff0055; color:#fff;" onclick="sendMsg()">Send</button>
    </div>
  </div>
  <div class="bottom-nav">
    <button class="nav-btn active" id="navParty" onclick="switchTab('tabParty', 'navParty')"><span>🏠</span>Party</button>
    <button class="nav-btn" id="navSearch" onclick="switchTab('tabSearch', 'navSearch')"><span>🔍</span>Search</button>
    <div class="nav-plus" onclick="createNewRoom()">+</div>
    <button class="nav-btn" id="navMe" onclick="switchTab('tabMe', 'navMe')"><span>👤</span>Me</button>
  </div>
</div>
<script>
  const socket = io();
  let username = prompt("Enter Username (Type 'Lovepreet' for Owner):") || ("User_" + Math.floor(Math.random()*1000));
  let user = {};
  let currentRoom = '';
  let mySeat = -1;

  fetch('/api/user/' + username).then(r => r.json()).then(d => { user = d; syncUI(); });

  function syncUI() {
    document.getElementById('topCoins').innerText = '💰 ' + user.coins;
    document.getElementById('topDia').innerText = '💎 ' + user.diamonds;
    document.getElementById('meDispName').innerText = user.username;
    document.getElementById('meCoinsTxt').innerText = user.coins;
    document.getElementById('meDiaTxt').innerText = user.diamonds;
    document.getElementById('meLvlTxt').innerText = 'Lv ' + user.userLevel;
    document.getElementById('meVipTxt').innerText = 'VIP ' + user.vipLevel;
    if(user.role === 'owner') {
      document.getElementById('meRoleTxt').innerText = '👑 Super Owner';
      document.getElementById('adminPanelBtn').style.display = 'block';
    }
  }

  function switchTab(viewId, btnId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(btnId) document.getElementById(btnId).classList.add('active');
  }

  function enterRoom(t) {
    currentRoom = t;
    document.getElementById('activeRoomName').innerText = t;
    document.getElementById('roomOverlay').style.display = 'flex';
    socket.emit('join_room', { room: t, user: user.username, vip: user.vipLevel });
  }

  function leaveRoom() {
    leaveSeat();
    document.getElementById('roomOverlay').style.display = 'none';
    socket.emit('leave_room', { room: currentRoom, user: user.username });
  }

  function createNewRoom() {
    let r = prompt("Enter Room Name:");
    if(r) enterRoom(r);
  }

  function takeSeat(i) {
    if(mySeat !== -1) document.getElementById('slot' + mySeat).classList.remove('active');
    mySeat = i;
    document.getElementById('slot' + i).classList.add('active');
    socket.emit('seat_action', { room: currentRoom, seat: i, user: user.username, action: 'sit' });
  }

  function leaveSeat() {
    if(mySeat !== -1) {
      document.getElementById('slot' + mySeat).classList.remove('active');
      socket.emit('seat_action', { room: currentRoom, seat: mySeat, user: user.username, action: 'leave' });
      mySeat = -1;
    }
  }

  function sendMsg() {
    let inp = document.getElementById('rChatInp');
    if(!inp.value.trim()) return;
    socket.emit('send_chat', { room: currentRoom, user: user.username, msg: inp.value, vip: user.vipLevel });
    inp.value = '';
  }

  function sendGift(name, cost, dia, icon) {
    if(user.coins < cost) { alert("Not enough coins!"); return; }
    user.coins -= cost;
    syncUI();
    socket.emit('send_gift', { room: currentRoom, sender: user.username, name: name, cost: cost, icon: icon });
  }

  function searchUser() {
    let q = document.getElementById('findUname').value;
    if(!q) return;
    fetch('/api/user/' + q).then(r => r.json()).then(u => {
      document.getElementById('searchRes').innerHTML = '<div style="background:#15182a; padding:10px; border-radius:8px;"><b>'+u.username+'</b> ('+u.role+')<br><small style="color:#00f0ff;">Coins: '+u.coins+'</small></div>';
    });
  }

  function editAvatar() {
    let url = prompt("Paste Profile Image URL:");
    if(url) { document.getElementById('meAvatarImg').src = url; }
  }

  function openAdminRecharge() {
    let target = prompt("Enter username to recharge:");
    let amt = prompt("Enter coin amount:");
    if(target && amt) socket.emit('admin_recharge', { target: target, amount: parseInt(amt) });
  }

  socket.on('user_entered', d => {
    let b = document.getElementById('entryAlert');
    b.innerText = d.user + " joined the room!";
    b.style.display = 'block';
    setTimeout(() => { b.style.display = 'none'; }, 2500);
  });

  socket.on('recv_chat', d => {
    let box = document.getElementById('rChatBox');
    box.innerHTML += '<div class="msg-chip"><b style="color:#00f0ff;">' + d.user + ':</b> ' + d.msg + '</div>';
    box.scrollTop = box.scrollHeight;
  });

  socket.on('gift_blast', d => {
    let box = document.getElementById('rChatBox');
    box.innerHTML += '<div class="msg-chip gift-chip">🎁 ' + d.sender + ' sent ' + d.name + '!</div>';
    box.scrollTop = box.scrollHeight;
    let blast = document.getElementById('giftBlastLayer');
    blast.innerText = d.icon;
    setTimeout(() => { blast.innerText = ''; }, 1500);
  });

  socket.on('seat_updated', d => {
    let slot = document.getElementById('slot' + d.seat);
    if(slot) {
      if(d.action === 'sit') slot.classList.add('active');
      else slot.classList.remove('active');
    }
  });

  socket.on('wallet_sync', d => {
    if(d.username.toLowerCase() === user.username.toLowerCase()) {
      user.coins = d.coins;
      syncUI();
      alert("Coins updated by Admin!");
    }
  });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Party Studio started on port ' + PORT);
});
