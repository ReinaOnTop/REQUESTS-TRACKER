const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let requestCount = 0;

app.use(express.static("public"));

// Count requests
app.use((req, res, next) => {
  requestCount++;
  io.emit("updateCount", requestCount);
  next();
});

// Show count on root
app.get("/count", (req, res) => {
  res.send(`Total Requests: ${requestCount}`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
