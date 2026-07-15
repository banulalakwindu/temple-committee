import type { ReactNode } from "react";

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

export function EmptyState({ message }: { message: string }) {
  return <div className="empty">{message}</div>;
}
