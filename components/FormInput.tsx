import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          className={cn(
            "bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800 transition-colors",
            "focus:border-slate-400 dark:focus:border-slate-600 focus:outline-none",
            error && "border-red-500 dark:border-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";