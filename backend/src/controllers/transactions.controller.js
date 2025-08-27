const { load } = require("../lib/db");

exports.mine = (req, res) => {
  const db = load();
  const uid = req.user.id;

  const txTopups = db.topups
    .filter(t => t.userId === uid)
    .map(t => ({
      id: t.id,
      title: `${t.method.toUpperCase()} Top-Up`,
      amount: t.amount,
      time: t.createdAt,
      status: t.status,
      type: "topup"
    }));

  const txRes = db.reservations
    .filter(r => r.userId === uid)
    .map(r => ({
      id: r.id,
      title: "Reservation",
      amount: r.total,
      time: r.createdAt,
      status: r.status,
      type: "reservation"
    }));

  const merged = [...txTopups, ...txRes].sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(merged);
};
