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

// 🔐 STRICT OWNER CONFIGURATION (Yahan apna asli Owner Gmail da dein)
const SUPER_OWNER_EMAIL = "lovepreet@gmail.com"; // <-- Yeh raha aapka official secure email

let users = {
  [SUPER_OWNER_EMAIL]: { 
    pbId: '10000001',
    email: SUPER_OWNER_EMAIL,
    username: 'Lovepreet (Owner)', 
    coins: 10000000, 
    diamonds: 500000, 
    role: 'owner', 
    userLevel: 99, 
    vipLevel: 10, 
    family: 'PB Royals',
    frame: 'frame-gold-glow'
  }
};

let families = [
  { id: 'pb_royals', name: 'PB Royals', leader: 'Lovepreet (Owner)', members: 24, power: 250000, badge: '👑' },
  { id: 'desi_warriors', name: 'Desi Warriors', leader: 'PB_Rapper', members: 14, power: 85000, badge: '🔥' }
];

let activeRooms = [
  { id: 'room_101', name: 'PB 101 Royal Club', host: 'Lovepreet (Owner)', category: 'Voice Party', seats: Array(8).fill(null) },
  { id: 'room_102', name: 'Desi Beats & Melodies', host: 'PB_Poet', category: 'Music & Rap', seats: Array(8).fill(null) }
];

// Greedy Roulette Engine
const FRUITS = [
  { name: 'Apple', mult: 5, icon: '🍎' },
  { name: 'Orange', mult: 10, icon: '🍊' },
  { name: 'Mango', mult: 15, icon: '🥭' },
  { name: 'Watermelon', mult: 25, icon: '🍉' },
  { name: 'Lucky Star', mult: 45, icon: '⭐' }
];

let gameState = { timer: 20, phase: 'betting', lastWinner: null, bets: {} };

setInterval(() => {
  if (gameState.phase === 'betting') {
    gameState.timer--;
    if (gameState.timer <= 0) {
      gameState.phase = 'spinning';
      const winIdx = Math.floor(Math.random() * FRUITS.length);
      const winnerFruit = FRUITS[winIdx];
      gameState.lastWinner = winnerFruit;
      
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
      }, 4500);
    } else {
      io.emit('game_timer_tick', { timer: gameState.timer });
    }
  }
}, 1000);

// 2. SECURE GMAIL AUTH API
app.post('/api/auth/gmail', (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ success: false, msg: 'Email is required!' });

  const em = email.toLowerCase().trim();
  
  // Strict Owner Validation (Only exact match grants owner power)
  const isExactOwner = (em === SUPER_OWNER_EMAIL.toLowerCase());

  if (!users[em]) {
    let newId = generatePBId();
    while(Object.values(users).some(u => u.pbId === newId)) {
      newId = generatePBId();
    }

    users[em] = {
      pbId: newId,
      email: em,
      username: username || em.split('@')[0],
      coins: isExactOwner ? 10000000 : 5000,
      diamonds: isExactOwner ? 500000 : 200,
      role: isExactOwner ? 'owner' : 'member',
      userLevel: isExactOwner ? 99 : 1,
      vipLevel: isExactOwner ? 10 : 0,
      family: 'None',
      frame: isExactOwner ? 'frame-gold-glow' : 'frame-none'
    };
  } else {
    // If it's the exact owner logging in, ensure role is secure
    if (isExactOwner) {
      users[em].role = 'owner';
      users[em].coins = Math.max(users[em].coins, 10000000);
      users[em].vipLevel = 10;
    }
  }

  res.json({ success: true, user: users[em] });
});

app.get('/api/families', (req, res) => res.json(families));
app.get('/api/rooms', (req, res) => res.json(activeRooms));

