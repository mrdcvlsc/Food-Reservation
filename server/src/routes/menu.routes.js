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

// Public list -> mounted at /api/menu
router.get("/", M.list);

module.exports = router;
