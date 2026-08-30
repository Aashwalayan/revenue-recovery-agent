const express = require("express");
const cors = require("cors");

const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const recoveryRoutes = require("./routes/recoveryRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "revenue-recovery-backend"
    });
});

app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recovery", recoveryRoutes);

module.exports = app;