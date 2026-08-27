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

// 1. Frontend Files Load Karein
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. User Data API
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

// 3. Live Socket Connection
io.on('connection', (socket) => {
  socket.on('join_room', (d) => { socket.join(d.room); io.to(d.room).emit('user_entered', d); });
  socket.on('leave_room', (d) => socket.leave(d.room));
  socket.on('send_chat', (d) => io.to(d.room).emit('recv_chat', d));
  socket.on('seat_action', (d) => io.to(d.room).emit('seat_updated', d));
  socket.on('send_gift', (d) => io.to(d.room).emit('gift_blast', d));
});

// Wildcard fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('PB Studio App Live on Port ' + PORT);
});
