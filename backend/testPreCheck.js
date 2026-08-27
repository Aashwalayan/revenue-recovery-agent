const preCheck = require("./rules/preCheck");
const expiredCardScenario = require("./data/scenarios/expiredCard");
const insufficientFundsScenario = require("./data/scenarios/insufficientFundsRepeated");
const customerOptedOutScenario = require("./data/scenarios/customerOptedOut");
const insufficientFundsSingleScenario = require("./data/scenarios/insufficientFundsSingle");

console.log("Expired card:");
console.log(
    preCheck(
        expiredCardScenario.failedPayment,
        expiredCardScenario.expectedOutcome.failureCategory
    )
);

console.log("\nInsufficient funds - repeated:");
console.log(
    preCheck(
        insufficientFundsScenario.failedPayment,
        insufficientFundsScenario.expectedOutcome.failureCategory
    )
);

console.log("\nCustomer opted out:");
console.log(
    preCheck(
        customerOptedOutScenario.failedPayment,
        customerOptedOutScenario.expectedOutcome.failureCategory
    )
);

console.log("\nInsufficient funds - single:");
console.log(
    preCheck(
        insufficientFundsSingleScenario.failedPayment,
        insufficientFundsSingleScenario.expectedOutcome.failureCategory
    )
);