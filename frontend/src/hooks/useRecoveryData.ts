import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  analyzePayment,
  executeCase,
  fetchDecisions,
  fetchExecutions,
  fetchFailedPayments,
  fetchSummary,
  streamAnalyze,
  streamExecute,
  refreshRecoveryStatus,
} from "../api/recoveryApi";
import type {
  ActivityLogEntry,
  ActivityTone,
  DecisionRecord,
  ExecutionRecord,
  RecoveryCase,
  Summary,
} from "../types/recovery";
import { formatInr } from "../utils/format";

const MAX_LOG_ENTRIES = 300;
let logIdCounter = 0;
const nextLogId = () => `log_${++logIdCounter}`;

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

/** Derives a log tone from a pipeline timeline step's own detail text. */
function toneForStepDetail(detail: string): ActivityTone {
  if (detail.includes("overrode") || detail.includes("Blocked")) return "override";
  if (detail.includes("Agent failed")) return "error";
  return "info";
}

export function useRecoveryData() {
  const [casesById, setCasesById] = useState<Map<string, RecoveryCase>>(
    new Map()
  );
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const closeStreamRef = useRef<(() => void) | null>(null);

  const logEvent = useCallback(
    (message: string, tone: ActivityTone, internalId?: string) => {
      setActivityLog((prev) => {
        const next = [
          ...prev,
          {
            id: nextLogId(),
            timestamp: new Date().toISOString(),
            internalId,
            message,
            tone,
          },
        ];
        return next.length > MAX_LOG_ENTRIES
          ? next.slice(next.length - MAX_LOG_ENTRIES)
          : next;
      });
    },
    []
  );

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

  // Close any open stream on unmount.
  useEffect(() => {
    return () => closeStreamRef.current?.();
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    setLoadError(null);
    logEvent("Fetching failed payments from Razorpay Test Mode...", "info");

    try {
      const { failedPayments, recoveredCount = 0 } =
        await fetchFailedPayments();

      const activeIds = new Set(
        failedPayments.map((payment) => payment.internalId)
      );

      setCasesById((prev) => {
        const next = new Map<string, RecoveryCase>();

        for (const failedPayment of failedPayments) {
          const existing = prev.get(failedPayment.internalId);

          next.set(
            failedPayment.internalId,
            existing ?? toPendingCase(failedPayment)
          );
        }

        return next;
      });

      if (recoveredCount > 0) {
        logEvent(
          `Detected ${recoveredCount} newly recovered payment${recoveredCount === 1 ? "" : "s"
          }.`,
          "success"
        );
      }

      logEvent(
        `Found ${activeIds.size} active failed payment${activeIds.size === 1 ? "" : "s"
        }.`,
        "success"
      );

      await refreshSummary();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not reach the backend to fetch failed payments.";

      setLoadError(message);
      logEvent(`Failed to fetch failed payments: ${message}`, "error");
    } finally {
      setIsLoadingPayments(false);
    }
  }, [logEvent, refreshSummary]);


  const refreshRecoveries = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);

    logEvent(
      "Checking executed payment links for successful recoveries...",
      "info"
    );

    try {
      const result = await refreshRecoveryStatus();

      if (result.recoveredCount === 0) {
        logEvent(
          "Refresh complete — no new recoveries detected.",
          "info"
        );
      } else {
        setCasesById((prev) => {
          const next = new Map(prev);

          for (const recovery of result.recovered) {
            next.delete(recovery.internalId);
          }

          return next;
        });

        logEvent(
          `Recovery detected — ${result.recoveredCount} case${result.recoveredCount === 1 ? "" : "s"
          } closed successfully.`,
          "success"
        );
      }

      await refreshSummary();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not refresh recovery status.";

      setLoadError(message);
      logEvent(
        `Recovery refresh failed: ${message}`,
        "error"
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [logEvent, refreshSummary]);

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

        logEvent(
          `Final: ${record.decision.finalAction}${record.decision.actionOverridden ? " (policy overrode agent)" : ""
          }`,
          record.decision.actionOverridden ? "override" : "success",
          internalId
        );

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

        logEvent(`Analysis failed: ${message}`, "error", internalId);
      }
    },
    [refreshSummary, logEvent]
  );

  const analyzeAll = useCallback(() => {
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

    const close = streamAnalyze({
      onBatchStart: (total) => {
        logEvent(`Starting analysis of ${total} case${total === 1 ? "" : "s"}...`, "info");
      },
      onCaseStart: (data) => {
        logEvent(
          `Case ${data.index + 1}/${data.total} — ${formatInr(data.amount)} — analyzing...`,
          "info",
          data.internalId
        );
      },
      onStep: (data) => {
        logEvent(data.detail, toneForStepDetail(data.detail), data.internalId);
      },
      onCaseComplete: (record) => {
        setCasesById((prev) => {
          const next = new Map(prev);
          next.set(record.failedPayment.internalId, toAnalyzedCase(record));
          return next;
        });
      },
      onCaseError: (data) => {
        setCasesById((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.internalId);
          if (existing) {
            next.set(data.internalId, { ...existing, status: "error", error: data.error });
          }
          return next;
        });
        logEvent(`Analysis failed: ${data.error}`, "error", data.internalId);
      },
      onBatchComplete: async (count) => {
        logEvent(`Analysis complete — ${count} case${count === 1 ? "" : "s"} processed.`, "success");
        setIsAnalyzingAll(false);
        closeStreamRef.current = null;
        await refreshSummary();
      },
    });

    closeStreamRef.current = close;
  }, [logEvent, refreshSummary]);

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

        logEvent(executionLogMessage(record), "success", internalId);

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

        logEvent(`Execution failed: ${message}`, "error", internalId);
      }
    },
    [refreshSummary, logEvent]
  );

  const executeAll = useCallback(() => {
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

    const close = streamExecute({
      onBatchStart: (total) => {
        logEvent(`Executing ${total} case${total === 1 ? "" : "s"}...`, "info");
      },
      onCaseStart: (data) => {
        logEvent(`Executing decision: ${data.finalAction}...`, "info", data.internalId);
      },
      onCaseComplete: (record) => {
        setCasesById((prev) => {
          const next = new Map(prev);
          const id = record.failedPayment.internalId;
          const existing = next.get(id);
          if (existing) {
            next.set(id, applyExecution(existing, record));
          }
          return next;
        });
        logEvent(
          record.alreadyExecuted
            ? `Already executed — skipping.`
            : executionLogMessage(record),
          record.execution.status === "failed" ? "error" : "success",
          record.failedPayment.internalId
        );
      },
      onCaseError: (data) => {
        setCasesById((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.internalId);
          if (existing) {
            next.set(data.internalId, {
              ...existing,
              executionStatus: "execution_error",
              executionError: data.error,
            });
          }
          return next;
        });
        logEvent(`Execution failed: ${data.error}`, "error", data.internalId);
      },
      onBatchComplete: async (count) => {
        logEvent(`Execution complete — ${count} case${count === 1 ? "" : "s"} processed.`, "success");
        setIsExecutingAll(false);
        closeStreamRef.current = null;
        await refreshSummary();
      },
    });

    closeStreamRef.current = close;
  }, [logEvent, refreshSummary]);

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
    activityLog,
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
    refreshRecoveries,
    isRefreshing,
  };
}

function executionLogMessage(record: ExecutionRecord): string {
  const { execution } = record;

  if (execution.status === "failed") {
    return `Execution failed: ${execution.error ?? "unknown error"}`;
  }
  if (execution.kind === "payment_link" && execution.paymentLink) {
    return `Real payment link created: ${execution.paymentLink.shortUrl}`;
  }
  if (execution.kind === "escalation") {
    return `Escalated to ops queue.`;
  }
  if (execution.kind === "no_action") {
    return `No action needed.`;
  }
  return execution.detail ?? "Execution complete.";
}