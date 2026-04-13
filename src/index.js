const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;

app.get("/health", (req, res) => {
  res.status(200).json({
    nama: "Raynald Ramadhani Fachriansyah",
    nrp: "5025241020",
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

app.listen(PORT);
