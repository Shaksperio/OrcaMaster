import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Search, Truck, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

type SupplierForm = {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
};

const emptyForm: SupplierForm = { name: "", document: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "" };

export default function Suppliers() {
  const { activeCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const listQuery = trpc.suppliers.list.useQuery(
    { companyId: activeCompany?.id ?? 0 },
    { enabled: Boolean(activeCompany?.id) }
  );
  const utils = trpc.useUtils();
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("Fornecedor criado com sucesso."); closeDialog(); },
    onError: (error) => toast.error(`Não foi possível criar o fornecedor: ${error.message}`),
  });
  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("Fornecedor atualizado com sucesso."); closeDialog(); },
    onError: (error) => toast.error(`Não foi possível atualizar o fornecedor: ${error.message}`),
  });
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => { utils.suppliers.list.invalidate(); toast.success("Fornecedor excluído."); },
    onError: (error) => toast.error(`Não foi possível excluir o fornecedor: ${error.message}`),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name ?? "",
      document: supplier.document ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      city: supplier.city ?? "",
      state: supplier.state ?? "",
      zipCode: supplier.zipCode ?? "",
    });
    setIsDialogOpen(true);
  };

  const saveSupplier = async () => {
    if (!activeCompany) return toast.error("Selecione uma empresa primeiro.");
    if (!form.name.trim()) return toast.error("Nome do fornecedor é obrigatório.");
    const data = {
      companyId: activeCompany.id,
      name: form.name.trim(),
      document: form.document.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim().toUpperCase() || undefined,
      zipCode: form.zipCode.trim() || undefined,
    };
    if (editingId) await updateMutation.mutateAsync({ ...data, id: editingId });
    else await createMutation.mutateAsync(data);
  };

  const filtered = (listQuery.data ?? []).filter((supplier: any) =>
    [supplier.name, supplier.document, supplier.email, supplier.city].filter(Boolean).some((value: string) => value.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Relacionamento</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Fornecedores</h1>
            <p className="mt-2 text-sm text-muted-foreground">Mantenha contatos e dados comerciais sempre acessíveis.</p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"><Plus className="h-4 w-4" />Novo fornecedor</Button>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardContent className="pt-6">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="h-11 border-border/70 bg-background pl-10 shadow-none focus-visible:ring-primary/30" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome, documento, e-mail ou cidade" /></div>
          </CardContent>
        </Card>

        {listQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Truck className="mb-4 h-12 w-12 text-muted-foreground" /><p className="font-medium">Nenhum fornecedor encontrado</p><p className="mt-1 text-sm text-muted-foreground">Cadastre o primeiro fornecedor para esta empresa.</p></CardContent></Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((supplier: any) => <Card key={supplier.id} className="border-0 shadow-sm transition-shadow hover:shadow-md"><CardHeader><CardTitle className="text-lg">{supplier.name}</CardTitle><CardDescription>{supplier.document || "Documento não informado"}</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><div className="min-h-10 text-muted-foreground">{supplier.email || "E-mail não informado"}{supplier.phone ? ` · ${supplier.phone}` : ""}</div><p className="text-muted-foreground">{[supplier.city, supplier.state].filter(Boolean).join(" / ") || "Localização não informada"}</p><div className="flex gap-2 pt-3"><Button variant="outline" size="sm" onClick={() => openEdit(supplier)} className="flex-1 gap-2"><Pencil className="h-4 w-4" />Editar</Button><Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Excluir ${supplier.name}?`)) deleteMutation.mutate({ id: supplier.id, companyId: activeCompany!.id }); }} className="gap-2 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Excluir</Button></div></CardContent></Card>)}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeDialog()}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle><DialogDescription>Preencha apenas os dados reais disponíveis do fornecedor.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="supplier-name">Nome *</Label><Input id="supplier-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div><Label htmlFor="supplier-document">CNPJ/Documento</Label><Input id="supplier-document" value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} /></div><div><Label htmlFor="supplier-email">E-mail</Label><Input id="supplier-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><div><Label htmlFor="supplier-phone">Telefone</Label><Input id="supplier-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div><Label htmlFor="supplier-zip">CEP</Label><Input id="supplier-zip" value={form.zipCode} onChange={(event) => setForm({ ...form, zipCode: event.target.value })} /></div><div className="sm:col-span-2"><Label htmlFor="supplier-address">Endereço</Label><Input id="supplier-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div><div><Label htmlFor="supplier-city">Cidade</Label><Input id="supplier-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div><div><Label htmlFor="supplier-state">UF</Label><Input id="supplier-state" maxLength={2} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></div><Button onClick={saveSupplier} disabled={isSaving || !form.name.trim()} className="sm:col-span-2">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editingId ? "Salvar alterações" : "Cadastrar fornecedor"}</Button></div></DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
