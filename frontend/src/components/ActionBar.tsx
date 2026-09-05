import "./ActionBar.css";

interface ActionBarProps {
  onFetchPayments: () => void;
  onAnalyzeAll: () => void;
  onExecuteAll: () => void;
  onRefreshRecoveries: () => void;
  isLoadingPayments: boolean;
  isAnalyzingAll: boolean;
  isExecutingAll: boolean;
  isRefreshing: boolean;
  caseCount: number;
  pendingCount: number;
  executableCount: number;
  awaitingConfirmationCount: number;
  loadError: string | null;
}

export function ActionBar({
  onFetchPayments,
  onAnalyzeAll,
  onExecuteAll,
  onRefreshRecoveries,
  isLoadingPayments,
  isAnalyzingAll,
  isExecutingAll,
  isRefreshing,
  caseCount,
  pendingCount,
  executableCount,
  awaitingConfirmationCount,
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
        <button
          className="action-bar__btn action-bar__btn--execute"
          onClick={onExecuteAll}
          disabled={isExecutingAll || executableCount === 0}
          title="Creates real Razorpay Payment Links for every analyzed, un-executed case"
        >
          {isExecutingAll
            ? "Executing…"
            : `Execute all${executableCount > 0 ? ` (${executableCount} ready)` : ""}`}
        </button>
        <button
          className="action-bar__btn action-bar__btn--refresh"
          onClick={onRefreshRecoveries}
          disabled={isRefreshing || awaitingConfirmationCount === 0}
          title="Checks Razorpay for real payment confirmations on links you've sent — use this if you're not running a live webhook listener"
        >
          {isRefreshing
            ? "Checking…"
            : `Check for payments${awaitingConfirmationCount > 0 ? ` (${awaitingConfirmationCount} pending)` : ""}`}
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