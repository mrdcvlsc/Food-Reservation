const express = require("express");
const R = require("../controllers/reservations.controller");

const router = express.Router();

// Student/public: create a reservation -> POST /api/reservations
router.post("/", R.create);

// Student: fetch own reservations -> GET /api/reservations/mine
// (uses req.user if available; otherwise supports ?student= query per controller)
router.get("/mine", R.mine);

// Admin: list reservations (optional ?status=Pending|Approved|Rejected)
// exposed at GET /api/reservations/admin
router.get("/admin", R.listAdmin);

// Admin: update reservation status { status: "Approved" | "Rejected" }
// exposed at PATCH /api/reservations/admin/:id
router.patch("/admin/:id", R.setStatus);

module.exports = router;
    