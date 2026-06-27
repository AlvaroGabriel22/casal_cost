# Evolução financeira — CasalCost

Documento vivo que registra o plano de consolidação extrato + manual e o que já foi entregue.

## Visão do produto (3 camadas)

| Camada | Fonte | Papel |
|--------|--------|--------|
| **Obrigações** | Cadastro manual (Pix, boleto, débito) | Previsão / comprometido |
| **Movimentação** | Extrato conta corrente | Caixa real + quitação |
| **Consumo** | Extrato cartão + débitos diretos | Onde o dinheiro foi de fato |

Dashboard = **projetado vs real**. Assistente = análise do **real**. Manual continua opcional para quem não importa.

---

## Fases do plano

### Fase 1 — Dois uploads + tipo de extrato ✅

- [x] Dois blocos na mesma tela (conta + cartão)
- [x] `sourceType`: `BANK_ACCOUNT` | `CREDIT_CARD`
- [x] Histórico separado por tipo, ordenado por mês
- [x] Parser Nubank: sinal invertido no cartão (+ compra, − pagamento)
- [x] Ciclo Nubank: fatura fecha **7 dias antes** do vencimento; compras só entram no ciclo correto
- [x] **Pagamento recebido** no CSV do cartão é **ignorado** — valor da fatura vem do extrato da conta
- [x] Exemplo: venc. 01/jun → compras de 24/abr a 25/mai entram na fatura de junho
- ~~[x] Ciclo de fatura (fecha 20 / vence 1)~~ substituído pela regra Nubank acima
- [x] Deduplicação entre extratos sobrepostos (fingerprint)
- [x] Excluir `CARD_BILL` do consumo quando há cartão importado

### Fase 2 — Dashboard híbrido ⚠️ parcial

- [x] Métricas: consumo confirmado, saldo confirmado, pendentes manuais
- [x] Gráfico de categorias usa consumo confirmado quando há extrato
- [x] Extrato individual com itens manuais + importados
- [ ] Receitas cruzadas com créditos do extrato
- [ ] Labels unificados em todas as telas (cadastrado vs confirmado)

### Fase 3 — Reconciliação Pix/débito ⚠️ em andamento

- [x] Modelo `StatementReconciliation` (AUTO / MANUAL)
- [x] Match automático na importação da conta (valor + janela de datas + título)
- [x] Reversão ao excluir import
- [x] **Painel "Planejado vs extrato"** no dashboard individual
- [x] API `GET /statement-imports/reconciliation?month=YYYY-MM`
- [ ] Confirmar match manualmente na UI
- [ ] Criar despesa a partir de lançamento sem match
- [ ] PAID só via extrato (manual como override excepcional)

### Fase 4 — Assistente + refino 🔜

- [x] Análise de extrato (conta + cartão) no RAG
- [x] Desafios/insights parcialmente ligados ao extrato
- [ ] Narrativa unificada: "cadastrou X, extrato confirmou Y"
- [ ] PDF nos imports
- [ ] Despesas compartilhadas / quem pagou

---

## Entrega atual (esta sessão)

**Fase 3 — UX de reconciliação (primeira fatia)**

### Backend

`StatementReconciliationService.getOverview(userId, month)` retorna:

- **awaitingExtract** — contas manuais Pix/débito PENDING/OVERDUE sem match
- **unmatchedStatementDebits** — débitos no extrato da conta sem conta cadastrada
- **confirmedMatches** — vínculos gravados (auto/manual) com confiança

Endpoint: `GET /api/statement-imports/reconciliation?month=2026-01`

### Frontend

Componente `ReconciliationPanel` no **dashboard individual**, visível quando há dados de extrato no mês. Três blocos de resumo + listas (até 6 itens cada).

### Como usar

1. Cadastre contas Pix/débito no mês
2. Importe extrato da **conta corrente**
3. Abra o dashboard do mês → seção **Planejado vs extrato**
4. Amarelo = ainda não apareceu no extrato · Azul = saiu no banco sem cadastro · Verde = confirmado

---

## Próximos passos recomendados

1. Botão "Confirmar match" para pares sugeridos com confiança média
2. "Criar despesa" a partir de lançamento unmatched
3. Assistente citar reconciliação no chat ("3 contas aguardando extrato")
4. Import PDF via IA → JSON → mesmo pipeline

---

## Decisões técnicas relevantes

- **Consolidação na leitura** (sem tabela materializada) — `StatementConsolidationService`
- **Fingerprint** inclui índice para linhas repetidas no mesmo dia (ex.: Foztrans)
- **Reimportação** apaga por mês de fatura + por fingerprint duplicado
- **Cartão**: `referenceMonth` = mês de vencimento da fatura, não mês calendário da compra

---

*Última atualização: jun/2026*
