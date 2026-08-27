require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    app: "Love Party",
    status: "online",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "Love Party",
    time: new Date()
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/rooms", require("./routes/rooms"));
app.use("/api/gifts", require("./routes/gifts"));
app.use("/api/wallet", require("./routes/wallet"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/family", require("./routes/family"));
app.use("/api/admin", require("./routes/admin"));

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomId, userId }) => {
    socket.join(`room:${roomId}`);

    socket.to(`room:${roomId}`).emit("userJoined", {
      userId,
      roomId
    });
  });

  socket.on("leaveRoom", ({ roomId, userId }) => {
    socket.leave(`room:${roomId}`);

    socket.to(`room:${roomId}`).emit("userLeft", {
      userId,
      roomId
    });
  });

  socket.on("seatJoin", ({ roomId, seatNumber, userId }) => {
    io.to(`room:${roomId}`).emit("seatUpdated", {
      roomId,
      seatNumber,
      userId,
      action: "join"
    });
  });

  socket.on("seatLeave", ({ roomId, seatNumber, userId }) => {
    io.to(`room:${roomId}`).emit("seatUpdated", {
      roomId,
      seatNumber,
      userId,
      action: "leave"
    });
  });

  socket.on("micChanged", ({ roomId, userId, enabled }) => {
    io.to(`room:${roomId}`).emit("micChanged", {
      userId,
      enabled
    });
  });

  socket.on("roomMessage", ({ roomId, userId, message }) => {
    io.to(`room:${roomId}`).emit("roomMessage", {
      userId,
      message,
      createdAt: new Date()
    });
  });

  socket.on("giftSent", ({ roomId, senderId, receiverId, gift }) => {
    io.to(`room:${roomId}`).emit("giftAnimation", {
      senderId,
      receiverId,
      gift,
      createdAt: new Date()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log("MongoDB connected");

    server.listen(PORT, () => {
      console.log(`Love Party server running on port ${PORT}`);
    });

  })
  .catch((err) => {

    console.error("MongoDB connection failed:", err);

    process.exit(1);

  });
