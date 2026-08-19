import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Settings, Bell, FileText, Users, Package, Briefcase, BarChart3, Home, DollarSign, ChevronDown, ChevronRight, Folder, FileSpreadsheet } from "lucide-react";
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

  // Accordion states for collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vendas: true,
    compras: true,
    cadastros: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* User / Org Header (Zoho Books style) */}
      <div className="p-4 border-b border-sidebar-border bg-black/10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-orange-400/30 bg-orange-500 text-white">
            <AvatarFallback className="font-bold">{user?.name ? user.name.substring(0, 2).toUpperCase() : "OM"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-white truncate">{user?.name || "OrçaMaster Admin"}</h2>
            <p className="text-xs text-orange-200/80 truncate">{user?.email || "admin@orcamaster.app"}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {/* Home */}
        <button
          onClick={() => {
            navigate("/dashboard");
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
            location === "/dashboard"
              ? "bg-orange-500 text-white font-medium shadow-md"
              : "text-orange-50 hover:bg-green-700/50"
          )}
        >
          <Home className="w-4 h-4" />
          <span>Página Inicial</span>
        </button>

        {/* Vendas Group */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("vendas")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-orange-100 hover:bg-green-700/30 transition-colors font-medium"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <span>Vendas</span>
            </div>
            {openGroups.vendas ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {openGroups.vendas && (
            <div className="pl-6 space-y-1 border-l border-orange-500/20 ml-4 my-1">
              <button
                onClick={() => { navigate("/quotations"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/quotations" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Orçamentos / Estimativas
              </button>
              <button
                onClick={() => { navigate("/invoices"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/invoices" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Faturas
              </button>
              <button
                onClick={() => { navigate("/receivables"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/receivables" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Contas a Receber
              </button>
            </div>
          )}
        </div>

        {/* Compras Group */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("compras")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-orange-100 hover:bg-green-700/30 transition-colors font-medium"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-orange-400" />
              <span>Compras & Despesas</span>
            </div>
            {openGroups.compras ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {openGroups.compras && (
            <div className="pl-6 space-y-1 border-l border-orange-500/20 ml-4 my-1">
              <button
                onClick={() => { navigate("/expenses"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/expenses" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Despesas & Contas
              </button>
            </div>
          )}
        </div>

        {/* Cadastros Group */}
        <div className="space-y-1">
          <button
            onClick={() => toggleGroup("cadastros")}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-orange-100 hover:bg-green-700/30 transition-colors font-medium"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-orange-400" />
              <span>Cadastros</span>
            </div>
            {openGroups.cadastros ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {openGroups.cadastros && (
            <div className="pl-6 space-y-1 border-l border-orange-500/20 ml-4 my-1">
              <button
                onClick={() => { navigate("/customers"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/customers" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Clientes
              </button>
              <button
                onClick={() => { navigate("/products"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/products" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Produtos & Serviços
              </button>
              <button
                onClick={() => { navigate("/professionals"); setIsMobileMenuOpen(false); }}
                className={cn("w-full text-left px-3 py-2 rounded-md text-xs transition-colors", location === "/professionals" ? "bg-orange-500 text-white font-medium" : "text-orange-100 hover:bg-green-700/40")}
              >
                Profissionais
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer / Settings */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button 
          onClick={() => {
            navigate("/settings");
            setIsMobileMenuOpen(false);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
            location === "/settings" ? "bg-orange-500 text-white font-medium" : "text-orange-50 hover:bg-green-700/50"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-orange-50 hover:bg-red-600/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-sidebar-border">
        <SidebarContent />
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col flex-1 md:ml-64 min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-sidebar border-b border-sidebar-border text-white shadow-sm">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-green-700/50">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r border-sidebar-border">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-orange-500 flex items-center justify-center font-bold text-xs">OM</div>
              <span className="font-bold">OrçaMaster</span>
            </div>
          </div>
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
