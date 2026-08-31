import { useState } from "react";
import { useRecoveryData } from "./hooks/useRecoveryData";
import { SummaryBar } from "./components/SummaryBar";
import { ActionBar } from "./components/ActionBar";
import { InterventionsSpotlight } from "./components/InterventionsSpotlight";
import { PaymentsTable } from "./components/PaymentsTable";
import { AuditTrailModal } from "./components/AuditTrailModal";
import "./App.css";

function App() {
  const {
    cases,
    interventions,
    summary,
    isLoadingPayments,
    isAnalyzingAll,
    loadError,
    fetchPayments,
    analyzeOne,
    analyzeAll,
  } = useRecoveryData();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const fallbackAtRiskAmount = cases.reduce(
    (sum, c) => sum + c.failedPayment.payment.amount,
    0
  );
  const pendingCount = cases.filter((c) => c.status === "pending").length;
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
        isLoadingPayments={isLoadingPayments}
        isAnalyzingAll={isAnalyzingAll}
        caseCount={cases.length}
        pendingCount={pendingCount}
        loadError={loadError}
      />

      <InterventionsSpotlight
        interventions={interventions}
        onViewAudit={setSelectedCaseId}
      />

      <PaymentsTable
        cases={cases}
        onAnalyzeOne={analyzeOne}
        onViewAudit={setSelectedCaseId}
      />

      <AuditTrailModal
        recoveryCase={selectedCase}
        onClose={() => setSelectedCaseId(null)}
      />
    </div>
  );
}

export default App;