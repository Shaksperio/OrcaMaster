# Análise Técnica e Política de Uso para Motor de Importação Web (Estilo IMPORTHTML)

Este documento avalia a viabilidade de implementar um motor genérico de importação web (estilo `IMPORTHTML` / `IMPORTXML`) no **OrçaMaster**, considerando as restrições técnicas, os termos de uso e os arquivos `robots.txt` dos fornecedores analisados (Leroy Merlin e Acal Home Center).

## 1. Diretriz de Conformidade Legal e Ética

Conforme a orientação expressada, a funcionalidade de busca externa só deve ser implementada se for **totalmente legal, ética e permitida pelas políticas públicas de acesso** dos sites consultados. Caso contrário, o sistema deve abster-se de realizar raspagem direta, priorizando a inserção manual ou catálogos oficiais autorizados.

## 2. Diagnóstico dos Fornecedores

### Leroy Merlin (`leroymerlin.com.br`)
- **Proteção Anti-Bot:** O domínio emprega sistemas avançados de mitigação de tráfego automatizado (Cloudflare e DataDome), resultando em respostas HTTP `403 Forbidden` e desafios de CAPTCHA para requisições programáticas diretas.
- **Diretriz `robots.txt`:** O acesso automatizado genérico a páginas de busca e listagem dinâmicas é restrito por barreiras técnicas de segurança.
- **Conclusão:** A tentativa de extração direta em larga escala por scripts simples viola as defesas de perímetro do site, tornando a experiência instável e sujeita a bloqueios permanentes de IP.

### Acal Home Center (`acalhomecenter.com.br`)
- **Diretriz `robots.txt`:** O arquivo `robots.txt` do domínio restringe explicitamente o rastreamento em rotas de busca (`Disallow: /busca/*`, `Disallow: /busca/`) e páginas de resultados dinâmicos (`Noindex: /buscapagina/*`).
- **Conclusão:** Como o motor estilo `IMPORTHTML` ou `IMPORTXML` depende exatamente de consultar as rotas de busca de produtos (`/busca?query=...`), a execução de varreduras automatizadas nessas URLs viola diretamente a diretriz de exclusão declarada pelo proprietário no `robots.txt`.

## 3. Decisão Arquitetural para o OrçaMaster

Diante da análise técnica e do respeito às regras de acesso público:

1. **Abstenção de Scraping de Busca:** O OrçaMaster **não** utilizará raspagem automatizada em rotas de busca restritas (`/busca/*`) ou protegidas por Cloudflare/DataDome.
2. **Preservação do Catálogo Híbrido Estrito:** O catálogo externo permanece restrito a consultas pontuais validadas por JSON-LD estrito ou catálogos oficiais de referência (como a base SINAPI integrada), onde os dados são estruturados e públicos.
3. **Foco na Entrada Manual e Revisão:** Usuários que desejarem cadastrar produtos de fornecedores externos devem utilizar a interface de **Revisão de Importação**, preenchendo os dados reais obtidos por navegação própria do usuário, eliminando riscos legais e garantindo 100% de conformidade com a exigência de ausência de dados fictícios.

---
*Autor: **Manus AI***
