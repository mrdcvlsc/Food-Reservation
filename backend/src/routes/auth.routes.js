const router = require("express").Router();
const C = require("../controllers/auth.controller");
const P = require("../controllers/password.controller");

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", C.login);
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               grade:
 *                 type: string
 *               section:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration successful
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Email already used
 */
router.post("/register", C.register);

// add change-password endpoint (POST)
router.post("/change-password", P.changePassword);

/**
 * @swagger
 * /auth/health:
 *   get:
 *     summary: Health check for auth service
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = router;
