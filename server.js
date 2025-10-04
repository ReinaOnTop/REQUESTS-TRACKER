const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let totalRequests = 0;
let requestHistory = [];
let ipCounts = {};
let pathCounts = {};
const recentWindowMs = 60000; // 60 seconds

app.use(express.static("public"));

app.use((req, res, next) => {
  totalRequests++;

  // Track IP
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  ipCounts[ip] = (ipCounts[ip] || 0) + 1;

  // Track path
  const path = req.path;
  pathCounts[path] = (pathCounts[path] || 0) + 1;

  // Track request timestamps for RPS
  const now = Date.now();
  requestHistory.push(now);
  requestHistory = requestHistory.filter(t => now - t < recentWindowMs);

  // Compute RPS
  const rps = requestHistory.length / (recentWindowMs / 1000);

  // Prepare stats
  const stats = {
    totalRequests,
    rps,
    recentWindowMs,
    topIps: Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    topPaths: Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };

  io.emit("stats", stats);
  next();
});

app.get("/count", (req, res) => {
  res.json({ totalRequests });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
