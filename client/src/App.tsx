import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Quotations from "./pages/Quotations";
import Invoices from "./pages/Invoices";
import Customers from "./pages/Customers";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/quotations"} component={Quotations} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/products"} component={() => <div>Products Page</div>} />
      <Route path={"/professionals"} component={() => <div>Professionals Page</div>} />
      <Route path={"/404"} component={NotFound} />
      {/* Redirect to dashboard */}
      <Route path={"/"} component={() => {
        window.location.href = "/dashboard";
        return null;
      }} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CompanyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
