import type { RecoveryAction, TimelineStep } from "../types/recovery";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Backend amounts are in paise (Razorpay convention) — convert to rupees. */
export function formatInr(amountInPaise: number): string {
  return inrFormatter.format(amountInPaise / 100);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

const actionLabels: Record<RecoveryAction, string> = {
  retry_same_method: "Retry same method",
  retry_after_delay: "Retry after delay",
  try_alternative_method: "Try alternative method",
  ask_customer_to_update_payment_method: "Ask to update payment method",
  send_payment_link: "Send payment link",
  escalate: "Escalate",
  do_not_retry: "Do not retry",
};

export function formatAction(action: RecoveryAction): string {
  return actionLabels[action] ?? action;
}

const timelineStepLabels: Record<TimelineStep, string> = {
  detected: "Detected",
  classified: "Classified",
  proposed: "Agent proposed",
  policy_checked: "Policy checked",
  final_decision: "Final decision",
};

export function formatTimelineStep(step: TimelineStep): string {
  return timelineStepLabels[step] ?? step;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}