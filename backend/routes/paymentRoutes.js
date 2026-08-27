const express = require("express");

const {
    getPayments
} = require("../controllers/paymentController");

const router = express.Router();

router.get("/", getPayments);

module.exports = router;