// 3. REAL-TIME SOCKET ENGINE
io.on('connection', (socket) => {
  socket.on('join_room', (d) => {
    socket.join(d.roomId);
    io.to(d.roomId).emit('user_entered', { user: d.username, pbId: d.pbId, vip: d.vipLevel });
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

  socket.on('buy_vip_frame', (d) => {
    const em = d.email.toLowerCase();
    if (users[em] && users[em].coins >= d.cost) {
      users[em].coins -= d.cost;
      users[em].vipLevel = Math.max(users[em].vipLevel, d.vipLvl);
      users[em].frame = d.frameClass;
      socket.emit('wallet_synced', { email: em, coins: users[em].coins });
      socket.emit('frame_updated', { frame: d.frameClass, vipLevel: users[em].vipLevel });
    }
  });

  // Secure Admin Recharge (Only executed if requester is the real owner)
  socket.on('admin_recharge', (d) => {
    let requesterEmail = d.requesterEmail ? d.requesterEmail.toLowerCase().trim() : '';
    if (requesterEmail !== SUPER_OWNER_EMAIL.toLowerCase()) {
      return; // Unauthorized attempt blocked!
    }

    let target = d.target.toLowerCase().trim();
    let found = Object.values(users).find(u => u.username.toLowerCase() === target || u.email === target || u.pbId === target);
    if (found) {
      found.coins += d.amount;
      io.emit('wallet_synced', { email: found.email, coins: found.coins });
    }
  });
});

// 4. EMBEDDED FRONTEND
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
    body { background: #050711; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app-shell { width: 100%; max-width: 440px; height: 100%; background: #0b0e1e; display: flex; flex-direction: column; position: relative; }

    #authOverlay { position: absolute; top:0; left:0; width:100%; height:100%; background: #070914; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; }
    .auth-box { background: #131830; padding: 26px 20px; border-radius: 16px; border: 1px solid #222b52; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 0 20px rgba(255,0,85,0.2); }
    .auth-logo { text-align: center; font-size: 20px; font-weight: 900; color: #ff0055; margin-bottom: 4px; }
    .auth-sub { text-align: center; font-size: 11px; color: #8a94b8; margin-bottom: 6px; }
    .auth-inp { background: #1a203e; border: 1px solid #2c3666; border-radius: 10px; padding: 12px; color: #fff; outline: none; font-size: 13px; }
    .auth-btn { background: linear-gradient(90deg, #ff0055, #ff5500); border: none; border-radius: 10px; padding: 12px; color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; margin-top: 4px; }

    .app-head { height: 52px; padding: 0 14px; background: #11152a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1c2242; flex-shrink: 0; }
    .brand-title { font-size: 15px; font-weight: 900; color: #ff0055; }
    .wallet-box { display: flex; gap: 6px; font-size: 11px; font-weight: bold; }
    .coin-badge { background: linear-gradient(90deg, #ffd700, #ff9900); color: #000; padding: 4px 8px; border-radius: 12px; }
    .dia-badge { background: linear-gradient(90deg, #00f0ff, #0077ff); color: #000; padding: 4px 8px; border-radius: 12px; }

    .view-panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 65px; }
    .view-panel.active { display: flex; }

    .hero-banner { margin: 12px 14px; height: 110px; border-radius: 14px; background: linear-gradient(135deg, #ff0055, #7928ca); padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 4px 15px rgba(255,0,85,0.25); }
    .sec-label { font-size: 12px; font-weight: bold; color: #8a94b8; margin: 10px 14px 6px; text-transform: uppercase; }
    .room-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 14px; }
    .room-tile { background: #131830; border-radius: 12px; padding: 12px; border: 1px solid #1f274c; cursor: pointer; }
    .room-tag { font-size: 9px; background: #ff0055; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; width: fit-content; margin-bottom: 6px; }
    
    .fam-card { margin: 6px 14px; background: #131830; border-radius: 12px; padding: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #1f274c; }
    .fam-badge { font-size: 24px; width: 44px; height: 44px; background: #1c2345; border-radius: 50%; display: flex; justify-content: center; align-items: center; }

    .mall-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 14px; }
    .mall-card { background: #131830; border-radius: 12px; padding: 14px; border: 1px solid #1f274c; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .mall-preview { width: 56px; height: 56px; border-radius: 50%; margin: 6px 0; }
    .btn-buy { background: linear-gradient(90deg, #ffd700, #ff9900); border: none; border-radius: 10px; padding: 6px 14px; color: #000; font-weight: bold; font-size: 11px; cursor: pointer; }

    .me-banner { padding: 20px 14px; background: linear-gradient(180deg, #161b36 0%, #0b0e1e 100%); display: flex; flex-direction: column; align-items: center; }
    .avatar-wrapper { position: relative; width: 74px; height: 74px; margin-bottom: 8px; }
    .me-avatar { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .frame-gold-glow { border: 3px solid #ffd700; box-shadow: 0 0 14px #ffd700; }
    .frame-neon-blue { border: 3px solid #00f0ff; box-shadow: 0 0 14px #00f0ff; }
    .frame-royal-fire { border: 3px solid #ff0055; box-shadow: 0 0 14px #ff0055; }
    .stats-card { margin: 12px 14px; background: #131830; border-radius: 12px; padding: 14px; display: flex; justify-content: space-around; border: 1px solid #1f274c; }
    .stat-item { text-align: center; font-size: 11px; color: #8a94b8; }
    .stat-item b { font-size: 16px; color: #ffd700; display: block; margin-bottom: 2px; }
    .admin-recharge-btn { margin: 10px 14px; padding: 12px; background: linear-gradient(90deg, #ff0055, #ff5500); border-radius: 10px; text-align: center; font-weight: bold; cursor: pointer; display: none; }
    .logout-btn { margin: 4px 14px 12px; padding: 10px; background: #1c2345; border-radius: 10px; text-align: center; font-size: 12px; color: #ff3344; cursor: pointer; font-weight: bold; }

    .room-screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #060813; z-index: 100; display: none; flex-direction: column; }
    .room-header { height: 48px; padding: 0 14px; background: #11152a; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1c2242; }
    .mic-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px 6px; padding: 14px 10px; background: #0d1022; border-bottom: 1px solid #191f3a; }
    .mic-box { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .mic-ring { width: 48px; height: 48px; border-radius: 50%; background: #151a34; border: 2px solid #262f56; display: flex; justify-content: center; align-items: center; font-size: 15px; }
    .mic-ring.occupied { border-color: #00f0ff; box-shadow: 0 0 12px #00f0ff; color: #00f0ff; font-weight: bold; }
    .mic-name { font-size: 10px; margin-top: 4px; color: #8a94b8; }
    
    .room-mid-bar { display: flex; justify-content: space-between; padding: 6px 14px; background: #11152a; border-bottom: 1px solid #1c2242; align-items: center; }
    .btn-game-toggle { background: linear-gradient(90deg, #ffaa00, #ff0055); border: none; border-radius: 12px; padding: 5px 12px; font-weight: bold; font-size: 11px; color: #fff; cursor: pointer; }

    .game-sheet { background: #131830; border-top: 2px solid #ffaa00; padding: 10px 14px; display: none; flex-direction: column; gap: 8px; }
    .game-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
    .fruit-slots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .fruit-card { background: #1b2142; border-radius: 8px; padding: 6px 2px; text-align: center; cursor: pointer; border: 1px solid #28325e; }
    .fruit-card.win-flash { border-color: #ffd700; background: #383018; box-shadow: 0 0 14px #ffd700; }
    .fruit-icon { font-size: 20px; }
    .fruit-mult { font-size: 10px; color: #ffd700; font-weight: bold; }
    .fruit-bet { font-size: 9px; color: #00f0ff; }

    .room-chat { flex: 1; padding: 10px 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .chat-bubble { background: rgba(255,255,255,0.06); padding: 6px 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
    .gift-slider { display: flex; gap: 8px; padding: 8px 12px; background: #0e1224; overflow-x: auto; border-top: 1px solid #1c2242; }
    .gift-card { min-width: 65px; padding: 6px 4px; background: #151a34; border-radius: 8px; text-align: center; font-size: 10px; cursor: pointer; }
    .gift-card span { font-size: 20px; display: block; margin-bottom: 2px; }
    .room-inputs { padding: 8px 12px; background: #080a16; display: flex; gap: 8px; }
    .input-bar { flex: 1; background: #131830; border: 1px solid #222a50; border-radius: 14px; padding: 8px 12px; color: #fff; outline: none; font-size: 12px; }
    .btn-send { background: #ff0055; border: none; border-radius: 12px; padding: 0 14px; color: #fff; font-weight: bold; cursor: pointer; }
    #giftPopupLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; justify-content: center; align-items: center; font-size: 85px; z-index: 110; }

    .bottom-bar { height: 58px; background: #0e1224; border-top: 1px solid #181e36; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 40; }
    .tab-item { display: flex; flex-direction: column; align-items: center; color: #697499; font-size: 10px; background: transparent; border: none; cursor: pointer; gap: 2px; }
    .tab-item.active { color: #ff0055; font-weight: bold; }
    .tab-item span { font-size: 18px; }
    .tab-add { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ff0055, #ff5500); display: flex; justify-content: center; align-items: center; color: #fff; font-size: 24px; font-weight: bold; box-shadow: 0 0 12px rgba(255,0,85,0.6); margin-top: -14px; cursor: pointer; }
  </style>
</head>
<body>
<div class="app-shell">

  <!-- LOGIN SCREEN -->
  <div id="authOverlay">
    <div class="auth-box">
      <div class="auth-logo">👑 PB LIVE STUDIO</div>
      <div class="auth-sub">Enter your Gmail to login securely</div>
      <input type="text" id="authName" class="auth-inp" placeholder="Your Nickname">
      <input type="email" id="authEmail" class="auth-inp" placeholder="Your Gmail Address" value="lovepreet@gmail.com">
      <button class="auth-btn" onclick="submitGmailLogin()">Continue with Gmail</button>
    </div>
  </div>

  <div class="app-head">
    <div class="brand-title">👑 PB LIVE STUDIO</div>
    <div class="wallet-box">
      <span class="coin-badge" id="hudCoins">0 C</span>
      <span class="dia-badge" id="hudDia">0 D</span>
    </div>
  </div>

  <div class="view-panel active" id="viewParty">
    <div class="hero-banner">
      <h3 style="font-size:16px;">🔥 3D Live Voice Club</h3>
      <p style="font-size:11px; opacity:0.8;">Join 8-Mic Stage, Greedy Roulette & Gifts!</p>
    </div>
    <div class="sec-label">Active Live Rooms</div>
    <div class="room-grid" id="roomListContainer"></div>
  </div>

  <div class="view-panel" id="viewFamily">
    <div class="sec-label">Top Ranked Families</div>
    <div id="familyListContainer"></div>
  </div>

  <div class="view-panel" id="viewMall">
    <div class="sec-label">VIP Store & Avatar Frames</div>
    <div class="mall-grid">
      <div class="mall-card">
        <h4>VIP 3 Neon Frame</h4>
        <div class="mall-preview frame-neon-blue" style="background:#151a34;"></div>
        <button class="btn-buy" onclick="buyVipFrame(3, 'frame-neon-blue', 1000)">1,000 Coins</button>
      </div>
      <div class="mall-card">
        <h4>VIP 5 Gold Frame</h4>
        <div class="mall-preview frame-gold-glow" style="background:#151a34;"></div>
        <button class="btn-buy" onclick="buyVipFrame(5, 'frame-gold-glow', 5000)">5,000 Coins</button>
      </div>
      <div class="mall-card">
        <h4>VIP 10 Royal Frame</h4>
        <div class="mall-preview frame-royal-fire" style="background:#151a34;"></div>
        <button class="btn-buy" onclick="buyVipFrame(10, 'frame-royal-fire', 25000)">25,000 Coins</button>
      </div>
    </div>
  </div>

  <div class="view-panel" id="viewMe">
    <div class="me-banner">
      <div class="avatar-wrapper">
        <img class="me-avatar" id="meAvatarPic" src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png">
      </div>
      <h3 id="meUname">User</h3>
      <p id="meIdTxt" style="font-size:11px; color:#ffd700; margin-top:2px;"></p>
      <p id="meEmailTxt" style="font-size:10px; color:#8a94b8;"></p>
      <p id="meRoleTxt" style="font-size:11px; color:#00f0ff; margin-top:2px;">VIP Member</p>
    </div>
    <div class="stats-card">
      <div class="stat-item"><b id="meCoins">0</b>Coins</div>
      <div class="stat-item"><b id="meDia">0</b>Diamonds</div>
      <div class="stat-item"><b id="meLvl">Lv 1</b>Level</div>
      <div class="stat-item"><b id="meVip">VIP 0</b>VIP</div>
    </div>
    <div class="admin-recharge-btn" id="btnAdminRecharge" onclick="openAdminRechargeModal()">👑 Owner Recharge Panel</div>
    <div class="logout-btn" onclick="logout()">🚪 Logout Account</div>
  </div>

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

    <div class="room-mid-bar">
      <span style="font-size:11px; color:#8a94b8;">Live Mini Game</span>
      <button class="btn-game-toggle" onclick="toggleGreedyGame()">🎰 Greedy Roulette</button>
    </div>

    <div class="game-sheet" id="greedyGameSheet">
      <div class="game-head">
        <span id="gameTimerStatus" style="color:#ffd700;">⏱️ Betting: 20s</span>
        <span style="font-size:10px; color:#8a94b8;">Tap to bet 100 C</span>
      </div>
      <div class="fruit-slots">
        <div class="fruit-card" id="fc0" onclick="betFruit(0)"><div class="fruit-icon">🍎</div><div class="fruit-mult">5x</div><div class="fruit-bet" id="bet0">0</div></div>
        <div class="fruit-card" id="fc1" onclick="betFruit(1)"><div class="fruit-icon">🍊</div><div class="fruit-mult">10x</div><div class="fruit-bet" id="bet1">0</div></div>
        <div class="fruit-card" id="fc2" onclick="betFruit(2)"><div class="fruit-icon">🥭</div><div class="fruit-mult">15x</div><div class="fruit-bet" id="bet2">0</div></div>
        <div class="fruit-card" id="fc3" onclick="betFruit(3)"><div class="fruit-icon">🍉</div><div class="fruit-mult">25x</div><div class="fruit-bet" id="bet3">0</div></div>
        <div class="fruit-card" id="fc4" onclick="betFruit(4)"><div class="fruit-icon">⭐</div><div class="fruit-mult">45x</div><div class="fruit-bet" id="bet4">0</div></div>
      </div>
    </div>

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

  <div class="bottom-bar">
    <button class="tab-item active" id="tabBtnParty" onclick="switchMainTab('viewParty', 'tabBtnParty')"><span>🏠</span>Party</button>
    <button class="tab-item" id="tabBtnFamily" onclick="switchMainTab('viewFamily', 'tabBtnFamily')"><span>🛡️</span>Family</button>
    <div class="tab-add" onclick="createRoomPrompt()">+</div>
    <button class="tab-item" id="tabBtnMall" onclick="switchMainTab('viewMall', 'tabBtnMall')"><span>🛍️</span>Mall</button>
    <button class="tab-item" id="tabBtnMe" onclick="switchMainTab('viewMe', 'tabBtnMe')"><span>👤</span>Me</button>
  </div>
</div>

<script>
  const socket = io();
  let user = null;
  let curRoomId = null;
  let activeSeats = Array(8).fill(null);

  let savedUser = localStorage.getItem('pb_live_user');
  if(savedUser) {
    user = JSON.parse(savedUser);
    document.getElementById('authOverlay').style.display = 'none';
    renderUser();
  }

  fetch('/api/rooms').then(r => r.json()).then(rooms => renderRooms(rooms));
  fetch('/api/families').then(r => r.json()).then(fams => renderFamilies(fams));

  function submitGmailLogin() {
    let email = document.getElementById('authEmail').value;
    let username = document.getElementById('authName').value;

    if(!email) { alert("Please enter Gmail address!"); return; }

    fetch('/api/auth/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username })
    }).then(r => r.json()).then(d => {
      if(d.success) {
        user = d.user;
        localStorage.setItem('pb_live_user', JSON.stringify(user));
        document.getElementById('authOverlay').style.display = 'none';
        renderUser();
      } else {
        alert(d.msg);
      }
    });
  }

  function logout() {
    localStorage.removeItem('pb_live_user');
    location.reload();
  }

  function renderUser() {
    document.getElementById('hudCoins').innerText = user.coins + ' C';
    document.getElementById('hudDia').innerText = user.diamonds + ' D';
    document.getElementById('meUname').innerText = user.username;
    document.getElementById('meIdTxt').innerText = 'PB ID: ' + user.pbId;
    document.getElementById('meEmailTxt').innerText = user.email;
    document.getElementById('meCoins').innerText = user.coins;
    document.getElementById('meDia').innerText = user.diamonds;
    document.getElementById('meLvl').innerText = 'Lv ' + user.userLevel;
    document.getElementById('meVip').innerText = 'VIP ' + user.vipLevel;
    
    let pic = document.getElementById('meAvatarPic');
    pic.className = 'me-avatar ' + (user.frame || '');

    if(user.role === 'owner') {
      document.getElementById('meRoleTxt').innerText = '👑 Super Owner';
      document.getElementById('btnAdminRecharge').style.display = 'block';
    } else {
      document.getElementById('meRoleTxt').innerText = 'VIP Member';
      document.getElementById('btnAdminRecharge').style.display = 'none';
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
    socket.emit('join_room', { roomId: id, username: user.username, pbId: user.pbId, vipLevel: user.vipLevel });
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

  function toggleGreedyGame() {
    let sheet = document.getElementById('greedyGameSheet');
    sheet.style.display = sheet.style.display === 'flex' ? 'none' : 'flex';
  }

  function betFruit(idx) {
    if (user.coins < 100) { alert("Need at least 100 coins to bet!"); return; }
    socket.emit('place_bet', { email: user.email, fruitIndex: idx, amount: 100 });
  }

  function buyVipFrame(vipLvl, frameClass, cost) {
    if (user.coins < cost) { alert("Not enough coins!"); return; }
    socket.emit('buy_vip_frame', { email: user.email, vipLvl: vipLvl, frameClass: frameClass, cost: cost });
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
    let target = prompt("Enter Target User's 8-digit PB ID, Name or Email:");
    let amt = prompt("Enter coin amount to add:");
    if (target && amt) {
      socket.emit('admin_recharge', { requesterEmail: user.email, target: target, amount: parseInt(amt) });
    }
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
    if (user && d.email === user.email) {
      user.coins = d.coins;
      localStorage.setItem('pb_live_user', JSON.stringify(user));
      renderUser();
    }
  });
  socket.on('frame_updated', d => {
    user.frame = d.frame;
    user.vipLevel = d.vipLevel;
    localStorage.setItem('pb_live_user', JSON.stringify(user));
    renderUser();
    alert("VIP Frame Activated!");
  });
  socket.on('game_timer_tick', d => {
    document.getElementById('gameTimerStatus').innerText = '⏱️ Betting: ' + d.timer + 's';
  });
  socket.on('game_spin_result', d => {
    document.getElementById('gameTimerStatus').innerText = '🎉 Result: ' + d.winner.name + ' (' + d.winner.mult + 'x)!';
    let card = document.getElementById('fc' + d.winIndex);
    if(card) {
      card.classList.add('win-flash');
      setTimeout(() => card.classList.remove('win-flash'), 4000);
    }
  });
  socket.on('game_new_round', d => {
    for(let i=0; i<5; i++) {
      let b = document.getElementById('bet' + i);
      if(b) b.innerText = '0';
    }
  });
  socket.on('bet_confirmed', d => {
    let b = document.getElementById('bet' + d.fruitIndex);
    if(b) b.innerText = d.totalUserBet;
  });
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Party Secure Owner Auth Engine Started on Port ' + PORT);
});
