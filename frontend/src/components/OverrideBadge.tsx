import type { OverrideReason } from "../types/recovery";
import "./OverrideBadge.css";

const reasonLabels: Record<NonNullable<OverrideReason>, string> = {
  customer_opted_out: "Customer opted out",
  retry_limit_reached: "Retry limit reached",
  agent_network_error: "Agent network error",
  agent_empty_response: "Agent empty response",
  agent_invalid_json: "Agent invalid JSON",
  agent_invalid_proposal: "Agent invalid proposal",
  agent_unknown_error: "Agent error",
};

interface OverrideBadgeProps {
  reason: OverrideReason;
}

export function OverrideBadge({ reason }: OverrideBadgeProps) {
  const label = reason ? reasonLabels[reason] ?? reason : "Overridden";

  return (
    <span className="override-badge">
      <span className="override-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}