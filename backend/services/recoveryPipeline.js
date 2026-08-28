const classify = require("../taxonomy/classify");
const preCheck = require("../rules/preCheck");
const recoveryAgent = require("../agents/recoveryAgent");
const postCheck = require("../rules/postCheck");

async function recoveryPipeline(failedPayment) {
    const failureCategory = classify(failedPayment);

    failedPayment.failure.normalizedCategory = failureCategory;

    const preCheckResult = preCheck(failedPayment, failureCategory);

    if (preCheckResult.blocked) {
        return {
            finalAction: preCheckResult.action,
            actionOverridden: true,
            overrideReason: preCheckResult.reason
        };
    }

    const agentProposal = recoveryAgent(failedPayment, failureCategory);

    const finalDecision = postCheck(
        failedPayment,
        agentProposal
    );

    return {
        finalAction: finalDecision.finalAction,
        actionOverridden: finalDecision.overridden,
        overrideReason: finalDecision.overrideReason
    };
}

module.exports = recoveryPipeline;