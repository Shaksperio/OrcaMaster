import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsIcon, Palette, FileText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const { activeCompany } = useCompany();
  const utils = trpc.useUtils();
  
  // Empresa form
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  
  // Temas form
  const [selectedTheme, setSelectedTheme] = useState("minimalista");
  const [primaryColor, setPrimaryColor] = useState("#FF8C00");
  const [secondaryColor, setSecondaryColor] = useState("#1B5E20");

  // Mutation
  const updateCompanyMutation = trpc.company.update.useMutation({
    onSuccess: () => {
      utils.company.list.invalidate();
      toast.success("Empresa atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro: " + (error.message || "Tente novamente"));
    },
  });

  // Initialize form
  useEffect(() => {
    if (activeCompany) {
      setCompanyName(activeCompany.name || "");
      setCompanyEmail(activeCompany.email || "");
      setCompanyPhone(activeCompany.phone || "");
      setCompanyAddress(activeCompany.address || "");
      
      const savedTheme = localStorage.getItem(`theme-${activeCompany.id}`);
      if (savedTheme) setSelectedTheme(savedTheme);
      
      const savedColors = localStorage.getItem(`colors-${activeCompany.id}`);
      if (savedColors) {
        try {
          const colors = JSON.parse(savedColors);
          setPrimaryColor(colors.primary || "#FF8C00");
          setSecondaryColor(colors.secondary || "#1B5E20");
        } catch (e) {
          // ignore
        }
      }
    }
  }, [activeCompany]);

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

  const handleSaveCompany = async () => {
    if (!activeCompany) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    try {
      await updateCompanyMutation.mutateAsync({
        id: activeCompany.id,
        name: companyName,
        email: companyEmail || undefined,
        phone: companyPhone || undefined,
        address: companyAddress || undefined,
      });
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  const handleSaveTheme = () => {
    if (!activeCompany) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }
    try {
      localStorage.setItem(`theme-${activeCompany.id}`, selectedTheme);
      localStorage.setItem(`colors-${activeCompany.id}`, JSON.stringify({
        primary: primaryColor,
        secondary: secondaryColor,
      }));
      toast.success("Tema salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar tema");
    }
  };

  if (!activeCompany) {
    return (
      <AppLayout>
        <div className="p-6 md:p-8 max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 text-center text-muted-foreground">
              Selecione uma empresa para acessar as configurações
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-document">CNPJ</Label>
                    <Input
                      id="company-document"
                      value={activeCompany.document || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-email">E-mail</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Telefone</Label>
                    <Input
                      id="company-phone"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company-address">Endereço</Label>
                  <Input
                    id="company-address"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="Rua, número, cidade, estado"
                  />
                </div>
                <Button
                  onClick={handleSaveCompany}
                  disabled={updateCompanyMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {updateCompanyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
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
                <div>
                  <Label>Logo da Empresa</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-primary/30 rounded-lg text-center bg-primary/5">
                    <p className="text-muted-foreground mb-2">Clique para fazer upload da logo</p>
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Marca d'água</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-primary/30 rounded-lg text-center bg-primary/5">
                    <p className="text-muted-foreground mb-2">Clique para fazer upload da marca d'água</p>
                    <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="validity-days">Dias de Validade (Orçamentos)</Label>
                  <Input
                    id="validity-days"
                    type="number"
                    defaultValue="30"
                    placeholder="30"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-fields">Campos Personalizados</Label>
                  <p className="text-sm text-muted-foreground mt-2">
                    Adicione campos customizados aos seus documentos
                  </p>
                  <Button variant="outline" className="mt-2 border-primary text-primary hover:bg-primary/10">
                    + Adicionar Campo
                  </Button>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
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
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTheme(theme.id)}
                    >
                      <div className={`${theme.preview} h-32 rounded mb-3`}></div>
                      <h3 className="font-semibold text-foreground">{theme.name}</h3>
                      <p className="text-sm text-muted-foreground">{theme.description}</p>
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
                <div className="grid grid-cols-2 gap-4">
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

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">Prévia das cores:</p>
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 rounded" style={{ backgroundColor: primaryColor }}>
                      <p className="text-white text-sm font-semibold">Primária</p>
                    </div>
                    <div className="flex-1 p-4 rounded" style={{ backgroundColor: secondaryColor }}>
                      <p className="text-white text-sm font-semibold">Secundária</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveTheme}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
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
