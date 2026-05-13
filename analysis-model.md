# Análise do Modelo de Orçamento

## Página 1 - Cabeçalho e Itens

### Cabeçalho da Empresa (topo)
- Nome da empresa (grande, verde)
- Endereço completo
- Mobile/Telefone
- Email
- CNPJ
- Logo da empresa (canto direito)

### Seção CONTRATANTE (cliente)
- Nome do contratante
- Empresa
- Telefone
- E-mail
- Endereço completo

### Seção LOCAL DA OBRA
- Endereço/local onde o serviço será realizado
- **NOVO CAMPO**: `workLocation` (text)

### Seção EST./N.° (cabeçalho do orçamento)
- Número do orçamento (grande)
- DATA PDO. (data do pedido/criação)
- DATA VAL. (data de validade)

### Tabela de Itens
- DESCRIÇÃO
- ITEM (tipo de serviço/material)
- M²/QTD. (quantidade/metragem)
- PREÇO/UN.
- VALOR (total do item)

### CONDIÇÕES DE PAGAMENTO
- Texto longo descrevendo condições (Art. 40, CDC e Arts. 417-420, CC)
- Sinal e Arras (50% do valor total) - texto descritivo
- Saldo de Conclusão (50% restante) - texto descritivo
- **NOVO CAMPO**: `paymentConditions` (text, longo)

## Página 2 - Totais e Detalhes

### Meios de Pagamento
- Texto descritivo sobre como pagar
- **NOVO CAMPO**: `paymentMethodDescription` (text)

### QR Code PIX
- QR Code para pagamento
- Titular
- Banco
- Chave PIX
- **NOVOS CAMPOS**: `pixHolder`, `pixBank`, `pixKey`

### Tabela de Totais
- SUBTOTAL
- ISS (%) - com percentual e valor
- ICMS (%) - com percentual e valor
- VALOR TOTAL
- **NOVOS CAMPOS**: `issPercentage`, `icmsPercentage`

### DESCRIÇÃO DOS SERVIÇOS CONTRATADOS
- Texto longo descrevendo todos os serviços
- **NOVO CAMPO**: `serviceDescription` (text, longo)

### PRAZO DE ENTREGA ESTIMADO
- Texto descrevendo prazo
- **NOVO CAMPO**: `deliveryEstimate` (text)

### AVISO LEGAL
- Texto legal em caixa
- **NOVO CAMPO**: `legalNotice` (text)

### Assinaturas
- Espaço para assinatura da empresa
- Espaço para assinatura do contratante
- Nome da empresa e nome do contratante abaixo

## Campos novos necessários na tabela `quotations`:
1. `workLocation` - varchar(500) - Local da obra
2. `issPercentage` - decimal(5,2) - Percentual de ISS
3. `icmsPercentage` - decimal(5,2) - Percentual de ICMS
4. `pixHolder` - varchar(255) - Titular PIX
5. `pixBank` - varchar(255) - Banco PIX
6. `pixKey` - varchar(255) - Chave PIX
7. `paymentConditions` - text - Condições de pagamento detalhadas
8. `paymentMethodDescription` - text - Meios de pagamento
9. `serviceDescription` - text - Descrição dos serviços contratados
10. `deliveryEstimate` - text - Prazo de entrega estimado
11. `legalNotice` - text - Aviso legal

## Campos novos na tabela `quotationItems`:
- `itemType` - varchar(100) - Tipo do item (ex: "Mão de obra + material")
