import Button from "./Button";

export default function ErrorMessage({
  message = "Something went wrong.",
  onRetry,
  retryLabel = "Try again",
  title = "Unable to load data",
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-rose-600">{message}</p>
      </div>

      {onRetry ? (
        <div className="mt-4">
          <Button variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
