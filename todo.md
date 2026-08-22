# OrçaMaster - TODO

## Fase 1: Configuração e Banco de Dados
- [x] Definir schema do banco de dados (tabelas de empresas, clientes, produtos, orçamentos, faturas, etc.)
- [x] Executar migrações do banco de dados
- [x] Criar helpers de query no server/db.ts

## Fase 2: Autenticação e Gestão de Empresas
- [x] Implementar tela de login (Google OAuth + E-mail/Senha)
- [ ] Implementar recuperação de senha
- [ ] Criar tela de cadastro de empresa
- [x] Implementar gestão de múltiplas empresas por usuário (procedures tRPC)
- [x] Implementar controle de acesso por perfis (admin, gerente, colaborador) (procedures tRPC)

## Fase 3: Cadastros Básicos
- [x] Implementar CRUD de clientes (CPF/CNPJ, endereço, contato) - UI + procedures (sem histórico)
- [x] Implementar CRUD de produtos/serviços (preço, SKU, estoque, categoria) - UI + procedures
- [x] Implementar CRUD de profissionais/mão de obra (valor hora, comissão) - UI + procedures
- [x] Implementar CRUD de fornecedores - UI + procedures protegidas, autorização por empresa, espelho Firebase e testes de contrato

## Fase 4: Orçamentos e Faturas
- [x] Implementar UI de orçamentos com listagem (empresa ativa, sem placeholders)
- [x] Implementar UI de faturas com listagem (empresa ativa, sem placeholders)
- [x] Implementar criação de orçamentos com seleção de itens (procedures + UI) - PRIORIDADE ALTA
- [x] Implementar numeração sequencial automática (ORC-001, FAT-001) - PRIORIDADE ALTA
- [x] Implementar controle de status (Rascunho, Enviado, Aprovado, Pago, etc.) - PRIORIDADE ALTA
- [x] Implementar conversão automática de orçamento em fatura - PRIORIDADE MÉDIA
- [x] Implementar validade de orçamento com alertas - PRIORIDADE MÉDIA
- [ ] Implementar duplicação de documentos - PRIORIDADE BAIXA
- [ ] Implementar histórico de versões - PRIORIDADE BAIXA

## Fase 5: Geração de PDF e QR Code
- [x] Instalar biblioteca de PDF (pdfkit) e QR Code
- [x] Implementar geração de PDF com layout customizável (server/pdf-generator.ts)
- [x] Implementar geração de QR Code embutido no PDF
- [x] Implementar download de PDF no cliente (botão nas páginas)
- [x] Implementar página de configurações com temas (UI)
- [x] Implementar personalização de temas de cores (UI)
- [x] Implementar página pública de validação via QR Code
- [x] Implementar upload de logo e marca d'água (backend)
- [x] Implementar campos personalizados nos documentos

## Fase 6: Gestão Financeira e Relatórios
- [x] Implementar controle de recebimentos (parciais, parcelados, atrasados)
- [x] Implementar contas a pagar
- [x] Implementar fluxo de caixa
- [ ] Implementar gráficos de faturamento mensal
- [ ] Implementar relatório de inadimplência
- [ ] Implementar exportação de relatórios (PDF e Excel)

## Fase 7: Dashboard e Página Pública
- [x] Implementar dashboard com indicadores financeiros
- [x] Implementar página pública de validação de documentos via QR Code
- [ ] Implementar rastreamento de QR Code escaneado

## Fase 8: Alertas e Notificações
- [ ] Implementar alertas por e-mail (orçamento aprovado, fatura vencida, pagamento recebido)
- [x] Implementar alertas de orçamento prestes a expirar
- [ ] Implementar notificações push
- [x] Implementar alerta de inadimplência

## Fase 9: Integração com IA
- [ ] Implementar sugestão de preços com base em histórico
- [ ] Implementar análise de padrões de orçamentos

## Fase 10: Refinamentos Visuais e Testes
- [x] Redesenhar com paleta de cores corporativas (laranja + verde escuro) - PRIORIDADE ALTA
- [x] Atualizar componentes com novas cores (index.css, AppLayout, Dashboard, Login)
- [x] Atualizar sidebar, headers e botões
- [x] Implementar testes unitários
- [x] Testar fluxos principais
- [x] Otimizar performance
- [x] Preparar para lançamento


## Testes de Funcionalidades
- [x] Testar navegação do menu sidebar (todos os links)
- [x] Testar CRUD de Clientes (criar, listar, editar, deletar)
- [x] Testar CRUD de Produtos (criar, listar, editar, deletar)
- [x] Testar CRUD de Profissionais (criar, listar, editar, deletar)
- [x] Testar botões de ação rápida no Dashboard
- [x] Testar links de navegação entre páginas
- [x] Testar autenticação (login/logout)
- [x] Testar página de validação pública
- [x] Testar configurações e personalização
- [x] Corrigir bugs encontrados durante testes

