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

// MongoDB Connection
const mongoURI = 'mongodb+srv://admin:LovepreetPB123@cluster0.mongodb.net/partyApp?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB Connected!'))
  .catch(err => console.log('MongoDB Error:', err));

// Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
  activeFrame: { type: String, default: 'frame-gold' },
  activeEntry: { type: String, default: 'हेलीकॉप्टर' },
  coins: { type: Number, default: 3000 },
  diamonds: { type: Number, default: 100 },
  role: { type: String, default: 'user' },
  userLevel: { type: Number, default: 1 },
  userExp: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

// UI Route
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>PB 3D Live Voice Club</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: sans-serif; }
    body { background: #06070d; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: #0d0f1a; display: flex; flex-direction: column; position: relative; }
    #entryBanner { position: absolute; top: 65px; left: 0; width: 100%; background: linear-gradient(90deg, #ff0055, #ffd700); padding: 8px; text-align: center; font-weight: bold; font-size: 12px; display: none; z-index: 99; color: #000; }
    #gift3DLayer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; justify-content: center; align-items: center; z-index: 100; font-size: 80px; }
    .header { padding: 10px 14px; background: #16192b; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #232845; }
    .profile-meta { display: flex; align-items: center; gap: 8px; }
    .avatar-wrapper { width: 44px; height: 44px; position: relative; display: flex; justify-content: center; align-items: center; cursor: pointer; }
    .avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .frame-gold { position: absolute; width: 44px; height: 44px; border: 2px solid #ffd700; border-radius: 50%; }
    .frame-royal { position: absolute; width: 44px; height: 44px; border: 2px solid #ff0055; border-radius: 50%; }
    .tag { font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 4px; }
    .lvl-tag { background: #00f0ff; color: #000; }
    .vip-tag { background: #ffd700; color: #000; }
    .wallet-box { display: flex; gap: 5px; font-size: 11px; font-weight: bold; }
    .pill { background: #000; padding: 4px 8px; border-radius: 10px; border: 1px solid #333; }
    .admin-bar { background: #ff0055; padding: 6px; text-align: center; font-size: 11px; font-weight: bold; cursor: pointer; display: none; }
    .hub-bar { display: flex; gap: 6px; padding: 6px 10px; background: #090a12; }
    .hub-item { flex: 1; padding: 6px; background: #1a1d30; border-radius: 6px; font-size: 10px; text-align: center; cursor: pointer; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px; }
    .mic-slot { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .mic-ring { width: 48px; height: 48px; border-radius: 50%; background: #1b1e33; border: 2px solid #2d3356; display: flex; justify-content: center; align-items: center; font-size: 18px; }
    .mic-ring.active { border-color: #00f0ff; }
    .slot-lbl { font-size: 10px; margin-top: 4px; color: #8e95b3; }
    .chat { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .msg-box { background: #1a1d30; padding: 5px 10px; border-radius: 8px; width: fit-content; max-width: 85%; }
    .gift-notice { background: linear-gradient(90deg, #ff0055, #ffaa00); color: #fff; font-weight: bold; }
    .gifts-tray { display: flex; gap: 6px; padding: 8px; background: #111424; overflow-x: auto; border-top: 1px solid #232845; }
    .gift-card { min-width: 65px; padding: 6px 2px; background: #1a1d30; border-radius: 8px; text-align: center; font-size: 9px; cursor: pointer; }
    .gift-card span { font-size: 20px; display: block; margin-bottom: 2px; }
    .bottom { padding: 8px 10px; background: #06070d; display: flex; gap: 6px; }
    input { flex: 1; padding: 8px 12px; background: #161829; border: 1px solid #282e4e; border-radius: 16px; color: #fff; outline: none; font-size: 12px; }
    .btn-snd { background: #ff0055; border: none; padding: 8px 14px; border-radius: 16px; color: #fff; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
<div class="app">
  <div id="entryBanner"></div>
  <div id="gift3DLayer"></div>
  <div class="header">
    <div class="profile-meta">
      <div class="avatar-wrapper">
        <img class="avatar-img" id="myAvatar" src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png">
        <div id="myFrame" class="frame-gold"></div>
      </div>
      <div>
        <div style="font-weight:bold; font-size:13px;" id="dispName">User</div>
        <div style="display:flex; gap:3px; margin-top:2px;">
          <span class="tag lvl-tag" id="dispLvl">Lv 1</span>
          <span class="tag vip-tag" id="dispVip">VIP 0</span>
        </div>
      </div>
    </div>
    <div class="wallet-box">
      <div class="pill" style="color:#ffd700;">💰 <span id="dispCoins">0</span></div>
      <div class="pill" style="color:#00f0ff;">💎 <span id="dispDia">0</span></div>
    </div>
  </div>
  <div id="adminPanel" class="admin-bar" onclick="openAdminModal()">👑 [ओनर कंट्रोल] कॉइन रिचार्ज व VIP अपग्रेड</div>
  <div class="hub-bar">
    <div class="hub-item" onclick="changeFrame('frame-royal')">👑 7-डे फ्रेम</div>
    <div class="hub-item" onclick="setEntry('🚛 देसी ट्रक')">🚛 ट्रक एंट्री</div>
    <div class="hub-item" onclick="claimDaily()">🎁 7-Day बोनस</div>
  </div>
  <div class="stage">
    <div class="mic-slot" onclick="toggleMic(0)"><div class="mic-ring active" id="mic0">👑</div><div class="slot-lbl">Host</div></div>
    <div class="mic-slot" onclick="toggleMic(1)"><div class="mic-ring" id="mic1">🎤</div><div class="slot-lbl">Mic 1</div></div>
    <div class="mic-slot" onclick="toggleMic(2)"><div class="mic-ring" id="mic2">🎤</div><div class="slot-lbl">Mic 2</div></div>
    <div class="mic-slot" onclick="toggleMic(3)"><div class="mic-ring" id="mic3">🎤</div><div class="slot-lbl">Mic 3</div></div>
    <div class="mic-slot" onclick="toggleMic(4)"><div class="mic-ring" id="mic4">🔒</div><div class="slot-lbl">Mic 4</div></div>
    <div class="mic-slot" onclick="toggleMic(5)"><div class="mic-ring" id="mic5">🔒</div><div class="slot-lbl">Mic 5</div></div>
    <div class="mic-slot" onclick="toggleMic(6)"><div class="mic-ring" id="mic6">🔒</div><div class="slot-lbl">Mic 6</div></div>
    <div class="mic-slot" onclick="toggleMic(7)"><div class="mic-ring" id="mic7">🔒</div><div class="slot-lbl">Mic 7</div></div>
  </div>
  <div class="chat" id="chatBox">
    <div class="msg-box" style="color:#00f0ff;">✨ पार्टी रूम एक्टिव है!</div>
  </div>
  <div class="gifts-tray">
    <div class="gift-card" onclick="send3DGift('🔫 होली पिचकारी', 50, 5, '🔫')"><span>🔫</span>50 C</div>
    <div class="gift-card" onclick="send3DGift('🎡 मेला झूला', 200, 20, '🎡')"><span>🎡</span>200 C</div>
    <div class="gift-card" onclick="send3DGift('🚜 PB ट्रैक्टर', 1000, 100, '🚜')"><span>🚜</span>1000 C</div>
    <div class="gift-card" onclick="send3DGift('🚛 देसी ट्रक', 5000, 500, '🚛')"><span>🚛</span>5000 C</div>
    <div class="gift-card" onclick="send3DGift('🚁 हेलीकॉप्टर', 10000, 1000, '🚁')"><span>🚁</span>10000 C</div>
  </div>
  <div class="bottom">
    <input type="text" id="chatInp" placeholder="मैसेज भेजें...">
    <button class="btn-snd" onclick="sendChat()">Send</button>
  </div>
</div>
<script>
  const socket = io();
  let username = prompt("यूजर नाम दर्ज करें (ओनर बनने के लिए 'Lovepreet' लिखें):") || ("User_" + Math.floor(Math.random()*1000));
  let myUser = {};

  fetch('/api/user/' + username)
    .then(r => r.json())
    .then(d => {
      myUser = d;
      sync();
      socket.emit('enter_room', { room: 'room101', user: myUser.username, entry: myUser.activeEntry, vip: myUser.vipLevel });
    });

  function sync() {
    document.getElementById('dispName').innerText = myUser.username;
    document.getElementById('dispCoins').innerText = myUser.coins;
    document.getElementById('dispDia').innerText = myUser.diamonds;
    document.getElementById('dispLvl').innerText = 'Lv ' + myUser.userLevel;
    document.getElementById('dispVip').innerText = 'VIP ' + myUser.vipLevel;
    document.getElementById('myAvatar').src = myUser.avatar;
    document.getElementById('myFrame').className = myUser.activeFrame || 'frame-gold';
    if(myUser.role === 'owner') document.getElementById('adminPanel').style.display = 'block';
  }

  function changeFrame(f) {
    myUser.activeFrame = f;
    document.getElementById('myFrame').className = f;
    socket.emit('update_frame', { username: myUser.username, frame: f });
  }

  function setEntry(e) {
    myUser.activeEntry = e;
    socket.emit('update_entry', { username: myUser.username, entry: e });
    alert("एंट्री सेट: " + e);
  }

  function claimDaily() {
    myUser.coins += 100;
    myUser.diamonds += 10;
    sync();
    alert("🎁 बोनस मिला: +100 कॉइन्स!");
  }

  function toggleMic(idx) { document.getElementById('mic' + idx).classList.toggle('active'); }

  function sendChat() {
    let inp = document.getElementById('chatInp');
    if(!inp.value.trim()) return;
    socket.emit('send_msg', { roomId: 'room101', user: myUser.username, lvl: myUser.userLevel, vip: myUser.vipLevel, msg: inp.value });
    inp.value = '';
  }

  function send3DGift(name, cost, dia, icon) {
    if(myUser.coins < cost) { alert("पर्याप्त कॉइन्स नहीं हैं!"); return; }
    myUser.coins -= cost;
    sync();
    socket.emit('send_gift_blast', { roomId: 'room101', sender: myUser.username, name: name, cost: cost, dia: dia, icon: icon });
  }

  function openAdminModal() {
    let target = prompt("यूज़र का नाम:");
    let amt = prompt("कॉइन्स की संख्या:");
    if(target && amt) socket.emit('admin_action', { owner: myUser.username, target: target, coins: parseInt(amt) });
  }

  socket.on('show_royal_entry', (d) => {
    let b = document.getElementById('entryBanner');
    b.innerText = d.entry + " पर VIP " + d.vip + " " + d.user + " पधारे!";
    b.style.display = 'block';
    setTimeout(() => { b.style.display = 'none'; }, 3000);
  });

  socket.on('receive_msg', (d) => {
    let b = document.getElementById('chatBox');
    let vTxt = d.vip > 0 ? ('[VIP'+d.vip+'] ') : ('[Lv'+d.lvl+'] ');
    b.innerHTML += '<div class="msg-box"><b style="color:#00f0ff;">' + vTxt + d.user + ':</b> ' + d.msg + '</div>';
    b.scrollTop = b.scrollHeight;
  });

  socket.on('play_3d_blast', (d) => {
    let b = document.getElementById('chatBox');
    b.innerHTML += '<div class="msg-box gift-notice">🎁 ' + d.sender + ' ने ' + d.name + ' भेजा!</div>';
    b.scrollTop = b.scrollHeight;
    let l = document.getElementById('gift3DLayer');
    l.innerText = d.icon;
    setTimeout(() => { l.innerText = ''; }, 1500);
  });

  socket.on('wallet_synced', (d) => {
    if(d.username === myUser.username) {
      myUser.coins = d.coins;
      myUser.vipLevel = d.vipLevel;
      sync();
      alert("👑 ओनर ने आपका अकाउंट रिचार्ज कर दिया!");
    }
  });
</script>
</body>
</html>`);
});

// API
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

// Sockets
io.on('connection', (socket) => {
  socket.on('enter_room', (d) => {
    socket.join(d.room);
    io.to(d.room).emit('show_royal_entry', d);
  });

  socket.on('send_msg', (d) => io.to(d.roomId).emit('receive_msg', d));

  socket.on('send_gift_blast', async (d) => {
    let u = await User.findOne({ username: d.sender });
    if (u && u.coins >= d.cost) {
      u.coins -= d.cost;
      u.diamonds += d.dia;
      await u.save();
      io.to(d.roomId).emit('play_3d_blast', d);
    }
  });

  socket.on('update_frame', async (d) => {
    let u = await User.findOne({ username: d.username });
    if(u) { u.activeFrame = d.frame; await u.save(); }
  });

  socket.on('update_entry', async (d) => {
    let u = await User.findOne({ username: d.username });
    if(u) { u.activeEntry = d.entry; await u.save(); }
  });

  socket.on('admin_action', async (d) => {
    let owner = await User.findOne({ username: d.owner });
    if(owner && owner.role === 'owner') {
      let target = await User.findOne({ username: d.target });
      if(!target) target = await User.create({ username: d.target, coins: d.coins });
      else target.coins += d.coins;

      if(target.coins >= 50000) target.vipLevel = 5;
      else if(target.coins >= 10000) target.vipLevel = 3;
      else if(target.coins >= 1000) target.vipLevel = 1;

      await target.save();
      io.emit('wallet_synced', { username: target.username, coins: target.coins, vipLevel: target.vipLevel });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server Live on Port ' + PORT));

      
