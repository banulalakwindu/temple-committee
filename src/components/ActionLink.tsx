import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ghost";
  className?: string;
};

/** Router link styled as a button — no underline, supports icon + short label */
export function ActionLink({
  to,
  icon,
  children,
  variant = "primary",
  className = "",
}: Props) {
  const variantClass =
    variant === "primary"
      ? ""
      : variant === "accent"
        ? "accent"
        : variant === "ghost"
          ? "ghost"
          : "secondary";

  return (
    <Link to={to} className={`btn btn-icon ${variantClass} ${className}`.trim()}>
      <span className="btn-ico">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}

export function IconButton({
  icon,
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
}: {
  icon: ReactNode;
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "danger" | "ghost";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variantClass =
    variant === "primary"
      ? ""
      : variant === "accent"
        ? "accent"
        : variant === "danger"
          ? "danger"
          : variant === "ghost"
            ? "ghost"
            : "secondary";

  return (
    <button
      type={type}
      className={`btn btn-icon ${variantClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="btn-ico">{icon}</span>
      <span>{children}</span>
    </button>
  );
}
