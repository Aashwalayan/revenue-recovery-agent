const recoveryAgent = require("./agents/recoveryAgent");
const postCheck = require("./rules/postCheck");

const customerOptedOutScenario = require("./data/scenarios/customerOptedOut");
const insufficientFundsSingleScenario = require("./data/scenarios/insufficientFundsSingle");

console.log("Customer opted out:");

const optedOutProposal = recoveryAgent(
    customerOptedOutScenario.failedPayment,
    customerOptedOutScenario.expectedOutcome.failureCategory
);

console.log("Agent proposal:");
console.log(optedOutProposal);

console.log("Final decision:");
console.log(
    postCheck(
        customerOptedOutScenario.failedPayment,
        optedOutProposal
    )
);

console.log("\nSingle insufficient funds:");

const retryProposal = recoveryAgent(
    insufficientFundsSingleScenario.failedPayment,
    insufficientFundsSingleScenario.expectedOutcome.failureCategory
);

console.log("Agent proposal:");
console.log(retryProposal);

console.log("Final decision:");
console.log(
    postCheck(
        insufficientFundsSingleScenario.failedPayment,
        retryProposal
    )
);