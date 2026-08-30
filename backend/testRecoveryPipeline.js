const recoveryPipeline = require("./services/recoveryPipeline");
const { allowedActions } = require("./agents/proposalSchema");

const customerOptedOut = require("./data/scenarios/customerOptedOut");
const expiredCard = require("./data/scenarios/expiredCard");
const insufficientFundsRepeated = require("./data/scenarios/insufficientFundsRepeated");
const insufficientFundsSingle = require("./data/scenarios/insufficientFundsSingle");
const expiredCardGenerated = require("./data/scenarios/generated/expiredCardGenerated");
const generateAttemptLimitScenarios = require("./data/generators/attemptLimitScenarios");
const generateOptOutScenarios = require("./data/generators/optOutScenarios");
const generateClassificationScenarios = require("./data/generators/classificationScenarios");
const generateAttemptLimitBoundaryScenarios = require("./data/generators/attemptLimitBoundaryScenarios");
const agentFailureScenarios = require("./data/scenarios/agentFailureScenario");



const generatedAttemptLimitScenarios = generateAttemptLimitScenarios();
const generatedOptOutScenarios = generateOptOutScenarios();
const generatedClassificationScenarios = generateClassificationScenarios();
const generatedAttemptLimitBoundaryScenarios = generateAttemptLimitBoundaryScenarios();

const scenarios = [
    customerOptedOut,
    expiredCard,
    insufficientFundsRepeated,
    insufficientFundsSingle,
    expiredCardGenerated,
    ...generatedAttemptLimitScenarios,
    ...generatedOptOutScenarios,
    ...generatedClassificationScenarios,
    ...generatedAttemptLimitBoundaryScenarios,
    ...agentFailureScenarios
];


async function run() {
    let passed = 0;
    let failed = 0;

    for (const scenario of scenarios) {
        const result = await recoveryPipeline(
            scenario.failedPayment,
            { agent: scenario.agent }
        );
        const expected = scenario.expectedOutcome;

        const checks = [];

        if (expected.recommendedAction !== undefined) {
            checks.push({
                name: "recommended action",
                expected: expected.recommendedAction,
                actual: result.finalAction,
                pass:
                    result.finalAction === expected.recommendedAction
            });
        }

        if (expected.failureCategory !== undefined) {
            checks.push({
                name: "failure category",
                expected: expected.failureCategory,
                actual: result.failureCategory,
                pass:
                    result.failureCategory === expected.failureCategory
            });
        }

        if (expected.recommendedAction === undefined) {
            checks.push({
                name: "valid final action",
                expected: "one of allowed actions",
                actual: result.finalAction,
                pass: allowedActions.includes(result.finalAction)
            });
        }

        if (expected.actionOverridden !== undefined) {
            checks.push({
                name: "action overridden",
                expected: expected.actionOverridden,
                actual: result.actionOverridden,
                pass:
                    result.actionOverridden === expected.actionOverridden
            });
        }

        if (expected.overrideReason !== undefined) {
            checks.push({
                name: "override reason",
                expected: expected.overrideReason,
                actual: result.overrideReason,
                pass:
                    result.overrideReason === expected.overrideReason
            });
        }

        const pass = checks.every((check) => check.pass);

        if (pass) {
            passed++;
        } else {
            failed++;
        }

        console.log("\nScenario:", scenario.scenarioId);

        for (const check of checks) {
            console.log(
                `${check.name}:`,
                check.expected,
                "| Got:",
                check.actual,
                "|",
                check.pass ? "PASS" : "FAIL"
            );
        }

        console.log("Overridden:", result.actionOverridden);
        console.log("Result:", pass ? "PASS" : "FAIL");
    }

    console.log("\n--- Evaluation Summary ---");
    console.log("Total:", scenarios.length);
    console.log("Passed:", passed);
    console.log("Failed:", failed);
    console.log(
        "Accuracy:",
        `${((passed / scenarios.length) * 100).toFixed(2)}%`
    );
}

run();