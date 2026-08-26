const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB Atlas Connection
const MONGO_URI = "mongodb+srv://jj2644348_db_user:mvnG9IBmFt757pWc@cluster0.lgltsej.mongodb.net/loveparty_db?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas Connected Successfully!'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  name: String,
  coins: { type: Number, default: 1000 },
  avatar: { type: String, default: "" }
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  title: String,
  hostId: String,
  speakers: [String],
  listeners: [String]
});

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);

// Basic API Routes
app.get('/', (req, res) => {
  res.send('Voice Party Live Server is Running!');
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { userId, name, avatar } = req.body;
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId, name, avatar, coins: 1000 });
      await user.save();
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.io Real-time Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', async ({ roomId, userId, name }) => {
    socket.join(roomId);
    io.to(roomId).emit('user_joined', { userId, name, message: `${name} joined the room` });
  });

  socket.on('send_gift', async ({ roomId, senderId, senderName, receiverId, giftName, giftCost }) => {
    try {
      const sender = await User.findOne({ userId: senderId });
      if (sender && sender.coins >= giftCost) {
        sender.coins -= giftCost;
        await sender.save();

        await User.findOneAndUpdate({ userId: receiverId }, { $inc: { coins: giftCost } });

        io.to(roomId).emit('gift_received', {
          senderName,
          giftName,
          giftCost,
          senderRemainingCoins: sender.coins
        });
      } else {
        socket.emit('error_message', { message: 'Not enough coins!' });
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('send_chat', ({ roomId, senderName, message }) => {
    io.to(roomId).emit('receive_chat', { senderName, message });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
      
