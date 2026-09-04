import type { Execution } from "../types/recovery";
import { formatTimestamp } from "../utils/format";
import "./ExecutionResult.css";

interface ExecutionResultProps {
  execution: Execution;
}

export function ExecutionResult({ execution }: ExecutionResultProps) {
  if (execution.status === "failed") {
    return (
      <span className="execution-result execution-result--failed">
        Execution failed: {execution.error ?? "unknown error"}
      </span>
    );
  }

  if (execution.kind === "payment_link" && execution.paymentLink) {
    return (
      <a
        className="execution-result execution-result--link"
        href={execution.paymentLink.shortUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={`Created ${formatTimestamp(execution.executedAt)} — real Razorpay link, not sent to the customer`}
      >
        <span className="execution-result__tag">Real link</span>
        {execution.paymentLink.shortUrl}
      </a>
    );
  }

  if (execution.kind === "escalation") {
    return (
      <span className="execution-result execution-result--escalated">
        Queued for ops
      </span>
    );
  }

  if (execution.kind === "no_action") {
    return <span className="execution-result execution-result--none">No action needed</span>;
  }

  return <span className="execution-result execution-result--none">{execution.detail}</span>;
}