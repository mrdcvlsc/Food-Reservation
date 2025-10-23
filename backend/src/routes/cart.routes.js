const express = require("express");
const router = express.Router();
const Cart = require("../controllers/cart.controller");
const { requireAuth } = require("../lib/auth");

// Get current user's cart
router.get("/", requireAuth, Cart.get);

// Add item (increment)
router.post("/add", requireAuth, Cart.addItem);

// Set qty (or remove when qty=0)
router.post("/update", requireAuth, Cart.updateItem);

// Remove single item
router.post("/remove", requireAuth, Cart.removeItem);

// Clear cart
router.post("/clear", requireAuth, Cart.clear);

module.exports = router;