## Correção CRUD Configurações > Empresa
- [x] Diagnosticar causa raiz: inputs disabled, falta de state controlado, falta de integração API
- [x] Remover disabled de todos os inputs editáveis
- [x] Implementar useState para cada campo do formulário
- [x] Implementar useEffect para carregar dados da empresa ativa
- [x] Implementar função saveCompany() com trpc.company.update.useMutation
- [x] Implementar invalidação de cache após salvar
- [x] Implementar loading state no botão de salvar
- [x] Implementar toast de sucesso/erro
- [x] Testar persistência: editar > salvar > recarregar > verificar dados
- [x] Verificar que não há overlay/z-index/pointer-events bloqueando inputs no mobile

## Fase 4B - Redesign Orçamentos (modelo profissional)
- [x] Adicionar campos extras ao schema: localObra, issPercentage, icmsPercentage, pixKey, pixBank, pixHolder, deliveryEstimate, legalNotice, serviceDescription, paymentMethodDescription
- [x] Migrar novos campos no banco de dados
- [x] Atualizar procedures tRPC com novos campos
- [x] Reescrever formulário de criação com todos os campos do modelo
- [x] Criar página de preview do orçamento seguindo layout da imagem (2 páginas)
- [x] Reescrever gerador de PDF profissional idêntico ao modelo
- [x] Implementar rota Express para download de PDF
- [x] Implementar QR Code PIX no PDF e preview
- [x] Atualizar listagem de orçamentos com ações (preview, PDF, status)
- [x] Testar compilação e funcionalidade

## Fase 5 - Sincronização Firebase Realtime Database
- [x] Instalar firebase-admin
- [x] Criar módulo de conexão Firebase (server/firebase.ts)
- [x] Criar camada de sincronização MySQL → Firebase (server/firebase-sync.ts)
- [x] Integrar sync nos procedures de escrita (create/update/delete)
- [x] Testar sincronização e compilação
- [x] Validar credenciais Firebase Admin (private key PEM) e confirmar conexão
- [x] Integrar sync nos writes de invoices (create/update status)
- [x] Adicionar teste de sincronização Firebase (write/read/remove real confirmado)
- [x] Push para GitHub

## Fase 6 - Bug Fix: Logomarca e Marca d'água em Configurações > Documentos
- [x] Investigar código atual de upload de logomarca e marca d'água
- [x] Implementar upload funcional com persistência (S3 + banco)
- [x] Testar funcionalidade completa
- [x] Corrigir persistência da marca d'água (criar theme default se não existir)
- [x] Carregar watermarkUrl no Settings.tsx ao abrir página
- [x] Push para GitHub

## Fase 7 - Busca Externa de Produtos (Leroy Merlin) e Serviços (SINAPI)
- [x] Implementar procedure tRPC de busca Leroy Merlin (API real + fallback simulado)
- [x] Implementar base de referência interna SINAPI (27 itens com preços 2024)
- [x] Implementar procedure tRPC de busca SINAPI (scraping sinapi.app + web search + base interna)
- [x] Criar componente frontend de busca Leroy Merlin na página de Produtos
- [x] Criar componente frontend de busca SINAPI na página de Produtos (catálogo de produtos e serviços)
- [x] Integrar resultados com cadastro local (botão + para adicionar)
- [x] Implementar tags visuais (Leroy Merlin verde, SINAPI azul)
- [x] Testar compilação e funcionalidade
- [x] Push para GitHub

Nota: Dados externos devem ser exibidos como resultados de pesquisa e não como avaliações, depoimentos ou conteúdo gerado de clientes.

### Validação adicional da busca externa
- [x] Testar estados idle, loading, erro, vazio e resultados nos componentes de busca
- [x] Testar mapeamento dos botões Adicionar/Usar para o cadastro local
- [x] Validar fallbacks Leroy e SINAPI com testes automatizados

## Fase 8 - PDF, impressão e compartilhamento conforme modelo anexado
- [x] Analisar PDF de referência e comparar com o gerador atual
- [x] Ajustar layout do PDF para reproduzir cabeçalho, blocos, tabela, condições, totais, QR Code e assinaturas do modelo
- [x] Ajustar preview HTML para manter o mesmo layout do PDF
- [x] Validar botão de gerar/baixar PDF
- [x] Validar impressão usando o mesmo modelo visual
- [x] Implementar compartilhamento por WhatsApp com mensagem e link do orçamento
- [x] Implementar compartilhamento por e-mail com assunto, mensagem e link do orçamento
- [x] Adicionar testes do PDF, impressão e compartilhamento
- [x] Salvar checkpoint e atualizar o GitHub

### Validação adicional do fluxo de documento
- [x] Adicionar teste do fluxo cliente → rota real de geração/baixar PDF, cobrindo sucesso e erro
- [x] Adicionar teste do fluxo de impressão e dos estilos `@media print`/`data-print-target`
- [x] Adicionar teste automatizado das ações de PDF e compartilhamento nas páginas de orçamento

