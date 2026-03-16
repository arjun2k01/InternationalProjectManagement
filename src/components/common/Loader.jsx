const sizeStyles = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
};

function Spinner({ size = "md", className = "" }) {
  return (
    <span
      className={[
        "inline-block animate-spin rounded-full border-slate-200 border-t-slate-900",
        sizeStyles[size] || sizeStyles.md,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}

export default function Loader({
  className = "",
  fullPage = false,
  label = "Loading...",
  size = "md",
}) {
  if (fullPage) {
    return (
      <div
        className={[
          "flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-slate-50/60",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    );
  }

  return (
    <div className={["inline-flex items-center gap-2", className].filter(Boolean).join(" ")}>
      <Spinner size={size} />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}
