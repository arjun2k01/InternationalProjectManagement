import { useId, useState } from "react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

function EyeIcon({ open = false }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 5.1A11.5 11.5 0 0 1 12 5c5.2 0 9.4 4.3 10 6.9a11.6 11.6 0 0 1-4.1 5.6M6.4 6.4C4.2 8 2.6 10.1 2 12c.3 1.1 1.2 2.8 2.8 4.3M14.1 18.9c-.7.1-1.4.1-2.1.1-1.8 0-3.5-.5-5-1.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M2 12c.6-2.6 4.8-7 10-7s9.4 4.4 10 7c-.6 2.6-4.8 7-10 7S2.6 14.6 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Input({
  className = "",
  containerClassName = "",
  error = "",
  helperText = "",
  icon = null,
  label,
  rows = 4,
  type = "text",
  ...props
}) {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const [showPassword, setShowPassword] = useState(false);

  const isTextarea = type === "textarea";
  const resolvedType = type === "password" && showPassword ? "text" : type;
  const baseFieldClasses = cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-4",
    error
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-slate-300 focus:ring-slate-100",
    icon ? "pl-10" : "",
    type === "password" ? "pr-11" : "",
    className
  );

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        ) : null}

        {isTextarea ? (
          <textarea id={inputId} rows={rows} className={baseFieldClasses} {...props} />
        ) : (
          <input id={inputId} type={resolvedType} className={baseFieldClasses} {...props} />
        )}

        {type === "password" ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
