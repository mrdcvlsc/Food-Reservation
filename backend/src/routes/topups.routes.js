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
// limit proofs to 8MB
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

/**
 * @swagger
 * /topups:
 *   post:
 *     summary: Create a top-up request
 *     tags: [Topups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               reference:
 *                 type: string
 *               provider:
 *                 type: string
 *               proof:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Top-up created
 *       400:
 *         description: Invalid input
 *       413:
 *         description: Uploaded file too large
 */
router.post("/", requireAuth, upload.single('proof'), create);
/**
 * @swagger
 * /topups/mine:
 *   get:
 *     summary: Get current user's top-up requests
 *     tags: [Topups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of top-ups
 *       401:
 *         description: Unauthorized
 */
router.get("/mine", requireAuth, mine);

module.exports = router;
