const recoveryAgent = require("./agents/recoveryAgent");
const customerOptedOutScenario = require("./data/scenarios/customerOptedOut");
const insufficientFundsSingleScenario = require("./data/scenarios/insufficientFundsSingle");

console.log("Single insufficient funds:");

const proposal1 = recoveryAgent(
    insufficientFundsSingleScenario.failedPayment,
    insufficientFundsSingleScenario.expectedOutcome.failureCategory
);

console.log(proposal1);

console.log("\nCustomer opted out:");

const proposal2 = recoveryAgent(
    customerOptedOutScenario.failedPayment,
    customerOptedOutScenario.expectedOutcome.failureCategory
);

console.log(proposal2);