const recoveryPipeline = require("./services/recoveryPipeline");

const customerOptedOut = require("./data/scenarios/customerOptedOut");
const expiredCard = require("./data/scenarios/expiredCard");
const insufficientFundsRepeated = require("./data/scenarios/insufficientFundsRepeated");
const insufficientFundsSingle = require("./data/scenarios/insufficientFundsSingle");

const scenarios = [
    customerOptedOut,
    expiredCard,
    insufficientFundsRepeated,
    insufficientFundsSingle
];

async function run() {
    for (const scenario of scenarios) {
        const result = await recoveryPipeline(scenario.failedPayment);

        console.log("\nScenario:", scenario.scenarioId);
        console.log("Expected:", scenario.expectedOutcome.recommendedAction);
        console.log("Got:", result.finalAction);
        console.log("Overridden:", result.actionOverridden);
    }
}

run();