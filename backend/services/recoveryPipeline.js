const classify = require("../taxonomy/classify");
const preCheck = require("../rules/preCheck");
const llmRecoveryAgent = require("../agents/llmRecoveryAgent");
const postCheck = require("../rules/postCheck");

async function recoveryPipeline(failedPayment) {
    const failureCategory = classify(failedPayment);

    failedPayment.failure.normalizedCategory = failureCategory;

    const preCheckResult = preCheck(failedPayment, failureCategory);

    if (preCheckResult.blocked) {
        return {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            finalAction: preCheckResult.action,
            actionOverridden: true,
            overrideReason: preCheckResult.reason
        };
    }

    const agentProposal = await llmRecoveryAgent(
        failedPayment,
        failureCategory
    );

    const finalDecision = postCheck(
        failedPayment,
        agentProposal
    );

    return {
        failureCategory: agentProposal.failureCategory,
        recoverable: agentProposal.recoverable,
        confidence: agentProposal.confidence,
        agentProposedAction: agentProposal.proposedAction,
        finalAction: finalDecision.finalAction,
        actionOverridden: finalDecision.overridden,
        overrideReason: finalDecision.overrideReason
    };
}

module.exports = recoveryPipeline;