import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, AlertCircle, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [, navigate] = useLocation();

  const stats = [
    {
      title: "Faturamento Mês",
      value: "R$ 12.500,00",
      change: "+15%",
      isPositive: true,
      icon: DollarSign,
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      title: "Orçamentos Pendentes",
      value: "8",
      change: "-2",
      isPositive: false,
      icon: FileText,
      bgColor: "bg-green-50",
      iconColor: "text-green-700",
    },
    {
      title: "Faturas Vencidas",
      value: "2",
      change: "+1",
      isPositive: false,
      icon: AlertCircle,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Tempo Médio de Pagamento",
      value: "12 dias",
      change: "-2 dias",
      isPositive: true,
      icon: Clock,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Bem-vindo de volta! Aqui está um resumo do seu negócio.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                      <Icon className={cn("w-4 h-4", stat.iconColor)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className={cn(
                      "text-sm flex items-center gap-1",
                      stat.isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {stat.isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quotations */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Orçamentos Recentes</CardTitle>
              <CardDescription>Últimos orçamentos criados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">ORC-{String(item).padStart(3, '0')}</p>
                      <p className="text-sm text-muted-foreground">Cliente #{item}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">R$ {(1000 * item).toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Rascunho</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => navigate("/quotations")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
              <Button 
                onClick={() => navigate("/invoices")}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Fatura
              </Button>
              <Button 
                onClick={() => navigate("/customers")}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
              <Button 
                onClick={() => navigate("/products")}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
