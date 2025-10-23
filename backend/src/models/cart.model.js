const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  name: { type: String },
  price: { type: Number, default: 0 },
}, { _id: false });

const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: { type: [ItemSchema], default: [] },
  updatedAt: { type: Date, default: () => new Date() },
}, { timestamps: false, collection: "carts" });

module.exports = mongoose.models.Cart || mongoose.model("Cart", CartSchema);