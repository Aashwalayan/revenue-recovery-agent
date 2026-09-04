/**
 * Batch evaluation script for the revenue recovery pipeline.
 *
 * Runs `recoveryPipeline` over N synthetic failed payments and reports
 * aggregate, judge-facing numbers:
 *   - total ₹ at risk
 *   - ₹ addressed via a real recovery mechanism (payment link generated)
 *   - ₹ escalated to a human
 *   - ₹ blocked/opted-out (no action)
 *   - breakdown by failure category and by final action
 *   - override rate (how often the guardrail layer changed the agent's proposal)
 *
 * Usage:
 *   node evaluateRecovery.js --count 200
 *   node evaluateRecovery.js --count 50 --execute   (also fires real Razorpay
 *                                                     paymentLink.create calls
 *                                                     for a small sample)
 *
 * NOTE: By default this does NOT call executionService (no real API calls),
 * so you can run it freely against the real LLM agent without spamming
 * Razorpay's test-mode API. Pass --execute to also run a handful of cases
 * through executeDecision() for a real "money recovered" number.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const recoveryPipeline = require("./services/recoveryPipeline");
const failureCategories = require("./taxonomy/failureCategories");
const recoveryStore = require("./data/store/recoveryStore");

// executionService (and therefore config/razorpay.js, which instantiates a
// real Razorpay client on require) is only loaded lazily, inside runBatch,
// and only when --execute is actually passed. This means a plain stats-only
// run never needs RAZORPAY_KEY_ID/SECRET to be present at all.

// ---------------------------------------------------------------------
// 1. Synthetic scenario generator
//
// Produces RAW failed-payment records only -- no attemptContext is built
// here. attemptContext (attemptNumber, priorAttempts, firstFailureAt) is
// derived by recoveryStore.setFailedPayments() itself, by grouping records
// that share the same payment.razorpayOrderId, exactly like the real app
// would receive them from webhooks. This avoids duplicating that grouping
// logic and risking it drifting out of sync with the real store.
//
// Swap this out for your real generator (data/generators/*) if it already
// produces raw records in this shape -- everything downstream just calls
// recoveryStore, so it doesn't care where the raw records came from.
// ---------------------------------------------------------------------

const CATEGORY_ERROR_MAP = {
    insufficient_funds: { errorCode: "INSUFFICIENT_FUNDS", errorReason: "insufficient_fund" },
    expired_card: { errorCode: "CARD_EXPIRED", errorReason: "card_expired" },
    authentication_3ds_failure: { errorReason: "authentication_failed", errorStep: "authentication" },
    bank_unavailable: { errorReason: "bank_unavailable", errorSource: "bank_unavailable" },
    upi_timeout: { errorCode: "UPI_TIMEOUT", errorReason: "upi_timeout" },
    transaction_limit_exceeded: { errorCode: "TRANSACTION_LIMIT_EXCEEDED", errorReason: "transaction_limit_exceeded" },
    card_declined_generic: { errorCode: "CARD_DECLINED", errorReason: "card_declined" }
};

const CATEGORY_WEIGHTS = [
    ["insufficient_funds", 0.22],
    ["expired_card", 0.1],
    ["authentication_3ds_failure", 0.12],
    ["bank_unavailable", 0.18],
    ["upi_timeout", 0.15],
    ["transaction_limit_exceeded", 0.08],
    ["card_declined_generic", 0.15]
];

// NOTE: these weights, the 8% opt-out rate, and the 12% repeat-order rate
// below are all made up for demo variety -- they are not derived from any
// real distribution. Replace with real numbers if you have them.

function pickWeighted(weights) {
    const r = Math.random();
    let acc = 0;
    for (const [key, w] of weights) {
        acc += w;
        if (r <= acc) return key;
    }
    return weights[weights.length - 1][0];
}

function randomAmount() {
    // ₹99 to ₹9,999, in paise (Razorpay amounts are in the smallest unit)
    return Math.floor((99 + Math.random() * 9900) * 100);
}

let attemptCounter = 0;

function makeRawPayment(orderId, category, optedOut, createdAt) {
    attemptCounter++;
    const errorInfo = CATEGORY_ERROR_MAP[category];
    const paymentId = `pay_sim_${attemptCounter}`;

    return {
        internalId: `sim_${attemptCounter}`,
        timestamps: {
            createdAt,
            // recoveryPipeline reads detectedAt; store sorts on createdAt.
            // Keep both in sync for a raw/first-seen record.
            detectedAt: createdAt
        },
        payment: {
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            amount: randomAmount(),
            currency: "INR"
        },
        customer: {
            optedOut,
            email: optedOut ? undefined : `sim.customer.${attemptCounter}@example.com`,
            contact: undefined
        },
        failure: { ...errorInfo }
        // attemptContext intentionally omitted -- recoveryStore fills it in.
    };
}

/**
 * Generates `count` raw failed-payment records. About 12% of them are
 * "repeat" scenarios: two payments sharing one razorpayOrderId with the
 * same failure reason, a few hours apart -- this is what should trigger
 * classify.js's "repeated_failure_same_reason" path once recoveryStore
 * builds attemptContext.priorAttempts for the second attempt.
 */
