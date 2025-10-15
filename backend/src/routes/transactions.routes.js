// backend/src/routes/transactions.routes.js
const express = require("express");
const { mine } = require("../controllers/transactions.controller");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

/**
 * @swagger
 * /transactions/mine:
 *   get:
 *     summary: Get current user's transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 *       401:
 *         description: Unauthorized
 */
router.get("/mine", requireAuth, mine);

module.exports = router;
