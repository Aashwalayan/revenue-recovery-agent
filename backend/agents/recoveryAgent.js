const failureCategories = require("../taxonomy/failureCategories");
const validateProposal = require("./proposalSchema");

const recoveryAgent = (failedPayment, failureCategory) => {
    const category = failureCategories[failureCategory];

    if (!category) {
        throw new Error(`Unknown failure category: ${failureCategory}`);
    }

    const proposal = {
        failureCategory,
        recoverable: category.defaultRecoverable,
        confidence: 0.7,
        proposedAction: category.defaultAction,
        reasoning: "Stub agent proposal based on the failure taxonomy."
    };

    const validation = validateProposal(proposal);

    if (!validation.valid) {
        throw new Error(
            `Invalid agent proposal: ${validation.errors.join(", ")}`
        );
    }

    return proposal;
};

module.exports = recoveryAgent;