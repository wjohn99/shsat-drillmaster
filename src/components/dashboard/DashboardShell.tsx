import { Header } from "@/components/layout/Header";
import { PageHeader } from "@/components/layout/PageHeader";

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
    <div className="min-h-screen">
      <Header />

      <main className="container py-8">
        <PageHeader title={title} description={subtitle} />
        {children}
      </main>
    </div>
  );
}
