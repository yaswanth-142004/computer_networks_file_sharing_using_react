const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Room user count
const roomUserCount = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (room, callback) => {
    if (room) {
      socket.join(room);

      // Increment user count for the room
      roomUserCount[room] = (roomUserCount[room] || 0) + 1;

      // Notify user and room
      socket.to(room).emit("receive_message", { message: `User ${socket.id} joined room: ${room}` });
      io.to(room).emit("user_count", roomUserCount[room]);

      callback(true); // Acknowledge success
    } else {
      callback(false); // Acknowledge failure
    }
  });

  socket.on("send_message", (data, callback) => {
    if (data.message && data.room) {
      socket.to(data.room).emit("receive_message", data);
      callback(true); // Acknowledge success
    } else {
      callback(false); // Acknowledge failure
    }
  });

  socket.on("file_share", (data, callback) => {
    const { room, fileName, fileData } = data;

    if (fileName && fileData && room) {
      const savePath = path.join(__dirname, "uploads", fileName);
      fs.writeFileSync(savePath, fileData, "base64");

      const fileUrl = `data:application/octet-stream;base64,${fileData}`;
      socket.to(room).emit("receive_file", { fileName, fileUrl });

      callback(true); // Acknowledge success
    } else {
      callback(false); // Acknowledge failure
    }
  });

  socket.on("disconnecting", () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((room) => {
      roomUserCount[room] = (roomUserCount[room] || 1) - 1;

      io.to(room).emit("user_count", roomUserCount[room]);
      socket.to(room).emit("receive_message", { message: `User ${socket.id} left room: ${room}` });

      if (roomUserCount[room] <= 0) {
        delete roomUserCount[room];
      }
    });
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});
