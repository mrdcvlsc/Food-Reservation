// server/src/index.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const { coloredMorgan, printColorLegend } = require("./lib/coloredMorgan");

// Specific routers
const transactionsRouter = require("./routes/transactions.routes");
// Aggregated app routes (auth, menu, reservations, etc.)
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(coloredMorgan);
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    // remove sensitive fields from logging
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.passwordHash) sanitizedBody.passwordHash = '[REDACTED]';
    console.log(`[REQUEST BODY] ${req.method} ${req.url}:`, JSON.stringify(sanitizedBody, null, 2));
  }
  next();
});

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
  // Structured logging
  const payload = {
    ts: new Date().toISOString(),
    error: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack.split('\n').slice(0, 5) : undefined,
  };
  console.error(JSON.stringify(payload));
  // Multer file-size or express payload too large
  if (err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'ETOOBIG' || err.status === 413 || err.statusCode === 413)) {
    return res.status(413).json({ error: 'Uploaded file too large.' });
  }
  const code = err && (err.status || err.statusCode) ? (err.status || err.statusCode) : 500;
  const body = { error: (err && err.message) || 'Internal Server Error' };
  // include stack only in non-production for easier debugging
  if (process.env.NODE_ENV !== 'production' && err && err.stack) body._stack = err.stack;
  res.status(code).json(body);
});
 
const server = app.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log(`🚀 FOOD RESERVATION API SERVER STARTED`);
  console.log(`📡 API @ http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/`);
  console.log(`🔗 Frontend should connect from: http://localhost:3000`);
  console.log(`🎨 Using COLORED Morgan HTTP Request Logging`);
  console.log('='.repeat(70));
  printColorLegend();
  console.log('-'.repeat(70));
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app; // (optional) helpful for testing

// schedule periodic orphan cleanup every 6 hours
try {
  const cleanup = require('./lib/cleanupUploads');
  setInterval(async () => {
    try {
      const r = await cleanup({ dryRun: true });
      console.log('[cleanupUploads] dryRun result', r);
    } catch (e) {
      console.error('[cleanupUploads] failed', e && e.message);
    }
  }, 1000 * 60 * 60 * 6);
} catch (e) {
  console.error('Failed to schedule cleanupUploads:', e && e.message);
}
