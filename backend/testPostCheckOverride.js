const postCheck = require("./rules/postCheck");

const failedPayment = {
    attemptContext: {
        attemptNumber: 3
    },
    customer: {
        optedOut: false
    }
};

const badAgentProposal = {
    failureCategory: "insufficient_funds",
    recoverable: true,
    confidence: 0.9,
    proposedAction: "retry_after_delay",
    reasoning: "Try again."
};

const result = postCheck(failedPayment, badAgentProposal);

console.log(result);