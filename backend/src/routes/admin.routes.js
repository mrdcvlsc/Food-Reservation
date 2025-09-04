const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const M = require("../controllers/menu.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, "..", "uploads");
      fs.ensureDirSync(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, Date.now() + "_" + Math.round(Math.random() * 1e6) + ext);
    }
  })
});

const router = express.Router();

router.get("/dashboard", requireAuth, requireAdmin, require("../controllers/admin.controller").dashboard);
router.post("/menu", requireAuth, requireAdmin, upload.single("image"), M.create);
router.put("/menu/:id", requireAuth, requireAdmin, upload.single("image"), M.update);
router.delete("/menu/:id", requireAuth, requireAdmin, M.remove);
// Admin-only uploads cleanup (dry run by default)
router.post("/uploads/cleanup", requireAuth, requireAdmin, async (req, res) => {
  const cleanup = require("../lib/cleanupUploads");
  const dry = req.query.dry !== 'false' && req.body && req.body.dry !== false;
  const result = await cleanup({ dryRun: !!dry });
  res.json(result);
});
// topups admin
const T = require("../controllers/topups.controller");
router.get("/topups", requireAuth, requireAdmin, T.listAdmin);
router.patch("/topups/:id", requireAuth, requireAdmin, T.setStatus);

// Wallets (QR) admin endpoints
const W = require("../controllers/wallets.controller");
router.post("/wallets", requireAuth, requireAdmin, upload.single("qr"), W.upsert);

module.exports = router;
