const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express(); // <-- app must be defined first
const server = http.createServer(app);
const io = socketIo(server);

let requestCount = 0;

// serve static files from "public"
app.use(express.static("public"));

// request counter middleware
app.use((req, res, next) => {
  requestCount++;
  io.emit("updateCount", requestCount);
  next();
});

// simple endpoint
app.get("/count", (req, res) => {
  res.send(`Total Requests: ${requestCount}`);
});

// use Railway's provided PORT or default 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
