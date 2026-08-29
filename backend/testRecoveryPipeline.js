const recoveryPipeline = require("./services/recoveryPipeline");

const customerOptedOut = require("./data/scenarios/customerOptedOut");
const expiredCard = require("./data/scenarios/expiredCard");
const insufficientFundsRepeated = require("./data/scenarios/insufficientFundsRepeated");
const insufficientFundsSingle = require("./data/scenarios/insufficientFundsSingle");
const expiredCardGenerated = require(
    "./data/scenarios/generated/expiredCardGenerated"
);

const scenarios = [
    customerOptedOut,
    expiredCard,
    insufficientFundsRepeated,
    insufficientFundsSingle,
    expiredCardGenerated
];

async function run() {
    let passed = 0;
    let failed = 0;

    for (const scenario of scenarios) {
        const result = await recoveryPipeline(scenario.failedPayment);

        const expected = scenario.expectedOutcome.recommendedAction;
        const actual = result.finalAction;
        const pass = expected === actual;

        if (pass) {
            passed++;
        } else {
            failed++;
        }

        console.log("\nScenario:", scenario.scenarioId);
        console.log("Expected:", expected);
        console.log("Got:", actual);
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