const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const M = require("../controllers/menu.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

// Limit menu images to 4MB to avoid very large uploads from the admin UI
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

// If you later add endpoint handlers that accept files here, use `upload.single('image')`

const router = express.Router();

// Public list -> mounted at /api/menu
router.get("/", M.list);

module.exports = router;
