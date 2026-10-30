"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(
    typeof window === "undefined" ? false : window.innerWidth < 1024,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Redireciona para o login apenas via effect — chamar router.replace
  // durante a renderização atualiza o Router enquanto este componente
  // renderiza, o que é um anti-pattern do React.
  useEffect(() => {
    if (mounted && !loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, loading, isAuthenticated, router]);

  // Ainda carregando o estado de auth: mostra spinner visível
  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <FontAwesomeIcon
            icon={faCircleNotch}
            className="w-8 h-8 animate-spin text-primary"
          />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  // Não autenticado: mostra mensagem visível em vez de null (tela preta).
  // O redirecionamento é disparado pelo useEffect acima.
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <p className="text-muted-foreground">Acesso restrito. Redirecionando…</p>
        </div>
      </div>
    );
  }

  if (pathname === "/config") {
    return (
      <main className="h-screen overflow-y-auto bg-background">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden relative min-w-0",
          collapsed
            ? "md:pl-[var(--mh-sidebar-collapsed-width)]"
            : "md:pl-[var(--mh-sidebar-width)]",
        )}
      >
        <Topbar />
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
