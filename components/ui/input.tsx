"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  disabled,
  ...props
}: React.ComponentProps<"input">) {
  const [shown, setShown] = React.useState(false);
  const isPassword = type === "password";

  const input = (
    <InputPrimitive
      type={isPassword ? (shown ? "text" : "password") : type}
      data-slot="input"
      disabled={disabled}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        isPassword && "pr-8",
        className,
      )}
      {...props}
    />
  );

  if (!isPassword) return input;

  return (
    <div className="relative w-full">
      {input}
      <button
        type="button"
        disabled={disabled}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export { Input };
