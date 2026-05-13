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
- [x] Implementar criação de orçamentos com seleção de itens (procedures + UI) - PRIORIDADE ALTA
- [x] Implementar numeração sequencial automática (ORC-001, FAT-001) - PRIORIDADE ALTA
- [x] Implementar controle de status (Rascunho, Enviado, Aprovado, Pago, etc.) - PRIORIDADE ALTA
- [x] Implementar conversão automática de orçamento em fatura - PRIORIDADE MÉDIA
- [ ] Implementar validade de orçamento com alertas - PRIORIDADE MÉDIA
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
- [ ] Testar navegação do menu sidebar (todos os links)
- [ ] Testar CRUD de Clientes (criar, listar, editar, deletar)
- [ ] Testar CRUD de Produtos (criar, listar, editar, deletar)
- [ ] Testar CRUD de Profissionais (criar, listar, editar, deletar)
- [ ] Testar botões de ação rápida no Dashboard
- [ ] Testar links de navegação entre páginas
- [ ] Testar autenticação (login/logout)
- [ ] Testar página de validação pública
- [ ] Testar configurações e personalização
- [ ] Corrigir bugs encontrados durante testes

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
- [ ] Push para GitHub
