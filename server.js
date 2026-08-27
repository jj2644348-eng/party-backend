const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
const mongoURI = 'mongodb+srv://admin:LovepreetPB123@cluster0.mongodb.net/partyApp?retryWrites=true&w=majority';
mongoose.connect(mongoURI)
  .then(() => console.log('PB Database Engine Connected!'))
  .catch(err => console.log('DB Error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  avatar: { type: String, default: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
  coins: { type: Number, default: 5000 },
  diamonds: { type: Number, default: 200 },
  role: { type: String, default: 'user' },
  userLevel: { type: Number, default: 1 },
  vipLevel: { type: Number, default: 0 },
  activeFrame: { type: String, default: 'frame-gold' },
  activeEntry: { type: String, default: '🚜 PB 3D ट्रैक्टर' }
});
const User = mongoose.model('User', UserSchema);

// Serve Main Frontend UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User API
app.get('/api/user/:username', async (req, res) => {
  let uname = req.params.username;
  let isOwner = (uname.toLowerCase() === 'lovepreet' || uname.toLowerCase() === 'admin');
  let user = await User.findOne({ username: uname });
  if (!user) {
    user = await User.create({
      username: uname,
      role: isOwner ? 'owner' : 'user',
      coins: isOwner ? 5000000 : 5000,
      diamonds: isOwner ? 100000 : 200,
      vipLevel: isOwner ? 5 : 0,
      activeFrame: isOwner ? 'frame-royal' : 'frame-gold'
    });
  }
  res.json(user);
});

// Socket Engine (Rooms, Mics, Gifts, Wallet)
io.on('connection', (socket) => {
  socket.on('join_room', (d) => {
    socket.join(d.room);
    io.to(d.room).emit('user_entered', d);
  });

  socket.on('leave_room', (d) => socket.leave(d.room));

  socket.on('send_chat', (d) => io.to(d.room).emit('recv_chat', d));

  socket.on('seat_action', (d) => io.to(d.room).emit('seat_updated', d));

  socket.on('send_gift', async (d) => {
    let u = await User.findOne({ username: d.sender });
    if (u && u.coins >= d.cost) {
      u.coins -= d.cost;
      u.diamonds += d.dia;
      await u.save();
      io.to(d.room).emit('gift_blast', d);
    }
  });

  socket.on('admin_recharge', async (d) => {
    let owner = await User.findOne({ username: d.owner });
    if(owner && owner.role === 'owner') {
      let target = await User.findOne({ username: d.target });
      if(!target) target = await User.create({ username: d.target, coins: d.amount });
      else target.coins += d.amount;

      if(target.coins >= 50000) target.vipLevel = 5;
      else if(target.coins >= 10000) target.vipLevel = 3;
      else if(target.coins >= 1000) target.vipLevel = 1;

      await target.save();
      io.emit('wallet_sync', { username: target.username, coins: target.coins, vipLevel: target.vipLevel });
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server is running on port ' + PORT));
  
