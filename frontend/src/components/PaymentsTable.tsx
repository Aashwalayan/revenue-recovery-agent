import type { RecoveryCase } from "../types/recovery";
import { formatInr } from "../utils/format";
import { ActionTransition } from "./ActionTransition";
import { OverrideBadge } from "./OverrideBadge";
import "./PaymentsTable.css";

interface PaymentsTableProps {
  cases: RecoveryCase[];
  onAnalyzeOne: (internalId: string) => void;
  onViewAudit: (internalId: string) => void;
}

export function PaymentsTable({ cases, onAnalyzeOne, onViewAudit }: PaymentsTableProps) {
  if (cases.length === 0) {
    return (
      <div className="payments-table__empty">
        <p className="payments-table__empty-title">No failed payments loaded yet</p>
        <p className="payments-table__empty-body">
          Fetch failed payments to pull the current at-risk batch from Razorpay Test Mode.
        </p>
      </div>
    );
  }

  return (
    <div className="payments-table">
      <table>
        <thead>
          <tr>
            <th>Payment</th>
            <th>Failure category</th>
            <th>AI proposed → Final decision</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <PaymentRow
              key={c.internalId}
              recoveryCase={c}
              onAnalyzeOne={onAnalyzeOne}
              onViewAudit={onViewAudit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaymentRowProps {
  recoveryCase: RecoveryCase;
  onAnalyzeOne: (internalId: string) => void;
  onViewAudit: (internalId: string) => void;
}

function PaymentRow({ recoveryCase, onAnalyzeOne, onViewAudit }: PaymentRowProps) {
  const { failedPayment, decision, status, internalId, error } = recoveryCase;
  const overridden = decision?.actionOverridden === true;

  return (
    <tr
      className={`payments-row${overridden ? " payments-row--overridden" : ""}`}
      onClick={() => status === "analyzed" && onViewAudit(internalId)}
      role={status === "analyzed" ? "button" : undefined}
    >
      <td>
        <div className="payments-row__amount">
          {formatInr(failedPayment.payment.amount)}
        </div>
        <div className="payments-row__method">
          {failedPayment.payment.method} · {internalId}
        </div>
      </td>
      <td>
        <span className="payments-row__category">
          {decision?.failureCategory ?? failedPayment.failure.normalizedCategory ?? "—"}
        </span>
      </td>
      <td>
        {decision ? (
          <ActionTransition
            proposedAction={decision.agentProposedAction}
            finalAction={decision.finalAction}
            overridden={overridden}
          />
        ) : (
          <span className="payments-row__waiting">Not yet analyzed</span>
        )}
      </td>
      <td>
        {status === "pending" && <span className="status-pill status-pill--pending">Pending</span>}
        {status === "analyzing" && <span className="status-pill status-pill--analyzing">Analyzing…</span>}
        {status === "error" && (
          <span className="status-pill status-pill--error" title={error}>
            Failed
          </span>
        )}
        {status === "analyzed" && overridden && (
          <OverrideBadge reason={decision?.overrideReason ?? null} />
        )}
        {status === "analyzed" && !overridden && (
          <span className="status-pill status-pill--ok">Policy approved</span>
        )}
      </td>
      <td className="payments-row__actions" onClick={(e) => e.stopPropagation()}>
        {status === "pending" && (
          <button className="payments-row__btn" onClick={() => onAnalyzeOne(internalId)}>
            Analyze
          </button>
        )}
        {status === "error" && (
          <button className="payments-row__btn" onClick={() => onAnalyzeOne(internalId)}>
            Retry
          </button>
        )}
        {status === "analyzed" && (
          <button className="payments-row__btn payments-row__btn--ghost" onClick={() => onViewAudit(internalId)}>
            View audit trail
          </button>
        )}
      </td>
    </tr>
  );
}