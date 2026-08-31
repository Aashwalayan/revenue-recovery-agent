const razorpay = require("../config/razorpay");
const normalizePayment = require("../normalization/normalizePayments");
const recoveryPipeline = require("../services/recoveryPipeline");
const store = require("../data/store/recoveryStore");

/**
 * GET /api/recovery/failed-payments
 *
 * Pulls recent payments from Razorpay Test Mode, filters to failed ones,
 * normalizes them into the pipeline's failedPayment shape, and stores
 * them in memory so /analyze/:id and /batch-analyze can find them by id.
 */
const getFailedPayments = async (req, res) => {
    try {
        const count = Math.min(Number(req.query.count) || 100, 100);

        const raw = await razorpay.payments.all({ count });

        const failed = raw.items.filter(
            (payment) => payment.status === "failed"
        );

        console.log(
            raw.items.map((p) => ({
                id: p.id,
                status: p.status,
                amount: p.amount
            }))
        );

        const normalized = failed.map(normalizePayment);

        store.setFailedPayments(normalized);

        res.json({
            count: normalized.length,
            failedPayments: normalized
        });
    } catch (error) {
        console.error("Failed to fetch failed payments:", error);

        res.status(500).json({
            error: "Failed to fetch failed payments from Razorpay"
        });
    }
};



/**
 * POST /api/recovery/analyze/:id
 *
 * Runs one previously-fetched failed payment through the recovery
 * pipeline and stores the resulting decision (with timeline) for the
 * audit trail view.
 */
const analyzePayment = async (req, res) => {
    try {
        const { id } = req.params;

        const failedPayment = store.getFailedPaymentById(id);

        if (!failedPayment) {
            return res.status(404).json({
                error: `No failed payment found for id "${id}". Fetch /api/recovery/failed-payments first.`
            });
        }

        const decision = await recoveryPipeline(failedPayment);

        const record = store.saveDecision(id, failedPayment, decision);

        res.json(record);
    } catch (error) {
        console.error("Failed to analyze payment:", error);

        res.status(500).json({
            error: "Failed to analyze payment"
        });
    }
};

/**
 * POST /api/recovery/batch-analyze
 *
 * Runs every currently-stored failed payment through the pipeline.
 * Body may optionally include { ids: [...] } to limit which ones run;
 * otherwise it runs all failed payments fetched so far.
 */
const batchAnalyze = async (req, res) => {
    try {
        const requestedIds = Array.isArray(req.body?.ids)
            ? req.body.ids
            : null;

        const candidates = requestedIds
            ? requestedIds
                .map((id) => store.getFailedPaymentById(id))
                .filter(Boolean)
            : store.getFailedPayments();

        const results = [];

        for (const failedPayment of candidates) {
            const decision = await recoveryPipeline(failedPayment);

            const record = store.saveDecision(
                failedPayment.internalId,
                failedPayment,
                decision
            );

            results.push(record);
        }

        res.json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error("Failed to batch-analyze payments:", error);

        res.status(500).json({
            error: "Failed to batch-analyze payments"
        });
    }
};

/**
 * GET /api/recovery/decisions
 *
 * Returns every {failedPayment, decision, analyzedAt} record produced
 * so far. This is also how the frontend fetches a single case's full
 * timeline for the audit trail view (find by failedPayment.internalId).
 */
const getDecisions = (req, res) => {
    res.json({
        count: store.getAllDecisions().length,
        decisions: store.getAllDecisions()
    });
};

/**
 * GET /api/recovery/summary
 *
 * Computed live from whatever is currently in the store — never
 * hardcoded. "Recovered" = pipeline judged the case recoverable AND
 * the final action is an active recovery action (not do_not_retry
 * or escalate).
 */
const getSummary = (req, res) => {
    const failedPayments = store.getFailedPayments();
    const decisions = store.getAllDecisions();

    const totalAtRiskAmount = failedPayments.reduce(
        (sum, p) => sum + (p.payment.amount || 0),
        0
    );

    const nonRecoveryActions = new Set(["do_not_retry", "escalate"]);

    const recoveredDecisions = decisions.filter(
        (record) =>
            record.decision.recoverable === true &&
            !nonRecoveryActions.has(record.decision.finalAction)
    );

    const recoveredAmount = recoveredDecisions.reduce(
        (sum, record) => sum + (record.failedPayment.payment.amount || 0),
        0
    );

    const interventionsCount = decisions.filter(
        (record) => record.decision.actionOverridden === true
    ).length;

    res.json({
        totalAtRiskAmount,
        analyzedCount: decisions.length,
        recoveredCount: recoveredDecisions.length,
        recoveredAmount,
        recoveryRate:
            totalAtRiskAmount > 0
                ? recoveredAmount / totalAtRiskAmount
                : 0,
        interventionsCount
    });
};

module.exports = {
    getFailedPayments,
    analyzePayment,
    batchAnalyze,
    getDecisions,
    getSummary
};