import type { RecoveryCase } from "../types/recovery";
import { formatInr } from "../utils/format";
import { ActionTransition } from "./ActionTransition";
import { OverrideBadge } from "./OverrideBadge";
import "./InterventionsSpotlight.css";

interface InterventionsSpotlightProps {
  interventions: RecoveryCase[];
  onViewAudit: (internalId: string) => void;
}

export function InterventionsSpotlight({
  interventions,
  onViewAudit,
}: InterventionsSpotlightProps) {
  if (interventions.length === 0) {
    return null;
  }

  return (
    <section className="interventions">
      <div className="interventions__header">
        <h2 className="interventions__title">Policy interventions</h2>
        <p className="interventions__subtitle">
          Every case where the deterministic policy layer overrode the agent's proposal
          — this is the architecture's final authority in action, not a hypothetical.
        </p>
      </div>

      <div className="interventions__list">
        {interventions.map((c) => (
          <button
            key={c.internalId}
            className="intervention-card"
            onClick={() => onViewAudit(c.internalId)}
          >
            <div className="intervention-card__top">
              <span className="intervention-card__amount">
                {formatInr(c.failedPayment.payment.amount)}
              </span>
              <OverrideBadge reason={c.decision?.overrideReason ?? null} />
            </div>
            <ActionTransition
              proposedAction={c.decision?.agentProposedAction ?? null}
              finalAction={c.decision?.finalAction ?? "escalate"}
              overridden
            />
            <span className="intervention-card__id">{c.internalId}</span>
          </button>
        ))}
      </div>
    </section>
  );
}