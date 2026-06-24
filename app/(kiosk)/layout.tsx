import type { ReactNode } from "react";

export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background">
      {children}
    </div>
  );
}
