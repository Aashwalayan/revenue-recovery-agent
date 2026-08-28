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

    const maxAttempts = {
        card_declined_generic: 2,
        insufficient_funds: 2,
        expired_card: null,
        authentication_3ds_failure: 1,
        bank_unavailable: 3,
        upi_timeout: 2,
        transaction_limit_exceeded: null,
        repeated_failure_same_reason: null,
        uncategorized: 0
    };

    const category = agentProposal.failureCategory;
    const limit = maxAttempts[category];

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