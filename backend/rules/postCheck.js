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

    return {
        finalAction: agentProposal.proposedAction,
        overridden: false,
        overrideReason: null
    };
};

module.exports = postCheck;