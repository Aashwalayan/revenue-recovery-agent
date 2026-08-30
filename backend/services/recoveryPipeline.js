const classify = require("../taxonomy/classify");
const preCheck = require("../rules/preCheck");
const llmRecoveryAgent = require("../agents/llmRecoveryAgent");
const postCheck = require("../rules/postCheck");

async function recoveryPipeline(failedPayment, { agent = llmRecoveryAgent } = {}) {
    const timeline = [];

    const detectedAt =
        failedPayment.timestamps?.detectedAt || new Date().toISOString();

    timeline.push({
        step: "detected",
        timestamp: detectedAt,
        detail: "Failed payment ingested by the recovery pipeline."
    });

    const failureCategory = classify(failedPayment);

    failedPayment.failure.normalizedCategory = failureCategory;

    timeline.push({
        step: "classified",
        timestamp: new Date().toISOString(),
        detail: `Classified as "${failureCategory}".`
    });

    const preCheckResult = preCheck(failedPayment, failureCategory);

    if (preCheckResult.blocked) {
        timeline.push({
            step: "policy_checked",
            timestamp: new Date().toISOString(),
            detail: `Blocked before agent proposal: ${preCheckResult.reason}.`
        });

        const finalDecision = {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            finalAction: preCheckResult.action,
            actionOverridden: true,
            overrideReason: preCheckResult.reason,
            timeline
        };

        timeline.push({
            step: "final_decision",
            timestamp: new Date().toISOString(),
            detail: `Final action: ${finalDecision.finalAction} (policy override, agent never consulted).`
        });

        return finalDecision;
    }

    let agentProposal;

    try {
        agentProposal = await agent(
            failedPayment,
            failureCategory
        );

        timeline.push({
            step: "proposed",
            timestamp: new Date().toISOString(),
            detail: `Agent proposed "${agentProposal.proposedAction}" (confidence ${agentProposal.confidence}).`
        });
    } catch (error) {
        const overrideReasons = {
            AGENT_NETWORK_ERROR: "agent_network_error",
            AGENT_EMPTY_RESPONSE: "agent_empty_response",
            AGENT_INVALID_JSON: "agent_invalid_json",
            AGENT_INVALID_PROPOSAL: "agent_invalid_proposal"
        };

        const overrideReason =
            overrideReasons[error.code] || "agent_unknown_error";

        timeline.push({
            step: "proposed",
            timestamp: new Date().toISOString(),
            detail: `Agent failed (${overrideReason}): ${error.message}`
        });

        timeline.push({
            step: "policy_checked",
            timestamp: new Date().toISOString(),
            detail: "Agent failure caught; pipeline fell back to a safe escalation."
        });

        const finalDecision = {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            finalAction: "escalate",
            actionOverridden: true,
            overrideReason,
            timeline
        };

        timeline.push({
            step: "final_decision",
            timestamp: new Date().toISOString(),
            detail: "Final action: escalate (safe fallback after agent failure)."
        });

        return finalDecision;
    }

    const finalDecision = postCheck(
        failedPayment,
        failureCategory,
        agentProposal
    );

    timeline.push({
        step: "policy_checked",
        timestamp: new Date().toISOString(),
        detail: finalDecision.overridden
            ? `Policy overrode agent proposal: ${finalDecision.overrideReason}.`
            : "Policy layer approved the agent's proposal unchanged."
    });

    const result = {
        failureCategory,
        recoverable: agentProposal.recoverable,
        confidence: agentProposal.confidence,
        agentProposedAction: agentProposal.proposedAction,
        finalAction: finalDecision.finalAction,
        actionOverridden: finalDecision.overridden,
        overrideReason: finalDecision.overrideReason,
        timeline
    };

    timeline.push({
        step: "final_decision",
        timestamp: new Date().toISOString(),
        detail: `Final action: ${result.finalAction}.`
    });

    return result;
}

module.exports = recoveryPipeline;