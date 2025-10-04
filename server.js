// Serve static files from "public"
app.use(express.static('public'));

// Only count requests for non-dashboard routes
app.all('/api/*', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  const path = req.path;

  // update totals
  stats.totalRequests += 1;
  stats.byIp[ip] = stats.byIp[ip] || { count: 0, lastSeen: null };
  stats.byIp[ip].count += 1;
  stats.byIp[ip].lastSeen = Date.now();

  stats.byPath[path] = (stats.byPath[path] || 0) + 1;

  const now = Date.now();
  stats.recent.push(now);
  while (stats.recent.length && stats.recent[0] < now - WINDOW_MS) stats.recent.shift();

  io.emit('stats', {
    totalRequests: stats.totalRequests,
    topIps: getTopIps(10),
    topPaths: getTopPaths(10),
    rps: calcRPS(),
    recentWindowMs: WINDOW_MS
  });

  res.status(200).send('OK');
});
