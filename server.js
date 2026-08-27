const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SUPER_OWNER = "lp5006352@gmail.com";

let users = {
  [SUPER_OWNER]: {
    pbId: '2081902760',
    email: SUPER_OWNER,
    username: '☆ Lucky Ak47 🖥️☆',
    gender: 'Male',
    age: 22,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    coins: 1000000000,
    role: 'owner',
    level: 99
  }
};

let gifts = [
  { id: 'g1', name: 'Rose', price: 10, icon: '🌹', desc: 'Sweet Love' },
  { id: 'g2', name: 'Heart Ring', price: 99, icon: '💍', desc: 'Pure Romance' },
  { id: 'g3', name: 'Diamond Mic', price: 500, icon: '🎙️', desc: 'Star Singer' },
  { id: 'g4', name: 'PB Supercar', price: 1999, icon: '🏎️', desc: 'Luxury Drive' },
  { id: 'g5', name: 'Royal Crown', price: 5000, icon: '👑', desc: 'King Status' },
  { id: 'g6', name: 'PB Space Rocket', price: 15000, icon: '🚀', desc: 'To The Moon' },
  { id: 'g7', name: 'Fire Dragon King', price: 99999, icon: '🐉', desc: 'Ultimate Power' }
];

let rooms = [
  {
    id: 'pb_rap_101',
    name: '🔥 Official Tech Love Rap Cypher',
    tag: 'Rap Battle',
    host: '☆ Lucky Ak47 🖥️☆',
    hostEmail: SUPER_OWNER,
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
    bg: 'radial-gradient(circle at top, #23123d, #070914)',
    isLocked: false,
    pin: '',
    seats: Array(12).fill(null)
  },
  {
    id: 'pb_vip_202',
    name: '👑 PB Cyber VIP Lounge',
    tag: 'VIP Club',
    host: 'PB Tech Boss',
    hostEmail: 'boss@pb.com',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500',
    bg: 'radial-gradient(circle at top, #152238, #050b14)',
    isLocked: false,
    pin: '',
    seats: Array(12).fill(null)
  }
];

// Check Google User & Register Profile
app.post('/api/auth/google-sync', (req, res) => {
  const { email, username, avatar, gender, age } = req.body || {};
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER.toLowerCase());

  if (isOwner) {
    users[em] = {
      pbId: '2081902760',
      email: SUPER_OWNER,
      username: username || '☆ Lucky Ak47 🖥️☆',
      gender: gender || 'Male',
      age: age || 22,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      coins: 1000000000,
      role: 'owner',
      level: 99
    };
  } else {
    let existing = users[em];
    users[em] = {
      pbId: existing ? existing.pbId : Math.floor(10000000 + Math.random() * 90000000).toString(),
      email: em,
      username: username || em.split('@')[0],
      gender: gender || 'Male',
      age: parseInt(age) || 18,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      coins: existing ? existing.coins : 50000,
      role: 'member',
      level: 1
    };
  }

  res.json({ success: true, user: users[em] });
});

app.get('/api/rooms', (req, res) => res.json(rooms));
app.get('/api/gifts', (req, res) => res.json(gifts));

io.on('connection', (socket) => {
  socket.on('join_room', (d) => socket.join(d.roomId));

  socket.on('create_room', (d) => {
    let newRoom = {
      id: 'pb_room_' + Date.now(),
      name: d.name || 'PB Live Party',
      tag: d.tag || 'Party',
      host: d.host,
      hostEmail: d.hostEmail,
      cover: d.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
      bg: 'radial-gradient(circle at top, #23123d, #070914)',
      isLocked: !!d.pin,
      pin: d.pin || '',
      seats: Array(12).fill(null)
    };
    rooms.unshift(newRoom);
    io.emit('rooms_synced', rooms);
    socket.emit('room_ready', newRoom);
  });

  socket.on('update_room_bg', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r) {
      r.bg = d.bg;
      io.to(d.roomId).emit('room_bg_synced', d.bg);
    }
  });

  socket.on('take_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r) {
      r.seats = r.seats.map(s => s && s.email === d.email ? null : s);
      r.seats[d.seatIndex] = { name: d.username, email: d.email, avatar: d.avatar, isMuted: false };
      io.to(d.roomId).emit('seats_synced', r.seats);
    }
  });

  socket.on('leave_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r && r.seats[d.seatIndex] && r.seats[d.seatIndex].email === d.email) {
      r.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('seats_synced', r.seats);
    }
  });

  socket.on('admin_mute_user', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r && r.seats[d.seatIndex]) {
      r.seats[d.seatIndex].isMuted = !r.seats[d.seatIndex].isMuted;
      io.to(d.roomId).emit('seats_synced', r.seats);
    }
  });

  socket.on('admin_kick_user', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r && r.seats[d.seatIndex]) {
      let kickedName = r.seats[d.seatIndex].name;
      r.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('seats_synced', r.seats);
      io.to(d.roomId).emit('new_chat', { user: 'System 🛡️', msg: `${kickedName} was kicked off mic by Host!` });
    }
  });

  socket.on('toggle_self_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r) {
      let seat = r.seats.find(s => s && s.email === d.email);
      if (seat) {
        seat.isMuted = !seat.isMuted;
        io.to(d.roomId).emit('seats_synced', r.seats);
      }
    }
  });

  socket.on('send_multi_gift', (d) => {
    let sender = users[d.senderEmail?.toLowerCase().trim()];
    let gift = gifts.find(g => g.id === d.giftId);
    if (!sender || !gift || !d.targets || !d.targets.length) return;

    let totalCost = gift.price * d.targets.length;
    if (sender.coins < totalCost) return;

    sender.coins -= totalCost;
    io.to(d.roomId).emit('gift_broadcast', {
      sender: sender.username,
      gift: gift,
      targets: d.targetNames
    });
    socket.emit('coins_updated', sender.coins);
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('new_chat', d));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log('PB Google Live on ' + PORT));
  
