const razorpay = require("../config/razorpay");
const normalizePayment = require("../normalization/normalizePayments");
const recoveryPipeline = require("../services/recoveryPipeline");
const executeDecision = require("../services/executionService");
const store = require("../data/store/recoveryStore");

/**
 * Small SSE helper. Writes one `event: <type>\ndata: <json>\n\n` frame.
 * Not a generic library -- just enough for the two streaming routes below.
 */
function sseWrite(res, type, payload) {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseInit(res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
}

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
 * GET /api/recovery/analyze-stream?ids=a,b,c
 *
 * Same work as /batch-analyze, but streamed live via Server-Sent Events:
 * a case_start event before each case, a step event for every single
 * pipeline timeline entry as it's actually produced (detected ->
 * classified -> proposed -> policy_checked -> final_decision), and a
 * case_complete event with the full decision record once it's done.
 * This is what powers the live activity feed -- real pipeline timing,
 * not a client-side simulated playback of an already-finished batch.
 */
const analyzeStream = async (req, res) => {
    const requestedIds =
        typeof req.query.ids === "string" && req.query.ids.length > 0
            ? req.query.ids.split(",")
            : null;

    const candidates = requestedIds
        ? requestedIds.map((id) => store.getFailedPaymentById(id)).filter(Boolean)
        : store.getFailedPayments();

    sseInit(res);
    sseWrite(res, "batch_start", { total: candidates.length });

    for (let i = 0; i < candidates.length; i++) {
        const failedPayment = candidates[i];

        sseWrite(res, "case_start", {
            internalId: failedPayment.internalId,
            index: i,
            total: candidates.length,
            amount: failedPayment.payment.amount,
            currency: failedPayment.payment.currency
        });

        try {
            const decision = await recoveryPipeline(failedPayment, {
                onStep: (entry) =>
                    sseWrite(res, "step", {
                        internalId: failedPayment.internalId,
                        ...entry
                    })
            });

            const record = store.saveDecision(
                failedPayment.internalId,
                failedPayment,
                decision
            );

            sseWrite(res, "case_complete", record);
        } catch (error) {
            sseWrite(res, "case_error", {
                internalId: failedPayment.internalId,
                error: error.message || "Failed to analyze this case"
            });
        }
    }

    sseWrite(res, "batch_complete", { count: candidates.length });
    res.end();
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
 * POST /api/recovery/execute/:id
 *
 * Human-in-the-loop execution: acts on an already-made decision for one
 * case (creates a real Razorpay Payment Link, an escalation record, or
 * a logged no-op, depending on finalAction). Idempotent -- if this case
 * was already executed, returns the existing record instead of creating
 * a second real payment link.
 */
const executeCase = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = store.getExecution(id);
        if (existing) {
            return res.json({ ...existing, alreadyExecuted: true });
        }

        const decisionRecord = store.getDecision(id);
        if (!decisionRecord) {
            return res.status(404).json({
                error: `No decision found for id "${id}". Analyze it first via /api/recovery/analyze/:id.`
            });
        }

        const execution = await executeDecision(
            decisionRecord.failedPayment,
            decisionRecord.decision
        );

        const record = store.saveExecution(
            id,
            decisionRecord.failedPayment,
            decisionRecord.decision,
            execution
        );

        res.json({ ...record, alreadyExecuted: false });
    } catch (error) {
        console.error("Failed to execute case:", error);

        res.status(500).json({
            error: "Failed to execute case"
        });
    }
};

/**
 * POST /api/recovery/execute-batch
 *
 * Executes every decided-but-not-yet-executed case (optionally limited
 * to { ids: [...] } in the body). Skips (rather than re-executes) any
 * case that already has an execution record.
 */
const executeBatch = async (req, res) => {
    try {
        const requestedIds = Array.isArray(req.body?.ids)
            ? req.body.ids
            : null;

        const candidateIds = requestedIds
            ? requestedIds
            : store.getAllDecisions().map((r) => r.failedPayment.internalId);

        const results = [];

        for (const id of candidateIds) {
            const existing = store.getExecution(id);
            if (existing) {
                results.push({ ...existing, alreadyExecuted: true });
                continue;
            }

            const decisionRecord = store.getDecision(id);
            if (!decisionRecord) {
                continue;
            }

            const execution = await executeDecision(
                decisionRecord.failedPayment,
                decisionRecord.decision
            );

            const record = store.saveExecution(
                id,
                decisionRecord.failedPayment,
                decisionRecord.decision,
                execution
            );

            results.push({ ...record, alreadyExecuted: false });
        }

        res.json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error("Failed to batch-execute:", error);

        res.status(500).json({
            error: "Failed to batch-execute"
        });
    }
};

/**
 * GET /api/recovery/execute-stream?ids=a,b,c
 *
 * Same work as /execute-batch, streamed live: a case_start event before
 * each case (naming the real action about to be taken), then
 * case_complete with the full execution record (including the real
 * Razorpay Payment Link URL the instant it's created). Execution has no
 * pipeline sub-steps the way analysis does -- creating a link is one
 * atomic call -- so granularity here is per-case, not per-step.
 */
