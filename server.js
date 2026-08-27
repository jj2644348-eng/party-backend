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

// 1. Static Folder Link
app.use(express.static(path.join(__dirname, 'public')));

// 2. Direct Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Real-Time Socket Center
io.on('connection', (socket) => {
  socket.on('join_room', (d) => { socket.join(d.room); io.to(d.room).emit('user_entered', d); });
  socket.on('leave_room', (d) => socket.leave(d.room));
  socket.on('send_chat', (d) => io.to(d.room).emit('recv_chat', d));
  socket.on('seat_action', (d) => io.to(d.room).emit('seat_updated', d));
  socket.on('send_gift', (d) => io.to(d.room).emit('gift_blast', d));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('App Live on Port ' + PORT);
});
