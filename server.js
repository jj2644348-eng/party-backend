const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// MongoDB Database
const mongoURI = 'mongodb+srv://admin:LovepreetPB123@cluster0.mongodb.net/partyApp?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('PB Master Database Connected!'))
  .catch(err => console.log('DB Error:', err));

// Complete Database Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
  coins: { type: Number, default: 3000 },
  diamonds: { type: Number, default: 100 },
  role: { type: String, default: 'user' },
  userLevel: { type: Number, default: 1 },
  userExp: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 0 },
  familyName: { type: String, default: 'PB Royal Clan' },
  activeFrame: { type: String, default: 'frame-gold' },
  activeEntry: { type: String, default: '🚜 3D PB ट्रैक्टर' },
  loginStreak: { type: Number, default: 1 }
});
const User = mongoose.model('User', UserSchema);

// Full Multi-Page UI & Logic Route
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Desi Voice Party Studio</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    body { background: #05060a; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app-root { width: 100%; max-width: 440px; height: 100%; background: #0c0e18; display: flex; flex-direction: column; position: relative; }
    
    /* Views */
    .tab-view { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 60px; }
    .tab-view.active { display: flex; }

    /* Top Nav */
    .top-header { padding: 12px 16px; background: #131626; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f243d; }
    .app-logo { font-size: 15px; font-weight: 900; color: #ff0055; text-transform: uppercase; }
    .wallet-stat-top { display: flex; gap: 6px; font-size: 11px; font-weight: bold; }
    .coin-badge { background: #ffd700; color: #000; padding: 3px 8px; border-radius: 12px; }
    .dia-badge { background: #00f0ff; color: #000; padding: 3px 8px; border-radius: 12px; }

    /* Home / Party View */
    .banner-slide { margin: 12px; height: 110px; border-radius: 14px; background: linear-gradient(135deg, #ff0055, #7928ca); padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 4px 15px rgba(255,0,85,0.3); }
    .room-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 12px; }
    .room-tile { background: #15182a; border-radius: 12px; padding: 12px; border: 1px solid #242947; cursor: pointer; }
    .room-tile h4 { font-size: 13px; color: #fff; margin-bottom: 4px; }
    .room-tile p { font-size: 10px; color: #00f0ff; }

    /* Search View */
    .search-row { padding: 12px; display: flex; gap: 8px; }
    .search-input { flex: 1; padding: 10px 14px; background: #171a2d; border: 1px solid #252a48; border-radius: 20px; color: #fff; outline: none; }
    .btn-action { padding: 8px 14px; border-radius: 16px; border: none; font-weight: bold; cursor: pointer; font-size: 11px; background: #00f0ff; color: #000; }

    /* Me Profile View */
    .me-top { padding: 20px 16px; background: linear-gradient(180deg, #1a1d33 0%, #0c0e18 100%); display: flex; flex-direction: column; align-items: center; }
    .me-avatar-box { width: 70px; height: 70px; position: relative; border-radius: 50%; margin-bottom: 8px; cursor: pointer; }
    .me-avatar-box img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .frame-gold { position: absolute; top: -4px; left: -4px; width: 78px; height: 78px; border: 3px solid #ffd700; border-radius: 50%; box-shadow: 0 0 10px #ffd700; pointer-events: none; }
    .frame-royal { position: absolute; top: -4px; left: -4px; width: 78px; height: 78px; border: 3px solid #ff0055; border-radius: 50%; box-shadow: 0 0 12px #ff0055; pointer-events: none; }
    .wallet-card-me { margin: 12px; background: #15182a; border-radius: 12px; padding: 14px; display: flex; justify-content: space-around; border: 1px solid #242947; }
    .w-box { text-align: center; }
    .w-box b { font-size: 16px; color: #ffd700; display: block; }
    .admin-bar-btn { margin: 10px 12px; padding: 12px; background: linear-gradient(90deg, #ff0055, #7928ca); border-radius: 10px; text-align: center; font-weight: bold; cursor: pointer; display: none; font-size: 12px; }

    /* Live Voice Room Overlay */
    .room-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #070810; z-index: 100; display: none; flex-direction: column; }
    .room-header { padding: 10px 14px; background: #121422; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f233b; }
    .leave-btn { background: #ff3333; color: #fff; border: none; padding: 4px 10px; border-radius: 10px; font-weight: bold; font-size: 11px; cursor: pointer; }
    
    /* 8 Mic Stage Grid */
    .mic-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px 10px; }
    .mic-slot { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .mic-ring { width: 52px; height: 52px; border-radius: 50%; background: #171a2c; border: 2px solid #2c3254; display: flex; justify-content: center; align-items: center; font-size: 18px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    .mic-ring.active { border-color: #00f0ff; box-shadow: 0 0 12px #00f0ff; }
    .mic-title { font-size: 10px; margin-top: 4px; color: #8e95b3; font-weight: bold; }

    .seat-bar { display: flex; justify-content: space-around; padding: 6px; background: #111422; border-top: 1px solid #1d2136; }
    .room-chat-box { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .msg-chip { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
    .gift-chip { background: linear-gradient(90deg, #ff0055, #ffaa00); color: #fff; font-weight: bold; }

    /* Gifts Tray */
    .gift-tray { display: flex; gap: 6px; padding: 8px; background: #0e101c; overflow-x: auto; border-top: 1px solid #1b1f33; }
    .gift-tile { min-width: 65px; padding: 6px 2px; background: #16192b; border-radius: 8px; text-align: center; font-size: 9px; cursor: pointer; }
    .gift-tile span { font-size: 20px; display: block; margin-bottom: 2px; }

    /* Bottom Input */
    .room-footer { padding: 8px 10px; background: #080912; display: flex; gap: 6px; }
    .room-input { flex: 1; padding: 8px 12px; background: #161829; border: 1px solid #282e4e; border-radius: 16px; color: #fff; outline: none; font-size: 12px; }

    /* 3D Entry & Blast Layer */
    #entryAlert { position: absolute; top: 60px; left: 0; width: 100%; background: linear-gradient(90deg, #ff0055, #ffd700); color: #000; font-weight: 900; text-align: center; padding: 6px; font-size: 11px; display: none; z-index: 105; }
    #giftBlastLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; justify-content: center; align-items: center; z-index: 110; font-size: 85px; }

    /* Bottom Nav Bar */
    .nav-bar { height: 56px; background: #101220; border-top: 1px solid #1a1e30; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; width: 100%; z-index: 20; }
    .nav-item { display: flex; flex-direction: column; align-items: center; color: #8e95b3; font-size: 10px; cursor: pointer; border: none; background: transparent; }
    .nav-item.active { color: #ff0055; font-weight: bold; }
    .nav-item span { font-size: 18px; margin-bottom: 2px; }
    .nav-plus { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #ff0055, #ff5500); display: flex; justify-content: center; align-items: center; color: #fff; font-size: 24px; font-weight: bold; box-shadow: 0 0 10px rgba(255,0,85,0.6); margin-top: -15px; cursor: pointer; }
  </style>
</head>
<body>

<div class="app-root">

  <!-- TOP HEADER -->
  <div class="top-header">
    <div class="app-logo">🇮🇳 PB Voice Live</div>
    <div class="wallet-stat-top">
      <span class="coin-badge" id="topCoins">💰 0</span>
      <span class="dia-badge" id="topDia">💎 0</span>
    </div>
  </div>

  <!-- VIEW 1: HOME PARTY -->
  <div class="tab-view active" id="tabParty">
    <div class="banner-slide">
      <h3 style="font-size:15px;">🔥 देसी मेलोडी & वॉइस पार्टी</h3>
      <p style="font-size:11px; opacity:0.8;">माइक पर बैठें, बातें करें और गिफ़्ट्स जीतें!</p>
    </div>
    <div class="room-grid" id="roomGrid">
      <div class="room-tile" onclick="openRoom('🎙️ PB 101 Royal Club')">
        <h4>🎙️ PB 101 Royal Club</h4>
        <p>● Live 8 Mics | Desi Beats</p>
      </div>
      <div class="room-tile" onclick="openRoom('📻 Desi Mela & Fun')">
        <h4>📻 Desi Mela & Fun</h4>
        <p>● Live 8 Mics | Masti</p>
      </div>
    </div>
  </div>

  <!-- VIEW 2: SEARCH -->
  <div class="tab-view" id="tabSearch">
    <div class="search-row">
      <input type="text" id="findUname" class="search-input" placeholder="यूजर का नाम या ID लिखें...">
      <button class="btn-action" onclick="findUser()">खोजें</button>
    </div>
    <div id="searchRes" style="padding:10px 12px;"></div>
  </div>

  <!-- VIEW 3: ME (PROFILE & WALLET) -->
  <div class="tab-view" id="tabMe">
    <div class="me-top">
      <div class="me-avatar-box" onclick="changeDp()">
        <img id="meAvatarImg" src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png">
        <div id="meFrameClass" class="frame-gold"></div>
      </div>
      <h3 id="meDispName">User</h3>
      <p id="meRoleTxt" style="font-size:11px; color:#00f0ff; margin-top:2px;">Normal Member</p>
    </div>

    <div class="wallet-card-me">
      <div class="w-box"><b id="meCoinsTxt">0</b>कॉइन्स 💰</div>
      <div class="w-box"><b id="meDiaTxt">0</b>डायमंड्स 💎</div>
      <div class="w-box"><b id="meLvlTxt">Lv 1</b>लेवल 🌟</div>
      <div class="w-box"><b id="meVipTxt">VIP 0</b>VIP 👑</div>
    </div>

    <div style="display:flex; gap:6px; padding:0 12px;">
      <button class="btn-action" style="flex:1; background:#1e2238; color:#fff;" onclick="set7DayFrame()">👑 7-डे फ्रेम</button>
      <button class="btn-action" style="flex:1; background:#1e2238; color:#fff;" onclick="claimDailyReward()">🎁 7-Day बोनस</button>
    </div>

    <div id="adminPanelBtn" class="admin-bar-btn" onclick="openAdminRecharge()">👑 [ओनर कंट्रोल] कॉइन रिचार्ज / VIP अपग्रेड करें</div>
  </div>

  <!-- LIVE ROOM OVERLAY -->
  <div class="room-overlay" id="roomOverlay">
    <div id="entryAlert"></div>
    <div id="giftBlastLayer"></div>

    <div class="room-header">
      <div>
        <h4 id="activeRoomName" style="font-size:13px; color:#ff0055;">Room</h4>
        <span style="font-size:10px; color:#00f0ff;">● 8 Seats Audio Party</span>
      </div>
      <button class="leave-btn" onclick="closeRoom()">Leave ❌</button>
    </div>

    <!-- 8 Mic Stage -->
    <div class="mic-grid">
      <div class="mic-slot" onclick="takeMic(0)"><div class="mic-ring active" id="slot0">👑</div><div class="mic-title">Host</div></div>
      <div class="mic-slot" onclick="takeMic(1)"><div class="mic-ring" id="slot1">1</div><div class="mic-title">Mic 1</div></div>
      <div class="mic-slot" onclick="takeMic(2)"><div class="mic-ring" id="slot2">2</div><div class="mic-title">Mic 2</div></div>
      <div class="mic-slot" onclick="takeMic(3)"><div class="mic-ring" id="slot3">3</div><div class="mic-title">Mic 3</div></div>
      <div class="mic-slot" onclick="takeMic(4)"><div class="mic-ring" id="slot4">4</div><div class="mic-title">Mic 4</div></div>
      <div class="mic-slot" onclick="takeMic(5)"><div class="mic-ring" id="slot5">5</div><div class="mic-title">Mic 5</div></div>
      <div class="mic-slot" onclick="takeMic(6)"><div class="mic-ring" id="slot6">6</div><div class="mic-title">Mic 6</div></div>
      <div class="mic-slot" onclick="takeMic(7)"><div class="mic-ring" id="slot7">7</div><div class="mic-title">Mic 7</div></div>
    </div>

    <div class="seat-bar">
      <button class="btn-action" onclick="takeMic(1)">🎤 Take Mic</button>
      <button class="btn-action" style="background:#ffaa00;" onclick="leaveCurrentMic()">🛑 Leave Mic</button>
    </div>

    <div class="room-chat-box" id="rChatBox">
      <div class="msg-chip" style="color:#00f0ff;">✨ लाइव रूम एक्टिव है! माइक पर टैप करके बैठें।</div>
    </div>

    <!-- Desi Gifts -->
    <div class="gift-tray">
      <div class="gift-tile" onclick="sendDesiGift('🔫 पिचकारी', 50, 5, '🔫')"><span>🔫</span>50 C</div>
      <div class="gift-tile" onclick="sendDesiGift('🎡 मेला झूला', 200, 20, '🎡')"><span>🎡</span>200 C</div>
      <div class="gift-tile" onclick="sendDesiGift('🚜 PB ट्रैक्टर', 1000, 100, '🚜')"><span>🚜</span>1000 C</div>
      <div class="gift-tile" onclick="sendDesiGift('🚛 देसी ट्रक', 5000, 500, '🚛')"><span>🚛</span>5000 C</div>
      <div class="gift-tile" onclick="sendDesiGift('🚁 हेलीकॉप्टर', 10000, 1000, '🚁')"><span>🚁</span>10000 C</div>
    </div>

    <div class="room-footer">
      <input type="text" id="rChatInp" class="room-input" placeholder="मैसेज लिखें...">
      <button class="btn-action" style="background:#ff0055; color:#fff;" onclick="sendRoomMsg()">Send</button>
    </div>
  </div>

  <!-- BOTTOM NAVBAR -->
  <div class="nav-bar">
    <button class="nav-item active" id="navParty" onclick="switchTab('tabParty', 'navParty')"><span>🏠</span>Party</button>
    <button class="nav-item" id="navSearch" onclick="switchTab('tabSearch', 'navSearch')"><span>🔍</span>Search</button>
    <div class="nav-plus" onclick="createRoomPrompt()">+</div>
    <button class="nav-item" id="navMe" onclick="switchTab('tabMe', 'navMe')"><span>👤</span>Me</button>
  </div>

</div>

<script>
  const socket = io();
  let username = prompt("यूजर नाम दर्ज करें (ओनर बनने के लिए 'Lovepreet' लिखें):") || ("User_" + Math.floor(Math.random()*1000));
  let myUser = {};
  let currentActiveRoom = '';
  let seatedMicIdx = -1;

  fetch('/api/user/' + username)
    .then(r => r.json())
    .then(d => {
      myUser = d;
      syncGlobalUI();
      startExpTimer();
    });

  function syncGlobalUI() {
    document.getElementById('topCoins').innerText = '💰 ' + myUser.coins;
    document.getElementById('topDia').innerText = '💎 ' + myUser.diamonds;
    document.getElementById('meDispName').innerText = myUser.username;
    document.getElementById('meCoinsTxt').innerText = myUser.coins;
    document.getElementById('meDiaTxt').innerText = myUser.diamonds;
    document.getElementById('meLvlTxt').innerText = 'Lv ' + myUser.userLevel;
    document.getElementById('meVipTxt').innerText = 'VIP ' + myUser.vipLevel;
    document.getElementById('meAvatarImg').src = myUser.avatar;
    document.getElementById('meFrameClass').className = myUser.activeFrame || 'frame-gold';

    if(myUser.role === 'owner') {
      document.getElementById('meRoleTxt').innerText = '👑 Super Owner';
      document.getElementById('adminPanelBtn').style.display = 'block';
    }
  }

  function switchTab(viewId, btnId) {
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(btnId) document.getElementById(btnId).classList.add('active');
  }

  function openRoom(name) {
    currentActiveRoom = name;
    document.getElementById('activeRoomName').innerText = name;
    document.getElementById('roomOverlay').style.display = 'flex';
    socket.emit('enter_voice_room', { room: name, user: myUser.username, entry: myUser.activeEntry, vip: myUser.vipLevel });
  }

  function closeRoom() {
    leaveCurrentMic();
    document.getElementById('roomOverlay').style.display = 'none';
    socket.emit('leave_voice_room', { room: currentActiveRoom, user: myUser.username });
  }

  function createRoomPrompt() {
    let r = prompt("नया वॉइस पार्टी रूम का नाम दर्ज करें:");
    if(r) {
      document.getElementById('roomGrid').innerHTML += '<div class="room-tile" onclick="openRoom(\\''+r+'\\')"><h4>🎙️ '+r+'</h4><p>● Live 8 Mics | My Room</p></div>';
      openRoom(r);
    }
  }

  function takeMic(idx) {
    if(seatedMicIdx !== -1) document.getElementById('slot' + seatedMicIdx).classList.remove('active');
    seatedMicIdx = idx;
    document.getElementById('slot' + idx).classList.add('active');
    socket.emit('seat_change', { room: currentActiveRoom, seat: idx, user: myUser.username, action: 'sit' });
  }

  function leaveCurrentMic() {
    if(seatedMicIdx !== -1) {
      document.getElementById('slot' + seatedMicIdx).classList.remove('active');
      socket.emit('seat_change', { room: currentActiveRoom, seat: seatedMicIdx, user: myUser.username, action: 'leave' });
      seatedMicIdx = -1;
    }
  }

  function sendRoomMsg() {
    let inp = document.getElementById('rChatInp');
    if(!inp.value.trim()) return;
    socket.emit('send_voice_msg', { room: currentActiveRoom, user: myUser.username, lvl: myUser.userLevel, vip: myUser.vipLevel, msg: inp.value });
    inp.value = '';
  }

  function sendDesiGift(name, cost, dia, icon) {
    if(myUser.coins < cost) { alert("पर्याप्त कॉइन्स नहीं हैं!"); return; }
    myUser.coins -= cost;
    syncGlobalUI();
    socket.emit('send_desi_blast', { room: currentActiveRoom, sender: myUser.username, name: name, cost: cost, dia: dia, icon: icon });
  }

  function findUser() {
    let q = document.getElementById('findUname').value;
    if(!q) return;
    fetch('/api/user/' + q)
      .then(r => r.json())
      .then(u => {
        document.getElementById('searchRes').innerHTML = '<div style="background:#15182a; padding:12px; border-radius:10px; border:1px solid #242947;"><b>'+u.username+'</b> ('+u.role+')<br><small style="color:#00f0ff;">Lv '+u.userLevel+' | VIP '+u.vipLevel+' | 💰 '+u.coins+'</small></div>';
      });
  }

  function changeDp() {
    let url = prompt("नई प्रोफ़ाइल फोटो (Image Link) दर्ज करें:");
    if(url) { myUser.avatar = url; syncGlobalUI(); }
  }

  function set7DayFrame() {
    myUser.activeFrame = 'frame-royal';
    syncGlobalUI();
    alert("👑 7-डे रॉयल अवतार फ्रेम एक्टिवेट हो गया है!");
  }

  function claimDailyReward() {
    myUser.coins += 100;
    myUser.diamonds += 10;
    syncGlobalUI();
    alert("🎁 7-Day बोनस मिला: +100 कॉइन्स और +10 डायमंड्स!");
  }

  function openAdminRecharge() {
    let target = prompt("जिस यूज़र को कॉइन्स देने हैं उसका नाम:");
    let amt = prompt("कॉइन्स की संख्या:");
    if(target && amt) socket.emit('admin_recharge_action', { owner: myUser.username, target: target, amount: parseInt(amt) });
  }

  function startExpTimer() {
    setInterval(() => {
      socket.emit('heartbeat_exp', { username: myUser.username });
    }, 60000);
  }

  // Socket Receivers
  socket.on('voice_entry_banner', (d) => {
    let b = document.getElementById('entryAlert');
    b.innerText = d.entry + " पर सवार होकर VIP " + d.vip + " " + d.user + " रूम में आए!";
    b.style.display = 'block';
    setTimeout(() => { b.style.display = 'none'; }, 3000);
  });

  socket.on('recv_voice_msg', (d) => {
    let box = document.getElementById('rChatBox');
    let vTxt = d.vip > 0 ? ('[VIP'+d.vip+'] ') : ('[Lv'+d.lvl+'] ');
    box.innerHTML += '<div class="msg-chip"><b style="color:#00f0ff;">' + vTxt + d.user + ':</b> ' + d.msg + '</div>';
    box.scrollTop = box.scrollHeight;
  });

  socket.on('recv_gift_blast', (d) => {
    let box = document.getElementById('rChatBox');
    box.innerHTML += '<div class="msg-chip gift-chip">🎁 ' + d.sender + ' ने ' + d.name + ' भेजा!</div>';
    box.scrollTop = box.scrollHeight;

    let blast = document.getElementById('giftBlastLayer');
    blast.innerText = d.icon;
    setTimeout(() => { blast.innerText = ''; }, 1500);
  });

  socket.on('seat_state_changed', (d) => {
    let slot = document.getElementById('slot' + d.seat);
    if(slot) {
      if(d.action === 'sit') slot.classList.add('active');
      else slot.classList.remove('active');
    }
  });

  socket.on('wallet_recharged', (d) => {
    if(d.username === myUser.username) {
      myUser.coins = d.coins;
      myUser.vipLevel = d.vipLevel;
      syncGlobalUI();
      alert("👑 ओनर ने आपका अकाउंट रिचार्ज कर दिया!");
    }
  });
</script>
</body>
</html>`);
});

// API Routes
app.get('/api/user/:username', async (req, res) => {
  let uname = req.params.username;
  let isOwner = (uname.toLowerCase() === 'lovepreet' || uname.toLowerCase() === 'admin');
  let user = await User.findOne({ username: uname });
  if (!user) {
    user = await User.create({
      username: uname,
      role: isOwner ? 'owner' : 'user',
      coins: isOwner ? 5000000 : 3000,
      diamonds: isOwner ? 100000 : 100,
      vipLevel: isOwner ? 5 : 0,
      activeFrame: isOwner ? 'frame-royal' : 'frame-gold'
    });
  }
  res.json(user);
});

// Real-Time Socket Center
io.on('connection', (socket) => {
  socket.on('enter_voice_room', (d) => {
    socket.join(d.room);
    io.to(d.room).emit('voice_entry_banner', d);
  });

  socket.on('leave_voice_room', (d) => socket.leave(d.room));
  socket.on('send_voice_msg', (d) => io.to(d.room).emit('recv_voice_msg', d));

  socket.on('send_desi_blast', async (d) => {
    let u = await User.findOne({ username: d.sender });
    if (u && u.coins >= d.cost) {
      u.coins -= d.cost;
      u.diamonds += d.dia;
      await u.save();
      io.to(d.room).emit('recv_gift_blast', d);
    }
  });

  socket.on('seat_change', (d) => io.to(d.room).emit('seat_state_changed', d));

  socket.on('heartbeat_exp', async (d) => {
    let u = await User.findOne({ username: d.username });
    if(u) {
      u.userExp += 10;
      u.userLevel = Math.floor(u.userExp / 50) + 1;
      await u.save();
    }
  });

  socket.on('admin_recharge_action', async (d) => {
    let owner = await User.findOne({ username: d.owner });
    if(owner && owner.role === 'owner') {
      let target = await User.findOne({ username: d.target });
      if(!target) target = await User.create({ username: d.target, coins: d.amount });
      else target.coins += d.amount;

      if(target.coins >= 50000) target.vipLevel = 5;
      else if(target.coins >= 10000) target.vipLevel = 3;
      else if(target.coins >= 1000) target.vipLevel = 1;

      await target.save();
      io.emit('wallet_recharged', { username: target.username, coins: target.coins, vipLevel: target.vipLevel });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('PB Master Voice Engine Live on Port ' + PORT));
