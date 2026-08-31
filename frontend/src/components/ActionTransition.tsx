import type { RecoveryAction } from "../types/recovery";
import { formatAction } from "../utils/format";
import "./ActionTransition.css";

interface ActionTransitionProps {
  proposedAction: RecoveryAction | null;
  finalAction: RecoveryAction;
  overridden: boolean;
}

/**
 * When the policy layer overrides the agent, show the agent's proposal
 * struck through in indigo with an arrow to the final action in crimson —
 * a redline edit-mark. When there's no override, just show the action
 * plainly; forcing the redline treatment on pass-through cases would
 * dilute what it's supposed to mean.
 */
export function ActionTransition({
  proposedAction,
  finalAction,
  overridden,
}: ActionTransitionProps) {
  if (!overridden) {
    return (
      <span className="action-transition action-transition--plain">
        {formatAction(finalAction)}
      </span>
    );
  }

  return (
    <span className="action-transition action-transition--overridden">
      {proposedAction && (
        <>
          <span className="action-transition__proposed">
            {formatAction(proposedAction)}
          </span>
          <span className="action-transition__arrow" aria-hidden="true">
            →
          </span>
        </>
      )}
      <span className="action-transition__final">{formatAction(finalAction)}</span>
    </span>
  );
}