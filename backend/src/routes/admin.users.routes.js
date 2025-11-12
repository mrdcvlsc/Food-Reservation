const express = require("express");
const router = express.Router();
const C = require("../controllers/admin.users.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.get("/users", requireAuth, requireAdmin, C.list);
router.patch("/users/:id", requireAuth, requireAdmin, upload.single('photo'), C.updateUser);
router.delete("/users/:id", requireAuth, requireAdmin, C.deleteUser);
module.exports = router;