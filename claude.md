# FinancIAls

Sistema de finanças pessoais com backend FastAPI e frontend React.

## Stack

- **Backend:** Python 3.10+, FastAPI, SQLAlchemy, PostgreSQL, Alembic, Pydantic v2
- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Auth:** JWT via `python-jose`

## Estrutura de pastas

```
app/
  core/           # database.py, config.py
  models/         # SQLAlchemy models
  schemas/        # Pydantic schemas
  crud/           # CRUD genérico + específico
  routers/        # Endpoints FastAPI
  services/       # Lógica de negócio (analytics, financial_engine, etc.)
  main.py
alembic/
  versions/       # Migrations
frontend/src/
  pages/          # Dashboard, Contas, Transações, Recorrentes, Relatórios, etc.
  components/     # Componentes reutilizáveis
    dashboard/    # NetWorthCard, SpendingPaceCard, EvolutionChart, GoalsCard, etc.
    layout/       # MainLayout, Sidebar
    ui/           # shadcn/ui components
  api/            # api.js, analyticsApi.js
  context/        # ThemeContext, PrivacyContext, BudgetContext
  hooks/          # useInvoice.js
```

## Convenções obrigatórias

- Sempre entregar arquivos **completos**, nunca patches parciais
- Valores monetários usam `Decimal` no backend (nunca float)
- Soft delete em transações via `deleted_at` (nunca hard delete)
- UUIDs como chave primária em todas as entidades
- Migrations Alembic para qualquer mudança de schema
- `alembic upgrade head` após criar migration

## Comandos úteis

```bash
# Backend
uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev

# Migrations
alembic upgrade head
alembic history
alembic current
```

---

## Estado atual

### Backend — models e campos relevantes

**Account**
- Tipos: `banco`, `carteira`, `poupanca`, `investimento`, `cartao_credito`, `outros_ativos`, `outros_passivos`
- Campos de cartão: `closing_day`, `due_day`, `credit_limit`, `is_default`
- Campos de fatura: `invoice_status` (open/closed), `invoice_closed_at`, `invoice_snapshot_amount`
- Saldo calculado dinamicamente via `financial_engine.get_account_balance()` (initial_balance + sum transactions até hoje)
- Histórico de saldo: tabela `balance_history` (account_id, balance, date) — gravada a cada transação

**Transaction**
- Nature: `INCOME`, `EXPENSE`, `INVESTMENT`, `TRANSFER`, `SYSTEM_ADJUSTMENT`
- Soft delete via `deleted_at`
- `recurring_expense_id` vincula à recorrência de origem
- `transfer_group_id` agrupa as duas entradas de uma transferência (dual entry)
- Índice único: `uq_recurring_transaction_month` — impede duplicatas de recorrência no mesmo mês (migration `b7e9f1a2c3d4`)

**RecurringExpense**
- Tipos: `subscription` (mensal/anual), `installment` (parcelamento)
- `generate_future_transactions()` gera mês atual + 2 meses à frente
- Deduplicação em 2 camadas: por `recurring_expense_id + mês` e por `description + account_id + mês`
- Roda silenciosamente no carregamento do Dashboard

### Backend — endpoints principais

```
GET/POST /accounts/
GET/PUT/DELETE /accounts/{id}
PATCH /accounts/{id}/set-default
GET  /accounts/{id}/current-invoice     # estado completo da fatura
POST /accounts/{id}/close-invoice       # fecha fatura (idempotente)
POST /accounts/{id}/reopen-invoice      # reabre fatura
POST /accounts/{id}/next-invoice        # alias de reopen após pagamento

GET /analytics/account-balances-history?year=&month=  # saldos históricos por mês
GET /analytics/net-worth
GET /analytics/assets-liabilities
GET /analytics/operational-monthly
GET /analytics/burn-rate
GET /analytics/goals-progress
GET /analytics/daily-expenses?year=&month=
GET /analytics/monthly-commitment
GET /analytics/projection?months=

POST /recurring-expenses/generate       # gera transações futuras
POST /recurring-expenses/{id}/terminate
PATCH /recurring-expenses/{id}/propagate

POST /transactions/                     # cria via UnifiedTransactionCreate
POST /transactions/transfer             # dual entry
GET  /transactions/descriptions/        # autocomplete
GET  /transactions/suggest/?description=  # sugere categoria+conta por histórico
```

