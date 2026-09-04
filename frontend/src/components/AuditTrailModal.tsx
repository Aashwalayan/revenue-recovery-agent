import type { RecoveryCase } from "../types/recovery";
import { formatInr, formatTimelineStep, formatTimestamp } from "../utils/format";
import { ActionTransition } from "./ActionTransition";
import { OverrideBadge } from "./OverrideBadge";
import { ExecutionResult } from "./ExecutionResult";
import { AlternativesConsidered } from "./AlternativesConsidered";
import "./AuditTrailModal.css";

interface AuditTrailModalProps {
  recoveryCase: RecoveryCase | null;
  onClose: () => void;
  onExecute: (internalId: string) => void;
}

export function AuditTrailModal({ recoveryCase, onClose, onExecute }: AuditTrailModalProps) {
  if (!recoveryCase || !recoveryCase.decision) {
    return null;
  }

  const { failedPayment, decision, internalId, execution, executionStatus, executionError } =
    recoveryCase;
  const overridden = decision.actionOverridden;

  return (
    <div className="audit-modal__backdrop" onClick={onClose}>
      <div
        className="audit-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
      >
        <div className="audit-modal__header">
          <div>
            <span className="audit-modal__eyebrow">{internalId}</span>
            <h2 className="audit-modal__title" id="audit-modal-title">
              {formatInr(failedPayment.payment.amount)} · {decision.failureCategory}
            </h2>
          </div>
          <button className="audit-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="audit-modal__decision">
          <ActionTransition
            proposedAction={decision.agentProposedAction}
            finalAction={decision.finalAction}
            overridden={overridden}
          />
          {overridden && <OverrideBadge reason={decision.overrideReason} />}
        </div>

        <AlternativesConsidered alternatives={decision.alternativesConsidered} />

        <ol className="audit-timeline">
          {decision.timeline.map((entry, i) => {
            const isOverridePoint =
              overridden &&
              (entry.step === "policy_checked" || entry.step === "final_decision");

            return (
              <li
                key={i}
                className={`audit-timeline__item${
                  isOverridePoint ? " audit-timeline__item--override" : ""
                }`}
              >
                <div className="audit-timeline__marker" aria-hidden="true" />
                <div className="audit-timeline__content">
                  <div className="audit-timeline__row">
                    <span className="audit-timeline__step">
                      {formatTimelineStep(entry.step)}
                    </span>
                    <span className="audit-timeline__timestamp">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="audit-timeline__detail">{entry.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="audit-modal__execution">
          <h3 className="audit-modal__execution-title">Execution</h3>
          {executionStatus === "executed" && execution && (
            <ExecutionResult execution={execution} />
          )}
          {executionStatus === "executing" && (
            <span className="payments-row__waiting">Executing…</span>
          )}
          {(executionStatus === "not_executed" || executionStatus === "execution_error") && (
            <div className="audit-modal__execute-row">
              {executionStatus === "execution_error" && (
                <span className="execution-result execution-result--failed">
                  {executionError}
                </span>
              )}
              <button
                className="payments-row__btn payments-row__btn--accent"
                onClick={() => onExecute(internalId)}
              >
                {executionStatus === "execution_error" ? "Retry execute" : "Execute now"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}