// server/src/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");

// Specific routers
const transactionsRouter = require("./routes/transactions.routes");
// Aggregated app routes (auth, menu, reservations, etc.)
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;

/**
 * Core middleware
 */
app.use(
  cors({
    origin: ["http://localhost:3000"], // frontend dev origin
    credentials: true,
  })
);
// Allow larger JSON and urlencoded payloads (image uploads or embedded data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

/**
 * Static: serve uploaded images/files (multer target)
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * API routes
 * Mount specific routers first (more specific prefix),
 * then the general aggregator under /api.
 */
app.use("/api/transactions", transactionsRouter);
app.use("/api", routes);

/**
 * Health check
 */
app.get("/", (_req, res) => res.json({ ok: true, name: "canteen-api" }));

/**
 * 404 (JSON only)
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/**
 * Central error handler (always JSON)
 */
app.use((err, _req, res, _next) => {
  console.error("API error:", err && err.message ? err.message : err);
  // Multer file-size or express payload too large
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'ETOOBIG' || err.status === 413 || err.statusCode === 413)) {
    return res.status(413).json({ error: 'Uploaded file too large.' });
  }
  const code = err && (err.status || err.statusCode) ? (err.status || err.statusCode) : 500;
  res.status(code).json({ error: (err && err.message) || 'Internal Server Error' });
});
 
app.listen(PORT, () => {
  console.log(`API @ http://localhost:${PORT}`);
});

module.exports = app; // (optional) helpful for testing
