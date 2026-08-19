import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Settings, Bell, FileText, Users, Package, Briefcase, BarChart3, Home, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigationGroups = [
  {
    title: "Geral",
    items: [
      { label: "Painel Principal", href: "/dashboard", icon: Home },
    ],
  },
  {
    title: "Vendas",
    items: [
      { label: "Orçamentos", href: "/quotations", icon: FileText },
      { label: "Faturas", href: "/invoices", icon: BarChart3 },
      { label: "Contas a Receber", href: "/receivables", icon: DollarSign },
    ],
  },
  {
    title: "Compras & Despesas",
    items: [
      { label: "Despesas & Contas", href: "/expenses", icon: Briefcase },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Clientes", href: "/customers", icon: Users },
      { label: "Produtos & Serviços", href: "/products", icon: Package },
      { label: "Profissionais", href: "/professionals", icon: Briefcase },
    ],
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">OM</span>
          </div>
          <div>
            <h1 className="font-bold text-white">OrçaMaster</h1>
            <p className="text-xs text-orange-100">Gestão Financeira</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navigationGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="px-4 text-[11px] font-semibold uppercase tracking-wider text-orange-200/70">{group.title}</h2>
            {group.items.map((item: any) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href + "/"));
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200",
                    isActive
                      ? "bg-orange-500 text-white font-medium shadow-md hover:bg-orange-600"
                      : "text-orange-50 hover:bg-green-700/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button 
          onClick={() => {
            navigate("/settings");
            setIsMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-orange-50 hover:bg-green-700/50 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Configurações</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-orange-50 hover:bg-red-600/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
        {user && (
          <div className="pt-2 border-t border-sidebar-border text-xs text-orange-100">
            <p className="font-medium text-white">{user.name || "Usuário"}</p>
            <p className="truncate">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-sidebar border-b border-sidebar-border shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">OM</span>
            </div>
            <span className="font-bold text-white">OrçaMaster</span>
          </div>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
