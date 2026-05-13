import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsIcon, Palette, FileText } from "lucide-react";
import { useState } from "react";
import { useCompany } from "@/contexts/CompanyContext";

export default function Settings() {
  const { activeCompany } = useCompany();
  const [selectedTheme, setSelectedTheme] = useState("minimalista");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#f3f4f6");

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-name">Nome da Empresa</Label>
                    <Input
                      id="company-name"
                      defaultValue={activeCompany?.name}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-document">CNPJ</Label>
                    <Input
                      id="company-document"
                      defaultValue={activeCompany?.document}
                      disabled
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-email">E-mail</Label>
                    <Input
                      id="company-email"
                      defaultValue={activeCompany?.email || ""}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Telefone</Label>
                    <Input
                      id="company-phone"
                      defaultValue={activeCompany?.phone || ""}
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company-address">Endereço</Label>
                  <Input
                    id="company-address"
                    defaultValue={activeCompany?.address || ""}
                    disabled
                  />
                </div>
                <Button disabled className="w-full">
                  Editar Empresa
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
                  <div className="mt-2 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
                    <p className="text-slate-500 mb-2">Clique para fazer upload da logo</p>
                    <Button variant="outline" disabled>
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Marca d'água</Label>
                  <div className="mt-2 p-4 border-2 border-dashed border-slate-300 rounded-lg text-center">
                    <p className="text-slate-500 mb-2">Clique para fazer upload da marca d'água</p>
                    <Button variant="outline" disabled>
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="validity-days">Dias de Validade (Orçamentos)</Label>
                  <Input
                    id="validity-days"
                    type="number"
                    placeholder="30"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="custom-fields">Campos Personalizados</Label>
                  <p className="text-sm text-slate-500 mt-2">
                    Adicione campos customizados aos seus documentos
                  </p>
                  <Button variant="outline" className="mt-2" disabled>
                    + Adicionar Campo
                  </Button>
                </div>
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
                          ? "border-blue-600 bg-blue-50"
                          : "border-border hover:border-slate-300"
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

                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled>
                  Salvar Cores
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
