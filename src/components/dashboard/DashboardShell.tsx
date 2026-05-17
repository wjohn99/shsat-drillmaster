import { Header } from "@/components/layout/Header";

interface DashboardShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-10 md:py-14">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
