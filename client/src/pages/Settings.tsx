import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsIcon, Palette, FileText, Loader2, Save, CheckCircle, Upload, X, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const { activeCompany, isLoading, companies } = useCompany();
  const utils = trpc.useUtils();

  // === CRIAR EMPRESA STATE ===
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    currency: "BRL",
    taxRegime: "",
  });

  // === MUTATION PARA CRIAR EMPRESA ===
  const createCompanyMutation = trpc.company.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa criada com sucesso!");
      utils.company.list.invalidate();
      setShowCreateForm(false);
      setCreateForm({ name: "", document: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "", currency: "BRL", taxRegime: "" });
    },
    onError: (error) => {
      toast.error("Erro ao criar empresa: " + error.message);
    },
  });

  const handleCreateCompany = async () => {
    if (!createForm.name || !createForm.document) {
      toast.error("Nome e CNPJ são obrigatórios!");
      return;
    }
    await createCompanyMutation.mutateAsync({
      name: createForm.name,
      document: createForm.document,
      email: createForm.email || undefined,
      phone: createForm.phone || undefined,
      address: createForm.address || undefined,
      city: createForm.city || undefined,
      state: createForm.state || undefined,
      zipCode: createForm.zipCode || undefined,
      currency: createForm.currency || "BRL",
      taxRegime: createForm.taxRegime || undefined,
    });
  };

  // === EMPRESA FORM STATE ===
  const [companyForm, setCompanyForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    currency: "BRL",
    taxRegime: "",
  });

  // === DOCUMENTOS STATE ===
  const [validityDays, setValidityDays] = useState("30");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [watermarkUploading, setWatermarkUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  // === TEMAS STATE ===
  const [selectedTheme, setSelectedTheme] = useState("minimalista");
  const [primaryColor, setPrimaryColor] = useState("#FF8C00");
  const [secondaryColor, setSecondaryColor] = useState("#1B5E20");

  // === MUTATIONS DE UPLOAD ===
  const uploadLogoMutation = trpc.upload.companyLogo.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      toast.success("Logo enviada com sucesso!");
      utils.company.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao enviar logo: " + error.message);
    },
  });

  const uploadWatermarkMutation = trpc.upload.companyWatermark.useMutation({
    onSuccess: (data) => {
      setWatermarkPreview(data.url);
      toast.success("Marca d'água enviada com sucesso!");
      utils.themes.default.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao enviar marca d'água: " + error.message);
    },
  });

  const removeLogoMutation = trpc.upload.removeLogo.useMutation({
    onSuccess: () => {
      setLogoPreview(null);
      toast.success("Logo removida!");
      utils.company.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao remover logo: " + error.message);
    },
  });

  const removeWatermarkMutation = trpc.upload.removeWatermark.useMutation({
    onSuccess: () => {
      setWatermarkPreview(null);
      toast.success("Marca d'água removida!");
      utils.themes.default.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao remover marca d'água: " + error.message);
    },
  });

  // === HANDLERS DE UPLOAD ===
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCompany) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }

    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadLogoMutation.mutateAsync({
          companyId: activeCompany.id,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setLogoUploading(false);
      };
      reader.onerror = () => {
        toast.error("Erro ao ler arquivo");
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCompany) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }

    setWatermarkUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadWatermarkMutation.mutateAsync({
          companyId: activeCompany.id,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        });
        setWatermarkUploading(false);
      };
      reader.onerror = () => {
        toast.error("Erro ao ler arquivo");
        setWatermarkUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setWatermarkUploading(false);
    }
  };

  // === QUERY PARA TEMA PADRÃO (watermark) ===
  const defaultThemeQuery = trpc.themes.default.useQuery(
    { companyId: activeCompany?.id ?? 0 },
    { enabled: !!activeCompany?.id }
  );

  // === CARREGAR DADOS DA EMPRESA ATIVA ===
  useEffect(() => {
    if (activeCompany) {
      setCompanyForm({
        name: activeCompany.name || "",
        document: activeCompany.document || "",
        email: activeCompany.email || "",
        phone: activeCompany.phone || "",
        address: activeCompany.address || "",
        city: activeCompany.city || "",
        state: activeCompany.state || "",
        zipCode: activeCompany.zipCode || "",
        currency: activeCompany.currency || "BRL",
        taxRegime: activeCompany.taxRegime || "",
      });
      // Load existing logo
      setLogoPreview((activeCompany as any).logoUrl || null);
    }
  }, [activeCompany]);

  // === CARREGAR WATERMARK DO TEMA PADRÃO ===
  useEffect(() => {
    if (defaultThemeQuery.data) {
      setWatermarkPreview(defaultThemeQuery.data.watermarkUrl || null);
    }
  }, [defaultThemeQuery.data]);

  // === CARREGAR TEMA SALVO DO LOCALSTORAGE ===
  useEffect(() => {
    const savedTheme = localStorage.getItem("orcamaster_theme");
    const savedPrimary = localStorage.getItem("orcamaster_primary_color");
    const savedSecondary = localStorage.getItem("orcamaster_secondary_color");
    const savedValidity = localStorage.getItem("orcamaster_validity_days");
    if (savedTheme) setSelectedTheme(savedTheme);
    if (savedPrimary) setPrimaryColor(savedPrimary);
    if (savedSecondary) setSecondaryColor(savedSecondary);
    if (savedValidity) setValidityDays(savedValidity);
  }, []);

  // === MUTATION PARA SALVAR EMPRESA ===
  const updateCompanyMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      utils.company.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  // === FUNÇÃO SALVAR EMPRESA ===
  const handleSaveCompany = async () => {
    if (!activeCompany) return;
    await updateCompanyMutation.mutateAsync({
      id: activeCompany.id,
      name: companyForm.name,
      document: companyForm.document,
      email: companyForm.email || undefined,
      phone: companyForm.phone || undefined,
      address: companyForm.address || undefined,
      city: companyForm.city || undefined,
      state: companyForm.state || undefined,
      zipCode: companyForm.zipCode || undefined,
      currency: companyForm.currency || undefined,
      taxRegime: companyForm.taxRegime || undefined,
    });
  };

  // === FUNÇÃO SALVAR TEMA ===
  const handleSaveTheme = () => {
    localStorage.setItem("orcamaster_theme", selectedTheme);
    localStorage.setItem("orcamaster_primary_color", primaryColor);
    localStorage.setItem("orcamaster_secondary_color", secondaryColor);
    toast.success("Tema salvo com sucesso!");
  };

  // === FUNÇÃO SALVAR DOCUMENTOS ===
  const handleSaveDocuments = () => {
    localStorage.setItem("orcamaster_validity_days", validityDays);
    toast.success("Configurações de documentos salvas!");
  };

  // === LOADING STATE ===
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // === SEM EMPRESA - MOSTRAR FORMULÁRIO DE CRIAÇÃO ===
  if (!activeCompany) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="w-8 h-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground mt-2">Cadastre sua empresa para começar</p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Cadastrar Empresa</CardTitle>
              <CardDescription>Preencha os dados da sua empresa para começar a usar o sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Nome da Empresa *</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="create-document">CNPJ *</Label>
                  <Input
                    id="create-document"
                    value={createForm.document}
                    onChange={(e) => setCreateForm({ ...createForm, document: e.target.value })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-email">E-mail</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="empresa@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="create-phone">Telefone</Label>
                  <Input
                    id="create-phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="create-address">Endereço</Label>
                <Input
                  id="create-address"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="create-city">Cidade</Label>
                  <Input
                    id="create-city"
                    value={createForm.city}
                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="create-state">Estado</Label>
                  <Input
                    id="create-state"
                    value={createForm.state}
                    onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                    placeholder="UF"
                  />
                </div>
                <div>
                  <Label htmlFor="create-zip">CEP</Label>
                  <Input
                    id="create-zip"
                    value={createForm.zipCode}
                    onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateCompany}
                disabled={createCompanyMutation.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {createCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Cadastrar Empresa
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const themes = [
    {
      id: "minimalista",
      name: "Minimalista",
      description: "Design limpo e moderno",
      preview: "bg-white border-2 border-border",
    },
    {
      id: "classico",
      name: "Clássico",
      description: "Estilo profissional tradicional",
      preview: "bg-muted border-2 border-slate-400",
    },
    {
      id: "tecnico",
      name: "Técnico",
      description: "Layout detalhado e estruturado",
      preview: "bg-slate-100 border-2 border-slate-600",
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            Configurações
          </h1>
          <p className="text-muted-foreground mt-2">Personalize sua experiência e documentos</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="empresa" className="w-full">
          <TabsList>
            <TabsTrigger value="empresa">Empresa</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="temas">Temas</TabsTrigger>
          </TabsList>

          {/* Empresa Tab */}
          <TabsContent value="empresa" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>
                  Informações básicas da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-document">CNPJ</Label>
                    <Input
                      id="company-document"
                      value={companyForm.document}
                      onChange={(e) => setCompanyForm({ ...companyForm, document: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-email">E-mail</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      placeholder="empresa@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Telefone</Label>
                    <Input
                      id="company-phone"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company-address">Endereço</Label>
                  <Input
                    id="company-address"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="company-city">Cidade</Label>
                    <Input
                      id="company-city"
                      value={companyForm.city}
                      onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-state">Estado</Label>
                    <Input
                      id="company-state"
                      value={companyForm.state}
                      onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                      placeholder="UF"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-zip">CEP</Label>
                    <Input
                      id="company-zip"
                      value={companyForm.zipCode}
                      onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-currency">Moeda</Label>
                    <Input
                      id="company-currency"
                      value={companyForm.currency}
                      onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                      placeholder="BRL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-tax">Regime Tributário</Label>
                    <Input
                      id="company-tax"
                      value={companyForm.taxRegime}
                      onChange={(e) => setCompanyForm({ ...companyForm, taxRegime: e.target.value })}
                      placeholder="Simples Nacional"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveCompany}
                  disabled={updateCompanyMutation.isPending}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {updateCompanyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Dados da Empresa
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Personalização de Documentos
                </CardTitle>
                <CardDescription>
                  Configure como seus orçamentos e faturas serão exibidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo da Empresa */}
                <div>
                  <Label className="text-sm font-medium">Logo da Empresa</Label>
                  <p className="text-xs text-muted-foreground mb-2">Será exibida nos orçamentos e faturas. Formatos: PNG, JPG. Máx: 5MB</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {logoPreview ? (
                    <div className="mt-2 relative inline-block">
                      <div className="border rounded-lg p-3 bg-slate-50">
                        <img
                          src={logoPreview}
                          alt="Logo da empresa"
                          className="max-h-32 max-w-xs object-contain"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={logoUploading}
                        >
                          {logoUploading ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando...</>
                          ) : (
                            <><Upload className="w-3 h-3 mr-1" /> Trocar Logo</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (activeCompany) removeLogoMutation.mutate({ companyId: activeCompany.id });
                          }}
                          disabled={removeLogoMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="mt-2 p-6 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoUploading ? (
                        <>
                          <Loader2 className="w-8 h-8 mx-auto mb-2 text-orange-600 animate-spin" />
                          <p className="text-sm text-orange-600 font-medium">Enviando logo...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-sm text-slate-500 mb-1">Clique para fazer upload da logo</p>
                          <p className="text-xs text-slate-400">PNG, JPG ou SVG até 5MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Marca d'água */}
                <div>
                  <Label className="text-sm font-medium">Marca d'água</Label>
                  <p className="text-xs text-muted-foreground mb-2">Será aplicada como fundo nos documentos. Formatos: PNG, JPG. Máx: 5MB</p>
                  <input
                    ref={watermarkInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleWatermarkUpload}
                    className="hidden"
                  />
                  {watermarkPreview ? (
                    <div className="mt-2 relative inline-block">
                      <div className="border rounded-lg p-3 bg-slate-50">
                        <img
                          src={watermarkPreview}
                          alt="Marca d'água"
                          className="max-h-32 max-w-xs object-contain opacity-50"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => watermarkInputRef.current?.click()}
                          disabled={watermarkUploading}
                        >
                          {watermarkUploading ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando...</>
                          ) : (
                            <><Upload className="w-3 h-3 mr-1" /> Trocar Marca d'água</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (activeCompany) removeWatermarkMutation.mutate({ companyId: activeCompany.id });
                          }}
                          disabled={removeWatermarkMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-3 h-3 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="mt-2 p-6 border-2 border-dashed border-slate-300 rounded-lg text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors"
                      onClick={() => watermarkInputRef.current?.click()}
                    >
                      {watermarkUploading ? (
                        <>
                          <Loader2 className="w-8 h-8 mx-auto mb-2 text-orange-600 animate-spin" />
                          <p className="text-sm text-orange-600 font-medium">Enviando marca d'água...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p className="text-sm text-slate-500 mb-1">Clique para fazer upload da marca d'água</p>
                          <p className="text-xs text-slate-400">PNG, JPG ou SVG até 5MB</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="validity-days">Dias de Validade (Orçamentos)</Label>
                  <Input
                    id="validity-days"
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    placeholder="30"
                  />
                </div>

                <Button
                  onClick={handleSaveDocuments}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configurações de Documentos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Temas Tab */}
          <TabsContent value="temas" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Temas de Layout
                </CardTitle>
                <CardDescription>
                  Escolha o layout padrão para seus documentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTheme === theme.id
                          ? "border-orange-600 bg-orange-50"
                          : "border-border hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      <div className={`${theme.preview} h-32 rounded mb-3`}></div>
                      <h3 className="font-semibold text-foreground">{theme.name}</h3>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
                      {selectedTheme === theme.id && (
                        <CheckCircle className="w-5 h-5 text-orange-600 mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Cores Personalizadas</CardTitle>
                <CardDescription>
                  Customize as cores dos seus documentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Cor Primária</Label>
                    <div className="flex gap-2 mt-2">
                      <input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary-color">Cor Secundária</Label>
                    <div className="flex gap-2 mt-2">
                      <input
                        id="secondary-color"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveTheme}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Tema
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
