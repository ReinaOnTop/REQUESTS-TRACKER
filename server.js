// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Basic security headers
app.use(helmet());

// Lightweight in-memory store (for demo). For production use Redis or DB.
const stats = {
  totalRequests: 0,
  byIp: {},       // { ip: { count, lastSeen } }
  byPath: {},     // { path: count }
  recent: []      // sliding window of timestamps
};

const WINDOW_MS = 60_000; // 60s sliding window for recent requests

// Rate limiter for the dashboard and normal endpoints so the monitor itself isn't spammed
const limiter = rateLimit({
  windowMs: 5 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Serve dashboard files
app.use(express.static('public'));

// Example catch-all endpoint that will count requests to any path (simulate target)
app.all('*', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const path = req.path;

  // update totals
  stats.totalRequests += 1;
  stats.byIp[ip] = stats.byIp[ip] || { count: 0, lastSeen: null };
  stats.byIp[ip].count += 1;
  stats.byIp[ip].lastSeen = Date.now();

  stats.byPath[path] = (stats.byPath[path] || 0) + 1;

  // sliding window
  const now = Date.now();
  stats.recent.push(now);
  // prune old
  while (stats.recent.length && stats.recent[0] < now - WINDOW_MS) stats.recent.shift();

  // broadcast an update to dashboard clients
  io.emit('stats', {
    totalRequests: stats.totalRequests,
    topIps: getTopIps(10),
    topPaths: getTopPaths(10),
    rps: calcRPS(),
    recentWindowMs: WINDOW_MS
  });

  // you can respond normally; this demo returns a simple message
  res.status(200).send('OK');
});

// Helper functions
function getTopIps(limit = 5) {
  return Object.entries(stats.byIp)
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([ip, info]) => ({ ip, count: info.count, lastSeen: info.lastSeen }));
}
function getTopPaths(limit = 5) {
  return Object.entries(stats.byPath)
    .sort((a,b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path,count]) => ({ path, count }));
}
function calcRPS() {
  // requests per second over sliding window
  const now = Date.now();
  while (stats.recent.length && stats.recent[0] < now - WINDOW_MS) stats.recent.shift();
  return (stats.recent.length / (WINDOW_MS/1000));
}

// Socket.IO: serve initial state on connect
io.on('connection', socket => {
  socket.emit('stats', {
    totalRequests: stats.totalRequests,
    topIps: getTopIps(10),
    topPaths: getTopPaths(10),
    rps: calcRPS(),
    recentWindowMs: WINDOW_MS
  });
});

// Start
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Monitor listening on ${PORT}`));
