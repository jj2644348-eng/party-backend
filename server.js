const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SUPER_OWNER = "lp5006352@gmail.com";

let users = {
  [SUPER_OWNER]: {
    pbId: '2081902760',
    email: SUPER_OWNER,
    username: '☆ Lucky Ak47 🖥️☆',
    coins: 1000000000,
    role: 'owner',
    level: 99,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  }
};

let gifts = [
  { id: 'g1', name: 'Rose', price: 10, icon: '🌹' },
  { id: 'g2', name: 'Heart Ring', price: 99, icon: '💍' },
  { id: 'g3', name: 'PB Supercar', price: 1999, icon: '🏎️' },
  { id: 'g4', name: 'Royal Crown', price: 5000, icon: '👑' },
  { id: 'g5', name: 'PB Space Rocket', price: 15000, icon: '🚀' },
  { id: 'g6', name: 'Fire Dragon King', price: 99999, icon: '🐉' }
];

let rooms = [
  {
    id: 'pb_rap_101',
    name: '🔥 Official Tech Love Rap Cypher',
    tag: 'Rap Battle',
    host: '☆ Lucky Ak47 🖥️☆',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500',
    seats: Array(12).fill(null)
  },
  {
    id: 'pb_vip_202',
    name: '👑 PB Cyber VIP Lounge',
    tag: 'VIP Club',
    host: 'PB Tech Boss',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500',
    seats: Array(12).fill(null)
  }
];

app.post('/api/auth/login', (req, res) => {
  const { email, username } = req.body || {};
  if (!email) return res.status(400).json({ success: false });
  const em = email.toLowerCase().trim();
  const isOwner = (em === SUPER_OWNER.toLowerCase());

  if (isOwner) {
    users[em] = { pbId: '2081902760', email: SUPER_OWNER, username: username || '☆ Lucky Ak47 🖥️☆', coins: 1000000000, role: 'owner', level: 99, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' };
  } else if (!users[em]) {
    users[em] = { pbId: Math.floor(10000000 + Math.random() * 90000000).toString(), email: em, username: username || em.split('@')[0], coins: 50000, role: 'member', level: 1, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' };
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
      name: d.name || '⚡ PB Live Party',
      tag: d.tag || 'Party',
      host: d.host,
      cover: d.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500',
      seats: Array(12).fill(null)
    };
    rooms.unshift(newRoom);
    io.emit('rooms_synced', rooms);
    socket.emit('room_ready', newRoom);
  });

  socket.on('take_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r) {
      r.seats = r.seats.map(s => s && s.name === d.username ? null : s);
      r.seats[d.seatIndex] = { name: d.username, isMuted: false, avatar: d.avatar || '👑' };
      io.to(d.roomId).emit('seats_synced', r.seats);
    }
  });

  socket.on('leave_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r && r.seats[d.seatIndex] && r.seats[d.seatIndex].name === d.username) {
      r.seats[d.seatIndex] = null;
      io.to(d.roomId).emit('seats_synced', r.seats);
    }
  });

  socket.on('toggle_mic', (d) => {
    let r = rooms.find(x => x.id === d.roomId);
    if (r) {
      let seat = r.seats.find(s => s && s.name === d.username);
      if (seat) {
        seat.isMuted = !seat.isMuted;
        io.to(d.roomId).emit('seats_synced', r.seats);
      }
    }
  });

  socket.on('send_gift', (d) => {
    let sender = users[d.senderEmail?.toLowerCase().trim()];
    let gift = gifts.find(g => g.id === d.giftId);
    if (!sender || !gift) return;

    let totalCost = (d.target === 'all') ? (gift.price * 12) : gift.price;
    if (sender.coins < totalCost) return;

    sender.coins -= totalCost;
    io.to(d.roomId).emit('gift_animation', {
      sender: sender.username,
      gift: gift,
      target: d.targetName
    });
    socket.emit('coins_updated', sender.coins);
  });

  socket.on('send_chat', (d) => io.to(d.roomId).emit('new_chat', d));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('⚡ PB Live Ultra Server running on ' + PORT);
});
           