const executeStream = async (req, res) => {
    const requestedIds =
        typeof req.query.ids === "string" && req.query.ids.length > 0
            ? req.query.ids.split(",")
            : null;

    const candidateIds = requestedIds
        ? requestedIds
        : store.getAllDecisions().map((r) => r.failedPayment.internalId);

    sseInit(res);
    sseWrite(res, "batch_start", { total: candidateIds.length });

    let processed = 0;

    for (let i = 0; i < candidateIds.length; i++) {
        const id = candidateIds[i];

        const existing = store.getExecution(id);
        if (existing) {
            sseWrite(res, "case_complete", { ...existing, alreadyExecuted: true });
            processed++;
            continue;
        }

        const decisionRecord = store.getDecision(id);
        if (!decisionRecord) {
            continue;
        }

        sseWrite(res, "case_start", {
            internalId: id,
            index: i,
            total: candidateIds.length,
            finalAction: decisionRecord.decision.finalAction
        });

        try {
            const execution = await executeDecision(
                decisionRecord.failedPayment,
                decisionRecord.decision
            );

            const record = store.saveExecution(
                id,
                decisionRecord.failedPayment,
                decisionRecord.decision,
                execution
            );

            sseWrite(res, "case_complete", { ...record, alreadyExecuted: false });
        } catch (error) {
            sseWrite(res, "case_error", {
                internalId: id,
                error: error.message || "Failed to execute this case"
            });
        }

        processed++;
    }

    sseWrite(res, "batch_complete", { count: processed });
    res.end();
};

/**
 * GET /api/recovery/executions
 *
 * Returns every {failedPayment, decision, execution, executedAt} record
 * produced so far.
 */
const getExecutions = (req, res) => {
    res.json({
        count: store.getAllExecutions().length,
        executions: store.getAllExecutions()
    });
};

/**
 * GET /api/recovery/summary
 *
 * Computed live from whatever is currently in the store — never
 * hardcoded.
 *
 * IMPORTANT distinction between the two kinds of numbers here:
 *
 * - estimatedRecoverable* is a decision-level PROJECTION (the pipeline
 *   judged the case recoverable and proposed an active action). It does
 *   NOT mean anything actually happened yet -- a case counts here the
 *   moment it's analyzed, even if it's never executed. Named
 *   "estimated" deliberately so it can't be read as a completed outcome.
 *
 * - actioned* is the real, execution-level signal: cases where a real
 *   action was actually taken (a real Razorpay Payment Link created, or
 *   an escalation queued). This still isn't "the customer paid" --
 *   that requires the customer to complete the link, which this
 *   summary can't observe without a webhook -- but it's a genuine
 *   record of work done, not a projection.
 */
const getSummary = (req, res) => {
    const failedPayments = store.getFailedPayments();
    const decisions = store.getAllDecisions();
    const executions = store.getAllExecutions();

    const totalAtRiskAmount = failedPayments.reduce(
        (sum, p) => sum + (p.payment.amount || 0),
        0
    );

    const nonRecoveryActions = new Set(["do_not_retry", "escalate"]);

    const estimatedRecoverableDecisions = decisions.filter(
        (record) =>
            record.decision.recoverable === true &&
            !nonRecoveryActions.has(record.decision.finalAction)
    );

    const estimatedRecoverableAmount = estimatedRecoverableDecisions.reduce(
        (sum, record) => sum + (record.failedPayment.payment.amount || 0),
        0
    );

    const interventionsCount = decisions.filter(
        (record) => record.decision.actionOverridden === true
    ).length;

    const successfulExecutions = executions.filter(
        (record) => record.execution.status === "success"
    );

    const recoveredExecutions = executions.filter(
        (record) => record.recovery?.status === "recovered"
    );

    const recoveredAmount = recoveredExecutions.reduce(
        (sum, record) => sum + (record.recovery.amount || 0),
        0
    );

    const actionedAmount = successfulExecutions.reduce(
        (sum, record) => sum + (record.failedPayment.payment.amount || 0),
        0
    );

    const linksCreatedCount = executions.filter(
        (record) => record.execution.kind === "payment_link" && record.execution.status === "success"
    ).length;

    const escalationsQueuedCount = executions.filter(
        (record) => record.execution.kind === "escalation" && record.execution.status === "success"
    ).length;

    const executionFailedCount = executions.filter(
        (record) => record.execution.status === "failed"
    ).length;

    res.json({
        totalAtRiskAmount,
        analyzedCount: decisions.length,

        // Projection -- decision-level, not observed
        estimatedRecoverableCount: estimatedRecoverableDecisions.length,
        estimatedRecoverableAmount,
        estimatedRecoveryRate:
            totalAtRiskAmount > 0
                ? estimatedRecoverableAmount / totalAtRiskAmount
                : 0,

        interventionsCount,

        // Real -- execution-level, an actual action was taken
        actionedCount: successfulExecutions.length,
        actionedAmount,
        executedCount: executions.length,
        linksCreatedCount,
        escalationsQueuedCount,
        executionFailedCount,

        recoveredCount: recoveredExecutions.length,
        recoveredAmount,
        recoveryRate:
            totalAtRiskAmount > 0
                ? recoveredAmount / totalAtRiskAmount
                : 0,
    });
};

module.exports = {
    getFailedPayments,
    analyzePayment,
    batchAnalyze,
    analyzeStream,
    getDecisions,
    executeCase,
    executeBatch,
    executeStream,
    getExecutions,
    getSummary
};