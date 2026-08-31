import "./ActionBar.css";

interface ActionBarProps {
  onFetchPayments: () => void;
  onAnalyzeAll: () => void;
  isLoadingPayments: boolean;
  isAnalyzingAll: boolean;
  caseCount: number;
  pendingCount: number;
  loadError: string | null;
}

export function ActionBar({
  onFetchPayments,
  onAnalyzeAll,
  isLoadingPayments,
  isAnalyzingAll,
  caseCount,
  pendingCount,
  loadError,
}: ActionBarProps) {
  return (
    <div className="action-bar">
      <div className="action-bar__buttons">
        <button
          className="action-bar__btn action-bar__btn--primary"
          onClick={onFetchPayments}
          disabled={isLoadingPayments}
        >
          {isLoadingPayments ? "Fetching…" : "Fetch failed payments"}
        </button>
        <button
          className="action-bar__btn action-bar__btn--accent"
          onClick={onAnalyzeAll}
          disabled={isAnalyzingAll || pendingCount === 0}
        >
          {isAnalyzingAll
            ? "Analyzing…"
            : `Analyze all${pendingCount > 0 ? ` (${pendingCount} pending)` : ""}`}
        </button>
      </div>
      <div className="action-bar__status">
        {caseCount > 0 && (
          <span className="action-bar__count">
            {caseCount} case{caseCount === 1 ? "" : "s"} loaded
          </span>
        )}
        {loadError && <span className="action-bar__error">{loadError}</span>}
      </div>
    </div>
  );
}