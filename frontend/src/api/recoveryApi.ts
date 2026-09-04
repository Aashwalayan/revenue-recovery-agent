import type {
  BatchAnalyzeResponse,
  DecisionRecord,
  DecisionsResponse,
  ExecuteBatchResponse,
  ExecutionRecord,
  ExecutionsResponse,
  FailedPaymentsResponse,
  Summary,
} from "../types/recovery";

// Matches the existing convention in App.tsx (absolute base URL,
// no Vite proxy configured) rather than introducing a new pattern.
const API_BASE = "http://localhost:5000/api/recovery";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? (body as { error?: string }).error
        : null) || `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return body as T;
}

/** GET /api/recovery/failed-payments */
export async function fetchFailedPayments(): Promise<FailedPaymentsResponse> {
  const response = await fetch(`${API_BASE}/failed-payments`);
  return handleResponse<FailedPaymentsResponse>(response);
}

/** POST /api/recovery/analyze/:id */
export async function analyzePayment(
  internalId: string
): Promise<DecisionRecord> {
  const response = await fetch(
    `${API_BASE}/analyze/${encodeURIComponent(internalId)}`,
    { method: "POST" }
  );
  return handleResponse<DecisionRecord>(response);
}

/** POST /api/recovery/batch-analyze */
export async function batchAnalyze(
  ids?: string[]
): Promise<BatchAnalyzeResponse> {
  const response = await fetch(`${API_BASE}/batch-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  return handleResponse<BatchAnalyzeResponse>(response);
}

/** GET /api/recovery/decisions */
export async function fetchDecisions(): Promise<DecisionsResponse> {
  const response = await fetch(`${API_BASE}/decisions`);
  return handleResponse<DecisionsResponse>(response);
}

/** GET /api/recovery/summary */
export async function fetchSummary(): Promise<Summary> {
  const response = await fetch(`${API_BASE}/summary`);
  return handleResponse<Summary>(response);
}

/** POST /api/recovery/execute/:id */
export async function executeCase(internalId: string): Promise<ExecutionRecord> {
  const response = await fetch(
    `${API_BASE}/execute/${encodeURIComponent(internalId)}`,
    { method: "POST" }
  );
  return handleResponse<ExecutionRecord>(response);
}

/** POST /api/recovery/execute-batch */
export async function executeBatch(ids?: string[]): Promise<ExecuteBatchResponse> {
  const response = await fetch(`${API_BASE}/execute-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  return handleResponse<ExecuteBatchResponse>(response);
}

/** GET /api/recovery/executions */
export async function fetchExecutions(): Promise<ExecutionsResponse> {
  const response = await fetch(`${API_BASE}/executions`);
  return handleResponse<ExecutionsResponse>(response);
}

interface AnalyzeStreamHandlers {
  onBatchStart?: (total: number) => void;
  onCaseStart?: (data: {
    internalId: string;
    index: number;
    total: number;
    amount: number;
    currency: string;
  }) => void;
  onStep?: (data: {
    internalId: string;
    step: string;
    timestamp: string;
    detail: string;
  }) => void;
  onCaseComplete?: (record: DecisionRecord) => void;
  onCaseError?: (data: { internalId: string; error: string }) => void;
  onBatchComplete?: (count: number) => void;
}

/**
 * GET /api/recovery/analyze-stream (Server-Sent Events)
 *
 * Live, per-step streaming version of batchAnalyze — real pipeline
 * timing, not a client-side simulated playback. Returns a cleanup
 * function; call it to close the connection early if needed.
 */
export function streamAnalyze(
  handlers: AnalyzeStreamHandlers,
  ids?: string[]
): () => void {
  const url = new URL(`${API_BASE}/analyze-stream`);
  if (ids && ids.length > 0) {
    url.searchParams.set("ids", ids.join(","));
  }

  const source = new EventSource(url.toString());

  source.addEventListener("batch_start", (e) => {
    const { total } = JSON.parse((e as MessageEvent).data);
    handlers.onBatchStart?.(total);
  });
  source.addEventListener("case_start", (e) => {
    handlers.onCaseStart?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("step", (e) => {
    handlers.onStep?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("case_complete", (e) => {
    handlers.onCaseComplete?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("case_error", (e) => {
    handlers.onCaseError?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("batch_complete", (e) => {
    const { count } = JSON.parse((e as MessageEvent).data);
    handlers.onBatchComplete?.(count);
    source.close();
  });
  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

export interface RefreshRecoveryResponse {
  recoveredCount: number;
  recovered: Array<{
    internalId: string;
    paymentLinkId: string;
    razorpayPaymentId: string;
    amount: number;
  }>;
}

/** POST /api/recovery/refresh */
export async function refreshRecoveryStatus(): Promise<RefreshRecoveryResponse> {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: "POST",
  });

  return handleResponse<RefreshRecoveryResponse>(response);
}

interface ExecuteStreamHandlers {
  onBatchStart?: (total: number) => void;
  onCaseStart?: (data: {
    internalId: string;
    index: number;
    total: number;
    finalAction: string;
  }) => void;
  onCaseComplete?: (record: ExecutionRecord) => void;
  onCaseError?: (data: { internalId: string; error: string }) => void;
  onBatchComplete?: (count: number) => void;
}

/**
 * GET /api/recovery/execute-stream (Server-Sent Events)
 *
 * Live streaming version of executeBatch — one case_start/case_complete
 * pair per case as it's actually executed against Razorpay.
 */
export function streamExecute(
  handlers: ExecuteStreamHandlers,
  ids?: string[]
): () => void {
  const url = new URL(`${API_BASE}/execute-stream`);
  if (ids && ids.length > 0) {
    url.searchParams.set("ids", ids.join(","));
  }

  const source = new EventSource(url.toString());

  source.addEventListener("batch_start", (e) => {
    const { total } = JSON.parse((e as MessageEvent).data);
    handlers.onBatchStart?.(total);
  });
  source.addEventListener("case_start", (e) => {
    handlers.onCaseStart?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("case_complete", (e) => {
    handlers.onCaseComplete?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("case_error", (e) => {
    handlers.onCaseError?.(JSON.parse((e as MessageEvent).data));
  });
  source.addEventListener("batch_complete", (e) => {
    const { count } = JSON.parse((e as MessageEvent).data);
    handlers.onBatchComplete?.(count);
    source.close();
  });
  source.onerror = () => {
    source.close();
  };

  return () => source.close();
}

export { ApiError };