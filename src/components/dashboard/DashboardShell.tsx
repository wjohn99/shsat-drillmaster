import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { PageHeader } from "@/components/layout/PageHeader";

interface DashboardShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({
  title,
  subtitle,
  actions,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container py-8">
        <PageHeader title={title} description={subtitle} actions={actions} />
        {children}
      </main>
    </div>
  );
}
