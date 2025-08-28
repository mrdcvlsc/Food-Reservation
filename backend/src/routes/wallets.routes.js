// server/src/routes/wallets.routes.js
const express = require('express');
const multer = require('multer');
const { requireAuth, requireAdmin } = require('../lib/auth');
const W = require('../controllers/wallets.controller');

const router = express.Router();

// use memory storage; controller writes to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// Public list (only active wallets)
router.get('/', W.list);

// Authenticated: current user's wallet/balance
router.get('/me', requireAuth, W.me);
router.post('/charge', requireAuth, W.charge);

// Optional: get one wallet by provider (e.g., /wallets/gcash)
router.get('/:provider', W.getOne);

// Admin: create/update a wallet (+QR). Expect multipart/form-data
// fields: provider, accountName, mobile, reference, active (optional), and file field "qr"
router.post(
  '/',
  requireAuth,
  requireAdmin,
  upload.single('qr'),
  W.upsert
);

// (Optional) PUT variant if you prefer semantic updates
router.put(
  '/',
  requireAuth,
  requireAdmin,
  upload.single('qr'),
  W.upsert
);

module.exports = router;
