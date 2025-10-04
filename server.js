const express = require("express");
const app = express();
const path = require("path");

let requestCounts = {
  200: 0,
  304: 0,
  404: 0,
  206: 0
};
let history = []; // store history for charting

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Count requests
app.use((req, res, next) => {
  requestCounts[200] = (requestCounts[200] || 0) + 1;
  history.push({ time: Date.now(), status: 200 });
  if (history.length > 50) history.shift(); // keep last 50 points
  next();
});

// Example routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/stats", (req, res) => {
  res.json({ requestCounts, history });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
