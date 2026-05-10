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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 mb-4">
            <span className="text-white font-bold text-xl">OM</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">OrçaMaster</h1>
          <p className="text-slate-600 mt-2">Gestão de Orçamentos e Faturas</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Faça login para acessar sua plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="google" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="google">Google</TabsTrigger>
                <TabsTrigger value="email">E-mail</TabsTrigger>
              </TabsList>

              {/* Google Login */}
              <TabsContent value="google" className="space-y-4">
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-11 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <Chrome className="w-5 h-5" />
                  Continuar com Google
                </Button>
                <p className="text-xs text-slate-500 text-center">
                  Faça login com sua conta Google para começar
                </p>
              </TabsContent>

              {/* Email Login */}
              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      E-mail
                    </label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Senha
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {isLoading ? "Entrando..." : "Entrar com E-mail"}
                  </Button>
                </form>
                <div className="text-center">
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700">
                    Esqueceu sua senha?
                  </a>
                </div>
              </TabsContent>
            </Tabs>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white text-slate-500">Ou</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-slate-600">
              Não tem conta?{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Cadastre-se
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>© 2026 OrçaMaster. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
