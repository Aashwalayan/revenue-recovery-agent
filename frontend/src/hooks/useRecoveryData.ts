import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  analyzePayment,
  batchAnalyze,
  executeBatch,
  executeCase,
  fetchDecisions,
  fetchExecutions,
  fetchFailedPayments,
  fetchSummary,
} from "../api/recoveryApi";
import type {
  DecisionRecord,
  ExecutionRecord,
  RecoveryCase,
  Summary,
} from "../types/recovery";

function toPendingCase(failedPayment: RecoveryCase["failedPayment"]): RecoveryCase {
  return {
    internalId: failedPayment.internalId,
    failedPayment,
    decision: null,
    analyzedAt: null,
    status: "pending",
    execution: null,
    executedAt: null,
    executionStatus: "not_executed",
  };
}

function toAnalyzedCase(record: DecisionRecord): RecoveryCase {
  return {
    internalId: record.failedPayment.internalId,
    failedPayment: record.failedPayment,
    decision: record.decision,
    analyzedAt: record.analyzedAt,
    status: "analyzed",
    execution: null,
    executedAt: null,
    executionStatus: "not_executed",
  };
}

function applyExecution(
  base: RecoveryCase,
  record: ExecutionRecord
): RecoveryCase {
  return {
    ...base,
    execution: record.execution,
    executedAt: record.executedAt,
    executionStatus: "executed",
  };
}

export function useRecoveryData() {
  const [casesById, setCasesById] = useState<Map<string, RecoveryCase>>(
    new Map()
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshSummary = useCallback(async () => {
    try {
      const result = await fetchSummary();
      setSummary(result);
    } catch (err) {
      // Summary failing to refresh shouldn't block the rest of the UI;
      // the existing summary just goes stale until the next success.
      console.error("Failed to refresh summary:", err);
    }
  }, []);

  // On mount, pick up any decisions AND executions the backend already
  // has (e.g. from earlier calls before a page reload), in that order,
  // so the UI reflects true current server state rather than just this
  // session's clicks. Sequenced (not two independent effects) so
  // executions merge onto an already-populated case list.
  useEffect(() => {
    (async () => {
      try {
        const { decisions } = await fetchDecisions();

        if (decisions.length > 0) {
          setCasesById((prev) => {
            const next = new Map(prev);
            for (const record of decisions) {
              next.set(record.failedPayment.internalId, toAnalyzedCase(record));
            }
            return next;
          });
        }

        const { executions } = await fetchExecutions();

        if (executions.length > 0) {
          setCasesById((prev) => {
            const next = new Map(prev);
            for (const record of executions) {
              const id = record.failedPayment.internalId;
              const base: RecoveryCase =
                next.get(id) ??
                {
                  internalId: id,
                  failedPayment: record.failedPayment,
                  decision: record.decision,
                  analyzedAt: null,
                  status: "analyzed",
                  execution: null,
                  executedAt: null,
                  executionStatus: "not_executed",
                };
              next.set(id, applyExecution(base, record));
            }
            return next;
          });
        }

        if (decisions.length > 0 || executions.length > 0) {
          await refreshSummary();
        }
      } catch (err) {
        console.error("Failed to load existing decisions/executions:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    setLoadError(null);

    try {
      const { failedPayments } = await fetchFailedPayments();

      setCasesById((prev) => {
        const next = new Map(prev);

        for (const failedPayment of failedPayments) {
          const existing = next.get(failedPayment.internalId);
          // Don't clobber a case that's already been analyzed by an
          // earlier fetch — only add genuinely new pending cases.
          if (!existing) {
            next.set(failedPayment.internalId, toPendingCase(failedPayment));
          }
        }

        return next;
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the backend to fetch failed payments.";
      setLoadError(message);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  const analyzeOne = useCallback(
    async (internalId: string) => {
      setCasesById((prev) => {
        const next = new Map(prev);
        const existing = next.get(internalId);
        if (existing) {
          next.set(internalId, { ...existing, status: "analyzing" });
        }
        return next;
      });

      try {
        const record = await analyzePayment(internalId);

        setCasesById((prev) => {
          const next = new Map(prev);
          next.set(internalId, toAnalyzedCase(record));
          return next;
        });

        await refreshSummary();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not reach the backend to analyze this case.";

        setCasesById((prev) => {
          const next = new Map(prev);
          const existing = next.get(internalId);
          if (existing) {
            next.set(internalId, {
              ...existing,
              status: "error",
              error: message,
            });
          }
          return next;
        });
      }
    },
    [refreshSummary]
  );

  const analyzeAll = useCallback(async () => {
    setIsAnalyzingAll(true);
    setLoadError(null);

    setCasesById((prev) => {
      const next = new Map(prev);
      for (const [id, c] of next) {
        if (c.status === "pending") {
          next.set(id, { ...c, status: "analyzing" });
        }
      }
      return next;
    });

    try {
      const { results } = await batchAnalyze();

      setCasesById((prev) => {
        const next = new Map(prev);
        for (const record of results) {
          next.set(record.failedPayment.internalId, toAnalyzedCase(record));
        }
        return next;
      });

      await refreshSummary();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the backend to run batch analysis.";
      setLoadError(message);
    } finally {
      setIsAnalyzingAll(false);
    }
  }, [refreshSummary]);

  const executeOne = useCallback(
    async (internalId: string) => {
      setCasesById((prev) => {
        const next = new Map(prev);
        const existing = next.get(internalId);
        if (existing) {
          next.set(internalId, { ...existing, executionStatus: "executing" });
        }
        return next;
      });

      try {
        const record = await executeCase(internalId);

        setCasesById((prev) => {
          const next = new Map(prev);
          const existing = next.get(internalId);
          if (existing) {
            next.set(internalId, applyExecution(existing, record));
          }
          return next;
        });

        await refreshSummary();
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not reach the backend to execute this case.";

        setCasesById((prev) => {
          const next = new Map(prev);
          const existing = next.get(internalId);
          if (existing) {
            next.set(internalId, {
              ...existing,
              executionStatus: "execution_error",
              executionError: message,
            });
          }
          return next;
        });
      }
    },
    [refreshSummary]
  );

  const executeAll = useCallback(async () => {
    setIsExecutingAll(true);
    setLoadError(null);

    setCasesById((prev) => {
      const next = new Map(prev);
      for (const [id, c] of next) {
        if (c.status === "analyzed" && c.executionStatus === "not_executed") {
          next.set(id, { ...c, executionStatus: "executing" });
        }
      }
      return next;
    });

    try {
      const { results } = await executeBatch();

      setCasesById((prev) => {
        const next = new Map(prev);
        for (const record of results) {
          const id = record.failedPayment.internalId;
          const existing = next.get(id);
          if (existing) {
            next.set(id, applyExecution(existing, record));
          }
        }
        return next;
      });

      await refreshSummary();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the backend to run batch execution.";
      setLoadError(message);
    } finally {
      setIsExecutingAll(false);
    }
  }, [refreshSummary]);

  const cases = useMemo(
    () =>
      Array.from(casesById.values()).sort(
        (a, b) => b.failedPayment.payment.amount - a.failedPayment.payment.amount
      ),
    [casesById]
  );

  const interventions = useMemo(
    () => cases.filter((c) => c.decision?.actionOverridden === true),
    [cases]
  );

  return {
    cases,
    interventions,
    summary,
    isLoadingPayments,
    isAnalyzingAll,
    isExecutingAll,
    loadError,
    fetchPayments,
    analyzeOne,
    analyzeAll,
    executeOne,
    executeAll,
    refreshSummary,
  };
}