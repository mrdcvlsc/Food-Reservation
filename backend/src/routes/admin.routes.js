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

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin dashboard stats
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get("/dashboard", requireAuth, requireAdmin, require("../controllers/admin.controller").dashboard);
/**
 * @swagger
 * /admin/menu:
 *   post:
 *     summary: Admin - create menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Menu item created
 */
router.post("/menu", requireAuth, requireAdmin, upload.single("image"), M.create);
/**
 * @swagger
 * /admin/menu/{id}:
 *   put:
 *     summary: Admin - update menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Menu item updated
 *       404:
 *         description: Not found
 */
router.put("/menu/:id", requireAuth, requireAdmin, upload.single("image"), M.update);
/**
 * @swagger
 * /admin/menu/{id}:
 *   delete:
 *     summary: Admin - delete menu item
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Menu item ID
 *     responses:
 *       200:
 *         description: Menu item deleted
 *       404:
 *         description: Not found
 */
router.delete("/menu/:id", requireAuth, requireAdmin, M.remove);
// Admin-only uploads cleanup (dry run by default)
/**
 * @swagger
 * /admin/uploads/cleanup:
 *   post:
 *     summary: Admin - cleanup unused uploads
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dry:
 *                 type: boolean
 *                 description: Dry run (default true)
 *     responses:
 *       200:
 *         description: Cleanup result
 */
router.post("/uploads/cleanup", requireAuth, requireAdmin, async (req, res) => {
  const cleanup = require("../lib/cleanupUploads");
  const dry = req.query.dry !== 'false' && req.body && req.body.dry !== false;
  const result = await cleanup({ dryRun: !!dry });
  res.json(result);
});
// topups admin
const T = require("../controllers/topups.controller");
/**
 * @swagger
 * /admin/topups:
 *   get:
 *     summary: Admin - list all top-up requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of top-ups
 */
router.get("/topups", requireAuth, requireAdmin, T.listAdmin);

/**
 * @swagger
 * /admin/topups/{id}:
 *   patch:
 *     summary: Admin - update top-up status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Top-up ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Top-up updated
 *       404:
 *         description: Not found
 */
router.patch("/topups/:id", requireAuth, requireAdmin, T.setStatus);

// Wallets (QR) admin endpoints
const W = require("../controllers/wallets.controller");
/**
 * @swagger
 * /admin/wallets:
 *   post:
 *     summary: Admin - create/update wallet (QR)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *               accountName:
 *                 type: string
 *               mobile:
 *                 type: string
 *               reference:
 *                 type: string
 *               active:
 *                 type: boolean
 *               qr:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Wallet created/updated
 */
router.post("/wallets", requireAuth, requireAdmin, upload.single("qr"), W.upsert);

module.exports = router;
