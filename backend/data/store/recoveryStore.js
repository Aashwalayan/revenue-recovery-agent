/**
 * In-memory store for the recovery demo.
 *
 * No database is wired up yet, so this resets whenever the server
 * restarts.
 */

const failedPayments = new Map();
const decisions = new Map();
const executions = new Map();

const setFailedPayments = (payments) => {
    failedPayments.clear();

    // Group failed payments by Razorpay order.
    // Payments for the same order are treated as retry attempts.
    const paymentsByOrder = new Map();

    for (const payment of payments) {
        const orderId = payment.payment.razorpayOrderId;

        if (!orderId) {
            continue;
        }

        if (!paymentsByOrder.has(orderId)) {
            paymentsByOrder.set(orderId, []);
        }

        paymentsByOrder.get(orderId).push(payment);
    }

    // Sort each order's failures chronologically and build history.
    for (const orderPayments of paymentsByOrder.values()) {
        orderPayments.sort(
            (a, b) =>
                new Date(a.timestamps.createdAt) -
                new Date(b.timestamps.createdAt)
        );

        orderPayments.forEach((payment, index) => {
            const priorAttempts = orderPayments
                .slice(0, index)
                .map((priorPayment) => ({
                    razorpayPaymentId:
                        priorPayment.payment.razorpayPaymentId,
                    errorReason:
                        priorPayment.failure.errorReason,
                    attemptedAt:
                        priorPayment.timestamps.createdAt
                }));

            payment.attemptContext = {
                ...payment.attemptContext,
                attemptNumber: index + 1,
                firstFailureAt:
                    orderPayments[0].timestamps.createdAt,
                lastAttemptAt:
                    payment.timestamps.createdAt,
                priorAttempts
            };
        });
    }

    // Payments without an order ID remain first attempts.
    for (const payment of payments) {
        failedPayments.set(payment.internalId, payment);
    }

    // Keep decisions and executions as historical records even after a case
    // leaves the active failed-payment queue because it was recovered.
};

const getFailedPayments = () => {
    return Array.from(failedPayments.values());
};

const getFailedPaymentById = (id) => {
    return failedPayments.get(id) || null;
};

const saveDecision = (id, failedPayment, decision) => {
    const record = {
        failedPayment,
        decision,
        analyzedAt: new Date().toISOString()
    };

    decisions.set(id, record);

    return record;
};

const getDecision = (id) => {
    return decisions.get(id) || null;
};

const getAllDecisions = () => {
    return Array.from(decisions.values());
};

const saveExecution = (id, failedPayment, decision, execution) => {
    const record = {
        failedPayment,
        decision,
        execution,
        executedAt: new Date().toISOString()
    };

    executions.set(id, record);

    return record;
};

const getExecution = (id) => {
    return executions.get(id) || null;
};

const getAllExecutions = () => {
    return Array.from(executions.values());
};

const markPaymentLinkRecovered = (
    paymentLinkId,
    referenceId,
    payment
) => {
    for (const record of executions.values()) {
        const matchesPaymentLink =
            record.execution?.paymentLink?.id === paymentLinkId;

        const matchesReferenceId =
            record.failedPayment?.internalId === referenceId;

        if (matchesPaymentLink || matchesReferenceId) {
            if (record.recovery?.status === "recovered") {
                return {
                    ...record,
                    alreadyRecovered: true
                };
            }

            record.recovery = {
                status: "recovered",
                razorpayPaymentId: payment.razorpayPaymentId,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                recoveredAt: payment.paidAt
            };

            return {
                ...record,
                alreadyRecovered: false
            };
        }
    }

    return null;
};

const getUnreconciledPaymentLinkExecutions = () => {
    return Array.from(executions.values()).filter(
        (record) =>
            record.execution?.kind === "payment_link" &&
            record.execution?.status === "success" &&
            record.execution?.paymentLink?.id &&
            record.recovery?.status !== "recovered"
    );
};

const clear = () => {
    failedPayments.clear();
    decisions.clear();
    executions.clear();
};

module.exports = {
    setFailedPayments,
    getFailedPayments,
    getFailedPaymentById,
    saveDecision,
    getDecision,
    getAllDecisions,
    saveExecution,
    getExecution,
    getAllExecutions,
    markPaymentLinkRecovered,
    getUnreconciledPaymentLinkExecutions,
    clear
};