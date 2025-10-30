const express = require("express");
const router = express.Router();
const C = require("../controllers/admin.users.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

router.get("/users", requireAuth, requireAdmin, C.list);
router.post("/users/:id/reset-token", requireAuth, requireAdmin, C.generateResetToken);

module.exports = router;