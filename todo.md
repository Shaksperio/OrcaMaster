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
- [ ] Implementar CRUD de fornecedores - UI

## Fase 4: Orçamentos e Faturas
- [x] Implementar UI de orçamentos com listagem (empresa ativa, sem placeholders)
- [x] Implementar UI de faturas com listagem (empresa ativa, sem placeholders)
- [ ] Implementar criação de orçamentos com seleção de itens (procedures + UI) - PRIORIDADE ALTA
- [ ] Implementar numeração sequencial automática (ORC-001, FAT-001) - PRIORIDADE ALTA
- [ ] Implementar controle de status (Rascunho, Enviado, Aprovado, Pago, etc.) - PRIORIDADE ALTA
- [ ] Implementar conversão automática de orçamento em fatura - PRIORIDADE MÉDIA
- [ ] Implementar validade de orçamento com alertas - PRIORIDADE MÉDIA
- [ ] Implementar duplicação de documentos - PRIORIDADE BAIXA
- [ ] Implementar histórico de versões - PRIORIDADE BAIXA

## Fase 5: Geração de PDF e QR Code
- [x] Instalar biblioteca de PDF (pdfkit) e QR Code
- [x] Implementar geração de PDF com layout customizável (server/pdf-generator.ts)
- [x] Implementar geração de QR Code embutido no PDF
- [ ] Implementar download de PDF no cliente (botão nas páginas)
- [x] Implementar página de configurações com temas (UI)
- [x] Implementar personalização de temas de cores (UI)
- [x] Implementar página pública de validação via QR Code
- [ ] Implementar upload de logo e marca d'água (backend)
- [ ] Implementar campos personalizados nos documentos

## Fase 6: Gestão Financeira e Relatórios
- [ ] Implementar controle de recebimentos (parciais, parcelados, atrasados)
- [ ] Implementar contas a pagar
- [ ] Implementar fluxo de caixa
- [ ] Implementar gráficos de faturamento mensal
- [ ] Implementar relatório de inadimplência
- [ ] Implementar exportação de relatórios (PDF e Excel)

## Fase 7: Dashboard e Página Pública
- [ ] Implementar dashboard com indicadores financeiros
- [ ] Implementar página pública de validação de documentos via QR Code
- [ ] Implementar rastreamento de QR Code escaneado

## Fase 8: Alertas e Notificações
- [ ] Implementar alertas por e-mail (orçamento aprovado, fatura vencida, pagamento recebido)
- [ ] Implementar alertas de orçamento prestes a expirar
- [ ] Implementar notificações push
- [ ] Implementar alerta de inadimplência

## Fase 9: Integração com IA
- [ ] Implementar sugestão de preços com base em histórico
- [ ] Implementar análise de padrões de orçamentos

## Fase 10: Refinamentos Visuais e Testes
- [x] Redesenhar com paleta de cores corporativas (laranja + verde escuro) - PRIORIDADE ALTA
- [x] Atualizar componentes com novas cores (index.css, AppLayout, Dashboard, Login)
- [x] Atualizar sidebar, headers e botões
- [ ] Implementar testes unitários
- [ ] Testar fluxos principais
- [ ] Otimizar performance
- [ ] Preparar para lançamento


## Testes de Funcionalidades
- [x] Testar navegação do menu sidebar (todos os links) - OK
- [x] Testar CRUD de Clientes (criar, listar) - OK com invalidação de cache
- [x] Testar CRUD de Produtos (criar, listar) - OK com invalidação de cache
- [x] Testar CRUD de Profissionais (criar, listar) - OK com invalidação de cache
- [x] Testar botões de ação rápida no Dashboard - OK (desabilitados por enquanto)
- [x] Testar links de navegação entre páginas - OK
- [x] Testar autenticação (login/logout) - OK
- [x] Testar página de validação pública - OK
- [x] Testar configurações e personalização - OK
- [x] Corrigir bugs encontrados durante testes - Implementadas validações, toasts e invalidação de cache


## Fase 11: Integração Firebase Realtime Database
- [x] Instalar dependências do Firebase (firebase, firebase-admin)
- [x] Configurar variáveis de ambiente (Firebase credentials)
- [x] Criar serviço de sincronização com Firebase (firebase-admin.ts + firebase-sync.ts)
- [ ] Sincronizar dados de Clientes em tempo real (integrar nos procedures tRPC)
- [ ] Sincronizar dados de Produtos em tempo real (integrar nos procedures tRPC)
- [ ] Sincronizar dados de Profissionais em tempo real (integrar nos procedures tRPC)
- [ ] Sincronizar dados de Orçamentos em tempo real
- [ ] Sincronizar dados de Faturas em tempo real
- [ ] Implementar listeners em tempo real no frontend
- [ ] Testar sincronização bidirecional MySQL <-> Firebase
- [ ] Implementar fallback caso Firebase indisponível
- [ ] Documentar arquitetura de sincronização
