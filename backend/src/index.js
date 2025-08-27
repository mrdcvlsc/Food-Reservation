const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// serve uploaded images
app.use("/uploads", express.static(path.join(process.cwd(), "server", "uploads")));

// mount API
app.use("/api", routes);

app.get("/", (_req, res) => res.send("API OK"));
app.listen(PORT, () => console.log(`API @ http://localhost:${PORT}`));
