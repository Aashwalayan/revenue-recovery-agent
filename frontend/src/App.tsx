import { useState } from "react";
import { useRecoveryData } from "./hooks/useRecoveryData";
import { SummaryBar } from "./components/SummaryBar";
import { ActionBar } from "./components/ActionBar";
import { ActivityFeed } from "./components/ActivityFeed";
import { InterventionsSpotlight } from "./components/InterventionsSpotlight";
import { PaymentsTable } from "./components/PaymentsTable";
import { AuditTrailModal } from "./components/AuditTrailModal";
import "./App.css";

function App() {
  const {
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
  } = useRecoveryData();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fallbackAtRiskAmount = cases.reduce(
    (sum, c) => sum + c.failedPayment.payment.amount,
    0
  );
  const pendingCount = cases.filter((c) => c.status === "pending").length;
  const executableCount = cases.filter(
    (c) => c.status === "analyzed" && c.executionStatus === "not_executed"
  ).length;
  const selectedCase = cases.find((c) => c.internalId === selectedCaseId) ?? null;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__eyebrow">Razorpay AI Buildathon — Revenue Recovery</span>
        <h1 className="dashboard__title">Recovery Console</h1>
      </header>

      <SummaryBar summary={summary} fallbackAtRiskAmount={fallbackAtRiskAmount} />

      <ActionBar
        onFetchPayments={fetchPayments}
        onAnalyzeAll={analyzeAll}
        onExecuteAll={executeAll}
        isLoadingPayments={isLoadingPayments}
        isAnalyzingAll={isAnalyzingAll}
        isExecutingAll={isExecutingAll}
        caseCount={cases.length}
        pendingCount={pendingCount}
        executableCount={executableCount}
        loadError={loadError}
      />

      <ActivityFeed
        entries={activityLog}
        isLive={isLoadingPayments || isAnalyzingAll || isExecutingAll}
      />

      <InterventionsSpotlight
        interventions={interventions}
        onViewAudit={setSelectedCaseId}
      />

      <PaymentsTable
        cases={cases}
        onAnalyzeOne={analyzeOne}
        onExecuteOne={executeOne}
        onViewAudit={setSelectedCaseId}
      />

      <AuditTrailModal
        recoveryCase={selectedCase}
        onClose={() => setSelectedCaseId(null)}
        onExecute={executeOne}
      />
    </div>
  );
}

export default App;