const router = require("express").Router();
const C = require("../controllers/auth.controller");
const P = require("../controllers/password.controller");
const { requireAuth } = require("../lib/auth");

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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *       401:
 *         description: Unauthorized
 */
router.get("/me", requireAuth, C.me);

// Password reset endpoints
router.post("/forgot-password", P.forgotPassword);
router.post("/reset-password", P.resetPassword);
router.post("/change-password", requireAuth, P.changePassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", (req, res) => {
  // Client-side handles token removal, just confirm logout
  res.json({ ok: true, message: "Logged out successfully" });
});

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
