import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });

  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();

  const { data: customers, isLoading } = trpc.customers.list.useQuery(
    { companyId: activeCompany?.id || 0 },
    { enabled: !!activeCompany?.id }
  );

  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Cliente criado com sucesso!");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        document: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error("Erro ao criar cliente: " + (error.message || "Tente novamente"));
    },
  });

  const handleCreateCustomer = async () => {
    try {
      if (!activeCompany) {
        toast.error("Selecione uma empresa primeiro");
        return;
      }
      if (!formData.name.trim()) {
        toast.error("Nome do cliente é obrigatório");
        return;
      }
      await createCustomerMutation.mutateAsync({
        companyId: activeCompany.id,
        ...formData,
      });
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
    }
  };

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document?.includes(searchTerm)
  ) || [];

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie todos os seus clientes e recebíveis</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hidden md:flex bg-[#1B5E20] hover:bg-[#1B5E20]/90 gap-2 text-white">
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Cliente</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar um novo cliente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do cliente"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="document">CPF/CNPJ</Label>
                    <Input
                      id="document"
                      placeholder="000.000.000-00"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="cliente@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="São Paulo"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      placeholder="SP"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionais..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreateCustomer}
                  disabled={createCustomerMutation.isPending}
                  className="w-full bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white"
                >
                  {createCustomerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Cliente"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nome ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-card shadow-sm border-border"
          />
        </div>

        {/* Customers List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B5E20]" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-0 shadow-sm text-center py-16 bg-card">
            <CardContent>
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Nenhum cliente encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Cadastre seu primeiro cliente para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, idx) => {
              const bgColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-purple-500"];
              const avatarColor = bgColors[idx % bgColors.length];
              const initials = customer.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

              return (
                <div key={customer.id} className="bg-card border border-border/60 rounded-xl p-4 shadow-sm hover:shadow transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-full ${avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-base truncate">{customer.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{customer.email || customer.document || "Sem contato adicional"}</p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">Tel: {customer.phone || "—"} • {customer.city ? `${customer.city}/${customer.state}` : "Local não informado"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-muted-foreground">Recebíveis</p>
                      <p className="text-sm font-bold text-foreground">R$ 0,00</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-muted-foreground">Créditos</p>
                      <p className="text-sm font-bold text-foreground">R$ 0,00</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) Zoho Books mobile style */}
      <button
        onClick={() => setIsDialogOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#1B5E20] text-white shadow-2xl flex items-center justify-center hover:bg-[#1B5E20]/90 transition-transform hover:scale-105 z-50 md:hidden"
        title="Novo Cliente"
      >
        <Plus className="w-6 h-6" />
      </button>
    </AppLayout>
  );
}
