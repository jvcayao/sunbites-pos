import { cn } from "@/lib/utils";

interface Props {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionWrapper({ title, children, className }: Props) {
  return (
    <section className={cn("space-y-5", className)}>
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
