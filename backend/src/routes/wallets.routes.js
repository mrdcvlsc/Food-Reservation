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

/**
 * @swagger
 * /wallets:
 *   get:
 *     summary: Get list of active wallets
 *     tags: [Wallets]
 *     responses:
 *       200:
 *         description: List of wallets
 */
router.get('/', W.list);

/**
 * @swagger
 * /wallets/me:
 *   get:
 *     summary: Get current user's wallet info
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet info
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, W.me);

/**
 * @swagger
 * /wallets/charge:
 *   post:
 *     summary: Charge current user's wallet
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Wallet charged
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/charge', requireAuth, W.charge);

/**
 * @swagger
 * /wallets/{provider}:
 *   get:
 *     summary: Get wallet by provider
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet provider (e.g., gcash)
 *     responses:
 *       200:
 *         description: Wallet info
 *       404:
 *         description: Wallet not found
 */
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
