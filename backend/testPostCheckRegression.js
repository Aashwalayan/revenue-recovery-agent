const postCheck = require("./rules/postCheck");

function assertEqual(label, actual, expected) {
    const pass = actual === expected;
    console.log(
        `${label}:`,
        expected,
        "| Got:",
        actual,
        "|",
        pass ? "PASS" : "FAIL"
    );
    return pass;
}

function runPostCheckRegression() {
    console.log("\n--- postCheck Regression: category mismatch must not bypass retry limit ---");

    const failedPayment = {
        customer: {
            optedOut: false
        },
        attemptContext: {
            attemptNumber: 5
        }
    };

    const trueCategory = "card_declined_generic";

    const agentProposal = {
        failureCategory: "expired_card",
        proposedAction: "retry_same_method"
    };

    const result = postCheck(failedPayment, trueCategory, agentProposal);

    const checks = [
        assertEqual("finalAction", result.finalAction, "escalate"),
        assertEqual("overridden", result.overridden, true),
        assertEqual("overrideReason", result.overrideReason, "retry_limit_reached")
    ];

    const pass = checks.every(Boolean);

    console.log("Result:", pass ? "PASS" : "FAIL");

    return pass;
}

const pass = runPostCheckRegression();
process.exitCode = pass ? 0 : 1;