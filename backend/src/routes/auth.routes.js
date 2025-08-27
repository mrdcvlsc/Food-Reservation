const router = require("express").Router();
const C = require("../controllers/auth.controller");

router.post("/login", C.login);
router.post("/register", C.register);

// tiny health route so you can test quickly in the browser
router.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = router;
