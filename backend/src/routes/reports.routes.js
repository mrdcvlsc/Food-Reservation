const express = require("express");
const router = express.Router();
const C = require("../controllers/reports.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

// export route (admins only)
router.get("/export", requireAuth, requireAdmin, C.exportMonthly);

module.exports = router;