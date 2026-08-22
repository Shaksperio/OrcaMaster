import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { AssistantProvider } from "./contexts/AssistantContext";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Quotations from "./pages/Quotations";
import CreateQuotation from "./pages/CreateQuotation";
import EditQuotation from "./pages/EditQuotation";
import QuotationPreview from "./pages/QuotationPreview";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import Expenses from "./pages/Expenses";
import Customers from "./pages/Customers";
import Products from "./pages/Products";
import Professionals from "./pages/Professionals";
import Assistant from "./pages/Assistant";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import PublicValidation from "./pages/PublicValidation";
import { Loader2 } from "lucide-react";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  // Public routes (no auth required)
  const publicRoutes = (
    <Switch>
      <Route path={"/validate/:number"} component={PublicValidation} />
      <Route path={"/404"} component={NotFound} />
      {/* Fallback for public routes */}
      <Route component={NotFound} />
    </Switch>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Check if current path is public
  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/validate")) {
    return publicRoutes;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/quotations/new"} component={CreateQuotation} />
      <Route path={"/quotations/:id/edit"} component={EditQuotation} />
      <Route path={"/quotations/:id/preview"} component={QuotationPreview} />
      <Route path={"/quotations"} component={Quotations} />
      <Route path={"/invoices/new"} component={CreateInvoice} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/expenses"} component={Expenses} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/products"} component={Products} />
      <Route path={"/professionals"} component={Professionals} />
      <Route path={"/suppliers"} component={Suppliers} />
      <Route path={"/assistant"} component={Assistant} />
      <Route path={"/settings"} component={Settings} />
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
          <AssistantProvider>
            <TooltipProvider>
            <Toaster />
            <Router />
            </TooltipProvider>
          </AssistantProvider>
        </CompanyProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