function generateRawPayments(count) {
    const raw = [];
    let ordersCreated = 0;

    while (raw.length < count) {
        ordersCreated++;
        const orderId = `order_sim_${ordersCreated}`;
        const category = pickWeighted(CATEGORY_WEIGHTS);
        const optedOut = Math.random() < 0.08;
        const isRepeat = Math.random() < 0.12 && raw.length + 2 <= count;

        const firstCreatedAt = new Date(
            Date.now() - Math.floor(Math.random() * 5) * 24 * 3600 * 1000
        ).toISOString();

        raw.push(makeRawPayment(orderId, category, optedOut, firstCreatedAt));

        if (isRepeat) {
            const secondCreatedAt = new Date(
                new Date(firstCreatedAt).getTime() + 6 * 3600 * 1000
            ).toISOString();
            // Same category/errorReason on the same order -> repeat failure.
            raw.push(makeRawPayment(orderId, category, optedOut, secondCreatedAt));
        }
    }

    return raw.slice(0, count);
}

// ---------------------------------------------------------------------
// 2. Mock agent (optional) -- lets you run large batches for free/offline
// without hitting OpenRouter for every single case. Mirrors the real
// llmRecoveryAgent's contract: returns {proposedAction, confidence,
// recoverable, alternativesConsidered}.
// ---------------------------------------------------------------------

function mockAgent(failedPayment, failureCategory) {
    const policy = failureCategories[failureCategory];

    // Start with the policy's correct default action
    let proposedAction = policy ? policy.defaultAction : "escalate";
    let reasoning = "mock agent: following category default";

    // Deterministically inject bad proposals so postCheck guardrails
    // have realistic unsafe/suboptimal agent decisions to correct.
    const id = failedPayment.internalId || "";
    const caseNumber = parseInt(id.split("_").pop(), 10) || 0;

    if (caseNumber % 10 === 0) {
        proposedAction = "retry_same_method";
        reasoning = "mock agent intentionally proposed retry to test guardrails";
    }

    return Promise.resolve({
        failureCategory,
        recoverable: policy ? policy.defaultRecoverable : false,
        confidence: 0.75,
        proposedAction,
        reasoning,
        alternativesConsidered: []
    });
}

// ---------------------------------------------------------------------
// 3. Run the batch
// ---------------------------------------------------------------------

async function runBatch({ count, useRealAgent, executeSampleSize }) {
    // Generate raw records and hand them to recoveryStore, which groups
    // by razorpayOrderId and builds attemptContext (attemptNumber,
    // priorAttempts, firstFailureAt) exactly as the real app would.
    const rawPayments = generateRawPayments(count);
    recoveryStore.setFailedPayments(rawPayments);
    const scenarios = recoveryStore.getFailedPayments();

    const agent = useRealAgent
        ? undefined // recoveryPipeline defaults to the real llmRecoveryAgent
        : mockAgent;

    const results = [];
    for (const scenario of scenarios) {
        const decision = agent
            ? await recoveryPipeline(scenario, { agent })
            : await recoveryPipeline(scenario);

        recoveryStore.saveDecision(scenario.internalId, scenario, decision);
        results.push({ scenario, decision });
    }

    // Optionally execute a real sample through Razorpay test-mode
    let executed = [];
    if (executeSampleSize > 0) {
        // Loaded lazily so a stats-only run never needs Razorpay keys.
        const executeDecision = require("./services/executionService");

        const sample = results
            .filter(r => r.decision.finalAction !== "do_not_retry")
            .slice(0, executeSampleSize);

        for (const { scenario, decision } of sample) {
            const outcome = await executeDecision(scenario, decision);
            recoveryStore.saveExecution(scenario.internalId, scenario, decision, outcome);
            executed.push({ scenario, decision, outcome });
        }
    }

    return { results, executed };
}

// ---------------------------------------------------------------------
// 4. Aggregate + report
// ---------------------------------------------------------------------

function toRupees(paise) {
    return (paise / 100).toFixed(2);
}

