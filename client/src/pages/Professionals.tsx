import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Briefcase } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export default function Professionals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    hourlyRate: "",
    dailyRate: "",
    commissionPercentage: "",
  });

  const { activeCompany } = useCompany();

  const { data: professionals, isLoading } = trpc.professionals.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const utils = trpc.useUtils();

  const createProfessionalMutation = trpc.professionals.create.useMutation({
    onSuccess: () => {
      utils.professionals.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Profissional criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar profissional: " + (error.message || "Tente novamente"));
    },
  });

  const handleCreateProfessional = async () => {
    try {
      if (!activeCompany) {
        toast.error("Selecione uma empresa primeiro");
        return;
      }
      if (!formData.name.trim()) {
        toast.error("Nome do profissional é obrigatório");
        return;
      }
      await createProfessionalMutation.mutateAsync({
        companyId: activeCompany.id,
        name: formData.name,
        role: formData.role || undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : undefined,
        commissionPercentage: formData.commissionPercentage ? parseFloat(formData.commissionPercentage) : undefined,
      });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        role: "",
        hourlyRate: "",
        dailyRate: "",
        commissionPercentage: "",
      });
    } catch (error) {
      console.error("Erro ao criar profissional:", error);
    }
  };

  const filteredProfessionals = professionals?.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Equipe</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profissionais</h1>
            <p className="mt-2 text-sm text-muted-foreground">Organize prestadores, funções e referências de custo.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Profissional</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo profissional
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do profissional"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Função/Cargo</Label>
                  <Input
                    id="role"
                    placeholder="Ex: Desenvolvedor, Designer"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="hourlyRate">Valor/Hora</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyRate">Valor/Dia</Label>
                    <Input
                      id="dailyRate"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="commissionPercentage">Comissão %</Label>
                    <Input
                      id="commissionPercentage"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.commissionPercentage}
                      onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateProfessional}
                  disabled={createProfessionalMutation.isPending || !formData.name}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createProfessionalMutation.isPending ? "Criando..." : "Criar Profissional"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum profissional encontrado</p>
            </div>
          ) : (
            filteredProfessionals.map((professional: any) => (
              <Card key={professional.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{professional.name}</CardTitle>
                  <CardDescription>{professional.role || "Sem função definida"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {professional.hourlyRate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor/Hora:</span>
                      <span className="font-medium text-foreground">
                        R$ {professional.hourlyRate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {professional.dailyRate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor/Dia:</span>
                      <span className="font-medium text-foreground">
                        R$ {professional.dailyRate.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {professional.commissionPercentage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comissão:</span>
                      <span className="font-medium text-foreground">
                        {professional.commissionPercentage}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
