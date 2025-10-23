const express = require("express");
const router = express.Router();
const N = require("../controllers/notifications.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

// User endpoints
router.get("/", requireAuth, N.mine);
router.patch("/:id/read", requireAuth, N.markRead);

// Admin endpoints
router.get("/admin", requireAuth, requireAdmin, N.listAdmin);
router.post("/admin/mark-read", requireAuth, requireAdmin, N.markManyReadAdmin);

module.exports = router;