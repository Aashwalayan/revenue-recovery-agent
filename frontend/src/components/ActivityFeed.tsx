import { useEffect, useRef } from "react";
import type { ActivityLogEntry } from "../types/recovery";
import "./ActivityFeed.css";

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  isLive: boolean;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ActivityFeed({ entries, isLive }: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="activity-feed">
      <div className="activity-feed__header">
        <span className="activity-feed__title">Agent activity</span>
        <span
          className={`activity-feed__status${isLive ? " activity-feed__status--live" : ""}`}
        >
          <span className="activity-feed__dot" aria-hidden="true" />
          {isLive ? "working" : "idle"}
        </span>
      </div>
      <div className="activity-feed__body" ref={scrollRef}>
        {entries.length === 0 ? (
          <p className="activity-feed__empty">
            Nothing logged yet — fetch, analyze, or execute a batch to watch it work.
          </p>
        ) : (
          entries.map((entry) => (
            <div className={`activity-feed__line activity-feed__line--${entry.tone}`} key={entry.id}>
              <span className="activity-feed__time">{formatClock(entry.timestamp)}</span>
              {entry.internalId && (
                <span className="activity-feed__id">[{entry.internalId}]</span>
              )}
              <span className="activity-feed__message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}