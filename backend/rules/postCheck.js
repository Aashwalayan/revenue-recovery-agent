const failureCategories = require("../taxonomy/failureCategories");

const postCheck = (failedPayment, agentProposal) => {
    const { customer } = failedPayment;

    // Hard constraint: customer has opted out
    if (customer.optedOut === true) {
        return {
            finalAction: "do_not_retry",
            overridden: agentProposal.proposedAction !== "do_not_retry",
            overrideReason: "customer_opted_out"
        };
    }

    

    const category = agentProposal.failureCategory;

    const limit = Object.prototype.hasOwnProperty.call(failureCategories, category)
        ? failureCategories[category].retryPolicy.maxAttempts
        : null;

    if (
        limit !== null &&
        limit !== undefined &&
        failedPayment.attemptContext.attemptNumber > limit &&
        agentProposal.proposedAction.includes("retry")
    ) {
        return {
            finalAction: "escalate",
            overridden: true,
            overrideReason: "retry_limit_reached"
        };
    }

    return {
        finalAction: agentProposal.proposedAction,
        overridden: false,
        overrideReason: null
    };
};

module.exports = postCheck;