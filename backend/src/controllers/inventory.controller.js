const express = require('express');
const router = express.Router();

// ...existing code...
exports.addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { qty } = req.body;
    // update DB: example using Mongo
    const db = require("../lib/db.mongo"); // adapt to your DB utils
    await db.collection("menu").updateOne({ id }, { $inc: { stock: Number(qty) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to update stock" });
  }
};