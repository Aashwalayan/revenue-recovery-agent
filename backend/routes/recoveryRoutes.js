const express = require("express");

const {
    getFailedPayments,
    analyzePayment,
    batchAnalyze,
    analyzeStream,
    getDecisions,
    executeCase,
    executeBatch,
    executeStream,
    getExecutions,
    getSummary,
    refreshRecoveryStatus
} = require("../controllers/recoveryController");

const router = express.Router();

router.get("/failed-payments", getFailedPayments);
router.post("/analyze/:id", analyzePayment);
router.post("/batch-analyze", batchAnalyze);
router.get("/analyze-stream", analyzeStream);
router.get("/decisions", getDecisions);
router.post("/execute/:id", executeCase);
router.post("/execute-batch", executeBatch);
router.get("/execute-stream", executeStream);
router.get("/executions", getExecutions);
router.get("/summary", getSummary);
router.post("/refresh", refreshRecoveryStatus);
module.exports = router;