const express = require("express");
const router = express.Router();
const C = require("../controllers/notifications.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

// User endpoints
router.get("/", requireAuth, C.mine);
router.patch("/:id/read", requireAuth, C.markRead);

// Admin endpoints
router.get("/admin", requireAuth, requireAdmin, C.listAdmin);
router.post("/admin/mark-read", requireAuth, requireAdmin, C.markManyReadAdmin);

// Admin delete (admin-only)
router.delete("/admin/:id", requireAuth, requireAdmin, C.delete);
// User delete (authenticated user)
router.delete("/:id", requireAuth, C.delete);

module.exports = router;