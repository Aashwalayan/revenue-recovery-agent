const createScenario = require("../generators/createScenarios");

const createFailingAgent = (code) => async () => {
    const error = new Error(`Simulated agent failure: ${code}`);

    if (code !== undefined) {
        error.code = code;
    }

    throw error;
};

const agentFailureScenarios = [
    {
        scenarioId: "syn_agent_network_error",
        description:
            "Pipeline safely escalates when the agent fails with a network error.",
        agent: createFailingAgent("AGENT_NETWORK_ERROR"),
        failedPayment: createScenario({
            scenarioId: "fp_agent_network_error",
            failure: {
                errorCode: "CARD_EXPIRED",
                errorSource: "bank",
                errorStep: "payment_authorization",
                errorReason: "card_expired",
                errorDescription: "The payment card has expired."
            }
        }).failedPayment,
        expectedOutcome: {
            recommendedAction: "escalate",
            actionOverridden: true,
            overrideReason: "agent_network_error"
        }
    },

    {
        scenarioId: "syn_agent_empty_response",
        description:
            "Pipeline safely escalates when the agent returns no proposal content.",
        agent: createFailingAgent("AGENT_EMPTY_RESPONSE"),
        failedPayment: createScenario({
            scenarioId: "fp_agent_empty_response",
            failure: {
                errorCode: "CARD_EXPIRED",
                errorSource: "bank",
                errorStep: "payment_authorization",
                errorReason: "card_expired",
                errorDescription: "The payment card has expired."
            }
        }).failedPayment,
        expectedOutcome: {
            recommendedAction: "escalate",
            actionOverridden: true,
            overrideReason: "agent_empty_response"
        }
    },

    {
        scenarioId: "syn_agent_invalid_json",
        description:
            "Pipeline safely escalates when the agent returns invalid JSON.",
        agent: createFailingAgent("AGENT_INVALID_JSON"),
        failedPayment: createScenario({
            scenarioId: "fp_agent_invalid_json",
            failure: {
                errorCode: "CARD_EXPIRED",
                errorSource: "bank",
                errorStep: "payment_authorization",
                errorReason: "card_expired",
                errorDescription: "The payment card has expired."
            }
        }).failedPayment,
        expectedOutcome: {
            recommendedAction: "escalate",
            actionOverridden: true,
            overrideReason: "agent_invalid_json"
        }
    },

    {
        scenarioId: "syn_agent_invalid_proposal",
        description:
            "Pipeline safely escalates when the agent proposal fails validation.",
        agent: createFailingAgent("AGENT_INVALID_PROPOSAL"),
        failedPayment: createScenario({
            scenarioId: "fp_agent_invalid_proposal",
            failure: {
                errorCode: "CARD_EXPIRED",
                errorSource: "bank",
                errorStep: "payment_authorization",
                errorReason: "card_expired",
                errorDescription: "The payment card has expired."
            }
        }).failedPayment,
        expectedOutcome: {
            recommendedAction: "escalate",
            actionOverridden: true,
            overrideReason: "agent_invalid_proposal"
        }
    },

    {
        scenarioId: "syn_agent_unknown_error",
        description:
            "Pipeline safely escalates when the agent throws an unknown error.",
        agent: createFailingAgent("SOMETHING_UNEXPECTED"),
        failedPayment: createScenario({
            scenarioId: "fp_agent_unknown_error",
            failure: {
                errorCode: "CARD_EXPIRED",
                errorSource: "bank",
                errorStep: "payment_authorization",
                errorReason: "card_expired",
                errorDescription: "The payment card has expired."
            }
        }).failedPayment,
        expectedOutcome: {
            recommendedAction: "escalate",
            actionOverridden: true,
            overrideReason: "agent_unknown_error"
        }
    }
];

module.exports = agentFailureScenarios;