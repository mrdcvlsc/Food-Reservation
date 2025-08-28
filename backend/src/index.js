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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  const code = err.status || err.statusCode || 500;
  res.status(code).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`API @ http://localhost:${PORT}`);
});

module.exports = app; // (optional) helpful for testing
