# Verificação visual do PDF gerado

O PDF gerado tem duas páginas A4 e reproduz o modelo anexado nas estruturas principais: logomarca/status/título/número no cabeçalho, dados do cliente e do orçamento, local da obra, tabela laranja com itens, subtotal/total, condições de pagamento, QR Code com dados PIX, descrição e assinatura.

Na comparação visual, a paginação e a hierarquia estão corretas. O gerador usa um fallback “OM” quando a empresa não possui logo; quando existe logo configurada, a rota passa `companyLogoUrl` e `companyLogoStorageKey`. A tabela da segunda página repete o cabeçalho, como no modelo de referência.

A diferença intencional é que o rodapé “DA PLATAFORMA” é representado por um marcador textual discreto com três blocos coloridos, e os dados variáveis dependem do cadastro real da empresa, cliente e orçamento. O preview HTML deve usar a mesma estrutura e foi ajustado para impressão A4, ocultando o layout do aplicativo durante `window.print()`.
