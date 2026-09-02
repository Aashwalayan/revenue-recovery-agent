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

    // Hard constraint: policy marks this category as non-recoverable.
    if (
        Object.prototype.hasOwnProperty.call(failureCategories, category) &&
        failureCategories[category].defaultRecoverable === false
    ) {
        const defaultAction = failureCategories[category].defaultAction;

        return {
            finalAction: defaultAction,
            overridden: agentProposal.proposedAction !== defaultAction,
            overrideReason: "category_not_recoverable"
        };
    }

    const limit = Object.prototype.hasOwnProperty.call(failureCategories, category)
        ? failureCategories[category].retryPolicy.maxAttempts
        : null;

    // Hard constraint: retry limit exceeded
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