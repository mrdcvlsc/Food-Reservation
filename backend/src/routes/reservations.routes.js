// backend/src/routes/reservations.routes.js
const express = require("express");
const R = require("../controllers/reservations.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

const router = express.Router();

// Student/public: create a reservation -> POST /api/reservations
router.post("/", R.create);

// Student: fetch own reservations -> GET /api/reservations/mine
// Protected route - requires authentication
router.get("/mine", requireAuth, R.mine);

// Admin: list reservations (optional ?status=Pending|Approved|Rejected|Claimed)
router.get("/admin", R.listAdmin);

// Admin: update reservation status (Approved / Rejected / Preparing / Ready / Claimed)
router.patch("/admin/:id", R.setStatus);

module.exports = router;
