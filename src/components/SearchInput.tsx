import type { InputHTMLAttributes } from "react";
import { Icons } from "@/components/Icons";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  className?: string;
  inputClassName?: string;
};

/** Text search field with a leading magnifier icon. */
export function SearchInput({
  className = "",
  inputClassName = "",
  ...props
}: Props) {
  return (
    <div className={`input-with-icon ${className}`.trim()}>
      <span className="input-icon input-icon-left" aria-hidden>
        {Icons.search({ size: 16 })}
      </span>
      <input className={`input ${inputClassName}`.trim()} type="search" {...props} />
    </div>
  );
}