### Testes de interface do orçamento
- [x] Adicionar teste de integração do componente QuotationPreview para a ação Gerar PDF
- [x] Adicionar teste de integração do componente QuotationPreview para Imprimir e data-print-target
- [x] Adicionar testes de e-mail e WhatsApp acionados pelo componente QuotationPreview

## Fase 11 - Edição Completa, Exclusão e Preview Responsivo de Orçamentos
- [x] Garantir procedure tRPC de atualização completa de orçamentos (quotations.update com itens)
- [x] Garantir procedure tRPC de exclusão de orçamentos (quotations.delete)
- [x] Atualizar Quotations.tsx com ações explícitas (Visualizar, Editar, Excluir, PDF) na listagem e menu/botões responsivos
- [x] Criar modal ou página de edição completa do orçamento com todos os campos e itens editáveis
- [x] Garantir que QuotationPreview seja totalmente responsivo e limpo em telas menores
- [x] Validar compilação, testes e build de produção

## Fase 12 - Gestão Financeira Avançada (Despesas, Recebimentos e Fluxo de Caixa)
- [x] Criar tabelas/esquemas para despesas e contas a pagar no drizzle/schema.ts
- [x] Criar procedimentos tRPC para despesas e recebimentos no server/routers.ts
- [x] Criar página de Gestão Financeira (Despesas e Fluxo de Caixa) na interface
- [x] Validar integração mantendo todas as funcionalidades atuais intactas
- [x] Executar testes automatizados, verificação de tipos e build de produção

## Fase 21 - Catálogo Híbrido Avançado e Sincronização Automática (Inspiração Baseada no Guia)
- [x] Remover fallbacks fictícios de preços e dados aleatórios em server/external-search.ts
- [x] Expandir schema em drizzle/schema.ts com histórico de preços (productPriceHistory) e metadados de sincronização (sourceType, syncEnabled, externalUrl, externalStatus, etc.)
- [x] Implementar rotina robusta de sincronização em segundo plano (Heartbeat / sync routine com testes e callback autenticado)
- [x] Atualizar componentes de importação com pré-revisão e distinção de preço externo vs preço personalizado
- [x] Executar testes automatizados, verificação de tipos e build de produção

## Fase 22 - Eliminação de Dados Fictícios e Busca Externa Real (Firecrawl / Páginas Públicas)
- [x] Ajustar server/external-search.ts para remover qualquer fallback ou dado inventado, retornando erro informativo quando indisponível
- [x] Integrar busca pública da Leroy Merlin e Acal Home Center por endpoints/páginas públicas diretas e parsing defensivo, sem Firecrawl
- [x] Validar extração estrita de dados reais (nome, preço, disponibilidade, SKU, URL) sem preenchimento falso e sem valores padrão fictícios
- [x] Adicionar testes para verificar que campos ausentes retornam null e nunca placeholders ou valores inventados
- [x] Extrair SKU estritamente da fonte real (markdown ou JSON), sem inferir por regex de URL
- [x] Adicionar testes cobrindo ausência de preço e SKU nas buscas Leroy e Acal
- [x] Executar testes automatizados, verificação de tipos e build de produção

## Adaptação de busca pública direta no tRPC
- [x] Avaliar a integração Firecrawl e optar por não exigir API, conforme a restrição do projeto
- [x] Normalizar respostas JSON/HTML público com parsing defensivo, sem placeholders ou inferências de SKU
- [x] Cobrir respostas inválidas, campos ausentes e bloqueios de fonte com testes automatizados
- [x] Executar testes da busca, verificação de tipos e build de produção
- [x] Adaptar a busca externa para operar sem API Firecrawl, usando apenas requisições server-side a fontes públicas e sem fallback simulado
- [x] Validar parsing defensivo do HTML/JSON direto, mantendo campos ausentes sem placeholders ou dados inferidos

## Nova integração — Assistente LLM inspirado no OmniRoute
- [x] Definir casos de uso do assistente (orçamentos, produtos, clientes, fluxo de caixa, despesas, faturas e resumos financeiros)
- [x] Implementar chamada LLM somente no servidor usando invokeLLM e contexto filtrado por empresa
- [x] Adicionar chat contextual com respostas textuais contextualizadas e confirmação antes de ações mutáveis
- [x] Implementar limites de segurança, privacidade, custos, timeout e fallback controlado por erro transparente, com redação de dados sensíveis e testes de timeout/concorrência
- [x] Adicionar testes do assistente, executar pnpm test --run, pnpm check e pnpm build após os controles finais

### Reforço do CRUD de fornecedores
- [x] Adicionar tratamento de erro explícito nas mutations de fornecedores com feedback na UI
- [x] Criar testes das procedures suppliers para autorização por empresa e operações CRUD
- [x] Criar teste explícito do espelho Firebase para criação, atualização e remoção de fornecedor
- [x] Executar regressão completa, TypeScript e build após o CRUD de fornecedores
