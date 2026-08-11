import type { KeyboardEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function ListPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="list-page-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </div>
  );
}

export function FilterBar({
  children,
  onClear,
  clearLabel,
}: {
  children: ReactNode;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="filter-bar no-print">
      {children}
      <button type="button" className="btn secondary" onClick={onClear}>
        {clearLabel}
      </button>
    </div>
  );
}

export function ResultMeta({
  count,
  label,
}: {
  count: number;
  label: string;
}) {
  return (
    <div className="meta-row">
      <span>
        {label}: {count}
      </span>
    </div>
  );
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty">
      <p className="empty-message">{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function DataRowLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const navigate = useNavigate();
  const go = () => navigate(to);
  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };
  return (
    <tr
      className={`row-link ${className}`.trim()}
      tabIndex={0}
      role="link"
      onClick={go}
      onKeyDown={onKeyDown}
    >
      {children}
    </tr>
  );
}
