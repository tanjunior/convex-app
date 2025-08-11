interface ErrorMessageProps {
  error: string | null;
  className?: string;
}

export function ErrorMessage({ error, className = "" }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className={`bg-red-500/20 border-2 border-red-500/50 rounded-md p-2 ${className}`}>
      <p className="text-foreground font-mono text-xs">
        Error signing in: {error}
      </p>
    </div>
  );
}