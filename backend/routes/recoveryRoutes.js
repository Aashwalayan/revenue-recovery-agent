const express = require("express");

const {
    getFailedPayments,
    analyzePayment,
    batchAnalyze,
    getDecisions,
    executeCase,
    executeBatch,
    getExecutions,
    getSummary
} = require("../controllers/recoveryController");

const router = express.Router();

router.get("/failed-payments", getFailedPayments);
router.post("/analyze/:id", analyzePayment);
router.post("/batch-analyze", batchAnalyze);
router.get("/decisions", getDecisions);
router.post("/execute/:id", executeCase);
router.post("/execute-batch", executeBatch);
router.get("/executions", getExecutions);
router.get("/summary", getSummary);

module.exports = router;