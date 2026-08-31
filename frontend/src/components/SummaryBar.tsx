import type { Summary } from "../types/recovery";
import { formatInr, formatPercent } from "../utils/format";
import "./SummaryBar.css";

interface SummaryBarProps {
  summary: Summary | null;
  fallbackAtRiskAmount: number;
}

export function SummaryBar({ summary, fallbackAtRiskAmount }: SummaryBarProps) {
  // Before the first analysis, /summary hasn't been called yet — show the
  // at-risk total computed from whatever's currently in the case list
  // rather than a blank state, since that number is already real.
  const atRisk = summary?.totalAtRiskAmount ?? fallbackAtRiskAmount;

  const stats = [
    {
      label: "Total at risk",
      value: formatInr(atRisk),
      tone: "neutral" as const,
    },
    {
      label: "Recovered",
      value: summary ? formatInr(summary.recoveredAmount) : "—",
      tone: "recovered" as const,
    },
    {
      label: "Recovery rate",
      value: summary ? formatPercent(summary.recoveryRate) : "—",
      tone: "recovered" as const,
    },
    {
      label: "Policy interventions",
      value: summary ? String(summary.interventionsCount) : "—",
      tone: "override" as const,
    },
  ];

  return (
    <div className="summary-bar">
      {stats.map((stat, i) => (
        <div className="summary-bar__stat" key={stat.label}>
          {i > 0 && <div className="summary-bar__divider" aria-hidden="true" />}
          <span className="summary-bar__label">{stat.label}</span>
          <span className={`summary-bar__value summary-bar__value--${stat.tone}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}