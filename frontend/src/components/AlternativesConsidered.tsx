import type { AlternativeAction } from "../types/recovery";
import { formatAction } from "../utils/format";
import "./AlternativesConsidered.css";

interface AlternativesConsideredProps {
  alternatives: AlternativeAction[];
}

export function AlternativesConsidered({ alternatives }: AlternativesConsideredProps) {
  if (alternatives.length === 0) {
    return null;
  }

  return (
    <div className="alternatives">
      <span className="alternatives__label">Other options the agent weighed</span>
      <ul className="alternatives__list">
        {alternatives.map((alt, i) => (
          <li className="alternatives__item" key={i}>
            <div className="alternatives__row">
              <span className="alternatives__action">{formatAction(alt.action)}</span>
              {alt.confidence !== null && (
                <span className="alternatives__confidence">
                  {Math.round(alt.confidence * 100)}%
                </span>
              )}
            </div>
            {alt.reasoning && (
              <p className="alternatives__reasoning">{alt.reasoning}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}