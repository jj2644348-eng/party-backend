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

// Serve Static Frontend Files from public folder
app.use(express.static(path.join(__dirname, 'public')));

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

// Fallback to index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Live Master Server running on port ' + PORT);
});
      
