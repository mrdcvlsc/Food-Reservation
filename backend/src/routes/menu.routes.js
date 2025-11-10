const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const C = require("../controllers/menu.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

// simple disk storage (adjust path if your app stores elsewhere)
const upload = multer({
  dest: path.join(__dirname, "..", "..", "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * @swagger
 * /menu:
 *   get:
 *     summary: Get the list of menu items
 *     tags: [Menu]
 *     responses:
 *       200:
 *         description: List of menu items
 */
router.get("/", C.list);

// ensure update route accepts single image field named "image"
router.put("/:id", requireAuth, requireAdmin, upload.single("image"), C.update);

// Add this delete route so frontend can call DELETE /api/menu/:id
router.delete("/:id", requireAuth, requireAdmin, C.remove);

module.exports = router;
