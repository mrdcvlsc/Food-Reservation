const express = require("express");
const { create, mine } = require("../controllers/topups.controller");
const { requireAuth } = require("../lib/auth");
const path = require("path");
const multer = require("multer");

const router = express.Router();

// store proofs in backend uploads directory (served at /uploads)
const uploadDir = path.join(__dirname, "..", "uploads");
const storage = multer.diskStorage({
	destination: function (req, file, cb) { cb(null, uploadDir); },
	filename: function (req, file, cb) { cb(null, Date.now().toString(36) + '_' + file.originalname.replace(/\s+/g,'_')); }
});
const upload = multer({ storage });

router.post("/", requireAuth, upload.single('proof'), create);
router.get("/mine", requireAuth, mine);

module.exports = router;
