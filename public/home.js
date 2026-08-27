<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>BoloHi PB Live</title>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; user-select: none; }
    body { background: #031518; color: #fff; display: flex; justify-content: center; height: 100vh; overflow: hidden; }
    .app { width: 100%; max-width: 440px; height: 100%; background: radial-gradient(circle at top, #0c3b38 0%, #031418 100%); display: flex; flex-direction: column; position: relative; }

    /* Auth Screen */
    #auth { position: absolute; top:0; left:0; width:100%; height:100%; background: #041b1f; z-index: 500; display: flex; flex-direction: column; justify-content: center; padding: 24px; gap: 12px; }
    .inp { background: #08292f; border: 1px solid #145963; border-radius: 8px; padding: 12px; color: #fff; outline: none; }
    .btn { background: linear-gradient(90deg, #ffaa00, #ff0055); color: #fff; font-weight: bold; border: none; padding: 12px; border-radius: 8px; cursor: pointer; }

    /* 1. Top Bar with Tabs & Icons */
    .top-header { height: 50px; padding: 0 12px; display: flex; justify-content: space-between; align-items: center; background: rgba(3, 20, 24, 0.8); flex-shrink: 0; border-bottom: 1px solid rgba(255,215,0,0.2); }
    .top-tabs { display: flex; gap: 14px; font-size: 15px; font-weight: bold; }
    .top-tab { color: #5aa19b; cursor: pointer; position: relative; }
    .top-tab.active { color: #ffd700; }
    .top-tab.active::after { content:''; position: absolute; bottom: -6px; left: 20%; width: 60%; height: 3px; background: #ffd700; border-radius: 2px; }
    .top-icons { display: flex; gap: 10px; font-size: 16px; align-items: center; }
    .top-icon-btn { background: rgba(0,0,0,0.3); border: 1px solid #145963; border-radius: 50%; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; cursor: pointer; }

    /* Content Panels */
    .panel { flex: 1; display: none; flex-direction: column; overflow-y: auto; padding-bottom: 65px; }
    .panel.active { display: flex; }

    /* Mid Filter Buttons (Popular / New) */
    .filter-bar { display: flex; gap: 10px; padding: 10px 12px 6px; }
    .btn-pill { background: #092c30; border: 1px solid #1a626a; border-radius: 16px; padding: 5px 14px; font-size: 12px; font-weight: bold; color: #6bbbb3; cursor: pointer; }
    .btn-pill.active { background: linear-gradient(90deg, #00d2c4, #007d75); color: #fff; border-color: #00f0ff; box-shadow: 0 0 8px rgba(0,240,255,0.4); }

    /* 3. Room Cards Grid */
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px 12px; }
    .card { background: #072227; border-radius: 12px; overflow: hidden; border: 1.5px solid #145963; cursor: pointer; position: relative; display: flex; flex-direction: column; }
    .card.rank1 { border-color: #ffd700; box-shadow: 0 0 10px rgba(255,215,0,0.3); }
    .card.rank2 { border-color: #00d2c4; }
    .card img { width: 100%; height: 130px; object-fit: cover; }
    .card-meta { padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
    .card-title { font-size: 11px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-foot { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #72beb6; }

    /* Search Bar Popup */
    #searchModal { position: absolute; top: 50px; left: 0; width: 100%; background: #051e22; padding: 10px; border-bottom: 2px solid #ffd700; display: none; z-index: 400; gap: 8px; }

    /* 4. Bottom Dock Navigation Bar */
    .bnav { height: 56px; background: #041a1e; border-top: 1px solid #145963; display: flex; justify-content: space-around; align-items: center; position: absolute; bottom: 0; left: 0; width: 100%; z-index: 100; }
    .nav-item { display: flex; flex-direction: column; align-items: center; gap: 2px; color: #4e8c85; font-size: 10px; font-weight: bold; cursor: pointer; position: relative; }
    .nav-item.active { color: #00f0ff; }
    .nav-icon { font-size: 18px; }
    .badge { position: absolute; top: -3px; right: -6px; background: #ff0055; color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 8px; font-weight: bold; }

    /* Inside 12-Mic Voice Room */
    .room { position: absolute; top:0; left:0; width:100%; height:100%; background: radial-gradient(circle at center, #1b0d26 0%, #031418 100%); z-index: 200; display: none; flex-direction: column; }
    .stage { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 10px; flex-shrink: 0; }
    .seat { display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative; }
    .ring { width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid #145963; display: flex; justify-content: center; align-items: center; font-size: 11px; font-weight: bold; }
    .ring.on { border-color: #ffd700; color: #ffd700; background: #223f27; box-shadow: 0 0 10px #ffd700; }
    .ring.muted { border-color: #ff3344; color: #ff3344; }

    /* Modals & God Panel */
    .god-panel { background: #06282e; border: 2px solid #ffd700; border-radius: 10px; padding: 12px; margin: 10px; display: none; flex-direction: column; gap: 8px; }
    #actionModal, #settingsSheet { position: absolute; bottom: 0; left: 0; width: 100%; background: #051e22; border-top: 2px solid #00f0ff; padding: 14px; display: none; flex-direction: column; gap: 8px; z-index: 300; }
    .act-btn { padding: 10px; border-radius: 8px; border: none; font-weight: bold; font-size: 12px; cursor: pointer; text-align: center; }
  </style>
</head>
<body>
<div class="app">

  <!-- AUTH SCREEN -->
  <div id="auth">
    <h2 style="color:#ffd700; text-align:center;">👑 BoloHi PB Live</h2>
    <input type="text" id="aName" class="inp" placeholder="Name" value="☆ Lucky Ak47 🖥️☆">
    <input type="email" id="aMail" class="inp" placeholder="Gmail" value="lp5006352@gmail.com">
    <input type="text" id="aCustomId" class="inp" placeholder="Custom PB ID (Optional)">
    <button class="btn" onclick="auth()">Enter Studio</button>
  </div>

  <!-- 1. TOP HEADER (MINE, PARTY, EVENTS + ICONS) -->
  <div class="top-header">
    <div class="top-tabs">
      <span class="top-tab" onclick="switchTopTab('mine', this)">Mine</span>
      <span class="top-tab active" onclick="switchTopTab('party', this)">Party</span>
      <span class="top-tab" onclick="switchTopTab('events', this)">Events</span>
    </div>
    <div class="top-icons">
      <div class="top-icon-btn" onclick="claimDailyChest()">🎁</div>
      <div class="top-icon-btn" onclick="toggleSearch()">🔍</div>
      <div class="top-icon-btn" onclick="openMyRoom()">🏠</div>
    </div>
  </div>

  <!-- SEARCH BAR POPUP -->
  <div id="searchModal">
    <input type="text" id="srchInp" class="inp" style="flex:1;" placeholder="Search Room Name or ID..." oninput="filterRooms()">
    <button class="btn" style="padding:4px 10px;" onclick="toggleSearch()">✕</button>
  </div>

  <!-- 2. MAIN PARTY TAB CONTENT -->
  <div class="panel active" id="tabParty">
    <!-- Mid Filter Pills -->
    <div class="filter-bar">
      <button class="btn-pill active" onclick="switchFilter('popular', this)">🔥 Popular</button>
      <button class="btn-pill" onclick="switchFilter('new', this)">✨ New</button>
    </div>
    <!-- Room Grid -->
    <div class="grid" id="rList"></div>
  </div>

  <!-- DISCOVER TAB (GAMES & GREEDY) -->
  <div class="panel" id="tabDiscover">
    <div style="padding:16px; text-align:center;">
      <h3 style="color:#ffd700; margin-bottom:12px;">🎰 Games & Roulette</h3>
      <button class="btn" style="width:100%;" onclick="openGreedyGame()">Launch Greedy Fruit 🍎</button>
    </div>
  </div>

  <!-- FAMILY TAB -->
  <div class="panel" id="tabFamily">
    <div style="padding:16px; text-align:center;">
      <h3 style="color:#00f0ff;">🛡️ PB Royal Agency & Family</h3>
      <p style="font-size:12px; color:#888; margin-top:8px;">Join official Punjabi Live Guild</p>
    </div>
  </div>

  <!-- MESSAGE TAB -->
  <div class="panel" id="tabMessage">
    <div style="padding:12px;">
      <h4 style="color:#ffd700; margin-bottom:10px;">🔔 Official System Notices (68)</h4>
      <div style="background:#072227; padding:10px; border-radius:8px; border:1px solid #145963; font-size:12px;">
        <b style="color:#00f0ff;">System:</b> Daily recharge reward of 5000 Coins added!
      </div>
    </div>
  </div>

  <!-- ME TAB (PROFILE & GOD MODE) -->
  <div class="panel" id="tabMe">
    <div style="padding:16px; text-align:center;">
      <h3 id="meUname">User</h3>
      <p id="meId" style="color:#ffd700; font-size:11px; margin:4px 0;"></p>
      <p id="meRole" style="color:#00f0ff; font-size:11px; margin-bottom:10px;"></p>
      <div style="background:gold; color:#000; font-weight:bold; padding:4px 10px; border-radius:12px; display:inline-block;" id="uCoins">0 C</div>

      <!-- GOD MODE PANEL (OWNER ONLY) -->
      <div class="god-panel" id="godPanel">
        <div style="color:#ffd700; font-weight:bold; font-size:12px;">👑 SUPER OWNER GOD MODE</div>
        <input type="text" id="godTarget" class="inp" placeholder="Target Username / ID" style="padding:6px; font-size:11px;">
        <div style="display:flex; gap:6px;">
          <input type="number" id="godCoins" class="inp" placeholder="Coins" style="flex:1; padding:6px; font-size:11px;">
          <button class="btn" style="padding:6px 10px; background:gold; color:#000;" onclick="godAction('coins')">Add Coins</button>
        </div>
        <button class="btn" style="padding:6px; background:#00f0ff; color:#000; font-size:11px;" onclick="godAction('vip')">Grant VIP 10 🌟</button>
      </div>

      <button class="btn" style="background:#333; margin-top:10px;" onclick="logout()">Logout</button>
    </div>
  </div>

  <!-- 3. LIVE 12-MIC ROOM SCREEN -->
  <div class="room" id="rScreen">
    <div style="height:44px; display:flex; justify-content:space-between; align-items:center; padding:0 12px; background:#041a1e;">
      <span id="rTitle" style="font-size:12px; font-weight:bold; color:#ffd700;">Live Room</span>
      <div style="display:flex; gap:6px;">
        <button id="btnHostSettings" style="background:#00f0ff; color:#000; border:none; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold;" onclick="openSettings()">⚙️ Settings</button>
        <button class="btn" style="padding:4px 10px; font-size:10px;" onclick="exitR()">Exit</button>
      </div>
    </div>

    <!-- 12 Seats Stage -->
    <div class="stage" id="stg"></div>

    <!-- Seat Action Modal -->
    <div id="actionModal">
      <h4 id="actTitle" style="text-align:center; font-size:12px; color:#00f0ff;">Seat Options</h4>
      <div id="actButtons" style="display:flex; flex-direction:column; gap:6px;"></div>
      <button class="act-btn" style="background:#222; color:#fff;" onclick="closeModal()">Cancel</button>
    </div>

    <!-- Room Settings Sheet -->
    <div id="settingsSheet">
      <h4 style="text-align:center; font-size:12px; color:#ffd700;">⚙️ Room Settings</h4>
      <div style="display:flex; gap:6px;">
        <button class="act-btn" style="background:#072227; color:#fff; flex:1;" onclick="changeSeatLayout(8)">8 Seats</button>
        <button class="act-btn" style="background:#072227; color:#fff; flex:1;" onclick="changeSeatLayout(10)">10 Seats</button>
        <button class="act-btn" style="background:#072227; color:#fff; flex:1;" onclick="changeSeatLayout(12)">12 Seats</button>
      </div>
      <button class="act-btn" style="background:#222; color:#fff;" onclick="closeSettings()">Close</button>
    </div>
  </div>

  <!-- 4. BOTTOM NAVIGATION DOCK (5 TABS) -->
  <div class="bnav">
    <div class="nav-item active" onclick="switchNav('tabParty', this)">
      <div class="nav-icon">🕌</div>
      <span>Party</span>
    </div>
    <div class="nav-item" onclick="switchNav('tabDiscover', this)">
      <div class="nav-icon">🧭</div>
      <span>Discover</span>
    </div>
    <div class="nav-item" onclick="switchNav('tabFamily', this)">
      <div class="nav-icon">👥</div>
      <span>Family</span>
    </div>
    <div class="nav-item" onclick="switchNav('tabMessage', this)">
      <div class="nav-icon">🔔</div>
      <span class="badge">68</span>
      <span>Message</span>
    </div>
    <div class="nav-item" onclick="switchNav('tabMe', this)">
      <div class="nav-icon">🌙</div>
      <span>Me</span>
    </div>
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
    document.getElementById('rList').innerHTML = rms.map((r, i) => `
      <div class="card ${i === 0 ? 'rank1' : (i === 1 ? 'rank2' : '')}" onclick="openR('${r.id}', '${r.name}', ${r.seats.length})">
        <img src="${r.banner}">
        <div class="card-meta">
          <div class="card-title">${r.name}</div>
          <div class="card-foot">
            <span>🇮🇳 ${r.host}</span>
            <span>🟢 ${r.seats.filter(x => x).length + 1} online</span>
          </div>
        </div>
      </div>
    `).join('');
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

    if (user.role === 'owner') {
      document.getElementById('godPanel').style.display = 'flex';
      document.getElementById('btnHostSettings').style.display = 'block';
    }
  }

  /* Navigation & Filter Actions */
  function switchNav(tabId, el) {
    document.querySelectorAll('.bnav .nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
  }

  function switchTopTab(type, el) {
    document.querySelectorAll('.top-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (type === 'mine') renderRooms(allRooms.filter(r => r.host === user?.username || r.host === 'Lucky Ak47'));
    else if (type === 'party') renderRooms(allRooms);
    else if (type === 'events') alert("🎉 Events: Mega VIP Carnival is Live!");
  }

  function switchFilter(fType, el) {
    document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if (fType === 'popular') renderRooms(allRooms);
    else renderRooms([...allRooms].reverse());
  }

  function toggleSearch() {
    let s = document.getElementById('searchModal');
    s.style.display = s.style.display === 'flex' ? 'none' : 'flex';
  }

  function filterRooms() {
    let q = document.getElementById('srchInp').value.toLowerCase();
    renderRooms(allRooms.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)));
  }

  function claimDailyChest() {
    alert("🎁 Daily Reward: 5,000 Free Coins claimed!");
    user.coins += 5000;
    syncMe();
  }

  function openMyRoom() {
    let myR = allRooms[0];
    openR(myR.id, myR.name, myR.seats.length);
  }

  /* Room Stage Actions */
  function openR(id, name, seatLen) {
    curId = id;
    document.getElementById('rTitle').innerText = name;
    document.getElementById('rScreen').style.display = 'flex';
    seats = Array(seatLen || 12).fill(null);
    drawStage();
    socket.emit('join_room', { roomId: id, username: user.username });
  }

  function exitR() { socket.emit('leave_room', { roomId: curId, username: user.username }); document.getElementById('rScreen').style.display = 'none'; curId = null; }

  function drawStage() {
    document.getElementById('stg').innerHTML = seats.map((s, i) => {
      let isOccupied = s && !s.locked;
      let label = s ? s.name : (i === 0 ? 'Console' : 'Mic ' + (i + 1));
      let short = s ? (s.locked ? '🔒' : s.name.substring(0, 2)) : (i === 0 ? '👑' : i + 1);

      return `
        <div class="seat" onclick="tapSeat(${i})">
          <div class="ring ${isOccupied ? 'on' : ''}">${short}</div>
          <span style="font-size:8px; color:#72beb6; margin-top:2px;">${label}</span>
        </div>
      `;
    }).join('');
  }

  function tapSeat(i) {
    let s = seats[i];
    let modal = document.getElementById('actionModal');
    let btns = document.getElementById('actButtons');
    btns.innerHTML = '';

    if (!s) btns.innerHTML += `<button class="act-btn" style="background:#00d2c4; color:#000;" onclick="takeSeat(${i})">🎤 Take Seat</button>`;
    else if (s.name === user.username) btns.innerHTML += `<button class="act-btn" style="background:#ff3344; color:#fff;" onclick="leaveSeat(${i})">🛑 Leave Mic</button>`;

    modal.style.display = 'flex';
  }

  function takeSeat(i) { socket.emit('take_seat', { roomId: curId, seatIndex: i, username: user.username, email: user.email }); closeModal(); }
  function leaveSeat(i) { socket.emit('leave_seat', { roomId: curId, seatIndex: i, username: user.username }); closeModal(); }
  function closeModal() { document.getElementById('actionModal').style.display = 'none'; }
  function openSettings() { document.getElementById('settingsSheet').style.display = 'flex'; }
  function closeSettings() { document.getElementById('settingsSheet').style.display = 'none'; }
  function changeSeatLayout(cnt) { socket.emit('update_room_layout', { roomId: curId, seatCount: cnt }); closeSettings(); }

  function godAction(type) {
    let target = document.getElementById('godTarget').value;
    let val = type === 'coins' ? parseInt(document.getElementById('godCoins').value) || 0 : 10;
    socket.emit('god_mode_action', { requesterEmail: user.email, target: target, action: type, value: val });
  }

  function logout() { localStorage.removeItem('pb_u'); location.reload(); }

  socket.on('stage_synced', s => { seats = s; drawStage(); });
  socket.on('room_updated', r => { seats = r.seats; drawStage(); });
  socket.on('god_success', msg => { alert(msg); syncMe(); });
</script>
</body>
</html>
      
