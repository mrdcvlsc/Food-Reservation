const express = require("express");
const { mine } = require("../controllers/transactions.controller");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

router.get("/mine", requireAuth, mine);

module.exports = router;
