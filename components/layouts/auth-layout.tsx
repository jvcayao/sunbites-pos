import { AppLogo } from "@/components/app-logo";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className={cn("w-full max-w-[420px]", className)}>
        <div className="mb-8 flex justify-center">
          <AppLogo variant="full" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
