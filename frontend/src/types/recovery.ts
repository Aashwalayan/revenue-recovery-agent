/**
 * Types mirror the backend shapes exactly as verified against the live
 * endpoints in backend/controllers/recoveryController.js and
 * backend/services/recoveryPipeline.js. Nothing here is speculative.
 */

export type FailureCategory =
  | "card_declined_generic"
  | "insufficient_funds"
  | "expired_card"
  | "authentication_3ds_failure"
  | "bank_unavailable"
  | "upi_timeout"
  | "transaction_limit_exceeded"
  | "repeated_failure_same_reason"
  | "uncategorized";

export type RecoveryAction =
  | "retry_same_method"
  | "retry_after_delay"
  | "try_alternative_method"
  | "ask_customer_to_update_payment_method"
  | "send_payment_link"
  | "escalate"
  | "do_not_retry";

export type OverrideReason =
  | "customer_opted_out"
  | "retry_limit_reached"
  | "agent_network_error"
  | "agent_empty_response"
  | "agent_invalid_json"
  | "agent_invalid_proposal"
  | "agent_unknown_error"
  | null;

/** backend/normalization/normalizePayments.js output shape */
export interface FailedPayment {
  internalId: string;
  source: "synthetic" | "razorpay_test";
  payment: {
    razorpayPaymentId: string | null;
    razorpayOrderId: string | null;
    amount: number;
    currency: string;
    method: string;
    status: string;
  };
  failure: {
    errorCode: string | null;
    errorSource: string | null;
    errorStep: string | null;
    errorReason: string | null;
    errorDescription: string | null;
    normalizedCategory: FailureCategory | null;
  };
  customer: {
    customerId: string | null;
    email: string | null;
    contact: string | null;
    priorSuccessfulPayments: number;
    lifetimeValue: number;
    isSubscriber: boolean;
    optedOut?: boolean;
  };
  attemptContext: {
    attemptNumber: number;
    firstFailureAt: string;
    lastAttemptAt: string;
    priorAttempts: unknown[];
  };
  timestamps: {
    detectedAt: string;
    createdAt: string;
  };
}

export type TimelineStep =
  | "detected"
  | "classified"
  | "policy_checked"
  | "proposed"
  | "final_decision";

export interface TimelineEntry {
  step: TimelineStep;
  timestamp: string;
  detail: string;
}

export interface AlternativeAction {
  action: RecoveryAction;
  confidence: number | null;
  reasoning: string;
}

/** backend/services/recoveryPipeline.js return shape */
export interface Decision {
  failureCategory: FailureCategory;
  recoverable: boolean | null;
  confidence: number | null;
  agentProposedAction: RecoveryAction | null;
  alternativesConsidered: AlternativeAction[];
  finalAction: RecoveryAction;
  actionOverridden: boolean;
  overrideReason: OverrideReason;
  timeline: TimelineEntry[];
}

/** Stored/returned by GET /api/recovery/decisions and the analyze endpoints */
export interface DecisionRecord {
  failedPayment: FailedPayment;
  decision: Decision;
  analyzedAt: string;
}

/** GET /api/recovery/failed-payments response */
export interface FailedPaymentsResponse {
  count: number;
  failedPayments: FailedPayment[];
}

/** POST /api/recovery/batch-analyze response */
export interface BatchAnalyzeResponse {
  count: number;
  results: DecisionRecord[];
}

/** GET /api/recovery/decisions response */
export interface DecisionsResponse {
  count: number;
  decisions: DecisionRecord[];
}

/** backend/services/executionService.js return shape */
export type ExecutionKind = "payment_link" | "escalation" | "no_action" | "unsupported";
export type ExecutionStatus = "success" | "failed";

export interface Execution {
  kind: ExecutionKind;
  status: ExecutionStatus;
  paymentLink?: {
    id: string;
    shortUrl: string;
    amount: number;
    currency: string;
    status: string;
  };
  escalation?: {
    internalId: string;
    amount: number;
    currency: string;
    failureCategory: FailureCategory;
    overrideReason: OverrideReason;
    queuedAt: string;
  };
  detail?: string;
  error?: string;
  executedAt: string;
}

/** Stored/returned by GET /api/recovery/executions and the execute endpoints */
export interface ExecutionRecord {
  failedPayment: FailedPayment;
  decision: Decision;
  execution: Execution;
  executedAt: string;
  alreadyExecuted?: boolean;
}

/** POST /api/recovery/execute-batch response */
export interface ExecuteBatchResponse {
  count: number;
  results: ExecutionRecord[];
}

/** GET /api/recovery/executions response */
export interface ExecutionsResponse {
  count: number;
  executions: ExecutionRecord[];
}

/** GET /api/recovery/summary response */
export interface Summary {
  totalAtRiskAmount: number;
  analyzedCount: number;
  estimatedRecoverableCount: number;
  estimatedRecoverableAmount: number;
  estimatedRecoveryRate: number;
  interventionsCount: number;
  actionedCount: number;
  actionedAmount: number;
  executedCount: number;
  linksCreatedCount: number;
  escalationsQueuedCount: number;
  executionFailedCount: number;
}

/**
 * Frontend-only merged view used to drive the table: a failed payment
 * that may or may not have been analyzed/executed yet. Not a backend shape.
 */
export interface RecoveryCase {
  internalId: string;
  failedPayment: FailedPayment;
  decision: Decision | null;
  analyzedAt: string | null;
  status: "pending" | "analyzing" | "analyzed" | "error";
  error?: string;
  execution: Execution | null;
  executedAt: string | null;
  executionStatus: "not_executed" | "executing" | "executed" | "execution_error";
  executionError?: string;
}