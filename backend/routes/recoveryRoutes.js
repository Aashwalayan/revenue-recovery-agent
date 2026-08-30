const express = require("express");

const {
    getFailedPayments,
    analyzePayment,
    batchAnalyze,
    getDecisions,
    getSummary
} = require("../controllers/recoveryController");

const router = express.Router();

router.get("/failed-payments", getFailedPayments);
router.post("/analyze/:id", analyzePayment);
router.post("/batch-analyze", batchAnalyze);
router.get("/decisions", getDecisions);
router.get("/summary", getSummary);

module.exports = router;