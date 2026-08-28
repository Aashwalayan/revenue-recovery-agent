const validateProposal = require("./agents/proposalSchema");

const validProposal = {
    failureCategory: "insufficient_funds",
    recoverable: true,
    confidence: 0.7,
    proposedAction: "retry_after_delay",
    reasoning: "Temporary insufficient funds."
};

const invalidProposal = {
    failureCategory: "insufficient_funds",
    recoverable: true,
    confidence: 1.5,
    proposedAction: "charge_customer_again",
    reasoning: "Invalid proposal."
};

console.log("Valid proposal:");
console.log(validateProposal(validProposal));

console.log("\nInvalid proposal:");
console.log(validateProposal(invalidProposal));