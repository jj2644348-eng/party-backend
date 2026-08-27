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
  { id: 'room_101', name: '35+💎Follow VS Follow', host: 'Kunal', category: 'Hot', banner: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300', seats: Array(12).fill(null), currentSong: 'None' },
  { id: 'room_102', name: 'SINGLE GIRLS 🍻 BOYS Party', host: 'Mr Love', category: 'Hot', banner: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300', seats: Array(12).fill(null), currentSong: 'None' },
  { id: 'room_103', name: 'TRUTH.ONLY.TRUTH.❤️', host: 'Aditi King', category: 'Date', banner: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300', seats: Array(12).fill(null), currentSong: 'None' }
];

// Greedy Engine
const FRUITS = [
  { name: 'Apple', mult: 5, icon: '🍎' },
  { name: 'Orange', mult: 10, icon: '🍊' },
  { name: 'Mango', mult: 15, icon: '🥭' },
  { name: 'Watermelon', mult: 25, icon: '🍉' },
  { name: 'Lucky Star', mult: 45, icon: '⭐' }
];

let gameState = { timer: 20, phase: 'betting', bets: {} };
setInterval(() => {
  if (gameState.phase === 'betting') {
    gameState.timer--;
    if (gameState.timer <= 0) {
      gameState.phase = 'spinning';
      const winIdx = Math.floor(Math.random() * FRUITS.length);
      const winnerFruit = FRUITS[winIdx];
      for (const [email, userBets] of Object.entries(gameState.bets)) {
        if (userBets[winIdx]) {
          const winAmount = userBets[winIdx] * winnerFruit.mult;
          if (users[email]) {
            users[email].coins += winAmount;
            io.emit('wallet_synced', { email: users[email].email, coins: users[email].coins });
          }
        }
      }
      io.emit('game_spin_result', { winner: winnerFruit, winIndex: winIdx });
      setTimeout(() => {
        gameState.phase = 'betting';
        gameState.timer = 20;
        gameState.bets = {};
        io.emit('game_new_round', { timer: 20 });
      }, 4000);
    } else {
      io.emit('game_timer_tick', { timer: gameState.timer });
    }
  }
}, 1000);

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
  socket.on('send_chat', (d) => io.to(d.roomId).emit('recv_chat', d));
  socket.on('send_gift', (d) => io.to(d.roomId).emit('gift_blast', d));
  socket.on('place_bet', (d) => {
    if (gameState.phase !== 'betting') return;
    const em = d.email.toLowerCase();
    if (users[em] && users[em].coins >= d.amount) {
      users[em].coins -= d.amount;
      if (!gameState.bets[em]) gameState.bets[em] = {};
      gameState.bets[em][d.fruitIndex] = (gameState.bets[em][d.fruitIndex] || 0) + d.amount;
      socket.emit('wallet_synced', { email: em, coins: users[em].coins });
      socket.emit('bet_confirmed', { fruitIndex: d.fruitIndex, totalUserBet: gameState.bets[em][d.fruitIndex] });
    }
  });
  socket.on('admin_recharge', (d) => {
    if (d.requesterEmail.toLowerCase() !== SUPER_OWNER_EMAIL.toLowerCase()) return;
    let found = Object.values(users).find(u => u.username.toLowerCase() === d.target.toLowerCase() || u.email === d.target || u.pbId === d.target);
    if (found) {
      found.coins += d.amount;
      io.emit('wallet_synced', { email: found.email, coins: found.coins });
    }
  });
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BoloHi PB Live</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    html, body { width: 100%; height: 100%; background: #000; color: #111; overflow: hidden; display: flex; justify-content: center; }
    .app-shell { width: 100%; max-width: 440px; height: 100%; background: #f8f9fc; display: flex; flex-direction: column; position: relative; }

    /* AUTH SCREEN */
    #authOverlay { position: absolute; top:0; left:0; width:100%; height:100%; background: #111424; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; color: #fff; }
    .auth-box { background: #1a203a; padding: 24px; border-radius: 16px; display: flex; flex-direction: column; gap: 12px; }
    .auth-inp { background: #252d50; border: 1px solid #364172; border-radius: 10px; padding: 12px; color: #fff; outline: none; }
    .auth-btn { background: #ffd700; color: #000; font-weight: 900; border: none; padding: 12px; border-radius: 10px; cursor: pointer; }

    /* TOP HEADER */
    .top-head { height: 48px; padding: 0 14px; display: flex; justify-content: space-between; align-items: center; background: #fff; border-bottom: 1px solid #eee; }
    .app-logo { font-size: 20px; font-weight: 900; color: #000; letter-spacing: -0.5px; }
    .head-icons { display: flex; gap: 14px; font-size: 18px; cursor: pointer; }

    /* SUB TABS (Hot, Event, Date, Music, Game) */
    .sub-tabs { display: flex; gap: 8px; padding: 8px 14px; background: #fff; overflow-x: auto; border-bottom: 1px solid #f0f0f0; }
    .stab { padding: 4px 14px; border-radius: 14px; font-size: 12px; font-weight: bold; background: #f1f3f7; color: #555; cursor: pointer; white-space: nowrap; }
    .stab.active { background: #ffd700; color: #000; }

    /* MAIN VIEWS */
    .view-panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .view-panel.active { display: flex; }

    /* 1. PARTY TAB (Cards Grid) */
    .party-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px 14px; }
    .p-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.05); cursor: pointer; }
    .p-thumb { height: 130px; position: relative; background: #ddd; }
    .p-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .p-badge { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 8px; }
    .p-tag { position: absolute; bottom: 8px; left: 8px; background: #00f0ff; color: #000; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 8px; }
    .p-info { padding: 8px; font-size: 12px; font-weight: bold; }

    /* 2. GAME TAB */
    .game-hero { margin: 12px 14px; background: #fff4d1; border-radius: 12px; padding: 14px; display: flex; justify-content: space-between; align-items: center; }
    .game-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 0 14px; }
    .g-card { background: #fff; border-radius: 12px; padding: 8px; text-align: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .g-card img { width: 100%; height: 80px; border-radius: 8px; object-fit: cover; margin-bottom: 4px; }

    /* 3. MESSAGES TAB */
    .msg-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; border-bottom: 1px solid #f3f3f3; }
    .msg-ava { width: 44px; height: 44px; border-radius: 50%; background: #ffd700; display: flex; justify-content: center; align-items: center; font-size: 20px; }

    /* 4. ME TAB */
    .me-head { padding: 20px 14px 10px; background: #fff; display: flex; justify-content: space-between; align-items: flex-start; }
    .me-profile { display: flex; gap: 12px; align-items: center; }
    .me-avatar { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #ffd700; object-fit: cover; }
    .me-stats { display: flex; justify-content: space-around; padding: 12px 14px; background: #fff; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 11px; color: #888; }
    .me-stats b { display: block; font-size: 15px; color: #000; }
    .family-square-banner { margin: 10px 14px; background: #fff3dc; border-radius: 10px; padding: 12px; display: flex; align-items: center; gap: 8px; font-weight: bold; font-size: 13px; color: #b26a00; }

    /* SIDE DRAWER (Privilege, VIP, Wallet, etc.) */
    #sideDrawer { position: absolute; top:0; left:0; width:75%; height:100%; background: #fff; z-index: 300; transform: translateX(-100%); transition: 0.3s; display: flex; flex-direction: column; box-shadow: 2px 0 10px rgba(0,0,0,0.2); }
    #sideDrawer.open { transform: translateX(0); }
    .drawer-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #f5f5f5; font-size: 13px; font-weight: 600; cursor: pointer; }

    /* 12-MIC LIVE ROOM */
    .room-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, #261642 0%, #0c0817 100%); z-index: 200; display: none; flex-direction: column; color: #fff; }
    .stage-12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 4px; padding: 12px 6px; }
    .seat-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .seat-ring { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.25); display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: bold; }
    .seat-ring.occupied { border-color: #00f0ff; background: #2a3c75; color: #00f0ff; box-shadow: 0 0 10px #00f0ff; }
    .seat-name { font-size: 9px; margin-top: 4px; color: #b8c4e8; max-width: 50px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }

    /* BOTTOM BAR */
    .bottom-nav { height: 54px; background: #fff; border-top: 1px solid #eee; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-btn { display: flex; flex-direction: column; align-items: center; color: #999; font-size: 10px; font-weight: bold; background: transparent; border: none; cursor: pointer; gap: 2px; }
    .nav-btn.active { color: #000; }
    .nav-btn span { font-size: 18px; }
  </style>
</head>
<body>
<div class="app-shell">

  <!-- AUTH SCREEN -->
  <div id="authOverlay">
    <div class="auth-box">
      <h2 style="color:#ffd700; text-align:center;">BoloHi PB Live</h2>
      <input type="text" id="authName" class="auth-inp" placeholder="Display Name" value="☆ Lucky Ak47 🖥️☆">
      <input type="email" id="authEmail" class="auth-inp" placeholder="Gmail Address" value="lovepreet@gmail.com">
      <button class="auth-btn" onclick="submitAuth()">Continue</button>
    </div>
  </div>

  <!-- SIDE DRAWER -->
  <div id="sideDrawer">
    <div style="padding:16px; font-size:18px; font-weight:900; border-bottom:1px solid #eee;">Menu Options</div>
    <div class="drawer-item" onclick="alert('Square Center')">🪐 Square <span>></span></div>
    <div class="drawer-item" onclick="alert('Privilege Pack')">🛍️ Privilege Pack <span>></span></div>
    <div class="drawer-item" onclick="alert('Privilege Shop')">💎 Privilege Shop <span>></span></div>
    <div class="drawer-item" onclick="alert('VIP Center')">⭐ VIP Level <span id="drwVip">VIP 0</span></div>
    <div class="drawer-item" onclick="alert('Noble Center')">🛡️ Noble Center <span>></span></div>
    <div class="drawer-item" onclick="alert('Family')">👑 Family <span>></span></div>
    <div class="drawer-item" onclick="alert('User Level')">🎖️ User Level Center <span>Lv. 9</span></div>
    <div class="drawer-item" onclick="openRechargeModal()">💰 Wallet (Recharge) <span id="drwCoins">0 C</span></div>
    <div class="drawer-item" onclick="logout()" style="color:red;">🚪 Logout Account</div>
  </div>

  <!-- TOP APP BAR -->
  <div class="top-head">
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:20px; cursor:pointer;" onclick="toggleDrawer()">☰</span>
      <span class="app-logo">BoloHi</span>
    </div>
    <div class="head-icons">
      <span>🔍</span>
      <span>🏠+</span>
    </div>
  </div>

  <!-- SUB TABS -->
  <div class="sub-tabs">
    <div class="stab active">Hot</div>
    <div class="stab">Event</div>
    <div class="stab">Date</div>
    <div class="stab">Music</div>
    <div class="stab">Game</div>
  </div>

  <!-- TAB 1: PARTY -->
  <div class="view-panel active" id="tabParty">
    <div class="party-grid" id="roomsList"></div>
  </div>

  <!-- TAB 2: GAME -->
  <div class="view-panel" id="tabGame">
    <div class="game-hero">
      <div>
        <h4 id="gameUname">Lucky Ak47</h4>
        <small style="color:#666;">Growth Points: 0/982</small>
      </div>
      <span style="font-size:24px;">⭐ Lv.0</span>
    </div>
    <div style="padding:10px 14px; font-weight:bold; font-size:13px;">Popular Games</div>
    <div class="game-grid">
      <div class="g-card" onclick="alert('Starting Ludo...')"><img src="https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=200">Ludo</div>
      <div class="g-card" onclick="alert('Starting Sheep Fight...')"><img src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=200">Sheep Fight</div>
      <div class="g-card" onclick="alert('Starting Knife Hit...')"><img src="https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=200">Knife Hit</div>
    </div>
  </div>

  <!-- TAB 3: DISCOVER -->
  <div class="view-panel" id="tabDiscover">
    <div style="padding:20px; text-align:center; color:#888;">✨ Discover Moments & Status</div>
  </div>

  <!-- TAB 4: MESSAGES -->
  <div class="view-panel" id="tabMsg">
    <div class="msg-item"><div class="msg-ava">🤖</div><div><b>BoloHi Official</b><p style="font-size:11px;color:#888;">Welcome to PB Live Studio!</p></div></div>
    <div class="msg-item"><div class="msg-ava">🔔</div><div><b>Interactive notifications</b><p style="font-size:11px;color:#888;">You have new followers</p></div></div>
  </div>

  <!-- TAB 5: ME -->
  <div class="view-panel" id="tabMe">
    <div class="me-head">
      <div class="me-profile">
        <img class="me-avatar" id="meAva" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200">
        <div>
          <h3 id="meTitle" style="font-size:15px;">Lucky Ak47</h3>
          <p id="meIdDisplay" style="font-size:10px; color:#888;">ID: 2081902760</p>
        </div>
      </div>
      <div style="font-size:11px; font-weight:bold; background:#fff3dc; padding:4px 8px; border-radius:12px;">💎 <span id="meDia">0</span></div>
    </div>
    <div class="me-stats">
      <div><b id="meFollowers">46</b>Followers</div>
      <div><b id="meFollowing">108</b>Following</div>
      <div><b id="meFriends">43</b>Friends</div>
      <div><b>0</b>Coupling</div>
    </div>
    <div class="family-square-banner">👑 <span>Family Square</span></div>
    <div style="padding:10px 14px; font-size:13px; font-weight:bold;">Party Records</div>
    <div style="padding:0 14px; color:#888; font-size:11px;">Jio 5G Punjabi Song 101</div>
  </div>

  <!-- 12-SEAT LIVE ROOM SCREEN -->
  <div class="room-overlay" id="roomScreen">
    <div style="height:44px; display:flex; justify-content:space-between; align-items:center; padding:0 12px; background:rgba(0,0,0,0.4);">
      <h4 id="rmTitle" style="font-size:12px;">Live Room</h4>
      <button style="background:#ff3344; color:#fff; border:none; padding:4px 10px; border-radius:10px; font-weight:bold; font-size:11px;" onclick="exitRoom()">Exit</button>
    </div>
    <div class="stage-12" id="stageGrid"></div>
    <div style="flex:1; padding:10px; overflow-y:auto;" id="chatBox">
      <div style="background:rgba(0,0,0,0.4); padding:4px 8px; border-radius:6px; font-size:11px; width:fit-content;">✨ Room Started. Tap any seat!</div>
    </div>
    <div style="height:48px; background:#08060f; display:flex; align-items:center; padding:0 10px; gap:8px;">
      <input type="text" id="chatInp" style="flex:1; background:#1b152b; border:1px solid #332550; border-radius:14px; padding:6px 10px; color:#fff; font-size:12px;" placeholder="Send message...">
      <button style="background:#00f0ff; color:#000; border:none; border-radius:10px; padding:6px 12px; font-weight:bold;" onclick="sendMsg()">➤</button>
      <button style="background:#ffd700; color:#000; border:none; border-radius:10px; padding:6px 12px; font-weight:bold;" onclick="sendGiftFast()">🎁</button>
    </div>
  </div>

  <!-- 5-TAB BOTTOM BAR -->
  <div class="bottom-nav">
    <button class="nav-btn active" id="nbParty" onclick="switchNav('tabParty', 'nbParty')"><span>🏠</span>Party</button>
    <button class="nav-btn" id="nbGame" onclick="switchNav('tabGame', 'nbGame')"><span>🎮</span>Game</button>
    <button class="nav-btn" id="nbDiscover" onclick="switchNav('tabDiscover', 'nbDiscover')"><span>🧭</span>Discover</button>
    <button class="nav-btn" id="nbMsg" onclick="switchNav('tabMsg', 'nbMsg')"><span>💬</span>Messages</button>
    <button class="nav-btn" id="nbMe" onclick="switchNav('tabMe', 'nbMe')"><span>👤</span>Me</button>
  </div>
</div>

<script>
  const socket = io();
  let user = null;
  let curRoomId = null;
  let activeSeats = Array(12).fill(null);

  let saved = localStorage.getItem('bolo_user');
  if(saved) {
    user = JSON.parse(saved);
    document.getElementById('authOverlay').style.display = 'none';
    renderUser();
  }

  fetch('/api/r
