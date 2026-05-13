import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { Mail, Chrome } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: Implement email/password authentication
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-orange-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl -ml-48 -mb-48"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-2xl">
            <span className="text-white font-bold text-2xl">OM</span>
          </div>
          <h1 className="text-4xl font-bold text-white">OrçaMaster</h1>
          <p className="text-orange-100 mt-2 text-lg">Gestão de Orçamentos e Faturas</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-green-700 to-green-800 text-white rounded-t-lg">
            <CardTitle className="text-white">Bem-vindo</CardTitle>
            <CardDescription className="text-green-100">Faça login para acessar sua plataforma</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                <TabsTrigger value="google" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Google</TabsTrigger>
                <TabsTrigger value="email" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">E-mail</TabsTrigger>
              </TabsList>

              {/* Google Login */}
              <TabsContent value="google" className="space-y-4">
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-11 bg-white text-gray-900 border-2 border-gray-200 hover:bg-gray-50 hover:border-orange-500 flex items-center justify-center gap-2 transition-all"
                >
                  <Chrome className="w-5 h-5" />
                  Continuar com Google
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Faça login com sua conta Google para começar
                </p>
              </TabsContent>

              {/* Email Login */}
              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium"
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
                <p className="text-xs text-gray-500 text-center">
                  Não tem uma conta? Entre em contato com o administrador
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-white/80 text-sm">
          <p>© 2026 OrçaMaster. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
