require("dotenv").config();

const { validateProposal } = require("./proposalSchema");

const llmRecoveryAgent = async (failedPayment, failureCategory) => {
    const prompt = `
You are a revenue recovery proposal agent.

Your job is to analyze a failed payment and propose the best recovery
action, while also naming other actions you considered and ruled out.

You do NOT execute payments.
You do NOT override customer consent or system policy.
You only return a proposal.

Failure category:
${failureCategory}

Failed payment:
${JSON.stringify(failedPayment, null, 2)}

Return ONLY valid JSON in this exact format:

{
    "failureCategory": "string",
    "recoverable": true,
    "confidence": 0,
    "proposedAction": "string",
    "reasoning": "string",
    "alternativesConsidered": [
        { "action": "string", "confidence": 0, "reasoning": "string" }
    ]
}

alternativesConsidered should list 1-3 other plausible actions you
weighed and did not choose, each with why it was a weaker fit than
proposedAction. Omit proposedAction itself from this list. If truly
only one action is plausible, return an empty array -- do not pad it
with implausible options just to fill it.

Allowed proposedAction / alternative action values:

- retry_same_method
- retry_after_delay
- try_alternative_method
- ask_customer_to_update_payment_method
- send_payment_link
- escalate
- do_not_retry
`;

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: "qwen/qwen3.6-27b",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0,
                max_tokens: 500,
                reasoning: {
                    effort: "none"
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            `OpenRouter request failed: ${JSON.stringify(data)}`
        );
        error.code = "AGENT_NETWORK_ERROR";
        throw error;
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        const error = new Error("LLM returned no proposal content.");
        error.code = "AGENT_EMPTY_RESPONSE";
        throw error;
    }

    let proposal;

    try {
        proposal = JSON.parse(content);
    } catch {
        const error = new Error(
            `LLM returned invalid JSON: ${content}`
        );
        error.code = "AGENT_INVALID_JSON";
        throw error;
    }

    const validation = validateProposal(proposal);

    if (!validation.valid) {
        const error = new Error(
            `Invalid LLM proposal: ${validation.errors.join(", ")}`
        );
        error.code = "AGENT_INVALID_PROPOSAL";
        throw error;
    }

    return proposal;
};

module.exports = llmRecoveryAgent;