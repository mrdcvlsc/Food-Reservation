const express = require("express");
const router = express.Router();
const C = require("../controllers/inventory.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

router.post("/:id/stock", requireAuth, requireAdmin, C.addStock);

module.exports = router;