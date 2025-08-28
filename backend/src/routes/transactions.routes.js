// backend/src/routes/transactions.routes.js
const express = require("express");
const { mine } = require("../controllers/transactions.controller");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

/**
 * GET /api/transactions/mine
 * Returns the authenticated user's order transactions (reservations only).
 */
router.get("/mine", requireAuth, mine);

module.exports = router;
