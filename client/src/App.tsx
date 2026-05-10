import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
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
      <Route path={"/quotations"} component={() => <div>Quotations Page</div>} />
      <Route path={"/invoices"} component={() => <div>Invoices Page</div>} />
      <Route path={"/customers"} component={() => <div>Customers Page</div>} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
