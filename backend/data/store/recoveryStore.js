/**
 * In-memory store for the recovery demo.
 *
 * No database is wired up yet, so this resets whenever the server
 * restarts. Keyed by failedPayment.internalId (e.g. "fp_pay_ABC123").
 *
 * failedPayments: Map<internalId, failedPayment>
 * decisions:      Map<internalId, { failedPayment, decision, analyzedAt }>
 */

const failedPayments = new Map();
const decisions = new Map();

const setFailedPayments = (payments) => {
    failedPayments.clear();

    for (const payment of payments) {
        failedPayments.set(payment.internalId, payment);
    }

    for (const [id] of decisions) {
        if (!failedPayments.has(id)) {
            decisions.delete(id);
        }
    }
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

const clear = () => {
    failedPayments.clear();
    decisions.clear();
};

module.exports = {
    setFailedPayments,
    getFailedPayments,
    getFailedPaymentById,
    saveDecision,
    getDecision,
    getAllDecisions,
    clear
};