function summarize({ results, executed }) {
    let totalAtRiskPaise = 0;
    let blockedPaise = 0;
    let escalatedPaise = 0;
    let paymentLinkPaise = 0;
    let overrideCount = 0;

    const byCategory = {};
    const byFinalAction = {};

    for (const { scenario, decision } of results) {
        const amount = scenario.payment.amount;
        totalAtRiskPaise += amount;

        byCategory[decision.failureCategory] = (byCategory[decision.failureCategory] || 0) + 1;
        byFinalAction[decision.finalAction] = (byFinalAction[decision.finalAction] || 0) + 1;

        if (decision.actionOverridden) overrideCount++;

        if (decision.finalAction === "do_not_retry") {
            blockedPaise += amount;
        } else if (decision.finalAction === "escalate") {
            escalatedPaise += amount;
        } else {
            paymentLinkPaise += amount;
        }
    }

    const executedSuccess = executed.filter(e => e.outcome.status === "success");
    const executedPaymentLinks = executedSuccess.filter(e => e.outcome.kind === "payment_link");
    const executedRecoveredPaise = executedPaymentLinks.reduce(
        (sum, e) => sum + (e.outcome.paymentLink?.amount || 0),
        0
    );

    console.log("\n===== RECOVERY PIPELINE — BATCH EVALUATION =====\n");
    console.log(`Cases evaluated:            ${results.length}`);
    console.log(`Total revenue at risk:      ₹${toRupees(totalAtRiskPaise)}`);
    console.log(`  ↳ addressed w/ payment link: ₹${toRupees(paymentLinkPaise)} (${((paymentLinkPaise/totalAtRiskPaise)*100).toFixed(1)}%)`);
    console.log(`  ↳ escalated to human:        ₹${toRupees(escalatedPaise)} (${((escalatedPaise/totalAtRiskPaise)*100).toFixed(1)}%)`);
    console.log(`  ↳ blocked / opted-out:       ₹${toRupees(blockedPaise)} (${((blockedPaise/totalAtRiskPaise)*100).toFixed(1)}%)`);
    console.log(`Guardrail override rate:    ${((overrideCount/results.length)*100).toFixed(1)}% (${overrideCount}/${results.length})`);

    console.log("\nBreakdown by failure category:");
    Object.entries(byCategory).forEach(([cat, n]) => console.log(`  ${cat.padEnd(30)} ${n}`));

    console.log("\nBreakdown by final action:");
    Object.entries(byFinalAction).forEach(([action, n]) => console.log(`  ${action.padEnd(30)} ${n}`));

    if (executed.length > 0) {
        console.log(`\n----- Live execution sample (${executed.length} cases) -----`);
        console.log(`Real Razorpay payment links created: ${executedPaymentLinks.length}`);
        console.log(`Value put in front of customers:     ₹${toRupees(executedRecoveredPaise)}`);
        console.log(`Execution failures:                  ${executed.length - executedSuccess.length}`);
    }

    console.log("\n=================================================\n");

    return {
        casesEvaluated: results.length,
        totalAtRiskPaise,
        paymentLinkPaise,
        escalatedPaise,
        blockedPaise,
        overrideRate: overrideCount / results.length,
        byCategory,
        byFinalAction,
        executedSummary: executed.length > 0 ? {
            sampleSize: executed.length,
            paymentLinksCreated: executedPaymentLinks.length,
            valuePutInFrontOfCustomersPaise: executedRecoveredPaise
        } : null
    };
}

// ---------------------------------------------------------------------
// 5. CLI entry point
// ---------------------------------------------------------------------

function parseArgs() {
    const args = process.argv.slice(2);
    const getFlag = (name, fallback) => {
        const idx = args.indexOf(`--${name}`);
        if (idx === -1) return fallback;
        const val = args[idx + 1];
        return val && !val.startsWith("--") ? val : true;
    };

    return {
        count: parseInt(getFlag("count", "100"), 10),
        useRealAgent: args.includes("--real-agent"),
        executeSampleSize: args.includes("--execute") ? parseInt(getFlag("execute-count", "5"), 10) : 0
    };
}

async function main() {
    const { count, useRealAgent, executeSampleSize } = parseArgs();

    console.log(`Running ${count} synthetic cases through recoveryPipeline...`);
    console.log(`Agent: ${useRealAgent ? "real LLM (llmRecoveryAgent)" : "mock (category-default, offline)"}`);
    if (executeSampleSize > 0) {
        console.log(`Will execute ${executeSampleSize} real cases against Razorpay test-mode API.`);
    }

    const { results, executed } = await runBatch({ count, useRealAgent, executeSampleSize });
    const summary = summarize({ results, executed });

    // Write raw results for the dashboard to pick up, if useful.
    const fs = require("fs");
    fs.writeFileSync(
        "./evaluation-results.json",
        JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)
    );
    console.log("Full results written to evaluation-results.json");
}

main().catch(err => {
    console.error("Batch evaluation failed:", err);
    process.exit(1);
});