type CardStatus =
  | "healthy"
  | "warning"
  | "error"
  | "neutral";

interface StatusCardProps {
  title: string;
  value: string | number;
  detail?: string;
  status?: CardStatus;
}

const STATUS_LABELS: Record<CardStatus, string> = {
  healthy: "Healthy",
  warning: "Attention",
  error: "Failed",
  neutral: "Info",
};

export function StatusCard({
  title,
  value,
  detail,
  status = "neutral",
}: StatusCardProps) {
  return (
    <article className={`status-card status-card--${status}`}>
      <header className="status-card__header">
        <p className="status-card__title">{title}</p>

        <span className={`status-badge status-badge--${status}`}>
          <span className="status-badge__dot" />
          {STATUS_LABELS[status]}
        </span>
      </header>

      <p className="status-card__value">{value}</p>

      {detail && (
        <p className="status-card__detail">{detail}</p>
      )}
    </article>
  );
}