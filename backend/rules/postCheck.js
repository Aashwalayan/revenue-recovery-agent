const failureCategories = require("../taxonomy/failureCategories");

const postCheck = (failedPayment, category, agentProposal) => {
    const { customer } = failedPayment;

    // Hard constraint: customer has opted out
    if (customer.optedOut === true) {
        return {
            finalAction: "do_not_retry",
            overridden: agentProposal.proposedAction !== "do_not_retry",
            overrideReason: "customer_opted_out"
        };
    }

    

    const limit = Object.prototype.hasOwnProperty.call(failureCategories, category)
        ? failureCategories[category].retryPolicy.maxAttempts
        : null;

    // Hard constraint: retry limit exceeded. This applies regardless of
    // what the agent proposed -- a hard rule can't depend on whether the
    // agent's wording happens to contain "retry".
    if (
        limit !== null &&
        limit !== undefined &&
        failedPayment.attemptContext.attemptNumber > limit
    ) {
        return {
            finalAction: "escalate",
            overridden: agentProposal.proposedAction !== "escalate",
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