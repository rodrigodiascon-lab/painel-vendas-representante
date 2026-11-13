# Painel de Vendas para representante comercial

Skill para o **Claude Code** que conduz você, passo a passo, a montar e publicar o seu próprio painel de vendas
na sua conta grátis da **Cloudflare**, a partir de uma planilha do Google (ou de um arquivo CSV).

Feita para representante comercial e vendedor de carteira: o painel mostra **faturamento, pedidos, clientes
positivados, mix de linhas, ticket médio, cotações em aberto** e **ranking por cliente, por representada e por
linha**, com filtros por período, cliente, representada, linha e status.

> Adaptação do **[criador-dash](README.original-criador-dash.md)**, de **Julio Couto**, distribuído sob a
> licença MIT. A adaptação (domínio Representação, planilha de exemplo e testes) é da **representante.ia**.
> Os domínios originais de Marketing, Vendas e Suporte continuam disponíveis.

## Instalar

No **Claude Code** (aba Code do app ou terminal), peça:

```
Instala a skill painel-vendas clonando https://github.com/rodrigodiascon-lab/painel-vendas-representante
na pasta ~/.claude/skills/painel-vendas. Se a pasta já existir, atualiza com git pull.
```

Ou rode no terminal:

```
git clone https://github.com/rodrigodiascon-lab/painel-vendas-representante ~/.claude/skills/painel-vendas
```

Se a skill não aparecer quando você digitar `/`, abra uma sessão nova.

## Usar

```
/painel-vendas Quero um painel de Representação com a minha planilha: [link da planilha compartilhada].
Publica na minha conta da Cloudflare e me manda o link.
```

Sem planilha ainda? Use a de exemplo, com dados fictícios: `starter-kit/examples/representacao-exemplo.csv`
(colunas: Data, Cliente, Representada, Linha, Valor, Status).

### Como o painel de Representação conta

- **Pedido válido:** toda linha que não está cancelada nem é cotação/orçamento. Sem coluna de status, todas contam.
- **Faturamento:** soma do valor dos pedidos válidos.
- **Clientes positivados:** clientes diferentes com pelo menos um pedido válido no período.
- **Mix de linhas:** linhas ou produtos diferentes vendidos no período.
- **Oportunidades:** pedidos válidos mais cotações em aberto. **Conversão** = pedidos ÷ oportunidades.
- Os rankings somam o valor de todas as linhas da planilha; para ver só pedidos, use o filtro de status.

## O que você precisa

- Conta grátis na Cloudflare (dash.cloudflare.com).
- Node.js instalado (o Claude confere e ajuda a instalar).
- O roteiro completo, a arquitetura e a segurança estão em `SKILL.md`, `references/` e `starter-kit/ARCHITECTURE.md`.

## Testes

```
cd starter-kit && npm test
```

## Licença

MIT. Veja `LICENSE`. Obra original: criador-dash, de Julio Couto. Adaptação: representante.ia.
