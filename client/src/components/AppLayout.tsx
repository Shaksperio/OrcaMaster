import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Settings, FileText, Users, Package, Briefcase, BarChart3, Home, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vendas: true,
    compras: true,
    cadastros: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#15171A] text-slate-300 font-sans tracking-tight">
      {/* Ghost CMS Style Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-black font-black flex items-center justify-center text-sm shadow-sm">
            OM
          </div>
          <div>
            <h2 className="font-bold text-sm text-white tracking-wide">OrçaMaster</h2>
            <p className="text-[11px] text-slate-400">Editorial Edition</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Dashboard */}
        <button
          onClick={() => {
            navigate("/dashboard");
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-all",
            location === "/dashboard"
              ? "bg-white text-black shadow"
              : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
          )}
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        {/* Vendas */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("vendas")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>Vendas & Faturamento</span>
            {openGroups.vendas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.vendas && (
            <div className="pl-3 space-y-1 mt-1 border-l border-slate-800 ml-3">
              <button
                onClick={() => { navigate("/quotations"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/quotations" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Orçamentos
              </button>
              <button
                onClick={() => { navigate("/invoices"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/invoices" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Faturas
              </button>
              <button
                onClick={() => { navigate("/receivables"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/receivables" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Contas a Receber
              </button>
            </div>
          )}
        </div>

        {/* Compras */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("compras")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>Despesas & Custos</span>
            {openGroups.compras ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.compras && (
            <div className="pl-3 space-y-1 mt-1 border-l border-slate-800 ml-3">
              <button
                onClick={() => { navigate("/expenses"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/expenses" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Despesas & Contas
              </button>
            </div>
          )}
        </div>

        {/* Cadastros */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("cadastros")}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
          >
            <span>Cadastros Base</span>
            {openGroups.cadastros ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openGroups.cadastros && (
            <div className="pl-3 space-y-1 mt-1 border-l border-slate-800 ml-3">
              <button
                onClick={() => { navigate("/customers"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/customers" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Clientes
              </button>
              <button
                onClick={() => { navigate("/products"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/products" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Produtos & Serviços
              </button>
              <button
                onClick={() => { navigate("/professionals"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-all", location === "/professionals" ? "bg-white text-black" : "text-slate-400 hover:text-white hover:bg-slate-800/40")}
              >
                Profissionais
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* User / Settings Footer */}
      <div className="p-4 border-t border-slate-800/80 space-y-2 bg-black/20">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar className="w-8 h-8 bg-slate-700 text-white text-xs font-bold">
            <AvatarFallback>{user?.name ? user.name.substring(0, 2).toUpperCase() : "OM"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white truncate">{user?.name || "Administrador"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || "admin@orcamaster"}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            navigate("/settings");
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors",
            location === "/settings" ? "bg-white text-black" : "text-slate-300 hover:bg-slate-800 hover:text-white"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#15171A]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200">
        <SidebarContent />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col flex-1 md:ml-64 min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-[#15171A] border-b border-slate-800 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-slate-800">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-[#15171A] border-r border-slate-800">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white text-black flex items-center justify-center font-bold text-xs">OM</div>
              <span className="font-bold tracking-tight">OrçaMaster</span>
            </div>
          </div>
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA]">
          {children}
        </main>
      </div>
    </div>
  );
}
