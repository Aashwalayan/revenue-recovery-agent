const classify = require("../taxonomy/classify");
const preCheck = require("../rules/preCheck");
const llmRecoveryAgent = require("../agents/llmRecoveryAgent");
const { sanitizeAlternatives } = require("../agents/proposalSchema");
const postCheck = require("../rules/postCheck");

/**
 * @param {object} failedPayment
 * @param {object} [options]
 * @param {Function} [options.agent] - defaults to the real LLM agent
 * @param {Function} [options.onStep] - optional callback invoked with each
 *   timeline entry the instant it's produced, in addition to it being
 *   collected in the returned decision's `timeline` array. This is what
 *   lets a caller (e.g. an SSE route) stream the pipeline's reasoning
 *   live, case-by-case and step-by-step, instead of only seeing the full
 *   timeline after the whole case finishes. Purely additive -- existing
 *   callers that don't pass onStep are unaffected.
 */
async function recoveryPipeline(failedPayment, { agent = llmRecoveryAgent, onStep } = {}) {
    const timeline = [];

    const pushStep = (entry) => {
        timeline.push(entry);
        onStep?.(entry);
    };

    const detectedAt =
        failedPayment.timestamps?.detectedAt || new Date().toISOString();

    pushStep({
        step: "detected",
        timestamp: detectedAt,
        detail: "Failed payment ingested by the recovery pipeline."
    });

    const failureCategory = classify(failedPayment);

    failedPayment.failure.normalizedCategory = failureCategory;

    pushStep({
        step: "classified",
        timestamp: new Date().toISOString(),
        detail: `Classified as "${failureCategory}".`
    });

    const preCheckResult = preCheck(failedPayment, failureCategory);

    if (preCheckResult.blocked) {
        pushStep({
            step: "policy_checked",
            timestamp: new Date().toISOString(),
            detail: `Blocked before agent proposal: ${preCheckResult.reason}.`
        });

        const finalDecision = {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            alternativesConsidered: [],
            finalAction: preCheckResult.action,
            actionOverridden: true,
            overrideReason: preCheckResult.reason,
            timeline
        };

        pushStep({
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

        pushStep({
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

        pushStep({
            step: "proposed",
            timestamp: new Date().toISOString(),
            detail: `Agent failed (${overrideReason}): ${error.message}`
        });

        pushStep({
            step: "policy_checked",
            timestamp: new Date().toISOString(),
            detail: "Agent failure caught; pipeline fell back to a safe escalation."
        });

        const finalDecision = {
            failureCategory,
            recoverable: null,
            confidence: null,
            agentProposedAction: null,
            alternativesConsidered: [],
            finalAction: "escalate",
            actionOverridden: true,
            overrideReason,
            timeline
        };

        pushStep({
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

    pushStep({
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
        alternativesConsidered: sanitizeAlternatives(
            agentProposal.alternativesConsidered,
            agentProposal.proposedAction
        ),
        finalAction: finalDecision.finalAction,
        actionOverridden: finalDecision.overridden,
        overrideReason: finalDecision.overrideReason,
        timeline
    };

    pushStep({
        step: "final_decision",
        timestamp: new Date().toISOString(),
        detail: `Final action: ${result.finalAction}.`
    });

    return result;
}

module.exports = recoveryPipeline;