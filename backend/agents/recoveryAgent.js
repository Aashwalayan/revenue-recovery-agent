const failureCategories = require("../taxonomy/failureCategories");

const recoveryAgent = (failedPayment, failureCategory) => {
    const category = failureCategories[failureCategory];

    if (!category) {
        throw new Error(`Unknown failure category: ${failureCategory}`);
    }

    return {
        failureCategory,
        recoverable: category.defaultRecoverable,
        confidence: 0.7,
        proposedAction: category.defaultAction,
        reasoning: "Stub agent proposal based on the failure taxonomy."
    };
};

module.exports = recoveryAgent;