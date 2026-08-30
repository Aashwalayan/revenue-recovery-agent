const classify = require("../taxonomy/classify");
const preCheck = require("../rules/preCheck");
const llmRecoveryAgent = require("../agents/llmRecoveryAgent");
const postCheck = require("../rules/postCheck");

async function recoveryPipeline(failedPayment, { agent = llmRecoveryAgent } = {}) {
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

    let agentProposal;

    try {
        agentProposal = await agent(
            failedPayment,
            failureCategory
        );
    } catch (error) {
        const overrideReasons = {
            AGENT_NETWORK_ERROR: "agent_network_error",
            AGENT_EMPTY_RESPONSE: "agent_empty_response",
            AGENT_INVALID_JSON: "agent_invalid_json",
            AGENT_INVALID_PROPOSAL: "agent_invalid_proposal"
        };

        return {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            finalAction: "escalate",
            actionOverridden: true,
            overrideReason:
                overrideReasons[error.code] || "agent_unknown_error"
        };
    }

    const finalDecision = postCheck(
        failedPayment,
        failureCategory,
        agentProposal
    );

    return {
        failureCategory,
        recoverable: agentProposal.recoverable,
        confidence: agentProposal.confidence,
        agentProposedAction: agentProposal.proposedAction,
        finalAction: finalDecision.finalAction,
        actionOverridden: finalDecision.overridden,
        overrideReason: finalDecision.overrideReason
    };
}

module.exports = recoveryPipeline;