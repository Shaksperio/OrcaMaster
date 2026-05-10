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
- [ ] Implementar CRUD de clientes (CPF/CNPJ, endereço, contato, histórico)
- [ ] Implementar CRUD de produtos/serviços (preço, SKU, estoque, categoria)
- [ ] Implementar CRUD de profissionais/mão de obra (valor hora, comissão)
- [ ] Implementar CRUD de fornecedores

## Fase 4: Orçamentos e Faturas
- [ ] Implementar criação de orçamentos com seleção de itens
- [ ] Implementar conversão automática de orçamento em fatura
- [ ] Implementar numeração sequencial automática (ORC-001, FAT-001)
- [ ] Implementar controle de status (Rascunho, Enviado, Aprovado, Pago, etc.)
- [ ] Implementar validade de orçamento com alertas
- [ ] Implementar duplicação de documentos
- [ ] Implementar histórico de versões

## Fase 5: Geração de PDF e QR Code
- [ ] Implementar geração de PDF com layout customizável
- [ ] Implementar geração de QR Code embutido no PDF
- [ ] Implementar templates de layout (minimalista, clássico, técnico)
- [ ] Implementar personalização de temas de cores
- [ ] Implementar upload de logo e marca d'água
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
- [ ] Refinar design visual e UX
- [ ] Implementar testes unitários
- [ ] Testar fluxos principais
- [ ] Otimizar performance
- [ ] Preparar para lançamento
