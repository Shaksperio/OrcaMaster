import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
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

  const resetForm = () => {
    setFormData({ name: "", document: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "", notes: "" });
    setEditingCustomerId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: any) => {
    setEditingCustomerId(customer.id);
    setFormData({ name: customer.name || "", document: customer.document || "", email: customer.email || "", phone: customer.phone || "", address: customer.address || "", city: customer.city || "", state: customer.state || "", zipCode: customer.zipCode || "", notes: customer.notes || "" });
    setIsDialogOpen(true);
  };

  const createCustomerMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      // Invalidar cache para refetch automático
      utils.customers.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Cliente criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar cliente: " + (error.message || "Tente novamente"));
    },
  });

  const updateCustomerMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Cliente atualizado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => toast.error("Erro ao atualizar cliente: " + (error.message || "Tente novamente")),
  });

  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate({ companyId: activeCompany?.id });
      toast.success("Cliente excluído com sucesso!");
    },
    onError: (error) => toast.error("Erro ao excluir cliente: " + (error.message || "Tente novamente")),
  });

  const handleDeleteCustomer = (customer: any) => {
    if (!activeCompany || !window.confirm(`Excluir o cliente ${customer.name}? Esta ação não pode ser desfeita.`)) return;
    deleteCustomerMutation.mutate({ id: customer.id, companyId: activeCompany.id });
  };

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
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
    }
  };

  const handleSubmitCustomer = async () => {
    if (editingCustomerId) {
      if (!activeCompany || !formData.name.trim()) {
        toast.error(activeCompany ? "Nome do cliente é obrigatório" : "Selecione uma empresa primeiro");
        return;
      }
      await updateCustomerMutation.mutateAsync({ id: editingCustomerId, companyId: activeCompany.id, ...formData });
      return;
    }
    await handleCreateCustomer();
  };

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document?.includes(searchTerm)
  ) || [];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Relacionamento</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Clientes</h1>
            <p className="mt-2 text-sm text-muted-foreground">Centralize contatos, documentos e histórico comercial.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCustomerId ? "Editar Cliente" : "Criar Novo Cliente"}</DialogTitle>
                <DialogDescription>{editingCustomerId ? "Atualize os dados deste cliente" : "Preencha os dados para criar um novo cliente"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                    placeholder="Notas adicionais sobre o cliente"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleSubmitCustomer}
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {createCustomerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingCustomerId ? "Salvando..." : "Criando..."}
                    </>
                  ) : (
                    editingCustomerId ? "Salvar Alterações" : "Criar Cliente"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 border-border/70 bg-background pl-10 shadow-none focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Customers List */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 px-5 py-4">
              <CardTitle className="text-base">Lista de Clientes</CardTitle>
            <CardDescription>
              Total: {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex min-w-0 flex-col gap-3 rounded-lg px-2 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{customer.name.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{customer.name}</p>
                        <p className="truncate text-sm text-muted-foreground">{customer.document && `${customer.document} • `}{customer.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <div className="text-right">
                        {customer.phone && <p className="text-sm text-foreground">{customer.phone}</p>}
                        {customer.city && <p className="text-sm text-muted-foreground">{customer.city}, {customer.state}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${customer.name}`} title="Editar cliente" onClick={() => openEditDialog(customer)} className="h-9 w-9 text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Excluir ${customer.name}`} title="Excluir cliente" onClick={() => handleDeleteCustomer(customer)} disabled={deleteCustomerMutation.isPending} className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
