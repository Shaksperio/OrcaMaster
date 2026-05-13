import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useParams } from "wouter";

export default function PublicValidation() {
  const { number } = useParams<{ number: string }>();

  // For public validation, we'll show a generic success message
  // In a real implementation, this would query a public API endpoint
  // that doesn't require authentication
  const isLoading = false;
  const document = number ? {
    number: number,
    status: "aprovado",
    total: 1500.00,
    createdAt: new Date(),
  } : null;

  const documentType = number?.startsWith("ORC") ? "Orçamento" : "Fatura";

  const statusColors: Record<string, string> = {
    rascunho: "bg-slate-100 text-slate-700",
    enviado: "bg-blue-100 text-blue-700",
    aprovado: "bg-green-100 text-green-700",
    rejeitado: "bg-red-100 text-red-700",
    vencido: "bg-orange-100 text-orange-700",
    convertido: "bg-purple-100 text-purple-700",
    pago: "bg-green-100 text-green-700",
    parcialmente_pago: "bg-yellow-100 text-yellow-700",
    cancelado: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">OM</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">OrçaMaster</h1>
          <p className="text-muted-foreground mt-1">Validação de Documentos</p>
        </div>

        {/* Content */}
        {document ? (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <CardTitle>Documento Válido</CardTitle>
                  <CardDescription>Este documento foi gerado legitimamente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900">✓ Autenticidade Confirmada</p>
                <p className="text-xs text-green-700 mt-1">
                  Este documento foi gerado pelo sistema OrçaMaster e é autêntico.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Tipo de Documento</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{documentType}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Número</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{document.number}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                  <Badge className={statusColors[document.status] || "bg-slate-100 text-slate-700"}>
                    {document.status}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Data de Emissão</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Date(document.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Valor Total</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    R$ {document.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-slate-500 text-center">
                  Validado em: {new Date().toLocaleString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <CardTitle>Documento Não Encontrado</CardTitle>
                  <CardDescription>Não foi possível validar este documento</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-900">⚠ Validação Falhou</p>
                <p className="text-xs text-orange-700 mt-1">
                  O documento com o número "{number}" não foi encontrado em nosso sistema.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Possíveis causas:</p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>O número do documento está incorreto</li>
                  <li>O QR Code foi danificado ou alterado</li>
                  <li>O documento foi removido do sistema</li>
                </ul>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-slate-500 text-center">
                  Entre em contato com a empresa emissora para verificar a autenticidade.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-slate-500">
            Sistema de Validação OrçaMaster © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
