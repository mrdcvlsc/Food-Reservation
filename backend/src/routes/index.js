// server/src/routes/index.js
const express = require("express");
const auth = require("./auth.routes");
const menu = require("./menu.routes");
const reservations = require("./reservations.routes");
const topups = require("./topups.routes");
const admin = require("./admin.routes");
const tx = require("./transactions.routes");
const wallets = require("./wallets.routes");

const router = express.Router();

router.use("/auth", auth);
router.use("/menu", menu);
router.use("/reservations", reservations);
router.use("/topups", topups);
router.use("/wallets", wallets);
router.use("/admin", admin);
router.use("/transactions", tx);

module.exports = router;
