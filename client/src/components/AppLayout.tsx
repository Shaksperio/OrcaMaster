import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeft,
  Receipt,
  Settings2,
  ChartNoAxesCombined,
  Sparkles,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const navigationGroups: NavGroup[] = [
  { label: "Visão geral", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Relacionamento",
    items: [
      { label: "Clientes", href: "/customers", icon: Users },
      { label: "Profissionais", href: "/professionals", icon: BriefcaseBusiness },
      { label: "Fornecedores", href: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "Vendas",
    items: [
      { label: "Orçamentos", href: "/quotations", icon: FileText },
      { label: "Faturas", href: "/invoices", icon: Receipt },
      { label: "Produtos e serviços", href: "/products", icon: Package },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Despesas e contas", href: "/expenses", icon: WalletCards },
      { label: "Relatórios", href: "/reports", icon: ChartNoAxesCombined },
    ],
  },
];

function isCurrentRoute(location: string, href: string) {
  return location === href || (href !== "/dashboard" && location.startsWith(`${href}/`));
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const currentTitle = navigationGroups.flatMap((group) => group.items).find((item) => isCurrentRoute(location, item.href))?.label ?? "OrçaMaster";

  const goTo = (href: string) => {
    navigate(href);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-20 shrink-0 items-center border-b border-sidebar-border", compact ? "justify-center px-2" : "gap-3 px-5")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-sm">OM</div>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">OrçaMaster</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Gestão de serviços</p>
          </div>
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto", compact ? "px-2 py-4" : "px-3 py-5")} aria-label="Navegação principal">
        {navigationGroups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">{group.label}</p>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isCurrentRoute(location, item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    title={compact ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => goTo(item.href)}
                    className={cn(
                      "group flex w-full items-center rounded-lg text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      compact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                      active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground")} />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-5 border-t border-sidebar-border pt-5">
          {!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">Ferramentas</p>}
          <button type="button" title={compact ? "Assistente IA" : undefined} onClick={() => goTo("/assistant")} className={cn("flex w-full items-center rounded-lg text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground", compact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5", isCurrentRoute(location, "/assistant") && "bg-sidebar-accent text-sidebar-accent-foreground")}>
            <Sparkles className="h-[18px] w-[18px] shrink-0" />
            {!compact && <span>Assistente IA</span>}
          </button>
        </div>
      </nav>

      <div className={cn("shrink-0 border-t border-sidebar-border", compact ? "p-2" : "p-3")}>
        <button type="button" title={compact ? "Configurações" : undefined} onClick={() => goTo("/settings")} className={cn("flex w-full items-center rounded-lg text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground", compact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5")}>
          <Settings2 className="h-[18px] w-[18px] shrink-0" />
          {!compact && <span>Configurações</span>}
        </button>
        {!compact && user && (
          <div className="mt-3 flex items-center gap-3 border-t border-sidebar-border px-3 pt-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{(user.name || "U").slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name || "Usuário"}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/50">{user.email}</p>
            </div>
            <button type="button" aria-label="Sair" onClick={handleLogout} className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-destructive/20 hover:text-red-200"><LogOut className="h-4 w-4" /></button>
          </div>
        )}
        {compact && <button type="button" aria-label="Sair" onClick={handleLogout} className="mt-1 flex w-full justify-center rounded-lg px-2 py-2.5 text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-red-200"><LogOut className="h-[18px] w-[18px]" /></button>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-200 md:block", isCollapsed ? "w-[68px]" : "w-[248px]")}>
        <SidebarContent compact={isCollapsed} />
        <button type="button" aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"} onClick={() => setIsCollapsed((value) => !value)} className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground">
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <div className={cn("flex min-h-screen flex-col transition-[margin] duration-200", isCollapsed ? "md:ml-[68px]" : "md:ml-[248px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0"><SidebarContent /></SheetContent>
            </Sheet>
            <div className="hidden h-5 w-px bg-border md:block" />
            <div className="flex items-center gap-2 text-sm">
              <PanelLeft className="hidden h-4 w-4 text-muted-foreground sm:block" />
              <span className="truncate font-medium text-foreground">{currentTitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Visão geral da operação</span></div>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
