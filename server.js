const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

let statusCounts = {};
let history = [];

// Middleware to track requests
app.use((req, res, next) => {
  const now = new Date();
  const status = 200; // default for demo; replace with real if you add response codes
  statusCounts[status] = (statusCounts[status] || 0) + 1;

  history.push({ time: now, status });

  // keep only last 50 entries
  if (history.length > 50) history.shift();

  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// API endpoint for stats
app.get("/stats", (req, res) => {
  res.json({
    requestCounts: statusCounts,
    history
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
