const express = require("express");
const { create, mine } = require("../controllers/topups.controller");
const { requireAuth } = require("../lib/auth");

const router = express.Router();

router.post("/", requireAuth, create);
router.get("/mine", requireAuth, mine);

module.exports = router;