### Frontend — páginas e estado

**Dashboard** (`pages/Dashboard.jsx`)
- Navegação temporal por mês (seletor ← Abril 2025 →)
- `fetchStaticData`: patrimônio, contas, categorias, metas, operationalMonthly — roda uma vez
- `fetchMonthData(year, month)`: transações do mês, dailyExpenses, historicalBalances — roda ao trocar mês
- Layout: MonthOverviewCard (2/3) + NetWorthCard (1/3) → SpendingPaceCard → EvolutionChart → GoalsCard + RecentTransactionsCard
- Escuta evento global `transaction:created` para atualizar sem reload

**MonthOverviewCard** (`components/MonthOverviewCard.jsx`)
- Mês corrente: Saldo disponível | Já gastei | A gastar ainda / Ainda entra | Investido
- Mês histórico: Receitas | Despesas | Resultado / Saldo histórico | Investido
- Sem "saldo estimado" — removido por decisão de design
- `historicalBalances` vem de `/analytics/account-balances-history`

**Contas** (`pages/Contas.jsx`)
- Layout por seção: Contas Bancárias, Cartões de Crédito, Investimentos, Carteira & Poupança
- Resumo: saldo líquido, total investido, total faturas abertas
- `CreditCardCard`: barra de uso do limite, dias para fechar, botão "Fechar fatura" aparece quando ≤1 dia
- `TransferForm`: fluxo 2 etapas com preview De→Para antes de confirmar
- `InvoicePaymentForm`: pré-preenchimento com total/mínimo/personalizado, auto-seleciona conta padrão

**TransactionForm** (`components/TransactionForm.jsx`)
- Aceita `prefill` (vindo do QuickAdd) e carrega categorias/contas autonomamente se props vazias
- Conta padrão persistida em `localStorage` (chave: `financials_default_account`)
- Auto-sugestão de categoria via `/transactions/suggest/` ao digitar descrição
- Categoria é sugerida mas não sobrescreve conta — conta segue localStorage

**QuickAddTransaction** (`components/QuickAddTransaction.jsx`)
- Modal compacto: toggle Despesa/Receita, valor, descrição, categoria, conta, data
- Atalho de teclado global: `N` abre (quando fora de inputs)
- `⌘ + Enter` confirma
- Botão "Mais opções" abre TransactionForm completo com prefill

**MainLayout** (`components/layout/MainLayout.jsx`)
- Botão flutuante "Lançamento rápido" fixo no canto inferior direito
- Abre QuickAddTransaction ou TransactionForm completo
- Dispara `window.CustomEvent('transaction:created')` após salvar

### Migrations aplicadas (ordem)

1. `4229760ab57a` — schema inicial
2. `18671a96c794` e outras intermediárias — views, índices, user_id
3. `66d18793a3d9` — `invoice_status`, `invoice_closed_at`, `invoice_snapshot_amount` em accounts
4. `6aebac75a7a1` — initial_schema (limpeza de índices antigos)
5. `b7e9f1a2c3d4` — unique index `uq_recurring_transaction_month` (previne duplicatas de recorrência)
6. `c8f2a3b4d5e6` — merge dos dois heads

### Bugs corrigidos

- **Duplicata de recorrências** (ex-Spotify): race condition no `generate_future_transactions` quando Dashboard carregava duas vezes em paralelo. Corrigido com: (1) uso de `extract(year/month)` em vez de `date_trunc`, (2) deduplicação em 2 camadas no CRUD, (3) unique index no banco.
- **Dashboard perdendo dados do mês anterior**: `MonthOverviewCard` usava `new Date()` hardcoded. Corrigido com seletor de mês e `fetchMonthData` parametrizado.

### Pendente / próximas features

- Tela de Recorrentes: melhorias de UX e visualização (na fila)
- Geração automática de recorrentes: item 4 do roadmap original
- Tela de Recorrentes: visão de vencimentos próximos ("próximos 7 dias")