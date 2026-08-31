import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  analyzePayment,
  batchAnalyze,
  fetchDecisions,
  fetchFailedPayments,
  fetchSummary,
} from "../api/recoveryApi";
import type { DecisionRecord, RecoveryCase, Summary } from "../types/recovery";

function toPendingCase(failedPayment: RecoveryCase["failedPayment"]): RecoveryCase {
  return {
    internalId: failedPayment.internalId,
    failedPayment,
    decision: null,
    analyzedAt: null,
    status: "pending",
  };
}

function toAnalyzedCase(record: DecisionRecord): RecoveryCase {
  return {
    internalId: record.failedPayment.internalId,
    failedPayment: record.failedPayment,
    decision: record.decision,
    analyzedAt: record.analyzedAt,
    status: "analyzed",
  };
}

export function useRecoveryData() {
  const [casesById, setCasesById] = useState<Map<string, RecoveryCase>>(
    new Map()
  );
  const [summary, setSummary] = useState<Summary | null>(null);

  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
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

  // On mount, pick up any decisions the backend already has (e.g. from an
  // earlier analyze/batch-analyze call before a page reload) so the UI
  // reflects the true current server state, not just this session's clicks.
  useEffect(() => {
    fetchDecisions()
      .then(({ decisions }) => {
        if (decisions.length === 0) return;

        setCasesById((prev) => {
          const next = new Map(prev);
          for (const record of decisions) {
            next.set(record.failedPayment.internalId, toAnalyzedCase(record));
          }
          return next;
        });

        refreshSummary();
      })
      .catch((err) => {
        console.error("Failed to load existing decisions:", err);
      });
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
    loadError,
    fetchPayments,
    analyzeOne,
    analyzeAll,
    refreshSummary,
  };
}