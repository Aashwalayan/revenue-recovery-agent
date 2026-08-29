const llmRecoveryAgent = require("./agents/llmRecoveryAgent");

const expiredCardScenario = require("./data/scenarios/expiredCard");
const insufficientFundsRepeatedScenario = require("./data/scenarios/insufficientFundsRepeated");
const insufficientFundsSingleScenario = require("./data/scenarios/insufficientFundsSingle");
const customerOptedOutScenario = require("./data/scenarios/customerOptedOut");

const scenarios = [
    expiredCardScenario,
    insufficientFundsRepeatedScenario,
    insufficientFundsSingleScenario,
    customerOptedOutScenario
];

async function run() {
    for (const scenario of scenarios) {
        try {
            const proposal = await llmRecoveryAgent(
                scenario.failedPayment,
                scenario.expectedOutcome.failureCategory
            );

            console.log("\nScenario:", scenario.scenarioId);
            console.log(proposal);
        } catch (error) {
            console.error(
                `\nScenario ${scenario.scenarioId} failed:`,
                error.message
            );
        }
    }
}

run();