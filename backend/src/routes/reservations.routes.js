// backend/src/routes/reservations.routes.js
const express = require("express");
const R = require("../controllers/reservations.controller");
const { requireAuth, requireAdmin } = require("../lib/auth");

const router = express.Router();

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Create a reservation
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               grade:
 *                 type: string
 *               section:
 *                 type: string
 *               slot:
 *                 type: string
 *               note:
 *                 type: string
 *               student:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reservation created
 *       400:
 *         description: Invalid input
 */
router.post("/", requireAuth, R.create);

/**
 * @swagger
 * /reservations/checkout:
 *   post:
 *     summary: Create a reservation (checkout alias)
 *     tags: [Reservations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reservation created
 *       400:
 *         description: Invalid input
 */
router.post("/checkout", requireAuth, R.create);

/**
 * @swagger
 * /reservations/mine:
 *   get:
 *     summary: Get current user's reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *       401:
 *         description: Unauthorized
 */
router.get("/mine", requireAuth, R.mine);

/**
 * @swagger
 * /reservations/admin:
 *   get:
 *     summary: Admin - list reservations
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by reservation status
 *     responses:
 *       200:
 *         description: List of reservations
 */
router.get("/admin", R.listAdmin);

/**
 * @swagger
 * /reservations/admin/{id}:
 *   patch:
 *     summary: Admin - update reservation status
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
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
 *         description: Reservation updated
 *       400:
 *         description: Invalid input
 */
router.patch("/admin/:id", R.setStatus);

module.exports = router;
