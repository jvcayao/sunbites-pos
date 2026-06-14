import { cn } from "@/lib/utils";

interface AppLogoProps {
  variant?: "full" | "icon";
  className?: string;
}

export function AppLogo({ variant = "full", className }: AppLogoProps) {
  if (variant === "icon") {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground",
          className,
        )}
      >
        S
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-extrabold text-primary-foreground">
        S
      </div>
      <div className="flex flex-col">
        <span className="text-base font-bold leading-tight text-foreground">
          Sunbites
        </span>
        <span className="text-xs font-medium leading-tight text-muted-foreground">
          Your Healthy Kitchen
        </span>
      </div>
    </div>
  );
}
