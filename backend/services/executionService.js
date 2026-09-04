const razorpay = require("../config/razorpay");

/**
 * Actions that resolve to "get the customer a way to actually pay" --
 * a real Razorpay Payment Link, since a merchant can't silently re-charge
 * a card without the customer's action for a one-off payment. Different
 * finalActions map to the same underlying mechanism but with different
 * framing in the link description, so the audit trail still shows what
 * the pipeline decided even though execution converges on one API call.
 */
const PAYMENT_LINK_ACTIONS = new Set([
    "retry_same_method",
    "retry_after_delay",
    "try_alternative_method",
    "ask_customer_to_update_payment_method",
    "send_payment_link"
]);

const actionDescriptions = {
    retry_same_method: "Complete your payment",
    retry_after_delay: "Complete your payment",
    try_alternative_method: "Complete your payment with a different method",
    ask_customer_to_update_payment_method: "Update your payment method to complete this payment",
    send_payment_link: "Complete your payment"
};

/**
 * Executes a single decided case. Does not check for prior execution --
 * that idempotency guard lives in the controller/store, since "has this
 * already been executed" is a storage concern, not an execution concern.
 */
async function executeDecision(failedPayment, decision) {
    const { finalAction } = decision;

    if (finalAction === "do_not_retry") {
        return {
            kind: "no_action",
            status: "success",
            detail: "Customer has opted out or the case was closed with no retry attempted.",
            executedAt: new Date().toISOString()
        };
    }

    if (finalAction === "escalate") {
        return executeEscalation(failedPayment, decision);
    }

    if (PAYMENT_LINK_ACTIONS.has(finalAction)) {
        return executePaymentLink(failedPayment, decision);
    }

    return {
        kind: "unsupported",
        status: "failed",
        detail: `No executor defined for finalAction "${finalAction}".`,
        executedAt: new Date().toISOString()
    };
}

async function executeEscalation(failedPayment, decision) {
    // No external call -- escalation means a human takes it from here.
    // This creates the record a support/ops queue would read from.
    return {
        kind: "escalation",
        status: "success",
        escalation: {
            internalId: failedPayment.internalId,
            amount: failedPayment.payment.amount,
            currency: failedPayment.payment.currency,
            failureCategory: decision.failureCategory,
            overrideReason: decision.overrideReason,
            queuedAt: new Date().toISOString()
        },
        detail: "Queued for manual follow-up by the ops team.",
        executedAt: new Date().toISOString()
    };
}

async function executePaymentLink(failedPayment, decision) {
    const { payment, customer, internalId } = failedPayment;

    const description =
        actionDescriptions[decision.finalAction] || "Complete your payment";

    const payload = {
        amount: payment.amount,
        currency: payment.currency || "INR",
        description: `${description} (${decision.failureCategory})`,
        reference_id: internalId,
        // Explicitly disabled: this stage generates the real link but does
        // not deliver it -- that's a deliberate scope boundary, not an
        // oversight. Razorpay would otherwise auto-notify given contact info.
        notify: {
            sms: false,
            email: false
        },
        reminder_enable: false,
        notes: {
            internalId,
            finalAction: decision.finalAction,
            overrideReason: decision.overrideReason || "none",
            actionOverridden: String(decision.actionOverridden)
        }
    };

    const customerPayload = buildCustomerPayload(customer);
    if (customerPayload) {
        payload.customer = customerPayload;
    }

    try {
        const link = await razorpay.paymentLink.create(payload);

        return {
            kind: "payment_link",
            status: "success",
            paymentLink: {
                id: link.id,
                shortUrl: link.short_url,
                amount: link.amount,
                currency: link.currency,
                status: link.status
            },
            detail: "Real Razorpay Payment Link created (not sent to the customer).",
            executedAt: new Date().toISOString()
        };
    } catch (error) {
        return {
            kind: "payment_link",
            status: "failed",
            error: error.error?.description || error.message || "Payment link creation failed",
            executedAt: new Date().toISOString()
        };
    }
}

/**
 * Razorpay validates customer.email/contact format strictly if present,
 * so omit fields (or the whole object) rather than send nulls/empties.
 */
function buildCustomerPayload(customer) {
    if (!customer) return null;

    const payload = {};
    if (customer.email) payload.email = customer.email;
    if (customer.contact) payload.contact = customer.contact;

    return Object.keys(payload).length > 0 ? payload : null;
}

module.exports = executeDecision;